import React, { useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Plug } from "lucide-react";

/**
 * HelloWorldShadcnGrayscaleLanding
 * - A minimal, elegant "Hello World" page using shadcn/ui components in a grayscale theme.
 * - Showcases:
 *   - shadcn Card, Badge, Button
 *   - App context wiring (connection status, input handling, message counts)
 *   - Clean, accessible, and responsive layout
 *
 * Notes:
 * - The root of the app is already wrapped with AppProvider, so we use `useAppContext` directly.
 * - Only uses components that are confirmed available: card, badge, button.
 */
export default function HelloWorldShadcnGrayscaleLanding() {
  // Pull state and actions from the app-level context
  const {
    isConnected,
    inputText,
    setInputText,
    handleSendMessage,
    messages,
    humanMessages,
    generativeMessages,
  } = useAppContext();

  // A friendly dynamic greeting for an elegant touch
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  // A small helper to submit messages safely
  const onSend = async () => {
    if (!inputText.trim()) return;
    await handleSendMessage();
  };

  return (
    <div className="min-h-dvh bg-white text-black antialiased selection:bg-black selection:text-white">
      {/* Page container */}
      <div className="mx-auto flex min-h-dvh max-w-4xl flex-col items-center justify-center px-6 py-12">
        {/* Top status row */}
        <div className="mb-8 flex w-full items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Plug className={`size-4 ${isConnected ? "text-black" : "text-neutral-400"}`} />
            <span className="sr-only">Connection</span>
            <Badge
              className={`rounded-full border px-2 py-0.5 text-xs ${
                isConnected
                  ? "border-black bg-black text-white"
                  : "border-neutral-300 bg-neutral-100 text-neutral-600"
              }`}
              variant="outline"
            >
              {isConnected ? "Online" : "Offline"}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500">
            {/* Quick glance at counts derived from context */}
            <Badge variant="outline" className="border-neutral-300 bg-neutral-50">
              All: {messages.length}
            </Badge>
            <Badge variant="outline" className="border-neutral-300 bg-neutral-50">
              Human: {humanMessages.length}
            </Badge>
            <Badge variant="outline" className="border-neutral-300 bg-neutral-50">
              Generative: {generativeMessages.length}
            </Badge>
          </div>
        </div>

        {/* Main "Hello World" Card */}
        <Card className="w-full border border-black/10 bg-white shadow-sm transition-colors hover:border-black/20">
          <CardHeader className="space-y-2 border-b border-black/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/15 bg-black text-white">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold leading-none tracking-tight">
                  Hello, World!
                </h1>
                <p className="mt-1 text-sm text-neutral-500">
                  {greeting}. This is a minimal shadcn UI starter in grayscale.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-6">
            <p className="text-sm leading-6 text-neutral-700">
              You can type a message below and hit send to interact with the app context and
              your socket-based backend. This demonstrates how the UI and context work together.
            </p>

            {/* Basic input built with native HTML + Tailwind (shadcn input not listed as available) */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Say hello to the world..."
                className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm text-black outline-none ring-0 placeholder:text-neutral-400 focus:border-black/40"
              />
              <Button
                onClick={onSend}
                className="gap-2 bg-black text-white hover:bg-black/90"
                disabled={!inputText.trim()}
              >
                <Send className="size-4" />
                Send
              </Button>
            </div>

            {/* A tiny legend-like row for visual balance */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              <Badge variant="outline" className="border-neutral-300 bg-neutral-50">
                Minimal
              </Badge>
              <Badge variant="outline" className="border-neutral-300 bg-neutral-50">
                Grayscale
              </Badge>
              <Badge variant="outline" className="border-neutral-300 bg-neutral-50">
                Shadcn UI
              </Badge>
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-black/10 p-6 text-xs text-neutral-500">
            <span>Made with React and shadcn/ui</span>
            <span>Base palette: black & white</span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}