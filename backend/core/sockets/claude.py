import asyncio
import logging
import uuid

from claude_code_sdk import ClaudeCodeOptions, ClaudeSDKClient
from pydantic import Field, ValidationError

from . import sio
from .envelope_type import AckFail, AckOk, AliasedBaseModel, Envelope, Error

logger = logging.getLogger(__name__)


class ClaudeSDKRequest(AliasedBaseModel):
    query: str = Field(description="The app that the user wants to generate")


@sio.on("c2s.claude.stream.start")
async def request_claude_stream(sid: str, envelope: dict) -> str:
    print(f"DEBUG: request_claude_stream handler called with sid={sid}")
    logger.info(f"request_claude_stream {sid}")

    try:
        validated_envelope = Envelope[ClaudeSDKRequest].model_validate(envelope)
        if validated_envelope.request_id is None:
            return AckFail(
                ok=False,
                error=Error(
                    code="invalid_envelope",
                    message="The envelope is invalid",
                ),
            ).model_dump_json()

        validated_claude_sdk_request = ClaudeSDKRequest.model_validate(
            validated_envelope.data
        )

    except ValidationError:
        return AckFail(
            ok=False,
            error=Error(
                code="invalid_envelope",
                message="The envelope is invalid",
            ),
        ).model_dump_json()

    stream_id = str(uuid.uuid4())

    asyncio.create_task(
        stream_claude_code_sdk_chunks(
            sid,
            validated_claude_sdk_request,
            validated_envelope.request_id,
            stream_id,
        )
    )

    return AckOk(
        ok=True,
        request_id=validated_envelope.request_id,
        stream_id=stream_id,
    ).model_dump_json()


async def stream_claude_code_sdk_chunks(
    sid: str,
    validated_claude_sdk_request: ClaudeSDKRequest,
    request_id: str,
    stream_id: str,
    actor="claude",
):
    async with ClaudeSDKClient(
        ClaudeCodeOptions(
            model="claude-3-5-sonnet-20241022",
            cwd="/Users/anudeep/@anudeep/projects/tamagotchi/claude_playground/",
            allowed_tools=["Read", "Write", "Bash", "Grep"],
            disallowed_tools=["WebSearch", "Bash(rm*)"],
            extra_args={
                "verbose": "true",
            },
            
        )
    ) as client:
        await client.query(
            validated_claude_sdk_request.query,
        )

        stream = client.receive_response()

        seq = 0
        async for chunk in stream:
            seq += 1
            if hasattr(chunk, "content"):
                for block in chunk.content:
                    if hasattr(block, "text"):
                        print(f"DEBUG: chunk: {block.text}")
                        envelope_to_send = Envelope(
                            request_id=request_id,
                            stream_id=stream_id,
                            seq=seq,
                            direction="s2c",
                            actor=actor,
                            action="stream",
                            modifier="chunk",
                            data={
                                "delta": block.text,
                            },
                        )
                        await sio.emit(
                            f"s2c.{actor}.stream.chunk",
                            envelope_to_send.model_dump_json(),
                            to=sid,
                        )
            if type(chunk).__name__ == "ResultMessage":
                envelope_to_send = Envelope(
                    request_id=request_id,
                    stream_id=stream_id,
                    seq=seq,
                    direction="s2c",
                    actor=actor,
                    action="stream",
                    modifier="end",
                    data={
                        "finish_reason": "stop",
                    },
                )
                await sio.emit(
                    f"s2c.{actor}.stream.end",
                    envelope_to_send.model_dump_json(),
                    to=sid,
                )
