from typing import Optional

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    q: str = Field(..., min_length=1, description="Search query string")
    chapter: Optional[list[str]] = Field(None, description="Filter by one or more chapters")
    topic: Optional[list[str]] = Field(None, description="Filter by one or more topics")
    difficulty: Optional[list[str]] = Field(None, description="Filter by one or more difficulty levels")
    concept_type: Optional[list[str]] = Field(None, description="Filter by one or more concept types")
    tags: Optional[list[str]] = Field(None, description="Filter by one or more tags")
    size: int = Field(10, ge=1, le=50, description="Number of results to return")
    from_: int = Field(0, ge=0, alias="from", description="Pagination offset")

    class Config:
        populate_by_name = True


class FacetBucket(BaseModel):
    value: str
    count: int


class SearchFacets(BaseModel):
    chapters: list[FacetBucket]
    topics: list[FacetBucket]
    difficulties: list[FacetBucket]
    concept_types: list[FacetBucket]
    tags: list[FacetBucket]


class DocumentResult(BaseModel):
    id: str
    title: str
    chapter: str
    topic: str
    difficulty: str
    concept_type: str
    snippet: str
    tags: list[str]
    score: float


class SearchResponse(BaseModel):
    query: str
    total: int
    page: int
    total_pages: int
    results: list[DocumentResult]
    facets: SearchFacets
    took_ms: int


class DocumentDetail(BaseModel):
    id: str
    title: str
    chapter: str
    topic: str
    difficulty: str
    concept_type: str
    content: str
    snippet: str
    tags: list[str]


class SuggestResponse(BaseModel):
    query: str
    suggestions: list[str]


class IndexResponse(BaseModel):
    indexed: int
    failed: int
    message: str


class HealthResponse(BaseModel):
    status: str
    es_connected: bool
    index_exists: bool
    document_count: int
