import instructor
import socketio  # type: ignore[import-untyped]
from loguru import logger
from openai import AsyncOpenAI

from core.config import OPENAI_API_KEY

async_openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

instructor_client = instructor.client.from_openai(async_openai_client)

logger = logger.bind(name=__name__)

sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    async_mode="asgi",
    # logger=True,
    # engineio_logger=True,
)
active_connections: dict[str, dict] = {}


def register_sio_handlers() -> None:
    logger.info("Registering socket handlers...")
    from . import (
        chat,  # noqa: F401
        claude,  # noqa: F401
        setup,  # noqa: F401
    )

    logger.info("Socket handlers registered successfully")
