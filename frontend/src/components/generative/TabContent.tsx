import { useEffect, useRef, useMemo, memo } from "react";
import { CodeMessage } from "./CodeMessage";
import { WriterMessage } from "./WriterMessage";
import type { BaseMessage } from "@/store/useMessageStore";

interface TabContentProps {
  messages: BaseMessage[];
  type: "coder" | "writer";
}

export const TabContent = memo(({ messages, type }: TabContentProps) => {
  const messageEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  const messagesLength = messages.length;
  useEffect(() => {
    scrollToBottom();
  }, [messagesLength]);

  const memoizedMessages = useMemo(() => {
    return messages.map((message) =>
      type === "coder" ? (
        <CodeMessage key={message.id} message={message} />
      ) : (
        <WriterMessage key={message.id} message={message} />
      )
    );
  }, [messages, type]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {memoizedMessages}
      <div ref={messageEndRef} />
    </div>
  );
});

TabContent.displayName = "TabContent";