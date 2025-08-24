import type { Actor, Envelope } from "@/types/envelopeType";
import {
  constructChatStreamMessages,
  prepareCodeMessage,
} from "./messageUtils";
import type { TypedMessage } from "@/store/useMessageStore";

type EmitCallback = (event: string, data: unknown, callback?: (ack: string) => void) => void;
type AddMessage = (message: TypedMessage) => void;
type CreateStreamMessage = (streamId: string, requestId: string, actor: Actor) => void;

const createHumanMessage = (inputText: string): TypedMessage => ({
  id: `human-${Date.now()}`,
  ts: new Date().getTime(),
  content: inputText,
  type: "human",
});

const createStreamStartEnvelope = <T>(
  actor: Actor,
  data: T
): Envelope<T> => ({
  v: "1",
  id: `human-${Date.now()}`,
  ts: new Date().getTime(),
  requestId: crypto.randomUUID(),
  direction: "c2s",
  actor,
  action: "stream",
  modifier: "start",
  data,
});

const handleStreamAck = (
  ack: string,
  actor: Actor,
  createStreamMessage: CreateStreamMessage
) => {
  console.log("ack", ack);
  const { streamId, requestId } = JSON.parse(ack) as {
    streamId: string;
    requestId: string;
  };
  createStreamMessage(streamId, requestId, actor);
};

export const sendCodeMessage = async (
  inputText: string,
  setInputText: (text: string) => void,
  emit: EmitCallback,
  addMessage: AddMessage,
  humanAreaMessages: TypedMessage[],
  createStreamMessage: CreateStreamMessage
) => {
  const humanMessage = createHumanMessage(inputText);
  addMessage(humanMessage);

  const history = constructChatStreamMessages(humanAreaMessages);
  const codeRequest = await prepareCodeMessage(inputText);
  const data = { history, codeRequest };
  const envelope = createStreamStartEnvelope("coder", data);

  setInputText("");
  
  emit(`c2s.coder.stream.start`, envelope, (ack) =>
    handleStreamAck(ack, "coder", createStreamMessage)
  );
};

export const sendChatMessage = async (
  inputText: string,
  setInputText: (text: string) => void,
  emit: EmitCallback,
  addMessage: AddMessage,
  humanAreaMessages: TypedMessage[],
  createStreamMessage: CreateStreamMessage
) => {
  if (!inputText.trim()) return;

  const humanMessage = createHumanMessage(inputText);
  addMessage(humanMessage);

  const messagesToSend = [
    ...constructChatStreamMessages(humanAreaMessages),
    { role: "user", content: inputText },
  ];
  
  const envelope = createStreamStartEnvelope("assistant", messagesToSend);
  
  setInputText("");
  
  emit(`c2s.assistant.stream.start`, envelope, (ack) =>
    handleStreamAck(ack, "assistant", createStreamMessage)
  );
};

export const sendWriterMessage = async (
  _inputText: string,
  setInputText: (text: string) => void,
  emit: EmitCallback,
  _addMessage: AddMessage,
  humanAreaMessages: TypedMessage[],
  createStreamMessage: CreateStreamMessage
) => {
  const data = {
    history: constructChatStreamMessages(humanAreaMessages),
  }

  const envelope = createStreamStartEnvelope("writer", data);

  setInputText("");

  emit(`c2s.writer.stream.start`, envelope, (ack) =>
    handleStreamAck(ack, "writer", createStreamMessage)
  );
  
}