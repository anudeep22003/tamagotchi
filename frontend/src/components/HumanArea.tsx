import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { useEffect, useRef } from "react";
import { MessageInput } from "./MessageInput";

const ConversationHeader = () => {
  return (
    <div className="p-4 border-b border-border">
      <h2 className="text-lg font-medium">Conversation</h2>
    </div>
  );
};

const MessageList = () => {
  const { humanAreaMessages } = useAppContext();
  const messageEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [humanAreaMessages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {humanAreaMessages.map((message) => (
        <pre
          key={message.id}
          className="whitespace-pre-wrap text-sm bg-background border border-border rounded p-3 overflow-x-auto"
        >
          {message.content}
        </pre>
      ))}
      <div ref={messageEndRef} />
    </div>
  );
};

const RecordingControls = () => {
  const { showGenerative, setShowGenerative } = useAppContext();

  const handleToggleGenerative = () => {
    setShowGenerative(!showGenerative);
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm">
        Record
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
