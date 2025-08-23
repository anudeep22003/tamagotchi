import type { Actor, Envelope } from "@/types/envelopeType";
import {
  constructChatStreamMessages,
  prepareCodeMessage,
} from "./messageUtils";
import type { TypedMessage } from "@/store/useMessageStore";

export const sendCodeMessage = async (
  inputText: string,
  setInputText: (text: string) => void,
  emit: (
    event: string,
    data: unknown,
    callback?: (ack: string) => void
  ) => void,
  addMessage: (message: TypedMessage) => void,
  humanAreaMessages: TypedMessage[],
  createStreamMessage: (
    streamId: string,
    requestId: string,
    actor: Actor
  ) => void
) => {
  if (!inputText.trim()) return;

  const humanMessage: TypedMessage = {
    id: `human-${Date.now()}`,
    ts: new Date().getTime(),
    content: inputText,
    type: "human",
  };

  addMessage(humanMessage);

  const data = await prepareCodeMessage(inputText);

  const envelope: Envelope<typeof data> = {
    v: "1",
    id: `human-${Date.now()}`,
    ts: new Date().getTime(),
    requestId: crypto.randomUUID(),
    direction: "c2s",
    actor: "coder",
    action: "stream",
    modifier: "start",
    data,
  };

  setInputText("");

  emit(`c2s.coder.stream.start`, envelope, (ack: string) => {
    console.log("ack", ack);
    const ack_parsed: { streamId: string; requestId: string } =
      JSON.parse(ack);
    createStreamMessage(
      ack_parsed.streamId,
      ack_parsed.requestId,
      "coder"
    );
  });
};

export const sendChatMessage = async (
  inputText: string,
  setInputText: (text: string) => void,
  emit: (
    event: string,
    data: unknown,
    callback?: (ack: string) => void
  ) => void,
  addMessage: (message: TypedMessage) => void,
  humanAreaMessages: TypedMessage[],
  createStreamMessage: (
    streamId: string,
    requestId: string,
    actor: string
  ) => void
) => {
  if (!inputText.trim()) return;

  const humanMessage: TypedMessage = {
    id: `human-${Date.now()}`,
    ts: new Date().getTime(),
    content: inputText,
    type: "human",
  };

  addMessage(humanMessage);

  const messagesToSend = constructChatStreamMessages(humanAreaMessages);

  const envelope: Envelope<typeof messagesToSend> = {
    v: "1",
    id: `human-${Date.now()}`,
    ts: new Date().getTime(),
    requestId: crypto.randomUUID(),
    direction: "c2s",
    actor: "assistant",
    action: "stream",
    modifier: "start",
    data: messagesToSend,
  };

  setInputText("");

  emit(`c2s.assistant.stream.start`, envelope, (ack: string) => {
    console.log("ack", ack);
    const ack_parsed: { streamId: string; requestId: string } =
      JSON.parse(ack);
    createStreamMessage(
      ack_parsed.streamId,
      ack_parsed.requestId,
      "assistant"
    );
  });
};
