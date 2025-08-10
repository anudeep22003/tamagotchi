import logging
import time

from openai.types.chat import ChatCompletionMessageParam
from pydantic import BaseModel, Field, ValidationError

from . import client, sio
from .emitters import emit_chat_completion_chunk
from .types import Choice, ChoiceDelta, StreamingResponse

logger = logging.getLogger(__name__)

print("code.py module loaded - request_code_stream handler should be registered")


@sio.event
async def test_code_event(sid: str, data: dict) -> None:
    print(f"DEBUG: test_code_event received from {sid}: {data}")
    await sio.emit("test_response", {"message": "code.py handler is working"}, to=sid)


active_connections: dict[str, dict] = {}


MODEL = "gpt-5"


class CodeRequest(BaseModel):
    query: str = Field(description="The app that the user wants to generate")
    context: str = Field(description="The react context available to the app")
    packages: str = Field(description="The package.json file")
    components: str = Field(description="The components available to the app")

    def to_openai_messages(self) -> list[ChatCompletionMessageParam]:
        context_messages: list[ChatCompletionMessageParam] = [
            {
                "role": "user",
                "content": "The context is the react context available to the app. To use it import it like `import { AppProvider, useAppContext } from './context/AppContext';`",
            },
            {
                "role": "user",
                "content": "```typescript\n" + self.context + "\n```",
            },
        ]
        packages_messages: list[ChatCompletionMessageParam] = [
            {
                "role": "user",
                "content": "This is the package.json file for the app. It contains the dependencies and scripts for the app. Build the app with the dependencies available, if you need something not available ask the user to install it.",
            },
            {
                "role": "user",
                "content": "```json\n" + self.packages + "\n```",
            },
        ]
        components_messages: list[ChatCompletionMessageParam] = [
            {
                "role": "user",
                "content": "These are the installed shadcn components. Use them to build the app. If you need another, tell the user which one you need and ask them to install it.",
            },
            {
                "role": "user",
                "content": "These are the files in the components/ui folder. Import like `import { Button } from '@/components/ui/button';`",
            },
            {
                "role": "user",
                "content": "Here are the components available to the app: "
                + self.components,
            },
        ]
        query_messages: list[ChatCompletionMessageParam] = [
            {
                "role": "user",
                "content": "The user wants to generate a " + self.query + " app.",
            },
            {
                "role": "user",
                "content": "Output a single typescript file. One shot the app. Use elegant UI. The base color scheme is grayscale. Use black and white well. I will place it inside the pages folder and add an entry to it in the routes.ts file which is picked up by the react-router. It should work as is without any edits. Take care to ensure it runs as is without any errors. Include comments to explain the code.",
            },
        ]
        messages = (
            context_messages + packages_messages + components_messages + query_messages
        )
        return messages


@sio.event
async def request_code_stream(sid: str, messages: dict) -> None:
    print(
        f"DEBUG: request_code_stream handler called with sid={sid}"
    )  # This should show up
    logger.info(f"request_code_stream {sid}")

    try:
        validated_code_request = CodeRequest.model_validate(messages)
        messages_to_load = validated_code_request.to_openai_messages()
    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        logger.error(f"Validation error details: {e.errors()}")
        await sio.emit("error", {"message": f"Validation error: {e}"}, to=sid)
        return
    try:
        stream = await client.chat.completions.create(
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
