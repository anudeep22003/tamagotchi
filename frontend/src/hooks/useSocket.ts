import { useEffect, useRef, useCallback, useState } from "react";
import io from "socket.io-client";
import { BACKEND_URL } from "@/constants";
import { Socket } from "socket.io-client";
import type { Actor, Envelope } from "@/types/envelopeType";
import { useMessageStore } from "@/store/useMessageStore";

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const updateStreamingMessage = useMessageStore(
    (state) => state.updateStreamingMessage
  );
  const removeStreamingActor = useMessageStore(
    (state) => state.removeStreamingActor
  );

  const createStreamMessage = useMessageStore(
    (state) => state.createStreamMessage
  );

  const onStreamChunk = useCallback(
    (envelope: Envelope<{ delta: string }>) => {
      updateStreamingMessage(envelope);
    },
    [updateStreamingMessage]
  );

  const onStreamEnd = useCallback(
    (actor: Actor) => {
      removeStreamingActor(actor);
    },
    [removeStreamingActor]
  );

  const emit = useCallback(
    (event: string, data?: unknown, ack?: (ack: string) => void) => {
      if (ack) {
        socketRef.current?.emit(event, data, ack);
      } else {
        socketRef.current?.emit(event, data);
      }
    },
    []
  );

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

    socket.on("s2c.assistant.stream.chunk", (rawMessage: string) => {
      try {
        const envelope: Envelope<{ delta: string }> =
          JSON.parse(rawMessage);
        onStreamChunk(envelope);
      } catch (error) {
        console.error("Error parsing stream chunk:", error, rawMessage);
      }
    });

    socket.on("s2c.coder.stream.chunk", (rawMessage: string) => {
      try {
        const envelope: Envelope<{ delta: string }> =
          JSON.parse(rawMessage);
        onStreamChunk(envelope);
      } catch (error) {
        console.error("Error parsing stream chunk:", error, rawMessage);
      }
    });

    socket.on("s2c.writer.stream.chunk", (rawMessage: string) => {
      try {
        const envelope: Envelope<{ delta: string }> =
          JSON.parse(rawMessage);
        onStreamChunk(envelope);
      } catch (error) {
        console.error("Error parsing stream chunk:", error, rawMessage);
      }
    });

    socket.on("s2c.claude.stream.chunk", (rawMessage: string) => {
      try {
        const envelope: Envelope<{ delta: string }> =
          JSON.parse(rawMessage);
        onStreamChunk(envelope);
      } catch (error) {
        console.error("Error parsing stream chunk:", error, rawMessage);
      }
    });

    socket.on("s2c.assistant.stream.end", () => {
      onStreamEnd("assistant");
    });

    socket.on("s2c.coder.stream.end", () => {
      onStreamEnd("coder");
    });

    socket.on("s2c.writer.stream.end", () => {
      onStreamEnd("writer");
    });

    socket.on("s2c.claude.stream.end", () => {
      onStreamEnd("claude");
    });

    // when server starts
    socket.on(
      "s2c.writer.stream.start",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (rawMessage: string, callback: (response: any) => void) => {
        try {
          const parsed_envelope: Envelope<{
            delta: "start";
          }> = JSON.parse(rawMessage);

          if (!parsed_envelope.streamId || !parsed_envelope.requestId) {
            throw new Error(
              `Stream ID ${parsed_envelope.streamId} or request ID ${parsed_envelope.requestId} is missing`
            );
          }

          createStreamMessage(
            parsed_envelope.streamId,
            parsed_envelope.requestId,
            "writer"
          );
          console.log("created stream message", parsed_envelope);

          // ✅ Send acknowledgement using the callback
          callback({
            ok: true,
            streamId: parsed_envelope.streamId,
            requestId: parsed_envelope.requestId,
          });
        } catch (error) {
          console.error(
            "Error parsing stream start:",
            error,
            rawMessage
          );
          callback({
            ok: false,
            error: "Failed to parse stream start",
          });
        }
      }
    );

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [onStreamChunk, onStreamEnd, createStreamMessage]);

  return {
    isConnected,
    emit,
    socket: socketRef.current,
  };
};
