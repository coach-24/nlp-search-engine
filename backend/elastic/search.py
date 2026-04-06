"""
elastic/search.py
All Elasticsearch query DSL logic lives here.
Supports keyword search, filtering, aggregations, suggestions, and optional semantic search.
"""
from copy import deepcopy
import logging
import re
from threading import Lock
from time import monotonic

from elasticsearch import Elasticsearch, NotFoundError

from utils.config import settings

logger = logging.getLogger(__name__)

FACET_FIELDS = {
    "chapters": "chapter",
    "topics": "topic",
    "difficulties": "difficulty",
    "concept_types": "concept_type",
    "tags": "tags",
}

QUICK_FILTER_DEFINITIONS = {
    "important": {
        "label": "Important",
        "clause": {
            "bool": {
                "should": [
                    {"terms": {"concept_type": ["Definition", "Theory"]}},
                    {"terms": {"difficulty": ["Intermediate", "Advanced"]}},
                ],
                "minimum_should_match": 1,
            }
        },
    },
    "trending": {
        "label": "Trending",
        "clause": {
            "bool": {
                "should": [
                    {
                        "terms": {
                            "topic": [
                                "Transformers",
                                "Pretrained Models",
                                "Information Retrieval",
                                "Summarization",
                            ]
                        }
                    },
                    {
                        "terms": {
                            "tags": [
                                "Transformers",
                                "Pretrained Models",
                                "Language Models",
                                "Information Retrieval",
                            ]
                        }
                    },
                ],
                "minimum_should_match": 1,
            }
        },
    },
    "frequent": {
        "label": "Frequent",
        "clause": {
            "bool": {
                "should": [
                    {"terms": {"concept_type": ["Definition", "Algorithm"]}},
                    {
                        "terms": {
                            "tags": [
                                "NLP Basics",
                                "Language Models",
                                "Sequence Labeling",
                                "Word Embeddings",
                            ]
                        }
                    },
                ],
                "minimum_should_match": 1,
            }
        },
    },
}

QUERY_SIGNAL_LABELS = {
    "keyword_match": "Matched your keywords across weighted title, content, topic, and tag fields.",
    "title_phrase": "The result title closely matched your query phrase.",
    "content_phrase": "The result content contained the query as a near-phrase.",
}

_FILTER_CACHE: dict[tuple, tuple[float, dict]] = {}
_FILTER_CACHE_LOCK = Lock()


def _clean_suggestion(value: str) -> str:
    text = re.sub(r"\s+", " ", (value or "")).strip()
    text = text.replace("\u2014", "-").replace("\u2013", "-")
    return text


def _query_tokens(value: str) -> list[str]:
    return [token for token in re.findall(r"[a-z0-9]+", (value or "").lower()) if len(token) > 1]


def _is_valid_suggestion(value: str) -> bool:
    if not value:
        return False
    if len(value) > 100:
        return False
    if len(value.split()) < 2:
        return False
    if len(value.split()) > 12:
        return False
    if value.count(",") > 3:
        return False
    if re.search(r"[a-zA-Z]{35,}", value):
        return False
    return True


def _matches_query_tokens(value: str, query: str) -> bool:
    title = value.lower()
    tokens = _query_tokens(query)
    if not tokens:
        return False
    return all(token in title for token in tokens)


def _is_strong_prefix_match(value: str, query: str) -> bool:
    normalized_value = value.lower().strip()
    normalized_query = query.lower().strip()
    if not normalized_query:
        return False

    if " " in normalized_query:
        compact_query = re.sub(r"\s+", " ", normalized_query)
        return bool(re.search(rf"(?:^|\b){re.escape(compact_query)}", normalized_value))

    words = re.findall(r"[a-z0-9]+", normalized_value)
    for index, word in enumerate(words):
        if word.startswith(normalized_query) and index <= 1:
            return True
    return normalized_value.startswith(normalized_query)


