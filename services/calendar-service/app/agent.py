"""Thin LLM agent layer: lets a natural-language instruction drive the service's own
calendar/reservation operations through Anthropic tool-calling.
"""
import json
from typing import Any

from .config import Settings
from .db import EventRepository

TOOLS = [
    {
        "name": "list_events",
        "description": "List calendar events/reservations, optionally within a time range (ISO 8601).",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "default": 20},
                "offset": {"type": "integer", "default": 0},
                "start": {"type": "string", "description": "ISO 8601 range start"},
                "end": {"type": "string", "description": "ISO 8601 range end"},
            },
        },
    },
    {
        "name": "create_event",
        "description": "Create a calendar event or resource reservation. For reservations, set kind='reservation' "
                        "and resource to the room/equipment name; conflicting reservations are rejected.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "description": {"type": "string"},
                "start_time": {"type": "string", "description": "ISO 8601 datetime"},
                "end_time": {"type": "string", "description": "ISO 8601 datetime"},
                "kind": {"type": "string", "enum": ["event", "reservation"], "default": "event"},
                "resource": {"type": "string", "default": ""},
                "attendees": {"type": "array", "items": {"type": "string"}, "default": []},
            },
            "required": ["title", "start_time", "end_time"],
        },
    },
    {
        "name": "cancel_event",
        "description": "Cancel an event/reservation by id (keeps history, marks status cancelled).",
        "input_schema": {
            "type": "object",
            "properties": {"id": {"type": "string"}},
            "required": ["id"],
        },
    },
]

SYSTEM_PROMPT = (
    "You are the calendar-service agent, a small AI agent embedded in a microservice that "
    "manages timeplans, calendar events and resource reservations. Use the provided tools "
    "to answer questions or make changes the user asks for. Before creating a reservation, "
    "check for conflicts by listing events for that resource/time range if unsure. Be concise."
)


def _dispatch(repo: EventRepository, name: str, tool_input: dict[str, Any]) -> Any:
    if name == "list_events":
        items, total = repo.list(
            tool_input.get("limit", 20), tool_input.get("offset", 0),
            tool_input.get("start"), tool_input.get("end"),
        )
        return {"items": items, "count": total}
    if name == "create_event":
        if tool_input.get("kind") == "reservation" and tool_input.get("resource"):
            conflicts = repo.find_conflicts(tool_input["resource"], tool_input["start_time"], tool_input["end_time"])
            if conflicts:
                return {"error": "conflict", "conflicts": conflicts}
        return repo.create(tool_input)
    if name == "cancel_event":
        return {"cancelled": repo.cancel(tool_input["id"])}
    return {"error": f"unknown tool {name}"}


def run_agent(settings: Settings, repo: EventRepository, message: str, history: list[dict]) -> tuple[str, list[dict]]:
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
