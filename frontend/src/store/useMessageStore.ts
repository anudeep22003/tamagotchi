import type { Envelope } from "@/types/envelopeType";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface BaseMessage {
  id: string;
  ts: number;
  content: string;
}

export type HumanMessage = BaseMessage;

export interface IntelligenceMessage extends BaseMessage {
  streamId: string;
  requestId: string;
}

interface MessageState {
  allMessages: BaseMessage[];
  humanMessages: BaseMessage[];
  humanAreaMessages: BaseMessage[];
  assistantMessages: IntelligenceMessage[];
  codeMessages: IntelligenceMessage[];
  addAssistantMessage: (message: IntelligenceMessage) => void;
  addCodeMessage: (message: IntelligenceMessage) => void;
  addToAllMessages: (messages: BaseMessage[]) => void;
  addHumanMessage: (message: HumanMessage) => void;
  createStreamMessage: (streamId: string, requestId: string) => void;
  updateStreamingMessage: (
    envelope: Envelope<{ delta: string }>
  ) => void;
}

export const useMessageStore = create<MessageState>()(
  devtools(
    persist(
      (set) => ({
        allMessages: [],
        humanMessages: [],
        humanAreaMessages: [],
        assistantMessages: [],
        codeMessages: [],
        addHumanMessage: (message) =>
          set((state) => ({
            humanMessages: [...state.humanMessages, message],
            allMessages: [...state.allMessages, message],
            humanAreaMessages: [...state.humanAreaMessages, message],
          })),
        addAssistantMessage: (message) =>
          set((state) => ({
            assistantMessages: [...state.assistantMessages, message],
            allMessages: [...state.allMessages, message],
            humanAreaMessages: [...state.humanAreaMessages, message],
          })),
        addCodeMessage: (message) =>
          set((state) => ({
            codeMessages: [...state.codeMessages, message],
            allMessages: [...state.allMessages, message],
          })),
        addToAllMessages: (messages) =>
          set((state) => ({
            allMessages: [...state.allMessages, ...messages],
          })),
        createStreamMessage: (streamId, requestId) => {
          console.log("createStreamMessage", streamId, requestId);
          const streamMessage: IntelligenceMessage = {
            streamId,
            requestId,
            id: requestId,
            content: "",
            ts: Date.now(),
          };

          set((state) => ({
            ...state,
            assistantMessages: [
              ...state.assistantMessages,
              streamMessage,
            ],
            allMessages: [...state.allMessages, streamMessage],
            humanAreaMessages: [
              ...state.humanAreaMessages,
              streamMessage,
            ],
          }));
        },
        updateStreamingMessage: (envelope) => {
          set((state) => {
            console.log("updateStreamingMessage", envelope);
            const { streamId } = envelope;
            const messageIndex = state.assistantMessages.findIndex(
              (message) => message.streamId === streamId
            );

            if (messageIndex === -1) {
              return state; // Return unchanged state if message not found
            }

            // Create updated message
            const updatedMessage = {
              ...state.assistantMessages[messageIndex],
              content:
                state.assistantMessages[messageIndex].content +
                envelope.data.delta,
            };

            // Create new arrays with the updated message
            const updatedAssistantMessages = [
              ...state.assistantMessages,
            ];
            updatedAssistantMessages[messageIndex] = updatedMessage;

            const updatedAllMessages = [...state.allMessages];
            const allMessageIndex = updatedAllMessages.findIndex(
              (msg) => msg.id === updatedMessage.id
            );
            if (allMessageIndex !== -1) {
              updatedAllMessages[allMessageIndex] = updatedMessage;
            }

            const updatedHumanAreaMessages = [
              ...state.humanAreaMessages,
            ];
            const humanAreaIndex = updatedHumanAreaMessages.findIndex(
              (msg) => msg.id === updatedMessage.id
            );
            if (humanAreaIndex !== -1) {
              updatedHumanAreaMessages[humanAreaIndex] = updatedMessage;
            }

            return {
              ...state,
              assistantMessages: updatedAssistantMessages,
              allMessages: updatedAllMessages,
              humanAreaMessages: updatedHumanAreaMessages,
            };
          });
        },
      }),

      {
        name: "message-storage",
      }
    )
  )
);