def _suggestion_rank(value: str, query: str) -> tuple:
    normalized_value = value.lower().strip()
    normalized_query = query.lower().strip()
    tokens = _query_tokens(normalized_query)
    token_boundary_matches = sum(
        1 for token in tokens if re.search(rf"\b{re.escape(token)}", normalized_value)
    )
    token_contains_matches = sum(1 for token in tokens if token in normalized_value)

    if normalized_value == normalized_query:
        priority = 0
    elif normalized_value.startswith(normalized_query):
        priority = 1
    elif re.search(rf"\b{re.escape(normalized_query)}", normalized_value):
        priority = 2
    else:
        priority = 3

    return (
        priority,
        -token_boundary_matches,
        -token_contains_matches,
        len(value),
        normalized_value,
    )


def _collect_suggestions(response: dict, query: str, size: int) -> list[str]:
    candidates = []
    seen = set()

    for hit in response.get("hits", {}).get("hits", []):
        title = _clean_suggestion(hit.get("_source", {}).get("title", ""))
        normalized = title.lower()
        if not _is_valid_suggestion(title):
            continue
        if not _matches_query_tokens(title, query):
            continue
        if not _is_strong_prefix_match(title, query):
            continue
        if normalized in seen:
            continue
        seen.add(normalized)
        candidates.append(title)

    candidates.sort(key=lambda value: _suggestion_rank(value, query))
    return candidates[:size]


def _normalize_filter_values(values: list[str] | None) -> list[str]:
    if not values:
        return []
    seen = set()
    normalized = []
    for value in values:
        candidate = (value or "").strip()
        if not candidate:
            continue
        lowered = candidate.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        normalized.append(candidate)
    return normalized


def normalize_quick_filters(values: list[str] | None) -> list[str]:
    normalized = []
    seen = set()
    for value in values or []:
        key = (value or "").strip().lower()
        if key in QUICK_FILTER_DEFINITIONS and key not in seen:
            seen.add(key)
            normalized.append(key)
    return normalized


def build_filter_clauses(
    chapter: list[str] | None = None,
    topic: list[str] | None = None,
    difficulty: list[str] | None = None,
    concept_type: list[str] | None = None,
    tags: list[str] | None = None,
) -> list[dict]:
    filters = []

    chapter = _normalize_filter_values(chapter)
    topic = _normalize_filter_values(topic)
    difficulty = _normalize_filter_values(difficulty)
    concept_type = _normalize_filter_values(concept_type)
    tags = _normalize_filter_values(tags)

    if chapter:
        filters.append({"terms": {"chapter": chapter}})
    if topic:
        filters.append({"terms": {"topic": topic}})
    if difficulty:
        filters.append({"terms": {"difficulty": difficulty}})
    if concept_type:
        filters.append({"terms": {"concept_type": concept_type}})
    if tags:
        filters.append({"terms": {"tags": tags}})

    return filters


def build_quick_filter_clauses(quick_filter: list[str] | None = None) -> list[dict]:
    return [
        deepcopy(QUICK_FILTER_DEFINITIONS[key]["clause"])
        for key in normalize_quick_filters(quick_filter)
    ]


def build_facet_aggs(facet_filters: list[dict], quick_filter_clauses: list[dict] | None = None) -> dict:
    aggs = {}
    quick_filter_clauses = quick_filter_clauses or []

    for agg_name, field_name in FACET_FIELDS.items():
        other_filters = [*quick_filter_clauses]
        for filter_clause in facet_filters:
            clause_field = next(iter(filter_clause.get("terms", {})), None)
            if clause_field != field_name:
                other_filters.append(filter_clause)

        aggs[agg_name] = {
            "filter": {"bool": {"filter": other_filters}} if other_filters else {"match_all": {}},
            "aggs": {
                "values": {
                    "terms": {
                        "field": field_name,
                        "size": 50 if field_name == "tags" else 30,
                        "order": {"_count": "desc"} if field_name == "tags" else {"_key": "asc"},
                    }
                }
            },
        }

    return aggs


