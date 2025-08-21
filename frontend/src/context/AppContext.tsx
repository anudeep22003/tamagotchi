import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useSocket } from "@/hooks/useSocket";
import { Socket } from "socket.io-client";
import type { Envelope } from "@/types/envelopeType";
import { useMessageStore } from "@/store/useMessageStore";

interface AppContextType {
  inputText: string;
  setInputText: (inputText: string) => void;
  showGenerative: boolean;
  setShowGenerative: (showGenerative: boolean) => void;
  handleSendMessage: () => Promise<void>;
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

  const { isConnected, emit, socket } = useSocket();

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
    setInputText("");

    emit("c2s.chat.stream.start", envelope, (ack: string) => {
      console.log("ack", ack);
      const ack_parsed: { streamId: string; requestId: string } =
        JSON.parse(ack);
      createStreamMessage(ack_parsed.streamId, ack_parsed.requestId);
    });
  }, [inputText, emit, createStreamMessage]);

  return (
    <AppContext.Provider
      value={{
        inputText,
        setInputText,
        showGenerative,
        setShowGenerative,
        handleSendMessage,
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
