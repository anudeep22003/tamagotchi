import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Twitter, Wifi, WifiOff } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { createHumanMessage } from "@/lib/messageUtils";

// This page implements a chat UI specialized for chatting with the user's Twitter data.
// It uses the socket connection provided by the app context and follows the contract:
// - Emit "request_knowledge_stream" with the list of messages so far (including the current human message)
// - Listen for "receive_assistant_message" to display assistant responses
// The UI uses shadcn/ui components (Card, Button, Badge) and a grayscale palette for elegance.

type ChatRole = "human" | "assistant" | "generative";

// Provide a minimal local type to avoid over-coupling with internals.
// The AppContext messages are compatible with this shape.
type ChatMessage = {
  id?: string;
  type: ChatRole;
  content: string;
};

const statusDot = (connected: boolean) =>
  connected ? "bg-emerald-500" : "bg-neutral-400";

// Helper to map stored messages to a generic role/content array suitable for sending to the server.
// We map "generative" to "assistant" role when sending back to the server for clarity.
const toServerMessageList = (messages: ChatMessage[]) =>
  messages.map((m) => ({
    role: m.type === "generative" ? "assistant" : m.type,
    content: m.content,
  }));

// Distinct component name per instructions
const TwitterKnowledgeChatPage: React.FC = () => {
  const {
    messages,
    setMessages,
    isConnected,
    emit,
    socket,
  } = useAppContext();

  // Local input state for composing a new message
  const [draft, setDraft] = useState("");

  // Keep a ref to the scrollable message container to auto-scroll on new messages
  const listRef = useRef<HTMLDivElement | null>(null);

  // Derived message list for this UI:
  // We show human and generative messages side-by-side in the transcript.
  // If other message types exist in the system, you can include them here as needed.
  const visibleMessages = useMemo(
    () => messages.filter((m) => m.type === "human" || m.type === "generative"),
    [messages]
  );

  // Scroll to the bottom whenever messages change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [visibleMessages.length]);

  // Listen for assistant responses on "receive_assistant_message"
  useEffect(() => {
    if (!socket) return;

    const handleAssistant = (payload: { content: string } | string) => {
      const content = typeof payload === "string" ? payload : payload?.content ?? "";
      if (!content) return;

      // Append as a "generative" message so it surfaces in the transcript and in generative views.
      const assistantMessage: ChatMessage = {
        type: "generative",
        content,
      };
      setMessages((prev) => [...prev, assistantMessage as any]);
    };

    socket.on("receive_assistant_message", handleAssistant);
    return () => {
      socket.off("receive_assistant_message", handleAssistant);
    };
  }, [socket, setMessages]);

  // Send the draft to the server and optimistically add it to the transcript
  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text) return;

    // Create and append the human message for immediate UI feedback
    const humanMsg = createHumanMessage(text) as unknown as ChatMessage;
    setMessages((prev) => [...prev, humanMsg as any]);
    setDraft("");

    // Build message history for the server: include all previous + this new one
    const historyWithNew = toServerMessageList([
      ...messages,
      { type: "human", content: text },
    ] as ChatMessage[]);

    // Emit the knowledge request to pull fresh Twitter data and answer
    // The backend is expected to stream or respond via "receive_assistant_message"
    emit("request_knowledge_stream", { messages: historyWithNew });
  }, [draft, messages, emit, setMessages]);

  // Convenience: send on Enter (Shift+Enter makes a newline)
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Basic metrics derived from the current chat
  const counts = useMemo(() => {
    const humanCount = messages.filter((m) => m.type === "human").length;
    const assistantCount = messages.filter((m) => m.type === "generative").length;
    return { humanCount, assistantCount, total: messages.length };
  }, [messages]);

  return (
    <div className="min-h-[calc(100dvh-0px)] w-full bg-white text-black">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`absolute -right-1 -top-1 h-2 w-2 rounded-full ${statusDot(isConnected)}`} />
              <Twitter className="h-6 w-6 text-black" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Twitter Knowledge Chat</h1>
              <p className="text-xs text-neutral-500">
                Ask questions about your Twitter data. Fresh data is loaded per question.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="border border-neutral-200 bg-white text-neutral-700">
              {isConnected ? (
                <span className="inline-flex items-center gap-1">
                  <Wifi className="h-3.5 w-3.5" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <WifiOff className="h-3.5 w-3.5" /> Offline
                </span>
              )}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-3">
        {/* Chat Card */}
        <Card className="col-span-2 border-neutral-200 bg-white">
          <div className="flex h-[68vh] flex-col">
            {/* Transcript */}
            <div
              ref={listRef}
              className="flex-1 space-y-4 overflow-y-auto p-4"
            >
              {visibleMessages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-neutral-500">
                  <p className="text-sm">No messages yet.</p>
                  <p className="text-xs">
                    Try asking: "Summarize the trends in my last 30 tweets" or "What topics do I engage with most?"
                  </p>
                </div>
              ) : (
                visibleMessages.map((m, idx) => {
                  const isHuman = m.type === "human";
                  return (
                    <div
                      key={idx}
                      className={`flex ${isHuman ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={[
                          "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
                          isHuman
                            ? "bg-black text-white"
                            : "bg-neutral-100 text-neutral-900 border border-neutral-200",
                        ].join(" ")}
                      >
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {m.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-neutral-200 p-3">
              <div className="flex items-end gap-2">
                <div className="relative w-full">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Ask about your Twitter data…"
                    rows={2}
                    className="w-full resize-none rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <div className="pointer-events-none absolute right-3 top-2 text-[10px] text-neutral-400">
                    Enter to send • Shift+Enter for newline
                  </div>
                </div>
                <Button
                  onClick={handleSend}
                  disabled={!draft.trim()}
                  className="rounded-xl bg-black text-white hover:bg-neutral-900 disabled:opacity-60"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </Button>
              </div>
              {!isConnected && (
                <p className="mt-2 text-xs text-neutral-500">
                  You are currently offline. Your message will try to send when reconnected.
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Right-side Info Card */}
        <Card className="h-fit border-neutral-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-900">Session</h2>
            <Badge variant="secondary" className="border border-neutral-200 bg-white text-neutral-700">
              {counts.total} msg
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">You</span>
              <span className="font-medium text-neutral-900">{counts.humanCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Assistant</span>
              <span className="font-medium text-neutral-900">{counts.assistantCount}</span>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-xs text-neutral-600">
              Tips:
              {" "}
              - Ask for summaries, themes, or engagement patterns
              {" "}
              - Request examples: “Show my top 5 most-liked tweets”
              {" "}
              - Compare periods: “How did my engagement change this month vs last?”
            </p>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 text-xs text-neutral-500">
          <span>Built for exploring your Twitter knowledge graph in chat form.</span>
          <span>Grayscale UI • Shadcn components</span>
        </div>
      </footer>
    </div>
  );
};

export default TwitterKnowledgeChatPage;