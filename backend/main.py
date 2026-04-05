"""
main.py
FastAPI application entry point for the NLP Search Engine backend.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.search import router as search_router
from utils.config import settings

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    On startup:
      1. Connect to Elasticsearch.
      2. If the index is empty AND data/textbook.json exists → index it.
      3. If data/textbook.json is missing → log a warning with instructions.
         (User must run: python ingest.py --pdf ed3book.pdf)
    """
    from pathlib import Path
    from elastic.index import get_es_client, index_documents

    try:
        es = get_es_client()
        logger.info("Connected to Elasticsearch at %s", settings.es_host)

        if not es.indices.exists(index=settings.es_index):
            data_file = Path("data/textbook.json")
            if data_file.exists():
                logger.info("Index missing. Auto-indexing from %s ...", data_file)
                result = index_documents(es, data_path=str(data_file), force_recreate=False)
                logger.info("Auto-index done: %d indexed, %d failed.", result["indexed"], result["failed"])
            else:
                logger.warning(
                    "No index and no dataset found. "
                    "Run:  python ingest.py --pdf path/to/ed3book.pdf  to build and index the dataset."
                )
        else:
            count = es.count(index=settings.es_index)["count"]
            logger.info("Index '%s' ready with %d documents.", settings.es_index, count)

    except ConnectionError as e:
        logger.error("Elasticsearch not reachable: %s", e)
        logger.error("Start ES:  docker run -p 9200:9200 -e discovery.type=single-node "
                     "-e xpack.security.enabled=false elasticsearch:8.13.0")
    yield
    logger.info("Shutting down NLP Search Engine backend.")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="NLP Search Engine API",
    description=(
        "Backend for searching Jurafsky & Manning 'Speech and Language Processing' textbook. "
        "Supports full-text search, fuzzy matching, filtering, autocomplete, and optional semantic search."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
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

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(search_router, prefix="/api")


@app.get("/", tags=["Root"])
async def root():
    return {
        "name":    "NLP Search Engine",
        "version": "1.0.0",
        "docs":    "/docs",
        "health":  "/api/health",
    }
