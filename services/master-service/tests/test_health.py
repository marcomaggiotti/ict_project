from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_list_enable_disable_service():
    listing = client.get("/services")
    assert listing.status_code == 200
    names = [item["name"] for item in listing.json()["items"]]
    assert "audio-service" in names

    enabled = client.post("/services/audio-service/enable")
    assert enabled.status_code == 200
    assert enabled.json()["status"] == "running"

    disabled = client.post("/services/audio-service/disable")
    assert disabled.status_code == 200
    assert disabled.json()["status"] == "exited"


def test_unknown_service_is_404():
    response = client.post("/services/does-not-exist/enable")
    assert response.status_code == 404
