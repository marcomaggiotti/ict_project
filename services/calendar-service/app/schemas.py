from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class EventCreate(BaseModel):
    title: str
    description: str = ""
    start_time: datetime
    end_time: datetime
    kind: Literal["event", "reservation"] = "event"
    resource: str = ""  # e.g. room/equipment name, only meaningful for reservations
    attendees: list[str] = Field(default_factory=list)


class Event(EventCreate):
    id: str
    status: Literal["confirmed", "cancelled"] = "confirmed"
    created_at: datetime


class EventList(BaseModel):
    items: list[Event]
    count: int


class AgentChatRequest(BaseModel):
    message: str
    history: list[dict] = []


class AgentChatResponse(BaseModel):
    reply: str
    tool_calls: list[dict] = []
