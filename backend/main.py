"""
main.py
FastAPI application entry point for the NLP Search Engine backend.
"""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from elastic.client import close_es_client, get_es_client
from elastic.index import index_documents
from routers.ai import router as ai_router
from routers.explain import router as explain_router
from routers.search import router as search_router
from utils.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    On startup:
      1. Connect to Elasticsearch.
      2. Warm the semantic model if enabled.
      3. If the index is missing and a dataset exists, auto-index it.
    """
    try:
        es = get_es_client()
        logger.info("Connected to Elasticsearch at %s", settings.es_host)

        if settings.enable_semantic_search:
            try:
                from elastic.embeddings import warm_embedding_model

                warm_embedding_model()
                logger.info("Semantic model '%s' warmed successfully.", settings.semantic_model)
            except ImportError:
                logger.warning(
                    "Semantic search is enabled but sentence-transformers is unavailable. "
                    "Keyword search will continue to work."
                )

        dataset_path = Path(settings.dataset_path)

        if not es.indices.exists(index=settings.es_index):
            if dataset_path.exists():
                logger.info("Index missing. Auto-indexing from %s ...", dataset_path)
                result = index_documents(es, data_path=str(dataset_path), force_recreate=False)
                logger.info("Auto-index done: %d indexed, %d failed.", result["indexed"], result["failed"])
            else:
                logger.warning(
                    "No index and no dataset found at %s. "
                    "Run: python ingest.py --pdf path/to/ed3book.pdf to build and index the dataset.",
                    dataset_path,
                )
        else:
            count = es.count(index=settings.es_index)["count"]
            logger.info("Index '%s' ready with %d documents.", settings.es_index, count)

    except ConnectionError as exc:
        logger.error("Elasticsearch not reachable: %s", exc)
        logger.error(
            "Start ES: docker run -p 9200:9200 -e discovery.type=single-node "
            "-e xpack.security.enabled=false elasticsearch:8.13.0"
        )

    try:
        yield
    finally:
        close_es_client()
        logger.info("Shutting down NLP Search Engine backend.")


app = FastAPI(
    title="NLP Search Engine API",
    description=(
        "Backend for searching Jurafsky & Manning 'Speech and Language Processing' textbook. "
        "Supports full-text search, fuzzy matching, filtering, autocomplete, and optional semantic search."
    ),
    version="1.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search_router, prefix="/api")
app.include_router(explain_router, prefix="/api")
app.include_router(ai_router, prefix="/api")


@app.get("/", tags=["Root"])
async def root():
    return {
        "name": "NLP Search Engine",
        "version": "1.1.0",
        "docs": "/docs",
        "health": "/api/health",
    }
