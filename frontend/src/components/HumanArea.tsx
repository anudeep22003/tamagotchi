import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { useHumanAreaMessages } from "@/store/useMessageStore";
import { useEffect, useRef, useMemo } from "react";
import { MessageInput } from "./MessageInput";
import { MarkdownRenderer } from "./MarkdownRenderer";

const ConversationHeader = () => {
  return (
    <div className="p-4 border-b border-border">
      <h2 className="text-lg font-medium">Conversation</h2>
    </div>
  );
};

const MessageList = () => {
  const humanAreaMessages = useHumanAreaMessages();
  const messageEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const messagesLength = humanAreaMessages.length;
  useEffect(() => {
    scrollToBottom();
  }, [messagesLength]);

  const memoizedMessages = useMemo(() => {
    return humanAreaMessages.map((message) => (
      <div
        key={message.id}
        className={`flex ${
          message.type === "human" ? "justify-end" : "justify-start"
        }`}
      >
        <div
          className={`rounded-lg p-3 ${
            message.type === "human"
              ? "max-w-[80%] bg-primary text-primary-foreground"
              : "w-full bg-muted/50 border border-border"
          }`}
        >
          <MarkdownRenderer 
            content={message.content} 
            className="text-sm"
          />
        </div>
      </div>
    ));
  }, [humanAreaMessages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {memoizedMessages}
      <div ref={messageEndRef} />
    </div>
  );
};

const RecordingControls = () => {
  const { showGenerative, setShowGenerative, handleCodeSendClick } =
    useAppContext();

  const handleToggleGenerative = () => {
    setShowGenerative(!showGenerative);
  };

  return (
    <div className="flex gap-2">
      {/* <Button variant="outline" size="sm">
        Record
      </Button> */}
      <Button variant="outline" size="sm" onClick={handleCodeSendClick}>
        Code
      </Button>
      <div className="md:hidden flex-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleGenerative}
          className="w-full"
        >
          {showGenerative ? "← Conversation" : "View Output →"}
        </Button>
      </div>
    </div>
  );
};

export const HumanArea = () => {
  return (
    <div className="flex flex-col h-full bg-background border-r border-border">
      <ConversationHeader />
      <MessageList />
      <div className="p-4 border-t border-border">
        <MessageInput />
        <RecordingControls />
      </div>
    </div>
  );
};
