import type { Actor, Envelope } from "@/types/envelopeType";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

export interface BaseMessage {
  id: string;
  ts: number;
  content: string;

  // can only one of these values be present, or theyre both present or both absent?
  streamId?: string;
  requestId?: string;

  type: MessageType;
}

export type MessageType = "human" | Actor;

export type TypedMessage = BaseMessage;

interface MessageState {
  allMessages: TypedMessage[];
  addMessage: (message: TypedMessage) => void;
  createStreamMessage: (
    streamId: string,
    requestId: string,
    type: MessageType
  ) => void;
  updateStreamingMessage: (
    envelope: Envelope<{ delta: string }>
  ) => void;
  clearOldMessages: () => void;
}

export const useMessageStore = create<MessageState>()(
  devtools(
    (set) => ({
      allMessages: [],
      addMessage: (message) =>
        set((state) => ({
          allMessages: [...state.allMessages, message],
        })),

      createStreamMessage: (streamId, requestId, type) => {
        const newMessage: TypedMessage = {
          id: `stream-${Date.now()}`,
          ts: Date.now(),
          content: "",
          streamId,
          requestId,
          type,
        };

        set((state) => ({
          allMessages: [...state.allMessages, newMessage],
        }));
      },
      updateStreamingMessage: (envelope) => {
        set((state) => {
          const { streamId } = envelope;
          const messageIndex = state.allMessages.findIndex(
            (message) => message.streamId === streamId
          );

          if (messageIndex === -1) {
            return state;
          }

          const updatedMessage = {
            ...state.allMessages[messageIndex],
            content:
              state.allMessages[messageIndex].content +
              envelope.data.delta,
          };

          const updatedMessages = [...state.allMessages];
          updatedMessages[messageIndex] = updatedMessage;

          return { ...state, allMessages: updatedMessages };
        });
      },
      clearOldMessages: () => {
        set((state) => {
          // Keep only the last 100 messages to prevent memory overflow
          const maxMessages = 100;
          if (state.allMessages.length > maxMessages) {
            return {
              ...state,
              allMessages: state.allMessages.slice(-maxMessages)
            };
          }
          return state;
        });
      },
    }),

    {
      name: "message-storage",
      partialize: (state: MessageState) => ({
        // Don't persist all messages to reduce memory usage
        allMessages: state.allMessages.slice(-50)
      })
    }
  )
);

// Selector hooks
export const useHumanMessages = () =>
  useMessageStore(
    useShallow((state) =>
      state.allMessages.filter((m) => m.type === "human")
    )
  );

export const useAssistantMessages = () =>
  useMessageStore(
    useShallow((state) =>
      state.allMessages.filter((m) => m.type === "assistant")
    )
  );

export const useCodeMessages = () =>
  useMessageStore(
    useShallow((state) =>
      state.allMessages.filter((m) => m.type === "coder")
    )
  );

export const useHumanAreaMessages = () =>
  useMessageStore(
    useShallow((state) =>
      state.allMessages.filter(
        (m) => m.type === "human" || m.type === "assistant"
      )
    )
  );
