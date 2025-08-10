from openai.types.chat import ChatCompletionChunk
from socketio import AsyncServer  # type: ignore[import-untyped]

from .types import Choice, ChoiceDelta, StreamingResponse


async def emit_chat_completion_chunk(
    sio: AsyncServer,
    sid: str,
    chunk: ChatCompletionChunk,
    event_string: str,
) -> None:
    """Emit a streaming chat chunk to a specific client."""
    if chunk.choices[0].delta.content is not None:
        response = StreamingResponse(
            id=chunk.id,
            created=chunk.created,
            model=chunk.model,
            choices=[
                Choice(
                    index=0,
                    delta=ChoiceDelta(
                        content=chunk.choices[0].delta.content,
                        role=chunk.choices[0].delta.role,
                    ),
                    finish_reason=None,
                )
            ],
        )
    elif chunk.choices[0].finish_reason is not None:
        response = StreamingResponse(
            id=chunk.id,
            created=chunk.created,
            model=chunk.model,
            choices=[
                Choice(index=0, delta=ChoiceDelta(content=""), finish_reason="stop")
            ],
        )

    await sio.emit(
        event_string,
        {"data": response.model_dump_json(by_alias=True)},
        to=sid,
    )
