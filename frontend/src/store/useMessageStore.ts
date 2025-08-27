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
  activeTab: Actor | null;
  isTabManuallySelected: boolean;
  streamingActors: Set<Actor>;
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
  setActiveTab: (actor: Actor, isManual?: boolean) => void;
  addStreamingActor: (actor: Actor) => void;
  removeStreamingActor: (actor: Actor) => void;
}

export const useMessageStore = create<MessageState>()(
  devtools(
    (set) => ({
      allMessages: [],
      activeTab: null,
      isTabManuallySelected: false,
      streamingActors: new Set(),
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

        set((state) => {
          const actor = type as Actor;
          const newStreamingActors = new Set(state.streamingActors);
          if (type !== "human") {
            newStreamingActors.add(actor);
          }

          return {
            allMessages: [...state.allMessages, newMessage],
            streamingActors: newStreamingActors,
          };
        });
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
              allMessages: state.allMessages.slice(-maxMessages),
            };
          }
          return state;
        });
      },
      setActiveTab: (actor, isManual = false) => {
        set(() => ({
          activeTab: actor,
          isTabManuallySelected: isManual,
        }));
      },
      addStreamingActor: (actor) => {
        set((state) => ({
          streamingActors: new Set([...state.streamingActors, actor]),
        }));
      },
      removeStreamingActor: (actor) => {
        set((state) => {
          const newStreamingActors = new Set(state.streamingActors);
          newStreamingActors.delete(actor);
          return { streamingActors: newStreamingActors };
        });
      },
    }),

    {
      name: "message-storage",
      partialize: (state: MessageState) => ({
        // Don't persist all messages to reduce memory usage
        allMessages: state.allMessages.slice(-50),
      }),
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

export const useWriterMessages = () =>
  useMessageStore(
    useShallow((state) =>
      state.allMessages.filter((m) => m.type === "writer")
    )
  );

export const useClaudeMessages = () =>
  useMessageStore(
    useShallow((state) =>
      state.allMessages.filter((m) => m.type === "claude")
    )
  );
