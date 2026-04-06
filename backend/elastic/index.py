"""
elastic/index.py
Creates and manages the Elasticsearch index with modern ES 8.x APIs.
"""
from copy import deepcopy
import logging

from elasticsearch import Elasticsearch

from elastic.client import get_es_client
from utils.config import settings
from utils.text_processing import load_json_data, preprocess_document

logger = logging.getLogger(__name__)

SYNONYM_RULES = [
    "transformer, attention model, attention models",
    "ner, named entity recognition",
    "lm, language model, language models, language modelling",
    "llm, large language model, large language models",
    "pos, part of speech, part-of-speech, part-of-speech tagging",
    "qa, question answering",
    "ir, information retrieval",
]

BASE_INDEX_MAPPING = {
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
        "analysis": {
            "filter": {
                "english_stop": {
                    "type": "stop",
                    "stopwords": "_english_",
                },
                "english_stemmer": {
                    "type": "stemmer",
                    "language": "english",
                },
                "nlp_synonyms": {
                    "type": "synonym_graph",
                    "synonyms": SYNONYM_RULES,
                },
                "trigram_shingle": {
                    "type": "shingle",
                    "min_shingle_size": 2,
                    "max_shingle_size": 3,
                },
            },
            "analyzer": {
                "nlp_analyzer": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": [
                        "lowercase",
                        "asciifolding",
                        "nlp_synonyms",
                        "english_stop",
                        "english_stemmer",
                    ],
                },
                "trigram_analyzer": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": [
                        "lowercase",
                        "asciifolding",
                        "trigram_shingle",
                    ],
                },
                "suggest_query_analyzer": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": [
                        "lowercase",
                        "asciifolding",
                    ],
                },
            },
        },
    },
    "mappings": {
        "properties": {
            "id": {"type": "keyword"},
            "title": {
                "type": "text",
                "analyzer": "nlp_analyzer",
                "fields": {
                    "keyword": {"type": "keyword"},
                    "suggest": {"type": "search_as_you_type"},
                    "trigram": {
                        "type": "text",
                        "analyzer": "trigram_analyzer",
                        "search_analyzer": "suggest_query_analyzer",
                    },
                },
            },
            "chapter": {"type": "keyword"},
            "topic": {"type": "keyword"},
            "difficulty": {"type": "keyword"},
            "concept_type": {"type": "keyword"},
            "content": {
                "type": "text",
                "analyzer": "nlp_analyzer",
                "fields": {
                    "trigram": {
                        "type": "text",
                        "analyzer": "trigram_analyzer",
                        "search_analyzer": "suggest_query_analyzer",
                    }
                },
            },
            "snippet": {
                "type": "text",
                "analyzer": "nlp_analyzer",
            },
            "tags": {"type": "keyword"},
        }
    },
}


def get_index_mapping() -> dict:
    mapping = deepcopy(BASE_INDEX_MAPPING)

    if settings.enable_semantic_search:
        mapping["mappings"]["properties"]["embedding"] = {
            "type": "dense_vector",
            "dims": 384,
            "index": True,
            "similarity": "cosine",
        }

    return mapping


def create_index(es: Elasticsearch, force: bool = False) -> bool:
    """Create the index with ES 8.x keyword arguments. Use force=True to recreate it."""
    index = settings.es_index

    if es.indices.exists(index=index):
        if force:
            logger.warning("Deleting existing index: %s", index)
            es.indices.delete(index=index, ignore_unavailable=True)
        else:
            logger.info("Index '%s' already exists. Skipping creation.", index)
            return False

    index_mapping = get_index_mapping()
    es.indices.create(
        index=index,
        settings=index_mapping["settings"],
        mappings=index_mapping["mappings"],
    )
    logger.info("Index '%s' created successfully.", index)
    return True


def index_documents(
    es: Elasticsearch,
    data_path: str | None = None,
    force_recreate: bool = False,
) -> dict:
    """
    Load JSON data, preprocess it, and bulk-index into Elasticsearch.
    Returns dict with indexed/failed counts.
    """
    create_index(es, force=force_recreate)

    resolved_data_path = data_path or settings.dataset_path
    raw_docs = load_json_data(resolved_data_path)
    docs = [preprocess_document(document) for document in raw_docs]

    if settings.enable_semantic_search:
        docs = _add_embeddings(docs)

    operations = []
    for doc in docs:
        operations.append({"index": {"_index": settings.es_index, "_id": doc["id"]}})
        operations.append(doc)

    response = es.bulk(operations=operations, refresh="wait_for")

    indexed = sum(
        1
        for item in response["items"]
        if item["index"]["result"] in ("created", "updated")
    )
    failed = sum(1 for item in response["items"] if "error" in item["index"])

    if failed:
        logger.error("%d documents failed to index.", failed)

    logger.info("Indexed %d documents, %d failed.", indexed, failed)
    return {"indexed": indexed, "failed": failed}


def _add_embeddings(docs: list[dict]) -> list[dict]:
    """Generate sentence-transformer embeddings once and attach them to documents."""
    try:
        from elastic.embeddings import encode_documents
    except ImportError:
        logger.warning("sentence-transformers not installed. Skipping embeddings.")
        return docs

    texts = [f"{doc['title']}. {doc['content']}" for doc in docs]
    embeddings = encode_documents(texts)

    for doc, embedding in zip(docs, embeddings):
        doc["embedding"] = embedding

    logger.info("Embeddings generated for %d documents.", len(docs))
    return docs
