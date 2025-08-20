import logging
import uuid
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError
from pydantic.alias_generators import to_camel

from . import async_openai_client, sio

logger = logging.getLogger(__name__)

MODEL = "gpt-5"


class AliasedBaseModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    def model_dump_json(self, **kwargs) -> str:
        return super().model_dump_json(by_alias=True, **kwargs)


class ErrorDetails(AliasedBaseModel):
    code: Literal[
        "E_INVALID",
        "E_UNAUTHORIZED",
        "E_FORBIDDEN",
        "E_NOT_FOUND",
        "E_CONFLICT",
        "E_RATE_LIMITED",
        "E_TIMEOUT",
        "E_OVERFLOW",
        "E_UNAVAILABLE",
        "E_INTERNAL",
    ]
    message: str
    details: dict | None = None


class Envelope(AliasedBaseModel):
    # protocol
    v: str = "1"

    # identity & timing
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ts: int = Field(
        default_factory=lambda: int(datetime.now(timezone.utc).timestamp() * 1000)
    )

    # correlation
    request_id: str | None = None  # requestId in TS
    stream_id: str | None = None  # streamId in TS
    seq: int | None = None  # per-stream sequence, starting at 1

    # control
    direction: Literal["c2s", "s2c"]
    domain: Literal["chat"]
    action: Literal["stream"]
    modifier: Literal["start", "chunk", "end"]  # Remove | None, make it required

    # payload
    data: dict

    # errors
    error: ErrorDetails | None = None


class Data(AliasedBaseModel):
    input: str


class AckOk(AliasedBaseModel):
    ok: bool = True
    request_id: str
    stream_id: str


class Error(AliasedBaseModel):
    code: str
    message: str


class AckFail(AliasedBaseModel):
    ok: bool = False
    error: Error


@sio.on("c2s.chat.stream.start")
async def handle_chat_stream_start(
    sid: str,
    envelope: dict,
) -> str:
    """
    Sequence of events:
    - client sends a c2s.chat.stream.start event with:
        - a request_id
        - the data that is the input by the user
    - the server acknowledges this and also sends a server minted stream_id
    - server starts streaming chunks to the client via s2c.chat.stream.chunk
    - client accumulates the chunks on the client side
    - server sends a s2c.chat.stream.end event
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

    # start streaming task
    # asyncio.create_task(stream_chat(validated_envelope))

    # if everything is fine, mint a stream_id and send ack
    stream_id = str(uuid.uuid4())

    return AckOk(
        ok=True,
        request_id=validated_envelope.request_id,
        stream_id=stream_id,
    ).model_dump_json()


async def stream_chunks(sid: str, data: Data):
    stream = await async_openai_client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "user",
                "content": data.input,
            }
        ],
        stream=True,
        reasoning_effort="low",
    )

    async for chunk in stream:
        if chunk.choices[0].delta.content is not None:
            pass
        elif chunk.choices[0].finish_reason is not None:
            pass
        else:
            pass
