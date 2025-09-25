from loguru import logger

from core.sockets.claude_sdk_actor import ClaudeSDKActor

from . import sio

logger = logger.bind(name=__name__)


@sio.on("c2s.claude.stream.start")
async def request_claude_stream(sid: str, envelope: dict) -> str:
    claude_sdk_actor = ClaudeSDKActor(test=True)
    return claude_sdk_actor.handle_stream_start(sid, envelope)
