import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useSocket } from "@/hooks/useSocket";
import { Socket } from "socket.io-client";
import {
  useHumanAreaMessages,
  useMessageStore,
} from "@/store/useMessageStore";
import {
  sendChatMessage,
  sendCodeMessage,
} from "@/lib/messageSendHandlers";

interface AppContextType {
  inputText: string;
  setInputText: (inputText: string) => void;
  showGenerative: boolean;
  setShowGenerative: (showGenerative: boolean) => void;
  handleInputSendClick: () => Promise<void>;
  handleCodeSendClick: () => Promise<void>;
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
  const addMessage = useMessageStore((state) => state.addMessage);
  const humanAreaMessages = useHumanAreaMessages();
  const { clearOldMessages } = useMessageStore();

  const { isConnected, emit, socket } = useSocket();

  const createMessageHandler = useCallback(
    (sendFn: typeof sendChatMessage) => async () => {
      await sendFn(
        inputText,
        setInputText,
        emit,
        addMessage,
        humanAreaMessages,
        createStreamMessage
      );
    },
    [inputText, setInputText, emit, addMessage, humanAreaMessages, createStreamMessage]
  );

  const handleCodeSendClick = useCallback(
    () => createMessageHandler(sendCodeMessage)(),
    [createMessageHandler]
  );

  // Periodic cleanup of old messages
  useEffect(() => {
    const interval = setInterval(() => {
      clearOldMessages();
    }, 60000); // Clear old messages every minute
    
    return () => clearInterval(interval);
  }, [clearOldMessages]);

  const handleInputSendClick = useCallback(
    () => createMessageHandler(sendChatMessage)(),
    [createMessageHandler]
  );

  return (
    <AppContext.Provider
      value={{
        inputText,
        setInputText,
        showGenerative,
        setShowGenerative,
        handleCodeSendClick,
        handleInputSendClick,
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
