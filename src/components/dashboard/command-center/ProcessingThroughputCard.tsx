import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

type ThroughputPoint = { label: string; actual: number; forecast: number };

const config = {
  actual: { label: "Actual", color: "hsl(var(--primary))" },
  forecast: { label: "AI Forecast", color: "hsl(var(--warning))" },
} satisfies ChartConfig;

function fmtCount(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
  return String(v);
}

function makeThroughputData(seedSeries: { volume: number }[]): ThroughputPoint[] {
  // Derive an hourly-ish shape from existing volume trend so it stays consistent.
  const base = seedSeries.length ? seedSeries[seedSeries.length - 1].volume : 1_000_000;
  const points = Array.from({ length: 12 }, (_, i) => {
    const label = `${String(i * 2).padStart(2, "0")}:00`;
    const wave = 0.85 + 0.25 * Math.sin((i / 12) * Math.PI * 2);
    const actual = Math.round((base / 12) * wave);
    const forecast = Math.round(actual * (0.98 + 0.06 * Math.cos(i)));
    return { label, actual, forecast };
  });
  return points;
}

export function ProcessingThroughputCard({
  seedApiUsageTrend,
  loading,
  view,
  onViewChange,
}: {
  seedApiUsageTrend: { volume: number }[];
  loading?: boolean;
  view: "24h" | "7d";
  onViewChange: (v: "24h" | "7d") => void;
}) {
  const data = makeThroughputData(seedApiUsageTrend);
  const rollingTotal = data.reduce((sum, p) => sum + p.actual, 0);
  const multiplier = 5.8; // derived label; can be replaced when backend provides.

  return (
    <Card className="border-border shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <CardTitle className="text-h4 font-semibold text-foreground">Processing Throughput</CardTitle>
          <p className="mt-1 text-caption text-muted-foreground">
            {loading
              ? "Loading…"
              : `${fmtCount(rollingTotal)} processed · ${multiplier.toFixed(1)}x vs baseline`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant={view === "24h" ? "default" : "outline"}
            className="h-8"
            onClick={() => onViewChange("24h")}
          >
            24H
          </Button>
          <Button
            size="sm"
            variant={view === "7d" ? "default" : "outline"}
            className="h-8"
            onClick={() => onViewChange("7d")}
          >
            7D
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[240px] w-full">
          <LineChart data={loading ? [] : data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => fmtCount(v as number)}
            />
            <ChartTooltip content={<ChartTooltipContent labelKey="label" />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line type="monotone" dataKey="actual" stroke="var(--color-actual)" strokeWidth={2} dot={false} />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="var(--color-forecast)"
              strokeWidth={2}
              dot={false}
              strokeDasharray="6 4"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

