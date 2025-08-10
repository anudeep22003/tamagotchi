import json
import logging
import os
import time

from openai.types.chat import ChatCompletionMessageParam
from pydantic import BaseModel, Field, ValidationError

from . import async_openai_client, sio
from .emitters import emit_chat_completion_chunk
from .types import Choice, ChoiceDelta, StreamingResponse

logger = logging.getLogger(__name__)

print(
    "chat_with_knowledge.py module loaded - request_knowledge_stream handler should be registered"
)


@sio.event
async def test_knowledge_event(sid: str, data: dict) -> None:
    print(f"DEBUG: test_knowledge_event received from {sid}: {data}")
    await sio.emit(
        "test_response",
        {"message": "chat_with_knowledge.py handler is working"},
        to=sid,
    )


active_connections: dict[str, dict] = {}


MODEL = "gpt-5"


class KnowledgeRequest(BaseModel):
    messages: list[dict] = Field(description="List of conversation messages")

    def to_openai_messages(self) -> list[ChatCompletionMessageParam]:
        system_prompt = """
        You are a helpful AI assistant with access to Twitter data and knowledge of the user. 
        Use the provided Twitter data to answer questions and provide insights.
        Be conversational, helpful, and accurate in your responses.
        """

        system_messages: list[ChatCompletionMessageParam] = [
            {
                "role": "system",
                "content": system_prompt,
            },
        ]

        # Load Twitter data from storage
        twitter_data = self._load_twitter_data()

        twitter_context_messages: list[ChatCompletionMessageParam] = [
            {
                "role": "user",
                "content": "Here is the Twitter data available for context:",
            },
            {
                "role": "user",
                "content": "```json\n" + json.dumps(twitter_data, indent=2) + "\n```",
            },
        ]

        # Convert the incoming messages to the format OpenAI expects
        conversation_messages: list[ChatCompletionMessageParam] = []
        for msg in self.messages:
            # Map 'human' role to 'user' role for OpenAI compatibility
            role = "user" if msg["role"] == "human" else msg["role"]
            conversation_messages.append({"role": role, "content": msg["content"]})

        messages = system_messages + twitter_context_messages + conversation_messages
        return messages

    def _load_twitter_data(self) -> dict:
        """Load Twitter data from storage/twitter.json"""
        try:
            # Get the path to the storage directory relative to this file
            current_dir = os.path.dirname(os.path.abspath(__file__))
            storage_path = os.path.join(
                current_dir, "..", "..", "storage", "twitter.json"
            )

            with open(storage_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading Twitter data: {e}")
            return {"error": f"Failed to load Twitter data: {str(e)}"}


@sio.event
async def request_knowledge_stream(sid: str, messages: dict) -> None:
    print(f"DEBUG: request_knowledge_stream handler called with sid={sid}")
    logger.info(f"request_knowledge_stream {sid}")

    try:
        validated_knowledge_request = KnowledgeRequest.model_validate(messages)
        messages_to_load = validated_knowledge_request.to_openai_messages()
    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        logger.error(f"Validation error details: {e.errors()}")
        await sio.emit("error", {"message": f"Validation error: {e}"}, to=sid)
        return

    try:
        stream = await async_openai_client.chat.completions.create(
            model=MODEL,
            messages=messages_to_load,
            stream=True,
            reasoning_effort="low",
        )

        async for chunk in stream:
            await emit_chat_completion_chunk(
                sio, sid, chunk, "receive_assistant_message"
            )
    except Exception as e:
        print(f"Error: {e}")
        error_response = StreamingResponse(
            id=f"chatcmpl-{int(time.time())}",
            created=int(time.time()),
            model=MODEL,
            choices=[
                Choice(
                    index=0,
                    delta=ChoiceDelta(content=f"Error: {str(e)}"),
                    finish_reason="error",
                )
            ],
        )
        await sio.emit(
            "chat_stream",
            {
                "data": error_response.model_dump_json(by_alias=True),
            },
            to=sid,
        )
