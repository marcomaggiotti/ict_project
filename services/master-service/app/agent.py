"""Thin LLM agent layer: lets a natural-language instruction enable/disable/restart the
other microservices through Anthropic tool-calling. This is the "master agent".
"""
import json
from typing import Any

from .config import Settings
from .docker_manager import DockerManager
from .registry import load_registry

TOOLS = [
    {
        "name": "list_services",
        "description": "List all managed microservices and whether each is running.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "enable_service",
        "description": "Start (enable) a managed microservice by name.",
        "input_schema": {
            "type": "object",
            "properties": {"name": {"type": "string"}},
            "required": ["name"],
        },
    },
    {
        "name": "disable_service",
        "description": "Stop (disable) a managed microservice by name.",
        "input_schema": {
            "type": "object",
            "properties": {"name": {"type": "string"}},
            "required": ["name"],
        },
    },
    {
        "name": "restart_service",
        "description": "Restart a managed microservice by name.",
        "input_schema": {
            "type": "object",
            "properties": {"name": {"type": "string"}},
            "required": ["name"],
        },
    },
]

SYSTEM_PROMPT = (
    "You are the master-service agent, the orchestrator AI agent for a small platform of "
    "microservices (audio, calendar, image). Use the provided tools to report status and to "
    "enable/disable/restart services as asked. Confirm the exact service name exists via "
    "list_services first if you are unsure. Be concise."
)


def _dispatch(settings: Settings, manager: DockerManager, name: str, tool_input: dict[str, Any]) -> Any:
    registry = load_registry(settings)
    if name == "list_services":
        return {
            svc.name: manager.status(svc.container_name)
            for svc in registry.values()
        }
    if name in ("enable_service", "disable_service", "restart_service"):
        svc_name = tool_input["name"]
        if svc_name not in registry:
            return {"error": f"unknown service '{svc_name}'"}
        container_name = registry[svc_name].container_name
        action = getattr(manager, name.split("_")[0])  # enable/disable/restart
        return {"name": svc_name, "status": action(container_name)}
    return {"error": f"unknown tool {name}"}


def run_agent(settings: Settings, manager: DockerManager, message: str, history: list[dict]) -> tuple[str, list[dict]]:
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
            result = _dispatch(settings, manager, block.name, block.input)
            tool_calls.append({"tool": block.name, "input": block.input, "result": result})
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": json.dumps(result, default=str),
            })
        messages.append({"role": "user", "content": tool_results})

    return "Reached max tool-call iterations without a final answer.", tool_calls
