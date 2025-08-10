import logging
import time

from pydantic import ValidationError

from . import client, sio
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


@sio.event
async def request_chat_stream(sid: str, messages: dict) -> None:
    logger.info(f"request_chat_stream {sid}")
    try:
        validated_chat_request = ChatRequest.model_validate(messages)
        messages_to_load = [
            msg.to_openai_message() for msg in validated_chat_request.messages
        ]
    except ValidationError as e:
        print(f"Error: {e}")
        return
    try:
        stream = await client.chat.completions.create(
            model=MODEL,
            messages=messages_to_load,
            stream=True,
            temperature=0.7,
            reasoning_effort="high",
        )

        async for chunk in stream:
            await emit_chat_completion_chunk(
                sio, sid, chunk, "receive_assistant_message"
            )
    except Exception as e:
        print(f"Error: {e}")
        error_response = StreamingResponse(
            id=f"chatcmpl-{int(time.time())}",
            created=int(time.time()),
            model=MODEL,
            choices=[
                Choice(
                    index=0,
                    delta=ChoiceDelta(content=f"Error: {str(e)}"),
                    finish_reason="error",
                )
            ],
        )
        await sio.emit(
            "chat_stream",
            {
                "data": error_response.model_dump_json(by_alias=True),
            },
            to=sid,
        )
