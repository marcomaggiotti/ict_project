"""Thin LLM agent layer: lets a natural-language instruction drive the service's own
CRUD operations through Anthropic tool-calling, instead of hand-written REST calls.
"""
import json
from typing import Any

from .config import Settings
from .db import ImageRepository, _without_payload

TOOLS = [
    {
        "name": "list_image_files",
        "description": "List stored image files (metadata only, no image bytes).",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "default": 20},
                "offset": {"type": "integer", "default": 0},
            },
        },
    },
    {
        "name": "get_image_file",
        "description": "Get metadata for a single image file by id.",
        "input_schema": {
            "type": "object",
            "properties": {"id": {"type": "string"}},
            "required": ["id"],
        },
    },
    {
        "name": "delete_image_file",
        "description": "Delete an image file by id.",
        "input_schema": {
            "type": "object",
            "properties": {"id": {"type": "string"}},
            "required": ["id"],
        },
    },
]

SYSTEM_PROMPT = (
    "You are the image-service agent, a small AI agent embedded in a microservice that "
    "stores and manages image files. Use the provided tools to answer questions or make "
    "changes the user asks for. Image bytes cannot be uploaded through chat - tell the "
    "user to use POST /image for uploads. Be concise."
)


def _dispatch(repo: ImageRepository, name: str, tool_input: dict[str, Any]) -> Any:
    if name == "list_image_files":
        items, total = repo.list(tool_input.get("limit", 20), tool_input.get("offset", 0))
        return {"items": [_without_payload(i) for i in items], "count": total}
    if name == "get_image_file":
        record = repo.get(tool_input["id"])
        return _without_payload(record) if record else {"error": "not found"}
    if name == "delete_image_file":
        return {"deleted": repo.delete(tool_input["id"])}
    return {"error": f"unknown tool {name}"}


def run_agent(settings: Settings, repo: ImageRepository, message: str, history: list[dict]) -> tuple[str, list[dict]]:
    if not settings.anthropic_api_key:
        return (
            "Agent chat requires ANTHROPIC_API_KEY to be configured on this service.",
            [],
        )

    import anthropic

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    messages = list(history) + [{"role": "user", "content": message}]
    tool_calls: list[dict] = []

    for _ in range(5):
        response = client.messages.create(
            model=settings.anthropic_model,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )
        if response.stop_reason != "tool_use":
            text = "".join(block.text for block in response.content if block.type == "text")
            return text, tool_calls

        messages.append({"role": "assistant", "content": response.content})
        tool_results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            result = _dispatch(repo, block.name, block.input)
            tool_calls.append({"tool": block.name, "input": block.input, "result": result})
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": json.dumps(result, default=str),
            })
        messages.append({"role": "user", "content": tool_results})

    return "Reached max tool-call iterations without a final answer.", tool_calls
