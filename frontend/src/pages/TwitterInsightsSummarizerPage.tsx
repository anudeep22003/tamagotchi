import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/context/AppContext";
import { updateMessagesWithStreamData, createHumanMessage, type Message } from "@/lib/messageUtils";
import { Sparkles, Send, Wifi, WifiOff, Twitter, Loader2 } from "lucide-react";

/**
 * TwitterInsightsSummarizerPage
 *
 * A one-shot page that lets users ask questions and summarize their Twitter data.
 * It uses the existing AppContext (socket included) and follows the special instructions:
 * - Emits `request_knowledge_stream` with the list of messages so far.
 * - Listens on `receive_assistant_message` to update the chat/generative area.
 *
 * Notes:
 * - Elegantly styled with a grayscale theme using Tailwind.
 * - Uses available shadcn components: Card, Button, Badge.
 * - Does not wrap with AppProvider (root already provides it).
 * - Default export is provided for routes integration.
 */
const TwitterInsightsSummarizerPage: React.FC = () => {
  const {
    messages,
    setMessages,
    inputText,
    setInputText,
    isConnected,
    emit,
    socket,
    humanAreaMessages,
    generativeMessages,
  } = useAppContext();

  const isSendingRef = useRef(false);

  // Prepare a lightweight message payload for the backend
  const messagesForServer = useMemo(
    () =>
      messages.map((m) => ({
        role: m.type,
        content: m.content,
      })),
    [messages]
  );

  // Listen for assistant responses and update the message stream using the shared utility.
  useEffect(() => {
    if (!socket) return;

    const onAssistant = (data: unknown) => {
      // The backend may stream or send simple messages. We rely on the shared util to merge correctly.
      setMessages((prev) => updateMessagesWithStreamData(prev, data as any));
      isSendingRef.current = false;
    };

    socket.on("receive_assistant_message", onAssistant);
    return () => {
      socket.off("receive_assistant_message", onAssistant);
    };
  }, [socket, setMessages]);

  // Send the prompt to the backend to summarize Twitter data.
  const handleSend = useCallback(
    async (override?: string) => {
      const text = (override ?? inputText).trim();
      if (!text || !isConnected || isSendingRef.current) return;

      // Immediately add the human message locally for responsiveness.
      const newHuman = createHumanMessage(text);
      setMessages((prev) => [...prev, newHuman]);
      setInputText("");

      // Compose the full conversation (history + latest prompt)
      const messagesToSend = [
        ...messagesForServer,
        { role: "human", content: text },
      ];

      // Notify backend to load and reason over most up-to-date Twitter data.
      isSendingRef.current = true;
      emit("request_knowledge_stream", {
        messages: messagesToSend,
      });
    },
    [emit, inputText, isConnected, messagesForServer, setInputText, setMessages]
  );

  // Keyboard shortcut: Cmd/Ctrl + Enter to send.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Simple derived signals: first load hint and last assistant summary preview
  const assistantPreview = useMemo(() => {
    const lastAssistant =
      [...generativeMessages].reverse().find((m) => !!m.content) ??
      [...humanAreaMessages].reverse().find((m) => m.type === "assistant");
    return lastAssistant?.content ?? "";
  }, [generativeMessages, humanAreaMessages]);

  return (
    <div className="min-h-dvh bg-white text-black">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-black/10 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-black text-white grid place-items-center">
              <Twitter className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                Twitter Data Summarizer
              </h1>
              <p className="text-xs text-black/60">
                Ask questions. Get instant summaries and insights.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-black/20 text-xs">
              {isConnected ? (
                <span className="inline-flex items-center gap-1 text-black/80">
                  <Wifi className="size-3.5" /> Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-black/60">
                  <WifiOff className="size-3.5" /> Offline
                </span>
              )}
            </Badge>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat + Input */}
        <section className="lg:col-span-2 space-y-6">
          <Card className="border-black/10">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-medium">Conversation</h2>
                <Badge variant="outline" className="border-black/20">
                  Generative
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[48vh] overflow-y-auto pr-2">
              {humanAreaMessages.length === 0 ? (
                <div className="rounded-lg border border-dashed border-black/10 p-6 text-sm text-black/60">
                  Try asking:
                  <ul className="mt-2 list-disc pl-5 space-y-1">
                    <li>Summarize my last 30 days on Twitter.</li>
                    <li>What topics do I tweet about the most?</li>
                    <li>Which tweets had the highest engagement last month?</li>
                    <li>Give me a weekly activity summary.</li>
                  </ul>
                </div>
              ) : (
                humanAreaMessages.map((m: Message) => (
                  <div
                    key={(m as any).id ?? Math.random()}
                    className={
                      m.type === "human"
                        ? "flex justify-end"
                        : "flex justify-start"
                    }
                  >
                    <div
                      className={
                        "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed shadow-sm " +
                        (m.type === "human"
                          ? "bg-black text-white"
                          : "bg-black/[0.04] text-black")
                      }
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
            <CardFooter className="pt-2">
              <div className="w-full flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Ask about your tweets, engagement, topics, followers…"
                    rows={3}
                    className="w-full resize-none rounded-md border border-black/15 bg-white px-3 py-2 text-sm text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black/30"
                  />
                  <div className="mt-1 text-[11px] text-black/50">
                    Press Cmd/Ctrl + Enter to send
                  </div>
                </div>
                <Button
                  variant="default"
                  className="bg-black text-white hover:bg-black/90"
                  onClick={() => handleSend()}
                  disabled={!isConnected || !inputText.trim()}
                >
                  {isConnected ? (
                    <Send className="mr-2 size-4" />
                  ) : (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Send
                </Button>
              </div>
            </CardFooter>
          </Card>
        </section>

        {/* Insights Panel */}
        <aside className="lg:col-span-1 space-y-6">
          <Card className="border-black/10">
            <CardHeader className="pb-2">
              <h3 className="text-base font-medium">Smart Suggestions</h3>
              <p className="text-xs text-black/60">
                Quick prompts to get richer summaries.
              </p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {[
                "Summarize my top 5 tweets by engagement.",
                "What themes did I tweet about this quarter?",
                "Which days and hours am I most active?",
                "Show follower growth and notable mentions.",
              ].map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  className="border-black/20 text-black hover:bg-black/5"
                  onClick={() => handleSend(s)}
                >
                  <Sparkles className="mr-2 size-4" />
                  {s}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-black/10">
            <CardHeader className="pb-2">
              <h3 className="text-base font-medium">Latest Summary</h3>
              <p className="text-xs text-black/60">
                A brief of your most recent assistant insight.
              </p>
            </CardHeader>
            <CardContent>
              {assistantPreview ? (
                <div className="text-sm text-black whitespace-pre-wrap">
                  {assistantPreview}
                </div>
              ) : (
                <div className="text-sm text-black/60">
                  When you ask a question, your summary will appear here.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-black/10">
            <CardHeader className="pb-2">
              <h3 className="text-base font-medium">Status</h3>
              <p className="text-xs text-black/60">
                Connection and session health.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-black/70">Socket</span>
                <Badge
                  variant="outline"
                  className={
                    "border " +
                    (isConnected
                      ? "border-black/20 text-black"
                      : "border-black/30 text-black/60")
                  }
                >
                  {isConnected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-black/70">Messages</span>
                <span className="text-black/60">{messages.length}</span>
              </div>
            </CardContent>
          </Card>
        </aside>
      </main>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-4 py-6 text-xs text-black/50">
        Built for summarizing your Twitter data. Your data is fetched fresh each time you ask.
      </footer>
    </div>
  );
};

export default TwitterInsightsSummarizerPage;