def format_facet_results(aggregations: dict | None) -> dict:
    if not aggregations:
        return {name: [] for name in FACET_FIELDS}

    formatted = {}
    for agg_name in FACET_FIELDS:
        buckets = aggregations.get(agg_name, {}).get("values", {}).get("buckets", [])
        formatted[agg_name] = [
            {"value": bucket["key"], "count": bucket["doc_count"]}
            for bucket in buckets
            if str(bucket["key"]).strip()
        ]

    return formatted


def _build_text_match_query(q: str) -> dict:
    return {
        "bool": {
            "should": [
                {
                    "multi_match": {
                        "query": q,
                        "fields": [
                            "title^3",
                            "content^1",
                            "snippet^1.5",
                            "topic^2",
                            "concept_type^2",
                            "tags^2",
                        ],
                        "type": "best_fields",
                        "operator": "or",
                        "fuzziness": "AUTO",
                        "prefix_length": 2,
                        "tie_breaker": 0.3,
                        "_name": "keyword_match",
                    }
                },
                {
                    "match_phrase": {
                        "title": {
                            "query": q,
                            "boost": 2.2,
                            "slop": 1,
                            "_name": "title_phrase",
                        }
                    }
                },
                {
                    "match_phrase": {
                        "content": {
                            "query": q,
                            "slop": 2,
                            "_name": "content_phrase",
                        }
                    }
                },
            ],
            "minimum_should_match": 1,
        }
    }


def _build_scored_query(base_query: dict, sort: str) -> dict:
    if sort != "relevance":
        return base_query

    return {
        "function_score": {
            "query": base_query,
            "functions": [
                {"filter": {"term": {"difficulty": "Beginner"}}, "weight": 1.08},
                {"filter": {"term": {"concept_type": "Definition"}}, "weight": 1.1},
                {"filter": {"term": {"concept_type": "Example"}}, "weight": 1.03},
            ],
            "score_mode": "sum",
            "boost_mode": "multiply",
        }
    }


def _build_sort(sort: str) -> list[dict] | None:
    if sort == "alphabetical":
        return [
            {"title.keyword": {"order": "asc", "missing": "_last"}},
            {"_score": {"order": "desc"}},
            {"id": {"order": "asc"}},
        ]
    return None


def _build_did_you_mean(q: str) -> dict | None:
    normalized = (q or "").strip()
    if len(normalized) < 3:
        return None

    return {
        "did_you_mean": {
            "text": normalized,
            "phrase": {
                "field": "title.trigram",
                "gram_size": 3,
                "size": 1,
                "confidence": 0.2,
                "direct_generator": [
                    {
                        "field": "title.trigram",
                        "suggest_mode": "always",
                        "min_word_length": 3,
                    }
                ],
            },
        }
    }


def build_keyword_query(
    q: str,
    chapter: list[str] | None = None,
    topic: list[str] | None = None,
    difficulty: list[str] | None = None,
    concept_type: list[str] | None = None,
    tags: list[str] | None = None,
    quick_filter: list[str] | None = None,
    size: int = 10,
    from_: int = 0,
    sort: str = "relevance",
) -> dict:
    facet_filters = build_filter_clauses(chapter, topic, difficulty, concept_type, tags)
    quick_filter_clauses = build_quick_filter_clauses(quick_filter)
    all_filters = [*facet_filters, *quick_filter_clauses]

    base_query = {
        "bool": {
            "must": [_build_text_match_query(q)],
            "filter": all_filters,
        }
    }

    query_body = {
        "query": _build_scored_query(base_query, sort=sort),
        "aggs": build_facet_aggs(facet_filters, quick_filter_clauses),
        "size": size,
        "from": from_,
        "track_total_hits": True,
        "highlight": {
            "fields": {
                "title": {"number_of_fragments": 0},
                "content": {"fragment_size": 150, "number_of_fragments": 2},
            },
            "pre_tags": ["<mark>"],
            "post_tags": ["</mark>"],
        },
        "_source": {"excludes": ["embedding"]},
    }

    sort_clause = _build_sort(sort)
    if sort_clause:
        query_body["sort"] = sort_clause

    did_you_mean = _build_did_you_mean(q)
    if did_you_mean:
        query_body["suggest"] = did_you_mean

    return query_body


