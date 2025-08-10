import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { useAppContext } from "@/context/AppContext";

// A playful, single-page dashboard that visualizes conversation dynamics "in three":
// 1) Flow over time (line)
// 2) Role distribution (pie)
// 3) Message size by role (bar)
//
// The UI uses a grayscale palette and shadcn-ui components, plus Recharts for visualization.
// It also integrates with the app context to reflect live socket status and messages.

type RoleKey = "human" | "assistant" | "generative" | "system" | string;

const GRAYS = ["#000000", "#1a1a1a", "#2e2e2e", "#444444", "#5c5c5c", "#737373", "#8a8a8a", "#a1a1a1", "#b8b8b8", "#cfcfcf"];
const PIE_COLORS = ["#111111", "#333333", "#555555", "#777777", "#999999", "#bbbbbb", "#dddddd"];

function wordCount(s: string) {
  if (!s) return 0;
  const words = s.trim().split(/\s+/);
  return words.filter(Boolean).length;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const ConversationalTriVizPlaygroundPage: React.FC = () => {
  // Grab state and actions from the application context
  const {
    messages,
    inputText,
    setInputText,
    handleSendMessage,
    isConnected,
  } = useAppContext();

  // Local playful prompt generator that keeps things fun but simple
  const [seed, setSeed] = useState(0);
  const playfulPrompts = useMemo(
    () => [
      "Tell me a three-line poem about grayscale pancakes.",
      "In three steps, explain how to juggle invisible cubes.",
      "Invent a game in three moves that can be played with a shadow.",
    ],
    []
  );

  // Choose a rotating prompt
  const nextPrompt = useMemo(
    () => playfulPrompts[seed % playfulPrompts.length],
    [seed, playfulPrompts]
  );

  // Create friendly derived data from messages for visualizations
  const { timelineData, pieData, barData, hasRealData, totalWords } = useMemo(() => {
    const hasData = messages.length > 0;

    // Build a simple timeline: index along x, words per message along y
    const timeline = messages.slice(-24).map((m, idx) => ({
      idx: messages.length > 24 ? messages.length - (messages.slice(-24).length - idx) : idx + 1,
      words: clamp(wordCount(m.content), 0, 400),
      type: m.type as RoleKey,
    }));

    // If no real data, craft a small, fun demo dataset (so the page looks good on first load)
    const demoTimeline =
      timeline.length > 0
        ? timeline
        : Array.from({ length: 12 }).map((_, i) => ({
            idx: i + 1,
            words: [5, 8, 13, 21, 34, 21, 18, 11, 7, 9, 14, 22][i],
            type: (["human", "assistant", "generative"] as RoleKey[])[i % 3],
          }));

    // Role distribution
    const roleCounts = new Map<RoleKey, number>();
    const roleLengths = new Map<RoleKey, number>();
    const rolesOfInterest: RoleKey[] = ["human", "assistant", "generative"];

    const iterateSource = hasData ? messages : demoTimeline.map((d) => ({ type: d.type, content: "demo content" }));
    iterateSource.forEach((m) => {
      const role = (m.type as RoleKey) ?? "unknown";
      roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
      roleLengths.set(role, (roleLengths.get(role) ?? 0) + wordCount((m as any).content ?? ""));
    });

    const pie = rolesOfInterest
      .map((role) => ({
        name: role,
        value: roleCounts.get(role) ?? 0,
      }))
      .filter((d) => d.value > 0);

    // Average message size by role (words)
    const bar = rolesOfInterest
      .map((role) => {
        const count = roleCounts.get(role) ?? 0;
        const total = roleLengths.get(role) ?? 0;
        return {
          role,
          avgWords: count > 0 ? Math.round(total / count) : 0,
        };
      })
      .filter((d) => d.avgWords > 0);

    // Total words across source for summary
    let totalW = 0;
    if (hasData) {
      totalW = messages.reduce((acc, m) => acc + wordCount(m.content), 0);
    } else {
      totalW = demoTimeline.reduce((acc, d) => acc + d.words, 0);
    }

    return {
      timelineData: demoTimeline,
      pieData: pie.length ? pie : [{ name: "human", value: 6 }, { name: "assistant", value: 4 }, { name: "generative", value: 2 }],
      barData: bar.length ? bar : [{ role: "human", avgWords: 12 }, { role: "assistant", avgWords: 16 }, { role: "generative", avgWords: 9 }],
      hasRealData: hasData,
      totalWords: totalW,
    };
  }, [messages]);

  // Helper to send the rotating prompt in one click
  const sendPlayfulPrompt = async () => {
    // Set the input text and trigger the app's send handler
    setInputText(nextPrompt);
    try {
      await handleSendMessage();
      setSeed((s) => s + 1);
    } catch {
      // No-op: transport errors are handled by the socket layer; keep UI silent and pleasant
    }
  };

  // Visual polish: set a subtle page title while mounted
  useEffect(() => {
    const prev = document.title;
    document.title = "TriViz — grayscale chat visualizer";
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="min-h-[calc(100dvh-2rem)] w-full px-4 py-6 md:px-8 bg-white text-black">
      {/* Header / Controls */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">TriViz — Conversational Visuals in Three</h1>
          <Badge className={`border border-black/20 ${isConnected ? "bg-black text-white" : "bg-white text-black"}`}>
            {isConnected ? "Live" : "Offline"}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:block text-sm text-neutral-600">
            {hasRealData ? "Live data from your conversation" : "Showing demo data until messages arrive"}
          </div>
          <Button
            onClick={sendPlayfulPrompt}
            className="bg-black text-white hover:bg-neutral-900 border border-black"
            variant="default"
          >
            Surprise me in three
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border border-black/20 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-700">Total messages</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-semibold">{messages.length || timelineData.length}</div>
            <div className="text-xs text-neutral-500">Counting the most recent flow</div>
          </CardContent>
        </Card>
        <Card className="border border-black/20 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-700">Total words</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-semibold">{totalWords}</div>
            <div className="text-xs text-neutral-500">Approximate</div>
          </CardContent>
        </Card>
        <Card className="border border-black/20 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-700">Connection</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-semibold">{isConnected ? "Connected" : "Disconnected"}</div>
            <div className="text-xs text-neutral-500">Socket status</div>
          </CardContent>
        </Card>
      </div>

      {/* The "three" visualizations */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 1) Flow over time */}
        <Card className="border border-black/20 bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Message Flow</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <XAxis dataKey="idx" stroke="#1f1f1f" tick={{ fill: "#444", fontSize: 12 }} />
                <YAxis stroke="#1f1f1f" tick={{ fill: "#444", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #00000020", borderRadius: 6 }}
                  labelStyle={{ color: "#000" }}
                  itemStyle={{ color: "#000" }}
                />
                <Line
                  type="monotone"
                  dataKey="words"
                  stroke="#000000"
                  strokeWidth={2}
                  dot={{ r: 2, stroke: "#000", fill: "#000" }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-3 text-xs text-neutral-600">Words per message across recent turns</div>
          </CardContent>
        </Card>

        {/* 2) Role distribution */}
        <Card className="border border-black/20 bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Who Speaks</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={88}
                  innerRadius={40}
                  stroke="#1f1f1f"
                  strokeWidth={1}
                >
                  {pieData.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #00000020", borderRadius: 6 }}
                  itemStyle={{ color: "#000" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap gap-2">
              {pieData.map((d, i) => (
                <Badge
                  key={d.name}
                  className="bg-white text-black border border-black/20"
                  style={{ boxShadow: "inset 0 0 0 10px transparent" }}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full mr-2"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  {d.name}: {d.value}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 3) Message size by role */}
        <Card className="border border-black/20 bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Average Message Size</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <XAxis dataKey="role" stroke="#1f1f1f" tick={{ fill: "#444", fontSize: 12 }} />
                <YAxis stroke="#1f1f1f" tick={{ fill: "#444", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #00000020", borderRadius: 6 }}
                  itemStyle={{ color: "#000" }}
                />
                <Legend wrapperStyle={{ color: "#000" }} />
                <Bar dataKey="avgWords" name="Avg words" fill="#1a1a1a" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 text-xs text-neutral-600">Average words per message per role</div>
          </CardContent>
        </Card>
      </div>

      {/* Footer hint */}
      <div className="mt-8 flex items-center justify-between text-xs text-neutral-500">
        <div>Built with shadcn-ui, Recharts, and a love for black & white.</div>
        <div>Tip: Click “Surprise me in three” to nudge the conversation.</div>
      </div>
    </div>
  );
};

export default ConversationalTriVizPlaygroundPage;