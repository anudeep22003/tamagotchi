import { useEffect, useRef, useMemo, memo } from "react";
import { useAppContext } from "@/context/AppContext";
import { useCodeMessages } from "@/store/useMessageStore";
import { Button } from "./ui/button";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { GeneratedCode } from "@/types/serverTypes";
import type { BaseMessage } from "@/store/useMessageStore";

const GenerativeHeader = () => {
  return (
    <div className="p-4 border-b border-border flex justify-between items-center">
      <h2 className="text-lg font-medium">Generated Output</h2>
    </div>
  );
};

const GenerativeMessage = memo(({ message }: { message: BaseMessage }) => {
  return (
    <div className="bg-secondary/10 rounded-lg border border-border overflow-hidden">
      <SyntaxHighlighter
        language="typescript"
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: "1rem",
          fontSize: "0.875rem",
          backgroundColor: "#1e1e1e",
          borderRadius: "0.5rem",
        }}
        showLineNumbers
        wrapLines
        lineNumberStyle={{
          minWidth: "3em",
          paddingRight: "1em",
          color: "#858585",
        }}
      >
        {message.content}
      </SyntaxHighlighter>
    </div>
  );
});

const GenerativeMessageList = () => {
  const generativeMessages = useCodeMessages();
  const generativeMessageRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    generativeMessageRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  const messagesLength = generativeMessages.length;
  useEffect(() => {
    scrollToBottom();
  }, [messagesLength]);

  const memoizedMessages = useMemo(() => {
    return generativeMessages.map((message) => (
      <GenerativeMessage key={message.id} message={message} />
    ));
  }, [generativeMessages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {memoizedMessages}
      <div ref={generativeMessageRef} />
    </div>
  );
};

const InstallAppControls = () => {
  const { emit } = useAppContext();
  const generativeMessages = useCodeMessages();

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
