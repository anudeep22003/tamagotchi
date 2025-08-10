import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAppContext } from "@/context/AppContext";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Bot,
  User,
  Wifi,
  WifiOff,
  Sparkles,
  Trash2,
  Terminal,
  Loader2,
} from "lucide-react";

/**
 * ConversationalWorkspaceChatPage
 *
 * A one-shot, elegant grayscale chat page leveraging the shared AppContext.
 * - Uses Card, Button, Badge (shadcn) composed with Tailwind for layout
 * - Renders messages with streaming support, auto-scroll, and role-specific visuals
 * - Provides connection status, message filters, clear/reset, and input with Enter-to-send
 * - No AppProvider wrapping (the root already wraps it)
 */
const ConversationalWorkspaceChatPage: React.FC = () => {
  // Pull state and actions from the existing app context
  const {
    messages,
    setMessages,
    inputText,
    setInputText,
    showGenerative,
    setShowGenerative,
    handleSendMessage,
    humanAreaMessages,
    generativeMessages,
    isConnected,
    socket,
  } = useAppContext();

  // Track sending state locally for subtle UI feedback
  const [isSending, setIsSending] = useState(false);

  // Choose which messages to display based on the toggle
  const displayedMessages = useMemo(
    () => (showGenerative ? generativeMessages : humanAreaMessages),
    [showGenerative, generativeMessages, humanAreaMessages]
  );

  // Auto-scroll behavior whenever messages update
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [displayedMessages.length]);

  // Sends a message through the context function
  const send = useCallback(async () => {
    if (!inputText.trim() || isSending) return;
    setIsSending(true);
    try {
      await handleSendMessage();
    } finally {
      // Delay slightly to allow the stream to start before toggling off sending
      setTimeout(() => setIsSending(false), 150);
    }
  }, [handleSendMessage, inputText, isSending]);

  // Enter to send; Shift+Enter for new line
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Clear messages utility
  const clearAll = () => {
    setMessages([]);
  };

  // Helpers for rendering
  const renderRoleBadge = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower === "human") {
      return (
        <Badge className="rounded-full bg-black text-white hover:bg-black/90">
          <User className="mr-1.5 h-3.5 w-3.5" />
          You
        </Badge>
      );
    }
    if (roleLower === "assistant") {
      return (
        <Badge className="rounded-full bg-neutral-800 text-white hover:bg-neutral-800/90">
          <Bot className="mr-1.5 h-3.5 w-3.5" />
          Assistant
        </Badge>
      );
    }
    return (
      <Badge className="rounded-full bg-neutral-600 text-white hover:bg-neutral-600/90">
        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
        Generative
      </Badge>
    );
  };

  const renderMessageContent = (content: unknown) => {
    if (typeof content === "string") {
      return content;
    }
    try {
      return JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  };

  // Lightweight connection detail
  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 text-sm">
      {isConnected ? (
        <>
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-neutral-700">Connected</span>
          <Wifi className="h-4 w-4 text-neutral-700" />
        </>
      ) : (
        <>
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-neutral-400" />
          <span className="text-neutral-500">Disconnected</span>
          <WifiOff className="h-4 w-4 text-neutral-500" />
        </>
      )}
      <span className="ml-2 text-neutral-400">•</span>
      <span className="truncate text-xs text-neutral-500">
        {socket?.id ? `Socket: ${socket.id}` : "No socket id"}
      </span>
    </div>
  );

  return (
    <div className="mx-auto flex h-[100dvh] max-w-6xl flex-col gap-4 px-4 py-6 text-neutral-900">
      {/* Page header */}
      <header className="flex items-center justify-between">
        <div className="flex items-end gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-black text-white">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Conversational Workspace</h1>
            <p className="text-sm text-neutral-500">A focused, grayscale chat experience</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionStatus />
          <div className="h-4 w-px bg-neutral-200" />
          <Button
            variant="secondary"
            className={`border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100 ${
              showGenerative ? "opacity-100" : "opacity-70"
            }`}
            onClick={() => setShowGenerative((v) => !v)}
            title="Toggle generative responses view"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {showGenerative ? "Generative View" : "Assistant View"}
          </Button>
          <Button
            variant="ghost"
            className="text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            onClick={clearAll}
            title="Clear all messages"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>
      </header>

      {/* Main content area: Chat + Side panel */}
      <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-5">
        {/* Chat column */}
        <Card className="col-span-1 flex h-full flex-col border-neutral-200 bg-white md:col-span-3">
          <CardHeader className="border-b border-neutral-100 pb-3">
            <CardTitle className="text-lg">Chat</CardTitle>
            <CardDescription className="text-neutral-500">
              {showGenerative ? "Exploring generative results" : "Conversing with the assistant"}
            </CardDescription>
          </CardHeader>

          {/* Scrollable messages */}
          <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
            <div ref={scrollRef} className="h-full space-y-4 overflow-y-auto px-4 py-5">
              {displayedMessages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-neutral-200 bg-neutral-50 py-14 text-center">
                  <Sparkles className="h-6 w-6 text-neutral-400" />
                  <p className="max-w-sm text-sm text-neutral-500">
                    Start a conversation. Shift+Enter for a new line. Enter to send.
                  </p>
                </div>
              ) : (
                displayedMessages.map((m) => {
                  const role = m.type ?? "assistant";
                  const isYou = String(role).toLowerCase() === "human";
                  return (
                    <div key={m.id ?? Math.random()} className="flex w-full gap-3">
                      {/* Avatar */}
                      <div
                        className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                          isYou ? "bg-black text-white" : "bg-neutral-900 text-white"
                        }`}
                        title={isYou ? "You" : role}
                      >
                        {isYou ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>

                      {/* Message bubble */}
                      <div className="flex max-w-[80%] flex-col">
                        <div className="mb-1 flex items-center gap-2">
                          {renderRoleBadge(role)}
                          {m.createdAt ? (
                            <span className="text-xs text-neutral-400">
                              {new Date(m.createdAt).toLocaleTimeString()}
                            </span>
                          ) : null}
                        </div>

                        <div
                          className={`whitespace-pre-wrap rounded-lg border px-3 py-2 text-sm leading-relaxed ${
                            isYou
                              ? "border-neutral-200 bg-white text-neutral-900"
                              : "border-neutral-100 bg-neutral-50 text-neutral-900"
                          }`}
                        >
                          {renderMessageContent(m.content)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>

          {/* Composer */}
          <CardFooter className="border-t border-neutral-100 p-3">
            <div className="flex w-full items-end gap-2">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Type your message..."
                className="h-12 max-h-40 flex-1 resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-500"
              />
              <Button
                onClick={send}
                disabled={!inputText.trim() || isSending}
                className="h-10 border border-neutral-300 bg-black text-white hover:bg-black/90 disabled:opacity-50"
                title="Send message"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Side panel */}
        <div className="col-span-1 flex flex-col gap-4 md:col-span-2">
          <Card className="border-neutral-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Session</CardTitle>
              <CardDescription className="text-neutral-500">
                Quick details and controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Mode</span>
                <div className="flex items-center gap-2">
                  {showGenerative ? (
                    <Badge className="rounded-full bg-neutral-900 text-white">Generative</Badge>
                  ) : (
                    <Badge className="rounded-full bg-black text-white">Assistant</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Messages</span>
                <span className="font-medium text-neutral-900">{messages.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-500">You</span>
                <span className="font-medium text-neutral-900">
                  {messages.filter((m) => (m.type ?? "").toLowerCase() === "human").length}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Assistant</span>
                <span className="font-medium text-neutral-900">
                  {messages.filter((m) => (m.type ?? "").toLowerCase() === "assistant").length}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Generative</span>
                <span className="font-medium text-neutral-900">
                  {messages.filter((m) => (m.type ?? "").toLowerCase() === "generative").length}
                </span>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button
                variant="secondary"
                className="w-full border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100"
                onClick={() => setShowGenerative(false)}
              >
                Assistant
              </Button>
              <Button
                variant="secondary"
                className="w-full border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100"
                onClick={() => setShowGenerative(true)}
              >
                Generative
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-neutral-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tips</CardTitle>
              <CardDescription className="text-neutral-500">
                Get the most out of your chat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-neutral-700">
              <ul className="list-disc space-y-2 pl-5">
                <li>Press Enter to send, Shift+Enter for a new line.</li>
                <li>Use the top-right toggle to switch between Assistant and Generative views.</li>
                <li>Click Clear to reset the session.</li>
                <li>Share code or URLs—responses may stream in real time.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer branding */}
      <footer className="mt-2 flex items-center justify-between text-xs text-neutral-400">
        <span>Black & White. Minimal. Intentional.</span>
        <span>Built with shadcn/ui + Tailwind</span>
      </footer>
    </div>
  );
};

export default ConversationalWorkspaceChatPage;