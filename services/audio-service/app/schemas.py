from datetime import datetime

from pydantic import BaseModel


class AudioMeta(BaseModel):
    id: str
    filename: str
    content_type: str
    size_bytes: int
    created_at: datetime
    tags: list[str] = []


class AudioMetaList(BaseModel):
    items: list[AudioMeta]
    count: int


class AgentChatRequest(BaseModel):
    message: str
    history: list[dict] = []


class AgentChatResponse(BaseModel):
    reply: str
    tool_calls: list[dict] = []
