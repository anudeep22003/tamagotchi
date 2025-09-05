import asyncio
import os
from typing import Any

from loguru import logger

from core.sockets.types import Message

from . import sio
from .envelope_type import Actor, Envelope

logger = logger.bind(name=__name__)


async def stream_chunks_from_file(
    sid: str,
    data: list[Message],
    request_id: str,
    stream_id: str,
    actor: Actor,
    model: Any,  # Not used for file streaming but maintains signature compatibility
    file_path: str,
) -> None:
    """Stream chunks from a markdown file to maintain compatibility with writer actor signature."""
    
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        envelope_to_send = Envelope(
            request_id=request_id,
            stream_id=stream_id,
            seq=1,
            direction="s2c",
            actor=actor,
            action="stream",
            modifier="end",
            data={
                "finish_reason": "error",
                "error": f"File not found: {file_path}",
            },
        )
        await sio.emit(
            f"s2c.{actor}.stream.end",
            envelope_to_send.model_dump_json(),
            to=sid,
        )
        return

    try:
        with open(file_path, "r", encoding="utf-8") as file:
            content = file.read()
        
        # Split content into chunks of reasonable size for streaming
        chunk_size = 1000  # Characters per chunk
        chunks = [content[i:i + chunk_size] for i in range(0, len(content), chunk_size)]
        
        seq = 0
        for chunk in chunks:
            seq += 1
            envelope_to_send = Envelope(
                request_id=request_id,
                stream_id=stream_id,
                seq=seq,
                direction="s2c",
                actor=actor,
                action="stream",
                modifier="chunk",
                data={
                    "delta": chunk,
                },
            )
            await sio.emit(
                f"s2c.{actor}.stream.chunk",
                envelope_to_send.model_dump_json(),
                to=sid,
            )
            # Small delay to prevent overwhelming the client
            await asyncio.sleep(0.01)
        
        # Send end signal
        seq += 1
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
        
        logger.info(f"Successfully streamed file {file_path} in {len(chunks)} chunks")
        
    except Exception as e:
        logger.error(f"Error streaming file {file_path}: {str(e)}")
        envelope_to_send = Envelope(
            request_id=request_id,
            stream_id=stream_id,
            seq=seq + 1 if 'seq' in locals() else 1,
            direction="s2c",
            actor=actor,
            action="stream",
            modifier="end",
            data={
                "finish_reason": "error",
                "error": str(e),
            },
        )
        await sio.emit(
            f"s2c.{actor}.stream.end",
            envelope_to_send.model_dump_json(),
            to=sid,
        )