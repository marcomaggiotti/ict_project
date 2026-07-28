from pydantic import BaseModel

from .config import Settings


class ManagedService(BaseModel):
    name: str
    container_name: str
    base_url: str


# Matches the service names/container names defined in the top-level docker-compose.yml.
DEFAULT_SERVICES: list[ManagedService] = [
    ManagedService(name="audio-service", container_name="ai-agent-audio-service", base_url="http://audio-service:8000"),
    ManagedService(name="calendar-service", container_name="ai-agent-calendar-service", base_url="http://calendar-service:8000"),
    ManagedService(name="image-service", container_name="ai-agent-image-service", base_url="http://image-service:8000"),
]


def load_registry(settings: Settings) -> dict[str, ManagedService]:
    override = settings.managed_services_override()
    services = [ManagedService(**s) for s in override] if override else DEFAULT_SERVICES
    return {s.name: s for s in services}
