from functools import lru_cache

from utils.config import settings

DEFAULT_QUERY_EMBEDDING_CACHE_SIZE = 256
DEFAULT_EMBEDDING_BATCH_SIZE = 16


@lru_cache(maxsize=1)
def get_embedding_model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(settings.semantic_model)


@lru_cache(maxsize=DEFAULT_QUERY_EMBEDDING_CACHE_SIZE)
def get_query_embedding(text: str) -> tuple[float, ...]:
    normalized = " ".join((text or "").split()).strip()
    if not normalized:
        return tuple()

    vector = get_embedding_model().encode(normalized, normalize_embeddings=True)
    values = vector.tolist() if hasattr(vector, "tolist") else list(vector)
    return tuple(float(value) for value in values)


def encode_documents(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    embeddings = get_embedding_model().encode(
        texts,
        show_progress_bar=True,
        batch_size=DEFAULT_EMBEDDING_BATCH_SIZE,
        normalize_embeddings=True,
    )
    return [embedding.tolist() if hasattr(embedding, "tolist") else list(embedding) for embedding in embeddings]


def warm_embedding_model() -> None:
    get_embedding_model()


def clear_embedding_caches() -> None:
    get_query_embedding.cache_clear()