def _filters_cache_key(
    q: str | None,
    chapter: list[str] | None,
    topic: list[str] | None,
    difficulty: list[str] | None,
    concept_type: list[str] | None,
    tags: list[str] | None,
    quick_filter: list[str] | None,
) -> tuple:
    return (
        (q or "").strip().lower(),
        tuple(sorted(_normalize_filter_values(chapter))),
        tuple(sorted(_normalize_filter_values(topic))),
        tuple(sorted(_normalize_filter_values(difficulty))),
        tuple(sorted(_normalize_filter_values(concept_type))),
        tuple(sorted(_normalize_filter_values(tags))),
        tuple(normalize_quick_filters(quick_filter)),
    )


def search_documents(
    es: Elasticsearch,
    q: str,
    chapter: list[str] | None = None,
    topic: list[str] | None = None,
    difficulty: list[str] | None = None,
    concept_type: list[str] | None = None,
    tags: list[str] | None = None,
    quick_filter: list[str] | None = None,
    size: int = 10,
    from_: int = 0,
    page: int = 1,
    semantic: bool = False,
    sort: str = "relevance",
) -> dict:
    if semantic and settings.enable_semantic_search:
        return _semantic_search(
            es,
            q,
            chapter,
            topic,
            difficulty,
            concept_type,
            tags,
            quick_filter,
            size,
            from_,
            page,
            sort,
        )

    query = build_keyword_query(
        q,
        chapter,
        topic,
        difficulty,
        concept_type,
        tags,
        quick_filter=quick_filter,
        size=size,
        from_=from_,
        sort=sort,
    )
    response = es.search(index=settings.es_index, **query)
    return _format_results(response, q, page, size, quick_filter=quick_filter, sort=sort)


def get_filter_options(
    es: Elasticsearch,
    q: str | None = None,
    chapter: list[str] | None = None,
    topic: list[str] | None = None,
    difficulty: list[str] | None = None,
    concept_type: list[str] | None = None,
    tags: list[str] | None = None,
    quick_filter: list[str] | None = None,
) -> dict:
    ttl_seconds = max(settings.filters_cache_ttl_seconds, 0)
    cache_key = _filters_cache_key(q, chapter, topic, difficulty, concept_type, tags, quick_filter)

    if ttl_seconds:
        with _FILTER_CACHE_LOCK:
            cached = _FILTER_CACHE.get(cache_key)
            if cached and cached[0] > monotonic():
                return deepcopy(cached[1])

    facet_filters = build_filter_clauses(chapter, topic, difficulty, concept_type, tags)
    quick_filter_clauses = build_quick_filter_clauses(quick_filter)
    bool_query = {
        "must": [_build_text_match_query(q)] if q else [],
        "filter": [*facet_filters, *quick_filter_clauses],
    }
    query_body = {
        "size": 0,
        "track_total_hits": False,
        "query": {"bool": bool_query},
        "aggs": build_facet_aggs(facet_filters, quick_filter_clauses),
    }
    response = es.search(index=settings.es_index, **query_body)
    formatted = format_facet_results(response.get("aggregations"))

    if ttl_seconds:
        with _FILTER_CACHE_LOCK:
            _FILTER_CACHE[cache_key] = (monotonic() + ttl_seconds, deepcopy(formatted))

    return formatted


