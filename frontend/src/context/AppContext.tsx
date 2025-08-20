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
import {
  updateMessagesWithStreamData,
  // createHumanMessage,
  // returnUrlIfExists,
  type Message,
  // prepareCodeMessage,
} from "@/lib/messageUtils";
import { Socket } from "socket.io-client";
import type { Envelope } from "@/types/envelopeType";

interface AppContextType {
  messages: Message[];
  setMessages: (
    messages: Message[] | ((prev: Message[]) => Message[])
  ) => void;
  inputText: string;
  setInputText: (inputText: string) => void;
  showGenerative: boolean;
  setShowGenerative: (showGenerative: boolean) => void;
  handleSendMessage: () => Promise<void>;
  humanMessages: Message[];
  humanAreaMessages: Message[];
  generativeMessages: Message[];
  isConnected: boolean;
  emit: (event: string, data?: unknown) => void;
  socket: Socket | null;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [showGenerative, setShowGenerative] = useState(false);

  const handleChatStream = useCallback(
    (data: StreamingResponse | SimpleResponse) => {
      setMessages((prev) => updateMessagesWithStreamData(prev, data));
    },
    []
  );

  const { isConnected, emit, socket } = useSocket({
    onChatStream: handleChatStream,
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
      }
    );

    // if (url) {
    //   emit("request_url_stream", url);
    // } else {
    //   emit("request_chat_stream", {
    //     messages: messagesToSend,
    //   });
    // const codeMessage = await prepareCodeMessage(inputText);
    // emit("request_code_stream", codeMessage);
    // }
  }, [inputText, emit, messages, socket]);

  const humanMessages = messages.filter(
    (m) => m.contentType === "human"
  );
  const humanAreaMessages = messages.filter(
    (m) => m.contentType === "human" || m.contentType === "assistant"
  );
  const generativeMessages = messages.filter(
    (m) => m.contentType === "generative"
  );

  return (
    <AppContext.Provider
      value={{
        messages,
        setMessages,
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
