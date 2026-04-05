"""
elastic/index.py
Creates and manages the Elasticsearch index with proper mappings.
Run this once before ingesting data.
"""
import logging
from elasticsearch import Elasticsearch

from utils.config import settings
from utils.text_processing import load_json_data, preprocess_document

logger = logging.getLogger(__name__)

# ── Index mapping ─────────────────────────────────────────────────────────────

INDEX_MAPPING = {
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
        "analysis": {
            "analyzer": {
                "nlp_analyzer": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": [
                        "lowercase",
                        "stop",
                        "porter_stem",
                        "asciifolding"
                    ]
                }
            }
        }
    },
    "mappings": {
        "properties": {
            "id":         {"type": "keyword"},
            "title": {
                "type": "text",
                "analyzer": "nlp_analyzer",
                "fields": {
                    "keyword": {"type": "keyword"},          # exact match
                    "suggest": {"type": "search_as_you_type"}  # autocomplete
                }
            },
            "chapter":    {"type": "keyword"},
            "topic":      {"type": "keyword"},
            "difficulty": {"type": "keyword"},
            "concept_type": {"type": "keyword"},
            "content": {
                "type": "text",
                "analyzer": "nlp_analyzer"
            },
            "snippet":    {"type": "text", "analyzer": "nlp_analyzer"},
            "tags":       {"type": "keyword"},
            # Optional: semantic embedding vector (dense_vector)
            # Uncomment when ENABLE_SEMANTIC_SEARCH=true
            # "embedding": {
            #     "type": "dense_vector",
            #     "dims": 384,
            #     "index": True,
            #     "similarity": "cosine"
            # }
        }
    }
}
def get_es_client() -> Elasticsearch:
    client_kwargs = {
        "hosts": [settings.es_host],
        "verify_certs": settings.es_verify_certs,
        "request_timeout": 30,
        "retry_on_timeout": True,
        "max_retries": 3,
    }

    if settings.es_username and settings.es_password:
        client_kwargs["basic_auth"] = (settings.es_username, settings.es_password)

    client = Elasticsearch(**client_kwargs)

    if not client.ping():
        raise ConnectionError(
            "Cannot connect to Elasticsearch. Check if it's running."
        )

    return client


def create_index(es: Elasticsearch, force: bool = False) -> bool:
    """Create the index with mapping. Use force=True to recreate it."""
    index = settings.es_index

    if es.indices.exists(index=index):
        if force:
            logger.warning("Deleting existing index: %s", index)
            es.indices.delete(index=index)
        else:
            logger.info("Index '%s' already exists. Skipping creation.", index)
            return False

    es.indices.create(index=index, body=INDEX_MAPPING)
    logger.info("Index '%s' created successfully.", index)
    return True


def index_documents(
    es: Elasticsearch,
    data_path: str = "data/textbook.json",
    force_recreate: bool = False,
) -> dict:
    """
    Load JSON data, preprocess it, and bulk-index into Elasticsearch.
    Returns dict with indexed/failed counts.
    """
    create_index(es, force=force_recreate)

    raw_docs = load_json_data(data_path)
    docs = [preprocess_document(d) for d in raw_docs]

    # Add semantic embeddings if enabled
    if settings.enable_semantic_search:
        docs = _add_embeddings(docs)

    # Bulk index
    operations = []
    for doc in docs:
        operations.append({"index": {"_index": settings.es_index, "_id": doc["id"]}})
        operations.append(doc)

    response = es.bulk(operations=operations, refresh=True)

    indexed = sum(1 for item in response["items"] if item["index"]["result"] in ("created", "updated"))
    failed  = sum(1 for item in response["items"] if "error" in item["index"])

    if failed:
        logger.error("%d documents failed to index.", failed)

    logger.info("Indexed %d documents, %d failed.", indexed, failed)
    return {"indexed": indexed, "failed": failed}


def _add_embeddings(docs: list[dict]) -> list[dict]:
    """Generate sentence-transformer embeddings and attach to documents."""
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(settings.semantic_model)
        texts = [f"{d['title']}. {d['content']}" for d in docs]
        embeddings = model.encode(texts, show_progress_bar=True, batch_size=16)
        for doc, emb in zip(docs, embeddings):
            doc["embedding"] = emb.tolist()
        logger.info("Embeddings generated for %d documents.", len(docs))
    except ImportError:
        logger.warning("sentence-transformers not installed. Skipping embeddings.")
    return docs
