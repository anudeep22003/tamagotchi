import logging
import time

from pydantic import ValidationError

from . import async_openai_client, sio
from .emitters import emit_chat_completion_chunk
from .types import ChatRequest, Choice, ChoiceDelta, StreamingResponse

logger = logging.getLogger(__name__)

active_connections: dict[str, dict] = {}


MODEL = "gpt-5"


@sio.event
async def connect(sid: str, environ: dict) -> None:
    print("connection established")
    print(f"# of active connections: {len(active_connections)}")
    active_connections[sid] = environ


@sio.event
async def hello(sid: str, message: str) -> None:
    print(f"{sid}, {message}")
    await sio.emit(
        "hello",
        "number of active connections: " + str(len(active_connections)),
        to=sid,
    )


@sio.event
async def disconnect(sid: str) -> None:
    print(f"connection closed {sid}")
    del active_connections[sid]