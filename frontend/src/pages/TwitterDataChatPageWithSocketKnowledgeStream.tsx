import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/context/AppContext";
import { createHumanMessage, type Message } from "@/lib/messageUtils";

/**
 * TwitterDataChatPageWithSocketKnowledgeStream
 *
 * A single-page chat interface that lets the user converse with their Twitter data.
 * It uses the existing AppContext (socket, messages, setters) and follows the contract:
 * - On send: emit "request_knowledge_stream" with the full messages list (including the new user message).
 * - On receive: listen to "receive_assistant_message" to append assistant replies into the chat.
 *
 * Notes:
 * - The app assumes the root is already wrapped with AppProvider (as per project setup).
 * - We avoid introducing new dependencies beyond what's in package.json and the provided shadcn components.
 * - Elegant, grayscale-first UI using shadcn Card/Badge/Button and Tailwind.
 */

type AssistantSocketPayload = {
  content: string;
  // Optional fields if the server sends them
  id?: string;
  role?: "assistant";
};

const formatTimestamp = (d = new Date()) =>
  `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;

const StatusBadge = ({ connected }: { connected: boolean }) => {
  return (
    <Badge
      variant={connected ? "default" : "secondary"}
      className={connected ? "bg-black text-white hover:bg-black/90" : "bg-zinc-200 text-zinc-800"}
    >
      {connected ? "Connected" : "Reconnecting..."}
    </Badge>
  );
};

const MessageBubble = ({ message }: { message: Message }) => {
  const isHuman = message.type === "human";
  const isAssistant = message.type === "assistant" || message.type === "generative";

  return (
    <div
      className={[
        "flex w-full",
        isHuman ? "justify-end" : "justify-start",
      ].join(" ")}
      aria-live="polite"
    >
      <div
        className={[
          "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm border",
          isHuman
            ? "bg-black text-white border-black/80"
            : "bg-white text-black border-zinc-200",
        ].join(" ")}
      >
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
        <div
          className={[
            "mt-1 text-[10px] uppercase tracking-wider",
            isHuman ? "text-white/70" : "text-zinc-500",
          ].join(" ")}
        >
          {isHuman ? "You" : isAssistant ? "Assistant" : message.type}
          {" • "}
          {formatTimestamp()}
        </div>
      </div>
    </div>
  );
};

const QuickPrompt = ({
  label,
  onUse,
}: {
  label: string;
  onUse: (p: string) => void;
}) => {
  return (
    <Button
      variant="secondary"
      className="h-8 rounded-full bg-white text-zinc-800 border border-zinc-200 hover:bg-zinc-50"
      onClick={() => onUse(label)}
      type="button"
    >
      {label}
    </Button>
  );
};

const Composer = ({
  value,
  onChange,
  onSend,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
}) => {
  return (
    <div className="flex items-end gap-2 w-full">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ask about your tweets, followers, or engagement..."
        className="flex-1 min-h-[44px] max-h-[160px] resize-y rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-black placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
      />
      <Button
        onClick={onSend}
        className="h-[44px] px-5 rounded-xl bg-black text-white hover:bg-black/90 disabled:opacity-60"
        disabled={disabled || !value.trim()}
        type="button"
      >
        Send
      </Button>
    </div>
  );
};

const HelperEmptyState = () => {
  return (
    <div className="w-full py-10 text-center text-zinc-500">
      <p className="text-sm">Start a conversation to load your latest Twitter data.</p>
      <p className="text-xs mt-1">Your data is fetched fresh for each question.</p>
    </div>
  );
};

const Header = ({ isConnected }: { isConnected: boolean }) => {
  return (
    <CardHeader className="border-b border-zinc-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <CardTitle className="text-xl md:text-2xl tracking-tight text-black">
            Twitter Data Chat
          </CardTitle>
          <CardDescription className="text-zinc-500">
            Ask questions about your tweets, followers, and engagement in natural language.
          </CardDescription>
        </div>
        <StatusBadge connected={isConnected} />
      </div>
    </CardHeader>
  );
};

const Footer = ({
  onQuickPrompt,
}: {
  onQuickPrompt: (p: string) => void;
}) => {
  const prompts = useMemo(
    () => [
      "What were my top 3 tweets last month?",
      "Summarize my follower growth this quarter",
      "Which topics get the most engagement?",
      "When is the best time to tweet?",
    ],
    []
  );
  return (
    <CardFooter className="border-t border-zinc-200">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-500">Quick prompts:</span>
        {prompts.map((p) => (
          <QuickPrompt key={p} label={p} onUse={onQuickPrompt} />
        ))}
      </div>
    </CardFooter>
  );
};

function useTwitterKnowledgeSocketBridge() {
  const { socket, setMessages } = useAppContext();

  useEffect(() => {
    if (!socket) return;

    // Handler for assistant messages from the server
    const onAssistant = (payload: AssistantSocketPayload | string) => {
      const content = typeof payload === "string" ? payload : payload?.content || "";
      if (!content) return;

      const assistantMessage: Message = {
        // id is optional; if server provides one, keep it
        ...(typeof payload === "object" && payload?.id ? { id: payload.id } : {}),
        type: "assistant",
        content,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    };

    // Optionally handle simple errors pushed by the server
    const onError = (err: any) => {
      const content = typeof err === "string" ? err : err?.message || "An error occurred.";
      const assistantError: Message = { type: "assistant", content: `Error: ${content}` };
      setMessages((prev) => [...prev, assistantError]);
    };

    socket.on("receive_assistant_message", onAssistant);
    socket.on("receive_assistant_error", onError);

    return () => {
      socket.off("receive_assistant_message", onAssistant);
      socket.off("receive_assistant_error", onError);
    };
  }, [socket, setMessages]);
}

const TwitterDataChatPageWithSocketKnowledgeStream: React.FC = () => {
  const {
    messages,
    setMessages,
    inputText,
    setInputText,
    isConnected,
    emit,
  } = useAppContext();

  // Bridge socket event -> messages list
  useTwitterKnowledgeSocketBridge();

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Keep view pinned to the latest message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    // Append the human message locally for immediate feedback
    const newHuman = createHumanMessage(text);
    setMessages((prev) => [...prev, newHuman]);
    setInputText("");

    // Prepare messages for the knowledge request (role/content)
    const messagesToSend = [
      ...messages.map((m) => ({
        role: m.type,
        content: m.content,
      })),
      { role: "human", content: text },
    ];

    // Emit according to the Twitter knowledge stream contract
    emit("request_knowledge_stream", { messages: messagesToSend });
  }, [emit, inputText, messages, setInputText, setMessages]);

  const usePrompt = useCallback(
    (p: string) => {
      setInputText(p);
    },
    [setInputText]
  );

  const hasMessages = messages.length > 0;

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <Card className="border-zinc-200 shadow-sm bg-white">
        <Header isConnected={isConnected} />

        <CardContent className="h-[65vh] md:h-[70vh] overflow-y-auto space-y-4 bg-zinc-50/60 rounded-md p-4">
          {!hasMessages && <HelperEmptyState />}
          {messages.map((m, idx) => (
            <MessageBubble key={(m as any)?.id ?? idx} message={m} />
          ))}
          <div ref={scrollRef} />
        </CardContent>

        <div className="px-6 py-4 border-t border-zinc-200 bg-white">
          <Composer
            value={inputText}
            onChange={setInputText}
            onSend={handleSend}
            disabled={!isConnected}
          />
          <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">
            <span>
              Press Enter to send. Shift + Enter for new line.
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">
              Your latest Twitter data is fetched on each question.
            </span>
          </div>
        </div>

        <Footer onQuickPrompt={usePrompt} />
      </Card>
    </div>
  );
};

export default TwitterDataChatPageWithSocketKnowledgeStream;