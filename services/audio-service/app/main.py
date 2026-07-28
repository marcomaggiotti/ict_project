from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import agent, audio, health

settings = get_settings()

app = FastAPI(
    title="Audio Service AI Agent",
    description="Microservice AI agent that stores and manages audio files.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_allow_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(audio.router)
app.include_router(agent.router)
