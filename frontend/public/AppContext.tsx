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
  createHumanMessage,
  returnUrlIfExists,
  type Message,
} from "@/lib/messageUtils";
import { Socket } from "socket.io-client";

interface AppContextType {
  messages: Message[];
  setMessages: (
    messages: Message[] | ((prev: Message[]) => Message[])
  ) => void;
  inputText: string;
  setInputText: (inputText: string) => void;
  showGenerative: boolean;
  setShowGenerative: (showGenerative: boolean) => void;
  handleSendMessage: () => void;
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

  const handleSendMessage = useCallback(() => {
    if (!inputText.trim()) return;

    const newMessage = createHumanMessage(inputText);
    setMessages((prev) => [...prev, newMessage]);
    setInputText("");

    const messagesToSend = [
      ...messages.map((m) => ({
        role: m.type,
        content: m.content,
      })),
      {
        role: "human",
        content: inputText,
      },
    ];

    const url = returnUrlIfExists(inputText);

    if (url) {
      emit("request_url_stream", url);
    } else {
      emit("request_chat_stream", {
        messages: messagesToSend,
      });
    }
  }, [inputText, emit, messages]);

  const humanMessages = messages.filter((m) => m.type === "human");
  const humanAreaMessages = messages.filter(
    (m) => m.type === "human" || m.type === "assistant"
  );
  const generativeMessages = messages.filter(
    (m) => m.type === "generative"
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
