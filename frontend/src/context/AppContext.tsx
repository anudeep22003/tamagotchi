import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useSocket } from "@/hooks/useSocket";
import type {
  SimpleResponse,
  StreamingResponse,
} from "@/types/serverTypes";
import // updateMessagesWithStreamData,
// createHumanMessage,
// returnUrlIfExists,
// prepareCodeMessage,
"@/lib/messageUtils";
import { Socket } from "socket.io-client";
import type { Envelope } from "@/types/envelopeType";
import {
  useMessageStore,
  type BaseMessage,
} from "@/store/useMessageStore";

interface AppContextType {
  inputText: string;
  setInputText: (inputText: string) => void;
  showGenerative: boolean;
  setShowGenerative: (showGenerative: boolean) => void;
  handleSendMessage: () => Promise<void>;
  humanMessages: BaseMessage[];
  humanAreaMessages: BaseMessage[];
  generativeMessages: BaseMessage[];
  isConnected: boolean;
  emit: (event: string, data?: unknown) => void;
  socket: Socket | null;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [inputText, setInputText] = useState("");
  const [showGenerative, setShowGenerative] = useState(false);

  // Get store functions
  const createStreamMessage = useMessageStore(
    (state) => state.createStreamMessage
  );

  const handleChatStream = useCallback(
    (data: StreamingResponse | SimpleResponse) => {
      console.log("data", data);
    },
    []
  );

  // Create a stable stream chunk handler that doesn't cause re-renders
  const handleStreamChunk = useCallback(
    (envelope: Envelope<{ delta: string }>) => {
      // Use the store directly to avoid dependency issues
      useMessageStore.getState().updateStreamingMessage(envelope);
    },
    [] // No dependencies needed
  );

  const { isConnected, emit, socket } = useSocket({
    onChatStream: handleChatStream,
    onStreamChunk: handleStreamChunk,
  });

  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim()) return;

    const envelope: Envelope<{
      input: string;
    }> = {
      v: "1",
      id: `human-${Date.now()}`,
      ts: new Date().getTime(),

      requestId: crypto.randomUUID(),

      direction: "c2s",
      domain: "chat",
      action: "stream",
      modifier: "start",
      data: {
        input: inputText,
      },
    };
    // setMessages((prev) => [...prev, newMessage]);
    setInputText("");

    // eslint-disable-next-line
    // const messagesToSend = [
    //   ...messages.map((m) => ({
    //     role: m.contentType,
    //     content: m.content,
    //   })),
    //   {
    //     role: "human",
    //     content: inputText,
    //   },
    // ];

    socket?.emit(
      "c2s.chat.stream.start",
      envelope,
      (ack: { requestId: string; streamId: string; ok: boolean }) => {
        console.log("ack", ack);
        createStreamMessage(ack.streamId, ack.requestId);
      }
    );

    // if (url) {
    //   emit("request_url_stream", url);
    // } else {
    //   emit("request_chat_stream", {
    //   messages: messagesToSend,
    //   });
    // const codeMessage = await prepareCodeMessage(inputText);
    // emit("request_code_stream", codeMessage);
    // }
  }, [inputText, emit, socket, createStreamMessage]);

  // Get messages from store
  const humanMessages = useMessageStore((state) => state.humanMessages);
  const humanAreaMessages = useMessageStore(
    (state) => state.humanAreaMessages
  );
  const generativeMessages = useMessageStore(
    (state) => state.codeMessages
  );

  return (
    <AppContext.Provider
      value={{
        inputText,
        setInputText,
        showGenerative,
        setShowGenerative,
        handleSendMessage,
        humanMessages,
        humanAreaMessages,
        generativeMessages,
        isConnected,
        emit,
        socket,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
