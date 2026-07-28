from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_create_list_cancel_roundtrip():
    created = client.post("/events", json={
        "title": "Team sync",
        "start_time": "2026-08-01T10:00:00Z",
        "end_time": "2026-08-01T10:30:00Z",
    })
    assert created.status_code == 200
    event_id = created.json()["id"]

    listing = client.get("/events")
    assert listing.status_code == 200
    assert listing.json()["count"] >= 1

    cancelled = client.post(f"/events/{event_id}/cancel")
    assert cancelled.status_code == 200
    assert cancelled.json()["cancelled"] is True


def test_reservation_conflict_is_rejected():
    first = client.post("/events", json={
        "title": "Room booking",
        "kind": "reservation",
        "resource": "conference-room-a",
        "start_time": "2026-08-02T09:00:00Z",
        "end_time": "2026-08-02T10:00:00Z",
    })
    assert first.status_code == 200

    conflicting = client.post("/events", json={
        "title": "Overlapping booking",
        "kind": "reservation",
        "resource": "conference-room-a",
        "start_time": "2026-08-02T09:30:00Z",
        "end_time": "2026-08-02T10:30:00Z",
    })
    assert conflicting.status_code == 409
