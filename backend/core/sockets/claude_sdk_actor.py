import asyncio
import json
import uuid

from claude_code_sdk import (
    ClaudeCodeOptions,
    ClaudeSDKClient,
    ContentBlock,
    TextBlock,
    ToolUseBlock,
)
from claude_code_sdk import Message as ClaudeSDKMessage
from loguru import logger
from pydantic import Field, ValidationError

from core.sockets.envelope_type import AckFail, AckOk, AliasedBaseModel, Envelope, Error

from . import sio

logger = logger.bind(name=__name__)


class ClaudeSDKRequest(AliasedBaseModel):
    query: str = Field(description="The app that the user wants to generate")


class ClaudeSDKActor:
    def __init__(self):
        self.actor_name = "claude"
        self.model = "claude-3-5-sonnet-20241022"

    def prepare_messages(self, validated_request: ClaudeSDKRequest) -> str:
        return validated_request.query

    def handle_stream_start(self, sid: str, envelope: dict) -> str:
        try:
            validated_envelope = Envelope[ClaudeSDKRequest].model_validate(envelope)  # type: ignore

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

        stream_id = str(uuid.uuid4())

        user_query = self.prepare_messages(validated_envelope.data)

        asyncio.create_task(
            self.stream_claude_code_sdk_chunks(
                sid,
                user_query,
                validated_envelope.request_id,
                stream_id,
                actor=self.actor_name,
                model=self.model,
            )
        )

        return AckOk(
            ok=True,
            request_id=validated_envelope.request_id,
            stream_id=stream_id,
        ).model_dump_json()

    async def chunk_processor(
        self,
        chunk: ClaudeSDKMessage,
        request_id: str,
        stream_id: str,
        sid: str,
        seq: int,
    ) -> None:
        if hasattr(chunk, "content"):
            for block in chunk.content:
                seq += 1
                if isinstance(block, ContentBlock):
                    if isinstance(block, TextBlock):
                        envelope_to_send = Envelope(
                            request_id=request_id,
                            stream_id=stream_id,
                            seq=seq,
                            direction="s2c",
                            actor="claude",
                            action="stream",
                            modifier="chunk",
                            data={
                                "delta": block.text,
                            },
                        )
                        await sio.emit(
                            "s2c.claude.stream.chunk",
                            envelope_to_send.model_dump_json(),
                            to=sid,
                        )
                if isinstance(block, ToolUseBlock):
                    envelope_to_send = Envelope(
                        request_id=request_id,
                        stream_id=stream_id,
                        seq=seq,
                        direction="s2c",
                        actor="claude",
                        action="stream",
                        modifier="chunk",
                        data={
                            "delta": "\n"
                            + "```json"
                            + "\n"
                            + json.dumps(block.input)
                            + "\n"
                            + "```"
                            + "\n",
                        },
                    )
                    await sio.emit(
                        "s2c.claude.stream.chunk",
                        envelope_to_send.model_dump_json(),
                        to=sid,
                    )
        if type(chunk).__name__ == "ResultMessage":
            envelope_to_send = Envelope(
                request_id=request_id,
                stream_id=stream_id,
                seq=seq,
                direction="s2c",
                actor="claude",
                action="stream",
                modifier="end",
                data={
                    "finish_reason": "stop",
                },
            )
            await sio.emit(
                "s2c.claude.stream.end",
                envelope_to_send.model_dump_json(),
                to=sid,
            )

    async def stream_claude_code_sdk_chunks(
        self,
        sid: str,
        user_query: str,
        request_id: str,
        stream_id: str,
        actor="claude",
        model: str = "claude-3-5-sonnet-20241022",
    ) -> None:
        async with ClaudeSDKClient(
            ClaudeCodeOptions(
                model=model,
                cwd="/Users/anudeep/@anudeep/projects/tamagotchi/claude_playground/",
                allowed_tools=["Read", "Write", "Bash", "Grep"],
                disallowed_tools=["WebSearch", "Bash(rm -r*)"],
                permission_mode="acceptEdits",
                extra_args={
                    "verbose": "true",
                },
            )
        ) as client:
            await client.query(
                user_query,
            )

            stream = client.receive_response()

            seq = 0
            async for chunk in stream:
                await self.chunk_processor(chunk, request_id, stream_id, sid, seq)
