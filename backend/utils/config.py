from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    es_host: str = "http://localhost:9200"
    es_index: str = "nlp_textbook"
    frontend_url: str = "http://localhost:5173"
    es_username: str | None = None
    es_password: str | None = None
    es_verify_certs: bool = True
    enable_semantic_search: bool = False
    semantic_model: str = "all-MiniLM-L6-v2"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