def clear_search_caches() -> None:
    with _FILTER_CACHE_LOCK:
        _FILTER_CACHE.clear()

    try:
        from elastic.embeddings import clear_embedding_caches
    except ImportError:
        return

    clear_embedding_caches()


def _hit_total_value(hits: dict) -> int:
    total = hits.get("total", 0)
    if isinstance(total, dict):
        return int(total.get("value", 0))
    return int(total or 0)


def _extract_did_you_mean(response: dict, q: str) -> str | None:
    best_text = None
    best_score = float("-inf")

    for suggestion in response.get("suggest", {}).get("did_you_mean", []):
        for option in suggestion.get("options", []):
            text = _clean_suggestion(option.get("text", ""))
            if not text or text.lower() == (q or "").strip().lower():
                continue
            if len(text) > 100 or re.search(r"[a-zA-Z]{35,}", text):
                continue

            score = float(option.get("score", 0))
            if score > best_score:
                best_text = text
                best_score = score

    return best_text


def _build_match_signals(hit: dict, q: str, quick_filter: list[str] | None = None) -> list[str]:
    signals = []
    seen = set()

    for key in hit.get("matched_queries", []):
        label = QUERY_SIGNAL_LABELS.get(key)
        if label and label not in seen:
            seen.add(label)
            signals.append(label)

    source = hit.get("_source", {})
    title = (source.get("title") or "").lower()
    query_tokens = _query_tokens(q)

    if query_tokens and all(token in title for token in query_tokens):
        label = "All query terms were present in the result title."
        if label not in seen:
            seen.add(label)
            signals.append(label)

    query_text = (q or "").lower()
    tags = [str(tag).lower() for tag in source.get("tags", [])]
    if query_text and any(query_text in tag or tag in query_text for tag in tags):
        label = "The query aligned with the document tags."
        if label not in seen:
            seen.add(label)
            signals.append(label)

    active_quick_filters = normalize_quick_filters(quick_filter)
    if active_quick_filters:
        names = ", ".join(QUICK_FILTER_DEFINITIONS[key]["label"] for key in active_quick_filters)
        label = f"Quick filters narrowed results to: {names}."
        if label not in seen:
            signals.append(label)

    if not signals:
        signals.append("This result ranked from the overall weighted relevance score for the query.")

    return signals[:4]


