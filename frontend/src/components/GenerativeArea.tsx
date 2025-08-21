import { useEffect, useRef } from "react";
import { useAppContext } from "@/context/AppContext";
import { useMessageStore } from "@/store/useMessageStore";
import { Button } from "./ui/button";
import type { GeneratedCode } from "@/types/serverTypes";
import type { BaseMessage } from "@/store/useMessageStore";

const GenerativeHeader = () => {
  return (
    <div className="p-4 border-b border-border flex justify-between items-center">
      <h2 className="text-lg font-medium">Generated Output</h2>
    </div>
  );
};

const GenerativeMessage = ({ message }: { message: BaseMessage }) => {
  return (
    <div className="bg-secondary/10 rounded-lg p-4">
      {/* <p className="text-sm text-muted-foreground mb-2">
        {message.ts.toLocaleTimeString()}
      </p> */}
      <pre className="whitespace-pre-wrap text-sm bg-background border border-border rounded p-3 overflow-x-auto">
        {message.content}
      </pre>
    </div>
  );
};

const GenerativeMessageList = () => {
  const generativeMessages = useMessageStore(
    (state) => state.codeMessages
  );
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

const InstallAppControls = () => {
  const { emit } = useAppContext();
  const generativeMessages = useMessageStore(
    (state) => state.codeMessages
  );

  const hasCode = generativeMessages.length > 0;
  const lastGenerativeMessage = hasCode
    ? generativeMessages[generativeMessages.length - 1]
    : null;

  const handleInstallApp = () => {
    if (!lastGenerativeMessage) return;

    const payload: GeneratedCode = {
      code: lastGenerativeMessage.content,
    };

    emit("write_tsx_and_add_route", payload);
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">
        Use the latest output to create a new route.
      </p>
      <Button
        variant="default"
        size="sm"
        onClick={handleInstallApp}
        disabled={!hasCode}
      >
        Install App
      </Button>
    </div>
  );
};

export const GenerativeArea = () => {
  return (
    <div className="flex flex-col h-full bg-background">
      <GenerativeHeader />
      <GenerativeMessageList />
      <div className="p-4 border-t border-border">
        <InstallAppControls />
      </div>
    </div>
  );
};
