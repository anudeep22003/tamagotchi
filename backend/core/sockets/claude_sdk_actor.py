import asyncio
import json
import os
import uuid
from pathlib import Path
from typing import Optional

import yaml  # type: ignore[import-untyped]
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
from core.teardown.git_repo_processor import RepoProcessor

from . import sio

logger = logger.bind(name=__name__)


class ClaudeSDKRequest(AliasedBaseModel):
    query: str = Field(description="The query for Claude SDK")
    repo_url: Optional[str] = Field(
        default=None, description="GitHub repository URL for teardown"
    )


class ClaudeSDKActor:
    def __init__(self):
        self.actor_name = "claude"
        self.model = os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-20241022")
        self.repo_processor = RepoProcessor(data_dir="data")
        self.operation_timeout = int(
            os.getenv("OPERATION_TIMEOUT", "3600")
        )  # 1 hour default

    def load_teardown_prompt(self) -> str:
        """Load teardown prompt from YAML configuration."""
        prompt_file = Path(__file__).parent.parent / "prompts" / "teardown.yaml"
        try:
            with open(prompt_file, "r", encoding="utf-8") as f:
                config = yaml.safe_load(f)
                return config["teardown_prompt"]
        except Exception as e:
            logger.error(f"Failed to load teardown prompt: {e}")
            return "Please analyze this repository and create a comprehensive teardown."

    def prepare_messages(self, validated_request: ClaudeSDKRequest) -> str:
        if validated_request.repo_url:
            return self.load_teardown_prompt()
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

        # Check if this is a repo teardown request
        if validated_envelope.data.repo_url:
            asyncio.create_task(
                self.handle_repo_teardown(
                    sid,
                    validated_envelope.data.repo_url,
                    validated_envelope.request_id,
                    stream_id,
                )
            )
        else:
            raise ValueError("Repo URL is required")

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
        cwd: Path,
        actor="claude",
        model: str = "claude-3-5-sonnet-20241022",
    ) -> None:
        async with ClaudeSDKClient(
            ClaudeCodeOptions(
                model=model,
                cwd=cwd,
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
                logger.info(f"Chunk: {chunk}")
                try:
                    await self.chunk_processor(chunk, request_id, stream_id, sid, seq)
                except Exception as e:
                    logger.error(f"Error in chunk processor: {e}")

    async def close_claude_stream(
        self, sid: str, request_id: str, stream_id: str
    ) -> None:
        logger.info(f"Closing Claude stream: {stream_id}")
        envelope_to_send = Envelope(
            request_id=request_id,
            stream_id=stream_id,
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

    async def stream_cached_analysis(
        self, sid: str, request_id: str, stream_id: str, analysis_file_path: Path
    ) -> None:
        """Stream the cached analysis file in the temp directory."""
        logger.info(f"Streaming cached analysis file: {analysis_file_path}")
        stream_id = str(uuid.uuid4())
        # send a stream start
        envelope_to_send = Envelope(
            request_id=request_id,
            stream_id=stream_id,
            direction="s2c",
            actor="writer",
            action="stream",
            modifier="start",
            data={
                "delta": "start",
            },
        )
        await sio.emit(
            "s2c.writer.stream.start",
            envelope_to_send.model_dump_json(),
            to=sid,
            callback=lambda x: logger.info(f"Stream start sent, received ack: {x}"),
        )
        seq = 0
        with open(analysis_file_path, "r") as f:
            content = f.read()
        for chunk in content:
            envelope_to_send = Envelope(
                request_id=request_id,
                stream_id=stream_id,
                seq=seq,
                direction="s2c",
                actor="writer",
                action="stream",
                modifier="chunk",
                data={
                    "delta": chunk,
                },
            )
            await sio.emit(
                "s2c.writer.stream.chunk",
                envelope_to_send.model_dump_json(),
                to=sid,
            )
            seq += 1
            await asyncio.sleep(0.001)
        envelope_to_send = Envelope(
            request_id=request_id,
            stream_id=stream_id,
            seq=1,
            direction="s2c",
            actor="writer",
            action="stream",
            modifier="end",
            data={
                "finish_reason": "stop",
            },
        )
        await sio.emit(
            "s2c.writer.stream.end",
            envelope_to_send.model_dump_json(),
            to=sid,
        )

    async def handle_repo_teardown(
        self,
        sid: str,
        repo_url: str,
        request_id: str,
        stream_id: str,
    ) -> None:
        """Handle repository teardown process."""
        repo_directory = None
        try:
            result = self.repo_processor.process_repo_url(repo_url)
            if result.cached_file_path:
                await self.close_claude_stream(sid, request_id, stream_id)
                await self.stream_cached_analysis(
                    sid, request_id, stream_id, result.cached_file_path
                )
                return
            else:
                repo_directory = result.temp_dir.absolute()

            # Run Claude SDK teardown
            teardown_prompt = self.load_teardown_prompt()
            await self.stream_claude_code_sdk_chunks(
                sid,
                teardown_prompt,
                request_id,
                stream_id,
                cwd=repo_directory,
                actor="claude",
                model=self.model,
            )
            self.repo_processor.save_teardown(repo_directory, result.metadata)

        except Exception as e:
            logger.error(f"Error in repo teardown: {e}")
            # Send error to client
            envelope_to_send = Envelope(
                request_id=request_id,
                stream_id=stream_id,
                seq=1,
                direction="s2c",
                actor="claude",
                action="stream",
                modifier="end",
                data={
                    "finish_reason": "error",
                    "error": str(e),
                },
            )
            await sio.emit(
                "s2c.claude.stream.end",
                envelope_to_send.model_dump_json(),
                to=sid,
            )
        finally:
            # Cleanup temp directory
            if repo_directory:
                self.repo_processor.cleanup_temp_dir(repo_directory)
