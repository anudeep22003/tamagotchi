import { useEffect, useRef, useMemo, memo, useCallback } from "react";
import { CodeMessage } from "./CodeMessage";
import { WriterMessage } from "./WriterMessage";
import type { BaseMessage } from "@/store/useMessageStore";
import type { Actor } from "@/types/envelopeType";
import { ClaudeMessage } from "./ClaudeMessage";

interface TabContentProps {
  messages: BaseMessage[];
  type: Actor;
}

export const TabContent = memo(
  ({ messages, type }: TabContentProps) => {
    const messageEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = useCallback(() => {
      // Use setTimeout to ensure DOM is updated after markdown rendering
      setTimeout(() => {
        messageEndRef.current?.scrollIntoView({
          behavior: "smooth",
        });
      }, 10);
    }, []);

    const messagesLength = messages.length;
    const lastMessageContent =
      messages[messages.length - 1]?.content || "";

    useEffect(() => {
      scrollToBottom();
    }, [messagesLength, lastMessageContent, scrollToBottom]);

    const memoizedMessages = useMemo(() => {
      return messages.map((message) =>
        type === "coder" ? (
          <CodeMessage key={message.id} message={message} />
        ) : type === "writer" ? (
          <WriterMessage
            key={message.id}
            message={message}
            onContentLoad={scrollToBottom}
          />
        ) : type === "claude" ? (
          <ClaudeMessage key={message.id} message={message} />
        ) : null
      );
    }, [messages, type, scrollToBottom]);

    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {memoizedMessages}
        <div ref={messageEndRef} />
      </div>
    );
  }
);

TabContent.displayName = "TabContent";
