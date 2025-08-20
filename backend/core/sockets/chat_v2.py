import logging
import uuid

from pydantic import BaseModel, ConfigDict, ValidationError
from pydantic.alias_generators import to_camel

from . import sio

logger = logging.getLogger(__name__)


class AliasedBaseModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Envelope(AliasedBaseModel):
    # protocol
    v: str = "1"

    id: str
    ts: str
    data: dict


class Data(AliasedBaseModel):
    input: str


class C2SChatStreamStart(AliasedBaseModel):
    request_id: str
    data: Data


class S2CChatStreamStartAck(AliasedBaseModel):
    ok: bool
    request_id: str | None = None
    stream_id: str | None = None


@sio.on("c2s.chat.stream.start")
async def handle_chat_stream_start(sid: str, data: dict) -> str:
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
        validated_stream_start_request = C2SChatStreamStart.model_validate(data)
        logger.info(
            f"ChatStreamStart received in the correct format: {validated_stream_start_request}"
        )
    except ValidationError as e:
        print(f"Error: {e}")
        return S2CChatStreamStartAck(
            ok=False,
        ).model_dump_json(by_alias=True)

    # if everything is fine, mint a stream_id and send ack
    stream_id = str(uuid.uuid4())

    return S2CChatStreamStartAck(
        ok=True,
        request_id=validated_stream_start_request.request_id,
        stream_id=stream_id,
    ).model_dump_json(by_alias=True)
