import asyncio
import logging
import uuid

from pydantic import ValidationError

from core.sockets.types import Message

from . import async_openai_client, sio
from .envelope_type import AckFail, AckOk, Envelope, Error

logger = logging.getLogger(__name__)

MODEL = "gpt-5"


@sio.on("c2s.assistant.stream.start")
async def handle_chat_stream_start(
    sid: str,
    envelope: dict,
) -> str:
    """
    Sequence of events:
    - client sends a c2s.assistant.stream.start event with:
        - a request_id
        - the data that is the input by the user
    - the server acknowledges this and also sends a server minted stream_id
    - server starts streaming chunks to the client via s2c.assistant.stream.chunk
    - client accumulates the chunks on the client side
    - server sends a s2c.assistant.stream.end event
    """
    try:
        validated_envelope = Envelope.model_validate(envelope)
        logger.info(
            f"Envelope received in the correct format: {validated_envelope.model_dump_json()}"
        )
        if validated_envelope.request_id is None:
            return AckFail(
                ok=False,
                error=Error(
                    code="invalid_envelope",
                    message="The envelope is missing request_id",
                ),
            ).model_dump_json()
    except ValidationError:
        return AckFail(
            ok=False,
            error=Error(
                code="invalid_envelope",
                message="The envelope is not in the correct format",
            ),
        ).model_dump_json()

    try:
        # validated_data = Data.model_validate(validated_envelope.data)
        if isinstance(validated_envelope.data, list):
            validated_data = [
                Message.model_validate(msg) for msg in validated_envelope.data
            ]
    except ValidationError:
        return AckFail(
            ok=False,
            error=Error(
                code="invalid_data", message="The data is not in the correct format"
            ),
        ).model_dump_json()
    except Exception as e:
        logger.error(f"Error: {e}")
        return AckFail(
            ok=False,
            error=Error(code="internal_error", message="An unexpected error occurred"),
        ).model_dump_json()

    # if everything is fine, mint a stream_id and send ack
    stream_id = str(uuid.uuid4())

    # start streaming task
    asyncio.create_task(
        stream_chunks(sid, validated_data, validated_envelope.request_id, stream_id)
    )

    return AckOk(
        ok=True,
        request_id=validated_envelope.request_id,
        stream_id=stream_id,
    ).model_dump_json()


async def stream_chunks(sid: str, data: list[Message], request_id: str, stream_id: str):
    stream = await async_openai_client.chat.completions.create(
        model=MODEL,
        messages=[msg.to_openai_message() for msg in data],
        stream=True,
        reasoning_effort="low",
    )

    seq = 0
    async for chunk in stream:
        seq += 1
        if chunk.choices[0].delta.content is not None:
            envelope_to_send = Envelope(
                request_id=request_id,
                stream_id=stream_id,
                seq=seq,
                direction="s2c",
                actor="assistant",
                action="stream",
                modifier="chunk",
                data={
                    "delta": chunk.choices[0].delta.content,
                },
            )
            await sio.emit(
                "s2c.assistant.stream.chunk",
                envelope_to_send.model_dump_json(),
                to=sid,
            )
        elif chunk.choices[0].finish_reason is not None:
            envelope_to_send = Envelope(
                request_id=request_id,
                stream_id=stream_id,
                seq=seq,
                direction="s2c",
                actor="assistant",
                action="stream",
                modifier="end",
                data={
                    "finish_reason": chunk.choices[0].finish_reason,
                },
            )
            await sio.emit(
                "s2c.assistant.stream.end",
                envelope_to_send.model_dump_json(),
                to=sid,
            )
