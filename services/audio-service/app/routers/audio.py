from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from fastapi.responses import Response

from ..auth import require_api_key
from ..config import get_settings
from ..db import _without_payload, build_repository

router = APIRouter(prefix="/audio", tags=["audio"], dependencies=[Depends(require_api_key)])

_repo = None


def get_repo():
    global _repo
    if _repo is None:
        _repo = build_repository(get_settings())
    return _repo


@router.post("")
async def upload_audio(file: UploadFile, tags: str = ""):
    settings = get_settings()
    data = await file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail=f"file exceeds {settings.max_upload_mb}MB limit")
    tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    record = get_repo().create(file.filename, file.content_type or "application/octet-stream", data, tag_list)
    return _without_payload(record)


@router.get("")
def list_audio(limit: int = Query(20, le=200), offset: int = Query(0, ge=0)):
    items, total = get_repo().list(limit, offset)
    return {"items": [_without_payload(i) for i in items], "count": total}


@router.get("/{item_id}")
def get_audio_meta(item_id: str):
    record = get_repo().get(item_id)
    if not record:
        raise HTTPException(status_code=404, detail="not found")
    return _without_payload(record)


@router.get("/{item_id}/download")
def download_audio(item_id: str):
    import base64

    record = get_repo().get(item_id)
    if not record:
        raise HTTPException(status_code=404, detail="not found")
    data = base64.b64decode(record["data_base64"])
    return Response(content=data, media_type=record["content_type"], headers={
        "Content-Disposition": f'attachment; filename="{record["filename"]}"'
    })


@router.delete("/{item_id}")
def delete_audio(item_id: str):
    if not get_repo().delete(item_id):
        raise HTTPException(status_code=404, detail="not found")
    return {"deleted": True}
