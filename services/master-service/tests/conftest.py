import pytest

from app.routers import services as services_router


class FakeDockerManager:
    """Stands in for the real Docker Engine API so tests don't need a docker daemon."""

    def __init__(self):
        self._running: set[str] = set()

    def status(self, container_name):
        return "running" if container_name in self._running else "exited"

    def enable(self, container_name):
        self._running.add(container_name)
        return "running"

    def disable(self, container_name):
        self._running.discard(container_name)
        return "exited"

    def restart(self, container_name):
        self._running.add(container_name)
        return "running"


@pytest.fixture(autouse=True)
def fake_docker_manager(monkeypatch):
    fake = FakeDockerManager()
    services_router._manager = fake
    monkeypatch.setattr(services_router, "get_manager", lambda: fake)
    yield fake
    services_router._manager = None
