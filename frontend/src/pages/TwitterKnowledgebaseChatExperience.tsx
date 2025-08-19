import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { useAppContext } from "@/context/AppContext";
import {
  Send,
  Wifi,
  WifiOff,
  Twitter,
  RefreshCcw,
  Sparkles,
  Loader2,
} from "lucide-react";

/**
 * A single-file, one-shot page that enables chatting with the user's Twitter-backed knowledgebase.
 * - Uses the existing App context (already provided at the app root) via useAppContext.
 * - Emits to `request_knowledge_stream` with the list of messages so far + the new human prompt.
 * - Listens to `receive_assistant_message` for assistant responses and appends them to the context messages.
 * - Elegant, grayscale UI built with available shadcn components (card, button, badge).
 * - No additional installs required.
 */
const TwitterKnowledgebaseChatExperience: React.FC = () => {
  // Pull state and utilities from the global App context
  const {
    messages,
    setMessages,
    inputText,
    setInputText,
    isConnected,
    emit,
    socket,
  } = useAppContext();

  // Local UI state for send/loading and focus handling
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Derive the messages we want to render in the chat area (human + assistant)
  const chatMessages = useMemo(
    () => messages.filter((m) => m.type === "human" || m.type === "assistant"),
    [messages]
  );

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Listen for assistant responses that come via the "receive_assistant_message" event
  useEffect(() => {
    if (!socket) return;

    const handleAssistantMessage = (data: unknown) => {
      // Normalize the assistant message content
      let content = "";
      if (typeof data === "string") {
        content = data;
      } else if (
        data &&
        typeof data === "object" &&
        "content" in (data as Record<string, unknown>) &&
        typeof (data as Record<string, unknown>).content === "string"
      ) {
        content = (data as { content: string }).content;
      } else {
        // Fallback for any unexpected shape
        content = JSON.stringify(data);
      }

      // Append assistant message into the global message list
      setMessages((prev) => [
        ...prev,
        {
          // We only rely on 'type' and 'content' in rendering and downstream usage
          type: "assistant",
          content,
        } as any,
      ]);

      setIsSending(false);
    };

    socket.on("receive_assistant_message", handleAssistantMessage);
    return () => {
      socket.off("receive_assistant_message", handleAssistantMessage);
    };
  }, [socket, setMessages]);

  // Send message to the knowledge stream (Twitter knowledgebase)
  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !emit) return;

    setIsSending(true);

    // Optimistically add the human message to the global transcript
    setMessages((prev) => [
      ...prev,
      {
        type: "human",
        content: trimmed,
      } as any,
    ]);

    // Build the message history in the server-friendly shape
    const messagesToSend = [
      ...messages.map((m) => ({
        role: m.type,
        content: m.content,
      })),
      { role: "human", content: trimmed },
    ];

    // Clear input and emit to the server to load fresh Twitter knowledge and respond
    setInputText("");
    try {
      emit("request_knowledge_stream", { messages: messagesToSend });
    } catch {
      // In case of any emit error, release loading indicator
      setIsSending(false);
    }
  };

  // Optional: quickly refresh the loaded knowledge without adding a new user message
  const handleRefreshKnowledge = () => {
    if (!emit) return;
    // Send the conversation so far for context; server can refresh underlying knowledge
    const messagesToSend = messages.map((m) => ({
      role: m.type,
      content: m.content,
    }));
    emit("request_knowledge_stream", { messages: messagesToSend });
  };

  // Send on Enter (without Shift), new line on Shift+Enter
  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (
    e
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex h-dvh w-full flex-col bg-white text-black">
      {/* Header */}
      <header className="border-b border-black/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-black/15 bg-black text-white">
              <Twitter className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold tracking-tight">
                Twitter Knowledge Chat
              </h1>
              <p className="text-xs text-black/60">
                Ask questions powered by your latest Twitter knowledgebase.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={`flex items-center gap-1 border ${
                isConnected
                  ? "border-emerald-600/30 bg-emerald-50 text-emerald-700"
                  : "border-rose-600/30 bg-rose-50 text-rose-700"
              }`}
            >
              {isConnected ? (
                <>
                  <Wifi className="h-3.5 w-3.5" /> Connected
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" /> Disconnected
                </>
              )}
            </Badge>

            <Button
              variant="secondary"
              onClick={handleRefreshKnowledge}
              className="border border-black/10 bg-white hover:bg-black/5"
              title="Refresh knowledge from Twitter"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto grid h-full w-full max-w-6xl grid-rows-[1fr_auto] gap-4 px-4 py-4 md:grid-cols-[2fr_1fr] md:grid-rows-1">
        {/* Chat Area */}
        <Card className="row-start-1 h-full border-black/10 bg-white shadow-none md:col-span-1">
          <CardHeader className="border-b border-black/10 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-black/70">
                <Sparkles className="h-4 w-4" />
                Conversational Assistant
              </div>
            </div>
          </CardHeader>

          {/* Messages */}
          <CardContent className="relative h-[55vh] overflow-y-auto p-0 md:h-[calc(100vh-16rem)]">
            <div ref={scrollRef} className="flex h-full flex-col gap-2 p-4">
              {chatMessages.length === 0 ? (
                <div className="mx-auto mt-16 max-w-md text-center text-black/50">
                  <p className="text-sm">
                    Start by asking a question about your tweets, threads, or
                    mentions. Press Enter to send, Shift+Enter for a new line.
                  </p>
                </div>
              ) : (
                chatMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      m.type === "human" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg border px-3 py-2 text-sm leading-relaxed shadow-sm ${
                        m.type === "human"
                          ? "border-black/20 bg-black text-white"
                          : "border-black/10 bg-black/5 text-black"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))
              )}

              {isSending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-black/5 px-3 py-2 text-sm text-black">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Thinking...
                  </div>
                </div>
              )}
            </div>
          </CardContent>

          {/* Composer */}
          <CardFooter className="border-t border-black/10">
            <div className="flex w-full items-end gap-2">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your Twitter knowledgebase..."
                className="h-10 min-h-10 w-full resize-y rounded-md border border-black/15 bg-white px-3 py-2 text-sm text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black/30"
              />
              <Button
                onClick={handleSend}
                disabled={!inputText.trim() || !isConnected || isSending}
                className="border border-black/10 bg-black text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
                title={
                  !isConnected
                    ? "Socket disconnected"
                    : inputText.trim()
                    ? "Send"
                    : "Type a message first"
                }
              >
                <Send className="mr-2 h-4 w-4" />
                Send
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Right Panel: Session Info */}
        <div className="row-start-2 md:row-start-1">
          <Card className="h-full border-black/10 bg-white shadow-none">
            <CardHeader className="border-b border-black/10 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md border border-black/15 bg-black text-white">
                    <Twitter className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold">
                      Knowledge Session
                    </h2>
                    <p className="text-xs text-black/60">
                      Live context synced from Twitter
                    </p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="border border-black/15 bg-white text-black"
                >
                  Grayscale
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              <div className="rounded-md border border-black/10 bg-black/5 p-3 text-xs text-black/70">
                Your questions are answered using your latest Twitter data. Each
                time you ask something, the app refreshes what it knows so it’s
                always up to date.
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-black/60">Status</span>
                  <span className="font-medium">
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-black/60">Messages</span>
                  <span className="font-medium">{messages.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-black/60">Interaction</span>
                  <span className="font-medium">Streaming</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    // Focus the composer quickly
                    inputRef.current?.focus();
                  }}
                  className="w-full border border-black/10 bg-white hover:bg-black/5"
                >
                  Start typing
                </Button>
              </div>
            </CardContent>

            <CardFooter className="border-t border-black/10 p-4">
              <p className="text-xs leading-relaxed text-black/50">
                Tip: Ask about threads you wrote, mentions this week, or key
                topics you’ve been engaging with. Use Shift+Enter for a new
                line.
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default TwitterKnowledgebaseChatExperience;