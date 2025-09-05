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
from core.sockets.file_streamer import stream_chunks_from_file
from core.sockets.writer import WriterActor
from core.teardown import RepoProcessor

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
        self.repo_processor = RepoProcessor(
            data_dir="data", temp_dir=os.getenv("TEMP_DIR")
        )
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
            logger.info(f"Validated envelope: {validated_envelope}")

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
        logger.info(f"Processing chunk: #{seq}")
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
        cwd: Optional[str] = None,
    ) -> None:
        async with ClaudeSDKClient(
            ClaudeCodeOptions(
                model=model,
                cwd=cwd
                if cwd
                else "/Users/anudeep/@anudeep/projects/tamagotchi/claude_playground/",
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
            logger.info("creating a stream to receive response")

            stream = client.receive_response()

            seq = 0
            async for chunk in stream:
                logger.info(f"Received chunk: #{seq}")
                await self.chunk_processor(chunk, request_id, stream_id, sid, seq)

    async def handle_repo_teardown(
        self,
        sid: str,
        repo_url: str,
        request_id: str,
        stream_id: str,
    ) -> None:
        """Handle repository teardown process."""
        temp_dir = None
        try:
            # Step 1: Check cache and process repo URL
            cached_file, temp_dir = self.repo_processor.process_repo_url(repo_url)

            if cached_file:
                # Cached version found, stream it directly
                logger.info(f"Streaming cached teardown: {cached_file}")
                writer_actor = WriterActor()

                # Create a wrapper that passes the file path
                async def file_stream_wrapper(
                    sid, messages, req_id, str_id, actor, model
                ):
                    await stream_chunks_from_file(
                        sid, messages, req_id, str_id, actor, model, str(cached_file)
                    )

                writer_actor.stream_chunks = file_stream_wrapper
                await writer_actor.stream_chunks(
                    sid, [], request_id, stream_id, "writer", "gpt-4o"
                )
            else:
                # Need to generate teardown
                logger.info(f"Generating new teardown for repo in: {temp_dir}")

                # Extract repo info for final file naming
                owner, repo_name = self.repo_processor.extract_repo_info(repo_url)
                repo_hash = self.repo_processor.compute_repo_hash(owner, repo_name)

                # Run Claude SDK teardown
                teardown_prompt = self.load_teardown_prompt()
                logger.info(f"Teardown prompt size: {len(teardown_prompt)}")
                logger.info("Starting Claude SDK process")
                await self.stream_claude_code_sdk_chunks(
                    sid,
                    teardown_prompt,
                    request_id,
                    stream_id,
                    actor="claude",
                    model=self.model,
                    cwd=temp_dir,
                )

                # After Claude SDK completes, save the teardown and stream it
                try:
                    saved_file = self.repo_processor.save_teardown(
                        temp_dir, repo_name, repo_hash
                    )
                    logger.info(f"Saved teardown to: {saved_file}")

                    # Stream the saved file to client
                    writer_actor = WriterActor()

                    async def file_stream_wrapper(
                        sid, messages, req_id, str_id, actor, model
                    ):
                        await stream_chunks_from_file(
                            sid, messages, req_id, str_id, actor, model, str(saved_file)
                        )

                    writer_actor.stream_chunks = file_stream_wrapper
                    await writer_actor.stream_chunks(
                        sid, [], request_id, f"{stream_id}-file", "writer", "gpt-4o"
                    )

                except Exception as save_error:
                    logger.error(f"Failed to save teardown: {save_error}")
                    # Continue without failing completely

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
            if temp_dir:
                self.repo_processor.cleanup_temp_dir(temp_dir)
