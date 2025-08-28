import logging
import os
from typing import AsyncGenerator

import socketio  # type: ignore[import-untyped]
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.concurrency import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware

from core.api.routers import router as v1_router
from core.logging import setup_logging
from core.sockets import register_sio_handlers, sio

## SETTINGS
REQUIRED_ENV_VARS = [
    "OPENAI_API_KEY",
]


## FUNCTIONS
def check_env_vars() -> bool:
    load_dotenv(override=True, dotenv_path=".env.local")
    for var in REQUIRED_ENV_VARS:
        if not os.getenv(var):
            return False
    return True


@asynccontextmanager
async def lifecycle_manager(self) -> AsyncGenerator[None, None]:
    # Setup logging first
    setup_logging(level="DEBUG")
    logger = logging.getLogger(__name__)

    logger.debug("Starting FastAPI app")
    logger.debug("Loading Env Variables")
    if not check_env_vars():
        raise ValueError("Missing required environment variables")

    # register socketio handlers
    register_sio_handlers()

    yield
    logger.info("Shutting down FastAPI app")


fastapi_app = FastAPI(lifespan=lifecycle_manager)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


fastapi_app.include_router(v1_router)


@fastapi_app.get("/")
async def index() -> dict[str, str]:
    return {"message": "Hello World"}


app = socketio.ASGIApp(sio, fastapi_app)


@fastapi_app.get("/health")
def health_check() -> dict[str, str]:
    """Health check endpoint for extension to test server connectivity."""
    return {"status": "ok", "message": "Server is running"}
