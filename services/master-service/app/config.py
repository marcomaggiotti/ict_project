import json
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    service_name: str = "master-service"
    api_key: str = ""  # strongly recommended to set this - this service can stop/start containers

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-5"

    cors_allow_origins: str = "*"

    # JSON list of {"name","container_name","base_url"} objects overriding the built-in registry.
    # Leave empty to use the defaults matching the top-level docker-compose.yml service names.
    managed_services_json: str = ""

    def managed_services_override(self) -> list[dict] | None:
        if not self.managed_services_json:
            return None
        return json.loads(self.managed_services_json)


@lru_cache
def get_settings() -> Settings:
    return Settings()
