from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import require_api_key
from ..config import get_settings
from ..db import build_repository
from ..schemas import EventCreate

router = APIRouter(prefix="/events", tags=["events"], dependencies=[Depends(require_api_key)])

_repo = None


def get_repo():
    global _repo
    if _repo is None:
        _repo = build_repository(get_settings())
    return _repo


@router.post("")
def create_event(event: EventCreate):
    repo = get_repo()
    if event.kind == "reservation" and event.resource:
        conflicts = repo.find_conflicts(event.resource, event.start_time.isoformat(), event.end_time.isoformat())
        if conflicts:
            raise HTTPException(status_code=409, detail={"error": "conflict", "conflicts": conflicts})
    return repo.create(event.model_dump(mode="json"))


@router.get("")
def list_events(
    limit: int = Query(20, le=200),
    offset: int = Query(0, ge=0),
    start: str | None = None,
    end: str | None = None,
):
    items, total = get_repo().list(limit, offset, start, end)
    return {"items": items, "count": total}


@router.get("/{item_id}")
def get_event(item_id: str):
    record = get_repo().get(item_id)
    if not record:
        raise HTTPException(status_code=404, detail="not found")
    return record


@router.post("/{item_id}/cancel")
def cancel_event(item_id: str):
    if not get_repo().cancel(item_id):
        raise HTTPException(status_code=404, detail="not found")
    return {"cancelled": True}


@router.delete("/{item_id}")
def delete_event(item_id: str):
    if not get_repo().delete(item_id):
        raise HTTPException(status_code=404, detail="not found")
    return {"deleted": True}
