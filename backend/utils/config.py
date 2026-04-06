from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DATASET_PATH = BACKEND_DIR / "data" / "textbook.json"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    es_host: str = "http://localhost:9200"
    es_index: str = "nlp_textbook"
    frontend_url: str = "http://localhost:5173"
    es_username: str | None = None
    es_password: str | None = None
    es_verify_certs: bool = True
    es_request_timeout: int = 30
    enable_semantic_search: bool = False
    semantic_model: str = "all-MiniLM-L6-v2"
    admin_api_key: str = "changeme"
    dataset_path: str = str(DEFAULT_DATASET_PATH)
    filters_cache_ttl_seconds: int = 300

    # ── LLM / Explain-Match settings ──────────────────────────────────────
    # LLM_PROVIDER: ollama | openai | gemini
    llm_provider: str = "ollama"
    # Model name passed to the provider (e.g. "llama3", "gpt-4o-mini", "gemini-1.5-flash")
    llm_model: str = "llama3"
    llm_timeout_seconds: int = 30
    ollama_base_url: str = "http://localhost:11434"
    openai_api_key: str | None = None
    gemini_api_key: str | None = None


settings = Settings()
