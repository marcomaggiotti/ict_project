from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_upload_list_delete_roundtrip():
    upload = client.post(
        "/image",
        files={"file": ("test.png", b"\x89PNG\r\n\x1a\nfake-image-bytes", "image/png")},
    )
    assert upload.status_code == 200
    item_id = upload.json()["id"]

    listing = client.get("/image")
    assert listing.status_code == 200
    assert listing.json()["count"] >= 1

    deleted = client.delete(f"/image/{item_id}")
    assert deleted.status_code == 200
    assert deleted.json()["deleted"] is True
