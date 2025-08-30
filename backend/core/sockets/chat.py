from typing import Literal

from loguru import logger
from pydantic import Field

from core.sockets.base import BaseActor
from core.sockets.openai_streamer import stream_chunks
from core.sockets.types import Message

from . import sio
from .envelope_type import AliasedBaseModel

logger = logger.bind(name=__name__)

MODEL: Literal["gpt-4o", "gpt-5"] = "gpt-4o"


class AssistantRequest(AliasedBaseModel):
    history: list[Message] = Field(
        description="The conversation history between the user and the assistant so far"
    )


class AssistantActor(BaseActor[AssistantRequest]):
    def __init__(self):
        super().__init__(actor_name="assistant", model=MODEL, stream_chunks=stream_chunks)

    def prepare_messages(self, validated_request: AssistantRequest) -> list[Message]:
        return validated_request.history


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
    assistant_actor = AssistantActor()
    return assistant_actor.handle_stream_start(sid, envelope, AssistantRequest)

    # try:
    #     validated_envelope = Envelope[AssistantRequest].model_validate(envelope)
    #     logger.info(
    #         f"Envelope received in the correct format: {validated_envelope.model_dump_json()}"
    #     )
    #     if validated_envelope.request_id is None:
    #         return AckFail(
    #             ok=False,
    #             error=Error(
    #                 code="invalid_envelope",
    #                 message="The envelope is missing request_id",
    #             ),
    #         ).model_dump_json()
    # except ValidationError:
    #     return AckFail(
    #         ok=False,
    #         error=Error(
    #             code="invalid_envelope",
    #             message="The envelope is not in the correct format",
    #         ),
    #     ).model_dump_json()

    # try:
    #     # validated_data = Data.model_validate(validated_envelope.data)
    #     validated_data = validated_envelope.data
    # except ValidationError:
    #     return AckFail(
    #         ok=False,
    #         error=Error(
    #             code="invalid_data", message="The data is not in the correct format"
    #         ),
    #     ).model_dump_json()
    # except Exception as e:
    #     logger.error(f"Error: {e}")
    #     return AckFail(
    #         ok=False,
    #         error=Error(code="internal_error", message="An unexpected error occurred"),
    #     ).model_dump_json()

    # # if everything is fine, mint a stream_id and send ack
    # stream_id = str(uuid.uuid4())

    # # start streaming task
    # asyncio.create_task(
    #     stream_chunks(
    #         sid,
    #         validated_data.history,
    #         validated_envelope.request_id,
    #         stream_id,
    #         actor="assistant",
    #         model=MODEL,
    #     )
    # )

    # return AckOk(
    #     ok=True,
    #     request_id=validated_envelope.request_id,
    #     stream_id=stream_id,
    # ).model_dump_json()
