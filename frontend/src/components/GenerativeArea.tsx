import { useEffect, useRef } from "react";
import { useAppContext } from "@/context/AppContext";
import type { Message } from "@/lib/messageUtils";

const GenerativeHeader = () => {
  return (
    <div className="p-4 border-b border-border flex justify-between items-center">
      <h2 className="text-lg font-medium">Generated Output</h2>
    </div>
  );
};

const GenerativeMessage = ({
  message,
}: {
  message: Message;
}) => {
  return (
    <div className="bg-secondary/10 rounded-lg p-4">
      <p className="text-sm text-muted-foreground mb-2">
        {message.timestamp.toLocaleTimeString()}
      </p>
      <pre className="whitespace-pre-wrap text-sm bg-background border border-border rounded p-3 overflow-x-auto">
        {message.content}
      </pre>
    </div>
  );
};

const GenerativeMessageList = () => {
  const { generativeMessages } = useAppContext();
  const generativeMessageRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    generativeMessageRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [generativeMessages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {generativeMessages.map((message) => (
        <GenerativeMessage key={message.id} message={message} />
      ))}
      <div ref={generativeMessageRef} />
    </div>
  );
};

export const GenerativeArea = () => {
  return (
    <div className="flex flex-col h-full bg-background">
      <GenerativeHeader />
      <GenerativeMessageList />
    </div>
  );
};