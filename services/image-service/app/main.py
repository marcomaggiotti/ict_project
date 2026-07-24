from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import agent, image, health

settings = get_settings()

app = FastAPI(
    title="Image Service AI Agent",
    description="Microservice AI agent that stores and manages image files.",
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
app.include_router(image.router)
app.include_router(agent.router)
