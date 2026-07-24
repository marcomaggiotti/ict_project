from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    service_name: str = "audio-service"
    api_key: str = ""  # empty disables auth (dev mode)

    db_backend: Literal["postgres", "cosmos", "sqlite"] = "sqlite"

    # Postgres (works for local docker-compose Postgres AND Render managed Postgres -
    # Render's Postgres is wire-compatible, just point postgres_url at its connection string)
    postgres_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/audio_db"

    # Azure Cosmos DB (NoSQL API)
    cosmos_endpoint: str = ""
    cosmos_key: str = ""
    cosmos_database: str = "ai-agent"
    cosmos_container: str = "audio_files"

    # sqlite fallback for zero-config local dev
    sqlite_path: str = "./audio_service.db"

    max_upload_mb: int = 25

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-5"

    cors_allow_origins: str = "*"


@lru_cache
def get_settings() -> Settings:
    return Settings()
