"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PaceTrendChartProps {
  data: { date: string; pace: number }[];
}

function formatPaceLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function PaceTrendChart({ data }: PaceTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No pace data available yet.
      </div>
    );
  }

  // Compute Y-axis domain: pad by 30 seconds each side
  const paces = data.map((d) => d.pace);
  const minPace = Math.min(...paces) - 30;
  const maxPace = Math.max(...paces) + 30;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          className="fill-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          className="fill-muted-foreground"
          reversed
          domain={[minPace, maxPace]}
          tickFormatter={formatPaceLabel}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            fontSize: "12px",
            color: "var(--popover-foreground)",
          }}
          formatter={(value) => [
            `${formatPaceLabel(value as number)}/km`,
            "Pace",
          ]}
        />
        <Line
          type="monotone"
          dataKey="pace"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--primary)" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
