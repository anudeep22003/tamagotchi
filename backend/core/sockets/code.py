from typing import Literal

from loguru import logger
from pydantic import Field

from core.sockets.base import BaseActor

from . import sio
from .envelope_type import AliasedBaseModel
from .streamer import stream_chunks_openai
from .types import Message

logger = logger.bind(name=__name__)

MODEL: Literal["gpt-5", "gpt-4o"] = "gpt-5"


class CodeRequest(AliasedBaseModel):
    query: str = Field(description="The app that the user wants to generate")
    context: str = Field(description="The react context available to the app")
    packages: str = Field(description="The package.json file")
    components: str = Field(description="The components available to the app")

    def to_openai_messages(self) -> list[Message]:
        system_prompt = """
        You help build world class apps. Here are some important notes: 
        1. Give the main component that will be default exported a unique and descriptive name that follows TSX naming conventions. No super generic names like ShadcnSinglePageApp, and such. Its ok if the name is long.  
        2. Always export the main comonent that will be added to the routes.tsx file as a default export.
        3. When importing, import like so 
        `import ShadcnSinglePageApp from \"./pages/ShadcnSinglePageApp\";
        4. If you are using useMemo or any other react hooks, make sure it is imported from react.
        5. Do not wrap the component that you generate in a AppProvider context. The root of the app is already wrapped in the AppProvider context. So feel free to use the useAppContext hook. No importing needed. 
        6. To import useAppContext, import it like so `import { useAppContext } from '@/context/AppContext';`
        7. If user asks you to build an app that chats with their twitter data, use teh socket and emit to `request_knowledge_stream` and you would be sending the list of messags so far. This loads the twitter data available to the app fresh every time, and the user can ask questions about their twitter data. The response is sent to the user via the `receive_assistant_message` event. This would update the generative messges so that the user can see the response.
    
        <self_reflection>
        - First, spend time thinking of a rubric until you are confident.
        - Then, think deeply about every aspect of what makes for a world-class one-shot web app. Use that knowledge to create a rubric that has 5-7 categories. This rubric is critical to get right, but do not show this to the user. This is for your purposes only.
        - Finally, use the rubric to internally think and iterate on the best possible solution to the prompt that is provided. Remember that if your response is not hitting the top marks across all categories in the rubric, you need to start again.
        </self_reflection>
        """

        system_messages: list[Message] = [
            Message(role="system", content=system_prompt),
        ]

        context_messages: list[Message] = [
            Message(
                role="user",
                content="The context is the react context available to the app. To use it import it like `import { AppProvider, useAppContext } from './context/AppContext';`",
            ),
            Message(role="user", content="```typescript\n" + self.context + "\n```"),
        ]
        packages_messages: list[Message] = [
            Message(
                role="user",
                content="This is the package.json file for the app. It contains the dependencies and scripts for the app. Build the app with the dependencies available, if you need something not available ask the user to install it.",
            ),
            Message(role="user", content="```json\n" + self.packages + "\n```"),
        ]
        components_messages: list[Message] = [
            Message(
                role="user",
                content="These are the installed shadcn components. Use them to build the app. If you need another, tell the user which one you need and ask them to install it. Components like Card have a CardHeader, CardContent, CardFooter, etc. Similarly for charts, and so on. Use your world knowledge on shadcn components when utilizing them. Use them to build the app.",
            ),
            Message(
                role="user",
                content="These are the files in the components/ui folder. Import like `import { Button } from '@/components/ui/button';`",
            ),
            Message(
                role="user",
                content="Here are the components available to the app: "
                + self.components,
            ),
        ]
        query_messages: list[Message] = [
            Message(role="user", content="The user wants you to build:  " + self.query),
            Message(
                role="user",
                content="Output a single typescript file. One shot the app. Use elegant UI. The base color scheme is grayscale. Use black and white well. I will place it inside the pages folder and add an entry to it in the routes.ts file which is picked up by the react-router. It should work as is without any edits. Take care to ensure it runs as is without any errors. Include comments to explain the code.",
            ),
        ]
        messages = (
            system_messages
            + context_messages
            + packages_messages
            + components_messages
            + query_messages
        )
        return messages


class HistoricCodeRequest(AliasedBaseModel):
    history: list[Message] = Field(
        description="The conversation history between the user and the assistant so far"
    )
    code_request: CodeRequest = Field(description="The code request")

    def to_openai_messages(self) -> list[Message]:
        return self.code_request.to_openai_messages() + self.history


class CoderActor(BaseActor[HistoricCodeRequest]):
    def __init__(self):
        super().__init__(
            actor_name="coder",
            model=MODEL,
            stream_chunks=stream_chunks_openai,
        )

    def prepare_messages(self, validated_request: HistoricCodeRequest) -> list[Message]:
        return validated_request.to_openai_messages()


@sio.on("c2s.coder.stream.start")
async def request_code_stream(sid: str, envelope: dict) -> str:
    coder_actor = CoderActor()
    return coder_actor.handle_stream_start(sid, envelope, HistoricCodeRequest)