def _format_results(
    response: dict,
    q: str,
    page: int,
    size: int,
    quick_filter: list[str] | None = None,
    sort: str = "relevance",
) -> dict:
    hits = response["hits"]
    results = []

    for hit in hits.get("hits", []):
        source = hit["_source"]
        snippet = source.get("snippet", "")
        if "highlight" in hit and "content" in hit["highlight"]:
            snippet = " ... ".join(hit["highlight"]["content"])

        results.append(
            {
                "id": source.get("id", hit["_id"]),
                "title": source.get("title", ""),
                "chapter": source.get("chapter", ""),
                "topic": source.get("topic", ""),
                "difficulty": source.get("difficulty", ""),
                "concept_type": source.get("concept_type", ""),
                "snippet": snippet,
                "tags": source.get("tags", []),
                "score": round(hit.get("_score") or 0.0, 4),
                "matched_signals": _build_match_signals(hit, q, quick_filter=quick_filter),
            }
        )

    total = _hit_total_value(hits)

    return {
        "query": q,
        "total": total,
        "page": page,
        "total_pages": max(1, (total + size - 1) // size),
        "results": results,
        "facets": format_facet_results(response.get("aggregations")),
        "took_ms": response.get("took", 0),
        "did_you_mean": _extract_did_you_mean(response, q),
        "sort": sort,
    }


def suggest_completions(es: Elasticsearch, q: str, size: int = 6) -> list[str]:
    fetch_size = max(size * 6, 24)
    query = {
        "query": {
            "bool": {
                "should": [
                    {
                        "match_phrase": {
                            "title": {
                                "query": q,
                                "boost": 9,
                            }
                        }
                    },
                    {
                        "match_phrase_prefix": {
                            "title": {
                                "query": q,
                                "max_expansions": 20,
                                "boost": 6,
                            }
                        }
                    },
                    {
                        "multi_match": {
                            "query": q,
                            "type": "bool_prefix",
                            "fields": [
                                "title.suggest",
                                "title.suggest._2gram",
                                "title.suggest._3gram",
                            ],
                            "boost": 4,
                        }
                    },
                ],
                "minimum_should_match": 1,
            }
        },
        "size": fetch_size,
        "_source": ["title"],
    }

    try:
        response = es.search(index=settings.es_index, **query)
        return _collect_suggestions(response, q, size)
    except Exception as exc:
        logger.warning("Suggest query failed, falling back: %s", exc)
        return _prefix_suggest(es, q, size)


def _prefix_suggest(es: Elasticsearch, q: str, size: int) -> list[str]:
    query = {
        "query": {
            "match_phrase_prefix": {
                "title": {
                    "query": q,
                    "max_expansions": 10,
                }
            }
        },
        "size": max(size * 4, 20),
        "_source": ["title"],
    }
    response = es.search(index=settings.es_index, **query)
    return _collect_suggestions(response, q, size)


def get_document_by_id(es: Elasticsearch, doc_id: str) -> dict | None:
    try:
        response = es.get(index=settings.es_index, id=doc_id)
        source = response["_source"]
        source.pop("embedding", None)
        return source
    except NotFoundError:
        return None


def _semantic_search(
    es: Elasticsearch,
    q: str,
    chapter: list[str] | None,
    topic: list[str] | None,
    difficulty: list[str] | None,
    concept_type: list[str] | None,
    tags: list[str] | None,
    quick_filter: list[str] | None,
    size: int,
    from_: int,
    page: int,
    sort: str,
) -> dict:
    if sort != "relevance":
        logger.info("Semantic search only supports relevance sort. Falling back to relevance.")

    try:
        from elastic.embeddings import get_query_embedding
    except ImportError:
        logger.warning("sentence-transformers not available, falling back to keyword search.")
        return search_documents(
            es,
            q,
            chapter,
            topic,
            difficulty,
            concept_type,
            tags,
            quick_filter=quick_filter,
            size=size,
            from_=from_,
            page=page,
            semantic=False,
            sort=sort,
        )

    query_vector = list(get_query_embedding(q))
    if not query_vector:
        return search_documents(
            es,
            q,
            chapter,
            topic,
            difficulty,
            concept_type,
            tags,
            quick_filter=quick_filter,
            size=size,
            from_=from_,
            page=page,
            semantic=False,
            sort=sort,
        )

    facet_filters = build_filter_clauses(chapter, topic, difficulty, concept_type, tags)
    quick_filter_clauses = build_quick_filter_clauses(quick_filter)
    all_filters = [*facet_filters, *quick_filter_clauses]
    requested_window = min(max(from_ + size, size), 200)

    hybrid_query = {
        "bool": {
            "should": [_build_text_match_query(q)],
            "filter": all_filters,
        }
    }

    knn_query = {
        "field": "embedding",
        "query_vector": query_vector,
        "k": requested_window,
        "num_candidates": min(max(requested_window * 5, 50), 500),
        "boost": 0.65,
    }
    if all_filters:
        knn_query["filter"] = all_filters

    query_body = {
        "query": _build_scored_query(hybrid_query, sort="relevance"),
        "knn": knn_query,
        "aggs": build_facet_aggs(facet_filters, quick_filter_clauses),
        "size": size,
        "from": from_,
        "track_total_hits": True,
        "_source": {"excludes": ["embedding"]},
    }

    did_you_mean = _build_did_you_mean(q)
    if did_you_mean:
        query_body["suggest"] = did_you_mean

    response = es.search(index=settings.es_index, **query_body)
    return _format_results(response, q, page, size, quick_filter=quick_filter, sort="relevance")
