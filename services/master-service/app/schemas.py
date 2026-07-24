from pydantic import BaseModel


class ServiceStatus(BaseModel):
    name: str
    container_name: str
    base_url: str
    status: str


class ServiceStatusList(BaseModel):
    items: list[ServiceStatus]


class AgentChatRequest(BaseModel):
    message: str
    history: list[dict] = []


class AgentChatResponse(BaseModel):
    reply: str
    tool_calls: list[dict] = []
