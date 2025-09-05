import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { useHumanAreaMessages } from "@/store/useMessageStore";
import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import { GitHubUrlInput } from "./GitHubUrlInput";
import { MessageInput } from "./MessageInput";
import { MarkdownRenderer } from "./MarkdownRenderer";

const GitHubHeader = () => {
  return (
    <div className="p-4 border-b border-border">
      <h2 className="text-lg font-medium">🔍 GitHub Repository Teardown</h2>
      <p className="text-sm text-muted-foreground mt-1">Analyze any public GitHub repository</p>
    </div>
  );
};


const MessageList = () => {
  const humanAreaMessages = useHumanAreaMessages();
  const messageEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    // Use setTimeout to ensure DOM is updated after markdown rendering
    setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  }, []);

  const messagesLength = humanAreaMessages.length;
  const lastMessageContent =
    humanAreaMessages[humanAreaMessages.length - 1]?.content || "";

  useEffect(() => {
    scrollToBottom();
  }, [messagesLength, lastMessageContent, scrollToBottom]);

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
            onContentLoad={scrollToBottom}
          />
        </div>
      </div>
    ));
  }, [humanAreaMessages, scrollToBottom]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {memoizedMessages}
      <div ref={messageEndRef} />
    </div>
  );
};

const RecordingControls = () => {
  const {
    showGenerative,
    setShowGenerative,
    handleCodeSendClick,
    handleWriterSendClick,
    handleClaudeSendClick,
  } = useAppContext();

  const handleToggleGenerative = () => {
    setShowGenerative(!showGenerative);
  };

  return (
    <div className="flex gap-2 justify-between">
      <Button variant="outline" size="sm" onClick={handleCodeSendClick}>
        Code
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClaudeSendClick}
      >
        Claude
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleWriterSendClick}
      >
        {"Write >"}
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

const GitHubInputSection = ({ onSubmit, disabled }: { onSubmit: (url: string) => void; disabled: boolean }) => {
  return (
    <div className="p-4 border-t border-border">
      <GitHubUrlInput onSubmit={onSubmit} disabled={disabled} />
    </div>
  );
};

export const HumanArea = () => {
  const [currentMode, setCurrentMode] = useState<'github' | 'conversation'>('github');
  const [isProcessing, setIsProcessing] = useState(false);
  const { handleClaudeSendClick, setInputText } = useAppContext();

  const handleGitHubSubmit = useCallback(async (url: string) => {
    setIsProcessing(true);
    setInputText(`Please analyze this GitHub repository: ${url}`);
    
    // Switch to conversation mode and trigger analysis
    setCurrentMode('conversation');
    
    try {
      await handleClaudeSendClick();
    } catch (error) {
      console.error('Failed to start analysis:', error);
      // Return to GitHub input mode on error
      setCurrentMode('github');
    } finally {
      setIsProcessing(false);
    }
  }, [handleClaudeSendClick, setInputText]);

  const handleBackToGitHub = useCallback(() => {
    if (!isProcessing) {
      setCurrentMode('github');
      setInputText('');
    }
  }, [isProcessing, setInputText]);

  if (currentMode === 'github') {
    return (
      <div className="flex flex-col h-full bg-background border-r border-border">
        <GitHubHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md px-4">
            <GitHubInputSection onSubmit={handleGitHubSubmit} disabled={isProcessing} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background border-r border-border">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-medium">Conversation</h2>
        {!isProcessing && (
          <Button variant="outline" size="sm" onClick={handleBackToGitHub}>
            ← New Analysis
          </Button>
        )}
      </div>
      <MessageList />
      <div className="p-4 border-t border-border">
        <MessageInput />
        <RecordingControls />
      </div>
    </div>
  );
};
