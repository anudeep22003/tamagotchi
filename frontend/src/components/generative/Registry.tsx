import type {
  BaseMessage,
} from "@/store/useMessageStore";
import type { Actor } from "@/types/envelopeType";
import { WriterMessage } from "./WriterMessage";
import { ClaudeMessage } from "./ClaudeMessage";
import { CodeMessage } from "./CodeMessage";

interface ActorRegistryConfig {
  label: Actor;
  component: React.ComponentType<{
    message: BaseMessage;
    onContentLoad?: () => void;
  }>;
  messageSelector: (allMessages: BaseMessage[]) => BaseMessage[];
}

export const actorRegistry: Record<
  Exclude<Actor, "assistant">,
  ActorRegistryConfig
> = {
  writer: {
    label: "writer",
    component: WriterMessage,
    messageSelector: (allMessages) =>
      allMessages.filter((m) => m.type === "writer"),
  },
  claude: {
    label: "claude",
    component: ClaudeMessage,
    messageSelector: (allMessages) =>
      allMessages.filter((m) => m.type === "claude"),
  },
  coder: {
    label: "coder",
    component: CodeMessage,
    messageSelector: (allMessages) =>
      allMessages.filter((m) => m.type === "coder"),
  },
};
