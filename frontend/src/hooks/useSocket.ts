import { useEffect, useRef, useCallback, useState } from "react";
import io from "socket.io-client";
import { BACKEND_URL } from "@/constants";
import type { StreamingResponse } from "@/types/serverTypes";
import { Socket } from "socket.io-client";

interface UseSocketProps {
  onChatStream: (data: StreamingResponse) => void;
}

export const useSocket = ({ onChatStream }: UseSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      timeout: 20000,
      reconnection: true,
    });

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("hello", "world");
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on(
      "receive_assistant_message",
      (delta: { data: string }) => {
        try {
          const parsedData: StreamingResponse = JSON.parse(delta.data);
          onChatStream(parsedData);
        } catch (error) {
          console.error("Error parsing chat stream data:", error);
        }
      }
    );



    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [onChatStream]);

  return {
    isConnected,
    emit,
    socket: socketRef.current,
  };
};
