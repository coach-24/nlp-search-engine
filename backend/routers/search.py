"""
routers/search.py
All search-related API endpoints.
"""
from elasticsearch import Elasticsearch
from fastapi import APIRouter, Depends, HTTPException, Query, Response

from elastic.client import get_es_client
from elastic.index import index_documents
from elastic.search import (
    clear_search_caches,
    get_document_by_id,
    get_filter_options,
    search_documents,
    suggest_completions,
)
from models.schemas import (
    DocumentDetail,
    HealthResponse,
    IndexResponse,
    SearchFacets,
    SearchResponse,
    SuggestResponse,
)
from utils.config import settings
from utils.security import verify_admin_key

router = APIRouter()


def get_es() -> Elasticsearch:
    try:
        return get_es_client()
    except ConnectionError as exc:
        raise HTTPException(
            status_code=503,
            detail="Elasticsearch is unavailable. Start the search backend and try again.",
        ) from exc


@router.get("/search", response_model=SearchResponse, tags=["Search"])
async def search(
    q: str = Query(..., min_length=1, description="Search query"),
    chapter: list[str] | None = Query(None, description="Filter by chapter"),
    topic: list[str] | None = Query(None, description="Filter by topic"),
    difficulty: list[str] | None = Query(None, description="Filter by difficulty"),
    concept_type: list[str] | None = Query(None, description="Filter by concept type"),
    tags: list[str] | None = Query(None, description="Filter by tags"),
    quick_filter: list[str] | None = Query(None, description="Quick filter presets"),
    size: int = Query(10, ge=1, le=50, description="Results per page"),
    page: int = Query(1, ge=1, description="Page number"),
    semantic: bool = Query(False, description="Enable semantic search"),
    sort: str = Query("relevance", pattern="^(relevance|alphabetical)$", description="Sort mode"),
    es: Elasticsearch = Depends(get_es),
):
    from_ = (page - 1) * size
    result = search_documents(
        es,
        q,
        chapter=chapter,
        topic=topic,
        difficulty=difficulty,
        concept_type=concept_type,
        tags=tags,
        quick_filter=quick_filter,
        size=size,
        from_=from_,
        page=page,
        semantic=semantic and settings.enable_semantic_search,
        sort=sort,
    )
    return SearchResponse(**result)


@router.get("/suggest", response_model=SuggestResponse, tags=["Search"])
async def suggest(
    q: str = Query(..., min_length=1, description="Partial query for autocomplete"),
    size: int = Query(6, ge=1, le=15),
    es: Elasticsearch = Depends(get_es),
):
    suggestions = suggest_completions(es, q, size=size)
    return SuggestResponse(query=q, suggestions=suggestions)


@router.get("/document/{doc_id}", response_model=DocumentDetail, tags=["Documents"])
async def get_document(
    doc_id: str,
    es: Elasticsearch = Depends(get_es),
):
    doc = get_document_by_id(es, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found.")
    return DocumentDetail(**doc)


@router.get("/filters", response_model=SearchFacets, tags=["Search"])
async def get_filters(
    response: Response,
    q: str | None = Query(None, description="Optional search query to scope facet counts"),
    chapter: list[str] | None = Query(None, description="Selected chapters"),
    topic: list[str] | None = Query(None, description="Selected topics"),
    difficulty: list[str] | None = Query(None, description="Selected difficulty levels"),
    concept_type: list[str] | None = Query(None, description="Selected concept types"),
    tags: list[str] | None = Query(None, description="Selected tags"),
    quick_filter: list[str] | None = Query(None, description="Quick filter presets"),
    es: Elasticsearch = Depends(get_es),
):
    response.headers["Cache-Control"] = f"public, max-age={settings.filters_cache_ttl_seconds}"
    facet_data = get_filter_options(
        es,
        q=q,
        chapter=chapter,
        topic=topic,
        difficulty=difficulty,
        concept_type=concept_type,
        tags=tags,
        quick_filter=quick_filter,
    )
    return SearchFacets(**facet_data)


@router.post(
    "/index",
    response_model=IndexResponse,
    tags=["Admin"],
    dependencies=[Depends(verify_admin_key)],
)
async def reindex(
    force: bool = Query(False, description="Delete and recreate index before indexing"),
    es: Elasticsearch = Depends(get_es),
):
    result = index_documents(es, data_path=settings.dataset_path, force_recreate=force)
    clear_search_caches()
    return IndexResponse(
        indexed=result["indexed"],
        failed=result["failed"],
        message=(
            f"Successfully indexed {result['indexed']} documents."
            if result["failed"] == 0
            else f"Indexed {result['indexed']}, failed {result['failed']}."
        ),
    )


@router.get("/health", response_model=HealthResponse, tags=["Admin"])
async def health_check():
    try:
        es = get_es_client()
        connected = es.ping()
        exists = es.indices.exists(index=settings.es_index) if connected else False
        count = es.count(index=settings.es_index)["count"] if exists else 0
    except ConnectionError:
        connected = False
        exists = False
        count = 0

    return HealthResponse(
        status="ok" if connected else "degraded",
        es_connected=connected,
        index_exists=bool(exists),
        document_count=count,
    )
