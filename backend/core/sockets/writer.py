from typing import Literal

from loguru import logger
from pydantic import Field

from core.sockets.base import BaseActor
from core.sockets.envelope_type import AliasedBaseModel
from core.sockets.streamer import stream_chunks_openai
from core.sockets.types import Message

from . import sio

logger = logger.bind(name=__name__)

MODEL: Literal["gpt-4o", "gpt-5"] = "gpt-4o"


class WriterRequest(AliasedBaseModel):
    history: list[Message] = Field(description="The history of the conversation")


class WriterActor(BaseActor[WriterRequest]):
    def __init__(self):
        super().__init__(
            actor_name="writer",
            model=MODEL,
            stream_chunks=stream_chunks_openai,
        )
        self.system_prompt = "You are a writer. Whatever is given to you, you write a rap about getting over a tragedy,"

    def prepare_messages(self, validated_request: WriterRequest) -> list[Message]:
        return [
            Message(role="system", content=self.system_prompt),
            *validated_request.history,
        ]


@sio.on("c2s.writer.stream.start")
async def request_writer_stream(sid: str, envelope: dict) -> str:
    writer_actor = WriterActor()
    return writer_actor.handle_stream_start(sid, envelope, WriterRequest)
