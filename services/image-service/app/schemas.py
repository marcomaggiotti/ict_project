from datetime import datetime

from pydantic import BaseModel


class ImageMeta(BaseModel):
    id: str
    filename: str
    content_type: str
    size_bytes: int
    created_at: datetime
    tags: list[str] = []


class ImageMetaList(BaseModel):
    items: list[ImageMeta]
    count: int


class AgentChatRequest(BaseModel):
    message: str
    history: list[dict] = []


class AgentChatResponse(BaseModel):
    reply: str
    tool_calls: list[dict] = []
