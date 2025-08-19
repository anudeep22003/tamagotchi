import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Copy, Check } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

/**
 * MinimalGrayscaleHelloWorldPage
 *
 * A single-file, elegant grayscale "Hello, World!" page using shadcn UI.
 * - Uses Card, Badge, and Button components for clean presentation
 * - Reads socket connection state from the existing AppContext
 * - Provides a copy-to-clipboard interaction
 *
 * Notes:
 * - This file is meant to live under /pages and be default-exported for your routes.ts setup.
 * - The app root already wraps with AppProvider, so we directly use useAppContext.
 */
const MinimalGrayscaleHelloWorldPage: React.FC = () => {
  const { isConnected, socket } = useAppContext();

  // Local UI states
  const [copied, setCopied] = useState(false);
  const [greeting, setGreeting] = useState("Hello, world!");

  // Reset the "copied" state after a short timeout for subtle feedback
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1200);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(greeting);
      setCopied(true);
    } catch {
      // Silently fail; clipboard might not be supported
      setCopied(false);
    }
  };

  const toggleGreeting = () => {
    setGreeting((prev) => (prev === "Hello, world!" ? "Hello, World." : "Hello, world!"));
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-white to-gray-100 text-gray-900">
      <div className="mx-auto max-w-2xl px-6 pt-24 pb-12">
        <Card className="border-gray-200 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.4)]">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black text-white">
                <Sparkles size={16} />
              </div>
              <Badge
                variant="outline"
                className={
                  isConnected
                    ? "border-black text-black"
                    : "border-gray-400 text-gray-500"
                }
              >
                {isConnected ? "Connected" : "Offline"}
              </Badge>
            </div>
            <CardTitle className="text-3xl tracking-tight">Hello, World</CardTitle>
            <CardDescription className="text-sm text-gray-500">
              A minimal, elegant greeting built with shadcn UI in timeless grayscale.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
              <p className="text-4xl font-semibold tracking-tight text-black">{greeting}</p>
              <p className="mt-2 text-xs text-gray-500">
                {socket?.id ? `Session: ${socket.id}` : "No session id"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                onClick={handleCopy}
                className="w-full justify-center bg-black text-white hover:bg-gray-900"
                aria-label="Copy greeting to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" /> Copy
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={toggleGreeting}
                className="w-full justify-center border-gray-300 text-gray-800 hover:bg-gray-100"
                aria-label="Toggle greeting punctuation"
              >
                Toggle Style
              </Button>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col items-center gap-1 sm:flex-row sm:justify-between">
            <span className="text-xs text-gray-500">
              Designed in monochrome for focus and clarity.
            </span>
            <span className="text-xs text-gray-400">shadcn + React</span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default MinimalGrayscaleHelloWorldPage;