import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useAppContext } from "@/context/AppContext";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

// Elegant grayscale chart demo with dummy data.
// Notes:
// - Uses shadcn/ui components: Card, Button, Badge, Chart
// - Uses Recharts for rendering charts within ChartContainer
// - Pulls socket connection status from the provided AppContext
// - Designed to be placed under /pages and used directly in routes.tsx

type Period = "7D" | "30D" | "YTD";

// Utility formatters
const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const formatNumber = (n: number) => new Intl.NumberFormat("en-US").format(n);

// Main page component (default export). The name is intentionally descriptive for clarity.
export default function GrayscaleChartsShowcasePageElegant() {
  // Pull connection state from the app context. We won't mutate messages here; this is just a demo page.
  const { isConnected } = useAppContext();

  // Which period's dummy data to display
  const [period, setPeriod] = useState<Period>("7D");

  // Chart visual config (grayscale colors)
  const chartConfig = useMemo<ChartConfig>(
    () => ({
      revenue: {
        label: "Revenue",
        color: "#111111", // near-black
      },
      orders: {
        label: "Orders",
        color: "#6B7280", // gray-500
      },
      sessions: {
        label: "Sessions",
        color: "#A3A3A3", // gray-400
      },
      aov: {
        label: "Avg. Order Value",
        color: "#1F2937", // gray-800
      },
    }),
    []
  );

  // Generate some nice, stable dummy data for each period
  const { seriesRevenue, seriesCommerce, seriesAOV, headLabel, subLabel } = useMemo(() => {
    // base seeds to keep numbers sensible
    const make7D = () => {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return days.map((d, i) => {
        const revenue = 1000 + i * 120 + (i % 2 === 0 ? 80 : -40);
        const orders = 20 + i * 3 + (i % 3 === 0 ? 5 : 0);
        const sessions = 600 + i * 60 + (i % 2 === 1 ? 70 : 30);
        const aov = revenue / orders;
        return { label: d, revenue, orders, sessions, aov };
      });
    };

    const make30D = () => {
      const days = Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);
      return days.map((d, i) => {
        const revenue = 900 + i * 55 + Math.round(60 * Math.sin(i / 3));
        const orders = 18 + Math.round(i * 1.2) + (i % 5 === 0 ? 6 : 0);
        const sessions = 550 + i * 22 + Math.round(50 * Math.cos(i / 4));
        const aov = revenue / Math.max(orders, 1);
        return { label: d, revenue, orders, sessions, aov };
      });
    };

    const makeYTD = () => {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return months.map((m, i) => {
        const revenue = 30000 + i * 2500 + Math.round(1200 * Math.sin(i / 2));
        const orders = 600 + i * 35 + (i % 3 === 0 ? 70 : 0);
        const sessions = 18000 + i * 900 + Math.round(1000 * Math.cos(i / 3));
        const aov = revenue / Math.max(orders, 1);
        return { label: m, revenue, orders, sessions, aov };
      });
    };

    const map = {
      "7D": make7D(),
      "30D": make30D(),
      "YTD": makeYTD(),
    } as const;

    const data = map[period];

    return {
      seriesRevenue: data.map(({ label, revenue }) => ({ label, revenue })),
      seriesCommerce: data.map(({ label, orders, sessions }) => ({ label, orders, sessions })),
      seriesAOV: data.map(({ label, aov }) => ({ label, aov: Math.round(aov) })),
      headLabel:
        period === "7D" ? "Last 7 Days"
        : period === "30D" ? "Last 30 Days"
        : "Year to Date",
      subLabel:
        period === "7D" ? "Daily trend"
        : period === "30D" ? "Daily trend (30d)"
        : "Monthly trend",
    };
  }, [period]);

  return (
    <div className="flex flex-col gap-6 p-6 text-gray-900">
      {/* Header with connection status pulled from context */}
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold tracking-tight">Grayscale Charts Showcase</h1>
          <p className="text-sm text-gray-500">An elegant preview of line, area, and bar charts with dummy e‑commerce data.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={`border px-3 py-1 text-xs ${
              isConnected ? "bg-white text-gray-900 border-gray-200" : "bg-black text-white border-black"
            }`}
            title={isConnected ? "WebSocket connected" : "WebSocket disconnected"}
          >
            {isConnected ? "Live: Connected" : "Live: Offline"}
          </Badge>
        </div>
      </header>

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-gray-500">Period</span>
        <div className="flex items-center gap-2">
          {(["7D", "30D", "YTD"] as Period[]).map((p) => (
            <Button
              key={p}
              variant="outline"
              onClick={() => setPeriod(p)}
              className={`h-8 rounded-full border ${
                period === p
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-800 hover:bg-gray-100 border-gray-300"
              }`}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Revenue Area Chart */}
        <Card className="border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Revenue</CardTitle>
            <CardDescription className="text-gray-500">{headLabel} — {subLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* ChartContainer provides CSS vars for the chart based on config */}
            <ChartContainer
              config={chartConfig}
              className="h-[280px] w-full rounded-md border border-gray-200 bg-white"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={seriesRevenue} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" tick={{ fill: "#6B7280", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#D1D5DB" }} />
                  <YAxis
                    tick={{ fill: "#6B7280", fontSize: 12 }}
                    tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
                    tickLine={false}
                    axisLine={{ stroke: "#D1D5DB" }}
                  />
                  <ChartTooltip cursor={{ stroke: "#9CA3AF", strokeDasharray: "4 4" }}>
                    <ChartTooltipContent
                      className="border border-gray-200 bg-white text-gray-900"
                      labelFormatter={(l) => `${l}`}
                      formatter={(value) => `${formatCurrency(Number(value))}`}
                      nameKey="revenue"
                    />
                  </ChartTooltip>
                  <defs>
                    <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartConfig.revenue.color} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={chartConfig.revenue.color} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={chartConfig.revenue.color}
                    fill="url(#revGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
            {/* Quick stat row */}
            <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
              <span>Total</span>
              <strong className="text-gray-900">
                {formatCurrency(seriesRevenue.reduce((acc, d) => acc + (d.revenue || 0), 0))}
              </strong>
            </div>
          </CardContent>
        </Card>

        {/* Orders vs Sessions Combo (Bars + Line) */}
        <Card className="border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Orders vs Sessions</CardTitle>
            <CardDescription className="text-gray-500">{headLabel} — engagement vs. conversions</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={chartConfig}
              className="h-[280px] w-full rounded-md border border-gray-200 bg-white"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seriesCommerce} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" tick={{ fill: "#6B7280", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#D1D5DB" }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: "#6B7280", fontSize: 12 }}
                    tickFormatter={(v) => `${v}`}
                    tickLine={false}
                    axisLine={{ stroke: "#D1D5DB" }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: "#6B7280", fontSize: 12 }}
                    tickFormatter={(v) => `${v}`}
                    tickLine={false}
                    axisLine={{ stroke: "#D1D5DB" }}
                  />
                  <ChartTooltip cursor={{ fill: "rgba(0,0,0,0.03)" }}>
                    <ChartTooltipContent
                      className="border border-gray-200 bg-white text-gray-900"
                      labelFormatter={(l) => `${l}`}
                      // Custom formatter to show both metrics with labels
                      renderContent={(payload, label) => {
                        if (!payload || payload.length === 0) return null;
                        const items = payload.map((p) => ({
                          name: p.dataKey,
                          label: chartConfig[p.dataKey as keyof ChartConfig]?.label ?? String(p.dataKey),
                          color: p.color,
                          value: formatNumber(Number(p.value ?? 0)),
                        }));
                        return (
                          <div className="rounded-md border border-gray-200 bg-white p-2 text-xs text-gray-900 shadow-sm">
                            <div className="mb-1 font-medium">{label}</div>
                            <div className="space-y-0.5">
                              {items.map((it) => (
                                <div key={it.name} className="flex items-center justify-between gap-6">
                                  <span className="flex items-center gap-2">
                                    <span
                                      className="inline-block h-2 w-2 rounded-full"
                                      style={{ backgroundColor: it.color }}
                                    />
                                    {it.label}
                                  </span>
                                  <span className="tabular-nums">{it.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }}
                    />
                  </ChartTooltip>
                  <Bar
                    yAxisId="left"
                    dataKey="orders"
                    fill={chartConfig.orders.color}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={28}
                  />
                  {/* Overlay a line for sessions for contrast */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="sessions"
                    stroke={chartConfig.sessions.color}
                    strokeWidth={2}
                    dot={{ r: 2, stroke: "#111", fill: "#fff" }}
                    activeDot={{ r: 3 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between text-gray-600">
                <span>Total Orders</span>
                <strong className="text-gray-900">
                  {formatNumber(seriesCommerce.reduce((acc, d) => acc + (d.orders || 0), 0))}
                </strong>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>Total Sessions</span>
                <strong className="text-gray-900">
                  {formatNumber(seriesCommerce.reduce((acc, d) => acc + (d.sessions || 0), 0))}
                </strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Order Value Line Chart */}
        <Card className="border-gray-200 bg-white md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Average Order Value</CardTitle>
                <CardDescription className="text-gray-500">{headLabel} — purchase quality</CardDescription>
              </div>
              <Badge className="border border-gray-300 bg-white text-gray-800">AOV</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={chartConfig}
              className="h-[300px] w-full rounded-md border border-gray-200 bg-white"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={seriesAOV} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" tick={{ fill: "#6B7280", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#D1D5DB" }} />
                  <YAxis
                    tick={{ fill: "#6B7280", fontSize: 12 }}
                    tickFormatter={(v) => `$${v}`}
                    tickLine={false}
                    axisLine={{ stroke: "#D1D5DB" }}
                  />
                  <ChartTooltip cursor={{ stroke: "#9CA3AF", strokeDasharray: "4 4" }}>
                    <ChartTooltipContent
                      className="border border-gray-200 bg-white text-gray-900"
                      labelFormatter={(l) => `${l}`}
                      formatter={(value) => formatCurrency(Number(value))}
                      nameKey="aov"
                    />
                  </ChartTooltip>
                  <Line
                    type="monotone"
                    dataKey="aov"
                    stroke={chartConfig.aov.color}
                    strokeWidth={2}
                    dot={{
                      r: 2,
                      fill: "#ffffff",
                      stroke: chartConfig.aov.color,
                      strokeWidth: 2,
                    }}
                    activeDot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
              <span>Average</span>
              <strong className="text-gray-900">
                {formatCurrency(
                  Math.round(
                    seriesAOV.reduce((acc, d) => acc + (d.aov || 0), 0) / Math.max(seriesAOV.length, 1)
                  )
                )}
              </strong>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer tip */}
      <footer className="mt-2 text-center text-xs text-gray-500">
        Tip: Switch periods to see the charts rerender with different dummy datasets. Colors stay grayscale for an elegant look.
      </footer>
    </div>
  );
}