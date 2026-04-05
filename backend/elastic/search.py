"""
elastic/search.py
All Elasticsearch query DSL logic lives here.
Supports keyword search, filtering, aggregations, and optional semantic search.
"""
import logging
import re

from elasticsearch import Elasticsearch, NotFoundError

from utils.config import settings

logger = logging.getLogger(__name__)


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


FACET_FIELDS = {
    "chapters": "chapter",
    "topics": "topic",
    "difficulties": "difficulty",
    "concept_types": "concept_type",
    "tags": "tags",
}


def build_filter_clauses(
    chapter: list[str] | None = None,
    topic: list[str] | None = None,
    difficulty: list[str] | None = None,
    concept_type: list[str] | None = None,
    tags: list[str] | None = None,
) -> list[dict]:
    filters = []

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


def build_facet_aggs(active_filters: list[dict]) -> dict:
    aggs = {}

    for agg_name, field_name in FACET_FIELDS.items():
        other_filters = []
        for filter_clause in active_filters:
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


def build_keyword_query(
    q: str,
    chapter: list[str] | None = None,
    topic: list[str] | None = None,
    difficulty: list[str] | None = None,
    concept_type: list[str] | None = None,
    tags: list[str] | None = None,
    size: int = 10,
    from_: int = 0,
) -> dict:
    must_query = {
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
                    }
                },
                {"match_phrase": {"title": {"query": q, "boost": 2.0, "slop": 1}}},
                {"match_phrase": {"content": {"query": q, "slop": 2}}},
            ],
            "minimum_should_match": 1,
        }
    }

    filters = build_filter_clauses(chapter, topic, difficulty, concept_type, tags)

    return {
        "query": {
            "bool": {
                "must": must_query,
                "filter": filters,
            }
        },
        "aggs": build_facet_aggs(filters),
        "size": size,
        "from": from_,
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


def search_documents(
    es: Elasticsearch,
    q: str,
    chapter: list[str] | None = None,
    topic: list[str] | None = None,
    difficulty: list[str] | None = None,
    concept_type: list[str] | None = None,
    tags: list[str] | None = None,
    size: int = 10,
    from_: int = 0,
    page: int = 1,
    semantic: bool = False,
) -> dict:
    if semantic and settings.enable_semantic_search:
        return _semantic_search(es, q, chapter, topic, difficulty, concept_type, tags, size, from_, page)

    query = build_keyword_query(q, chapter, topic, difficulty, concept_type, tags, size, from_)
    response = es.search(index=settings.es_index, body=query)
    return _format_results(response, q, page, size)


def get_filter_options(
    es: Elasticsearch,
    q: str | None = None,
    chapter: list[str] | None = None,
    topic: list[str] | None = None,
    difficulty: list[str] | None = None,
    concept_type: list[str] | None = None,
    tags: list[str] | None = None,
) -> dict:
    filters = build_filter_clauses(chapter, topic, difficulty, concept_type, tags)
    query_body = {
        "size": 0,
        "query": {
            "bool": {
                "must": [{"multi_match": {"query": q, "fields": ["title^3", "content", "snippet"]}}] if q else [],
                "filter": filters,
            }
        },
        "aggs": build_facet_aggs(filters),
    }
    response = es.search(index=settings.es_index, body=query_body)
    return format_facet_results(response.get("aggregations"))


def _format_results(response: dict, q: str, page: int, size: int) -> dict:
    hits = response["hits"]
    results = []

    for hit in hits["hits"]:
        src = hit["_source"]
        snippet = src.get("snippet", "")
        if "highlight" in hit and "content" in hit["highlight"]:
            snippet = " ... ".join(hit["highlight"]["content"])

        results.append({
            "id": src.get("id", hit["_id"]),
            "title": src.get("title", ""),
            "chapter": src.get("chapter", ""),
            "topic": src.get("topic", ""),
            "difficulty": src.get("difficulty", ""),
            "concept_type": src.get("concept_type", ""),
            "snippet": snippet,
            "tags": src.get("tags", []),
            "score": round(hit["_score"] or 0.0, 4),
        })

    total = hits["total"]["value"]

    return {
        "query": q,
        "total": total,
        "page": page,
        "total_pages": max(1, (total + size - 1) // size),
        "results": results,
        "facets": format_facet_results(response.get("aggregations")),
        "took_ms": response.get("took", 0),
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
        response = es.search(index=settings.es_index, body=query)
        return _collect_suggestions(response, q, size)
    except Exception as e:
        logger.warning("Suggest query failed, falling back: %s", e)
        return _prefix_suggest(es, q, size)


def _prefix_suggest(es: Elasticsearch, q: str, size: int) -> list[str]:
    query = {
        "query": {"match_phrase_prefix": {"title": {"query": q, "max_expansions": 10}}},
        "size": max(size * 4, 20),
        "_source": ["title"],
    }
    response = es.search(index=settings.es_index, body=query)
    return _collect_suggestions(response, q, size)


def get_document_by_id(es: Elasticsearch, doc_id: str) -> dict | None:
    try:
        response = es.get(index=settings.es_index, id=doc_id)
        src = response["_source"]
        src.pop("embedding", None)
        return src
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
    size: int,
    from_: int,
    page: int,
) -> dict:
    try:
        from sentence_transformers import SentenceTransformer

        model = SentenceTransformer(settings.semantic_model)
        query_vector = model.encode(q).tolist()
    except ImportError:
        logger.warning("sentence-transformers not available, falling back to keyword search.")
        return search_documents(es, q, chapter, topic, difficulty, concept_type, tags, size, from_, page, semantic=False)

    filters = build_filter_clauses(chapter, topic, difficulty, concept_type, tags)

    knn_body = {
        "knn": {
            "field": "embedding",
            "query_vector": query_vector,
            "k": size,
            "num_candidates": size * 5,
            "filter": filters if filters else None,
            "boost": 0.6,
        },
        "query": {
            "bool": {
                "should": [
                    {
                        "multi_match": {
                            "query": q,
                            "fields": ["title^3", "content^1", "topic^2", "concept_type^2"],
                            "fuzziness": "AUTO",
                            "boost": 0.4,
                        }
                    }
                ],
                "filter": filters if filters else [],
            }
        },
        "aggs": build_facet_aggs(filters),
        "size": size,
        "from": from_,
        "_source": {"excludes": ["embedding"]},
    }

    if not filters:
        knn_body["knn"].pop("filter")
        knn_body["query"]["bool"].pop("filter")

    response = es.search(index=settings.es_index, body=knn_body)
    return _format_results(response, q, page, size)
