from fastapi import APIRouter, Depends, HTTPException

from ..auth import require_api_key
from ..config import get_settings
from ..docker_manager import DockerManager
from ..registry import load_registry

router = APIRouter(prefix="/services", tags=["services"], dependencies=[Depends(require_api_key)])

_manager: DockerManager | None = None


def get_manager() -> DockerManager:
    global _manager
    if _manager is None:
        _manager = DockerManager()
    return _manager


def _registry():
    return load_registry(get_settings())


@router.get("")
def list_services():
    manager = get_manager()
    registry = _registry()
    return {
        "items": [
            {
                "name": svc.name,
                "container_name": svc.container_name,
                "base_url": svc.base_url,
                "status": manager.status(svc.container_name),
            }
            for svc in registry.values()
        ]
    }


@router.post("/{name}/enable")
def enable_service(name: str):
    registry = _registry()
    if name not in registry:
        raise HTTPException(status_code=404, detail=f"unknown service '{name}'")
    status = get_manager().enable(registry[name].container_name)
    if status == "not_found":
        raise HTTPException(status_code=404, detail=f"container for '{name}' not found - is it deployed?")
    return {"name": name, "status": status}


@router.post("/{name}/disable")
def disable_service(name: str):
    registry = _registry()
    if name not in registry:
        raise HTTPException(status_code=404, detail=f"unknown service '{name}'")
    status = get_manager().disable(registry[name].container_name)
    if status == "not_found":
        raise HTTPException(status_code=404, detail=f"container for '{name}' not found - is it deployed?")
    return {"name": name, "status": status}


@router.post("/{name}/restart")
def restart_service(name: str):
    registry = _registry()
    if name not in registry:
        raise HTTPException(status_code=404, detail=f"unknown service '{name}'")
    status = get_manager().restart(registry[name].container_name)
    if status == "not_found":
        raise HTTPException(status_code=404, detail=f"container for '{name}' not found - is it deployed?")
    return {"name": name, "status": status}
