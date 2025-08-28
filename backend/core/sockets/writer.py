import asyncio
import uuid
from typing import Literal

from loguru import logger
from pydantic import Field, ValidationError

from core.sockets.envelope_type import AckFail, AckOk, AliasedBaseModel, Envelope, Error
from core.sockets.openai_streamer import stream_chunks
from core.sockets.types import Message

from . import sio

logger = logger.bind(name=__name__)

MODEL: Literal["gpt-4o", "gpt-5"] = "gpt-4o"


class WriterRequest(AliasedBaseModel):
    history: list[Message] = Field(description="The history of the conversation")


@sio.on("c2s.writer.stream.start")
async def request_writer_stream(sid: str, envelope: dict) -> str:
    print(f"DEBUG: request_writer_stream handler called with sid={sid}")
    logger.info(f"request_writer_stream {sid}")
    try:
        validated_envelope = Envelope[WriterRequest].model_validate(envelope)
    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        logger.error(f"Validation error details: {e.errors()}")
        return AckFail(
            ok=False,
            error=Error(
                code="invalid_envelope",
                message="The envelope is not in the correct format",
            ),
        ).model_dump_json()
    if validated_envelope.request_id is None:
        return AckFail(
            ok=False,
            error=Error(
                code="invalid_envelope",
                message="The envelope is missing request_id",
            ),
        ).model_dump_json()
    writer_request = WriterRequest.model_validate(validated_envelope.data)
    system_message = Message(
        role="system",
        content="You are a writer. Whatever is given to you, you write a rap about getting over a tragedy,",
    )
    messages_to_load = [system_message] + writer_request.history
    stream_id = str(uuid.uuid4())
    asyncio.create_task(
        stream_chunks(
            sid,
            messages_to_load,
            validated_envelope.request_id,
            stream_id,
            actor="writer",
            model=MODEL,
        )
    )
    return AckOk(
        ok=True, request_id=validated_envelope.request_id, stream_id=stream_id
    ).model_dump_json()
