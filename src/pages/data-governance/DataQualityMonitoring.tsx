import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  dataQualityMetrics,
  dataQualityTrendWithAnomaly,
  driftAlerts,
} from "@/data/data-governance-mock";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { badgeTextClasses } from "@/lib/typography";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { InstitutionFilterSelect } from "@/components/shared/InstitutionFilterSelect";
import { schemaRegistryEntries } from "@/data/schema-mapper-mock";
import { institutions } from "@/data/institutions-mock";
import { format, startOfMonth } from "date-fns";

const trendConfig = {
  value: { label: "Primary (score %)", color: "hsl(var(--primary))" },
  compareValue: { label: "Comparison (score %)", color: "hsl(var(--warning))" },
} satisfies ChartConfig;

const THRESHOLD = 94;

function formatSourceTypeLabel(sourceType: string) {
  return sourceType.charAt(0).toUpperCase() + sourceType.slice(1);
}

function isWithinDateRange(isoTs: string, from: string, to: string): boolean {
  if (!from?.trim() || !to?.trim()) return true;
  const t = new Date(isoTs).getTime();
  const start = new Date(`${from.trim()}T00:00:00`).getTime();
  const end = new Date(`${to.trim()}T23:59:59.999`).getTime();
  if (Number.isNaN(t) || Number.isNaN(start) || Number.isNaN(end)) return true;
  return t >= start && t <= end;
}

function hashId(id: string): number {
  return id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

export default function DataQualityMonitoring() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(now, "yyyy-MM-dd"));
  const [institutionId, setInstitutionId] = useState("all");
  const [compareInstitutionId, setCompareInstitutionId] = useState("none");
  const [sourceType, setSourceType] = useState<string>("all");

  const sourceTypeOptions = useMemo(() => {
    const set = new Set(schemaRegistryEntries.map((e) => e.sourceType));
    return [...set].sort();
  }, []);

  const namesBySourceType = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of schemaRegistryEntries) {
      if (!m.has(e.sourceType)) m.set(e.sourceType, new Set());
      m.get(e.sourceType)!.add(e.sourceName.toLowerCase());
    }
    return m;
  }, []);

  const submitters = useMemo(() => institutions.filter((i) => i.isDataSubmitter), []);

  const adjustedMetrics = useMemo(() => {
    const h = institutionId === "all" ? 0 : hashId(institutionId);
    const delta = institutionId === "all" ? 0 : (h % 7) - 3;
    return dataQualityMetrics.map((m) => {
      if (typeof m.value !== "number") return m;
      const next = Math.min(100, Math.max(0, Math.round(m.value + delta * 0.15)));
      return { ...m, value: next };
    });
  }, [institutionId]);

  const chartData = useMemo(() => {
    const p = institutionId === "all" ? 0 : hashId(institutionId);
    const c =
      compareInstitutionId !== "none" && compareInstitutionId !== "all"
        ? hashId(compareInstitutionId)
        : null;
    return dataQualityTrendWithAnomaly.map((row) => ({
      ...row,
      value: Math.round((row.value + (p % 5) * 0.08) * 10) / 10,
      compareValue:
        c != null ? Math.round((row.value + (c % 5) * 0.08 - 0.35) * 10) / 10 : undefined,
    }));
  }, [institutionId, compareInstitutionId]);

  const filteredDrift = useMemo(() => {
    return driftAlerts.filter((d) => {
      if (!isWithinDateRange(d.timestamp, dateFrom, dateTo)) return false;
      if (sourceType === "all") return true;
      const names = namesBySourceType.get(sourceType as (typeof sourceTypeOptions)[number]);
      if (!names || names.size === 0) return true;
      const src = d.source.toLowerCase();
      return [...names].some((n) => src.includes(n) || n.includes(src));
    });
  }, [dateFrom, dateTo, sourceType, namesBySourceType]);

  const exportCSV = () => {
    const headers = ["Metric", "Value", "Unit", "Threshold"];
    const rows = adjustedMetrics.map((m) => [m.label, m.value, m.unit, m.threshold ?? ""]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data-quality-metrics.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-semibold text-foreground">Data Quality Monitoring</h1>
          <p className="mt-1 text-caption text-muted-foreground">
            Missing fields, invalid format, duplicates, drift alerts — filter by period, member, and Schema Mapper source type.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <p className="text-caption font-medium text-muted-foreground mb-3">Filters</p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">From</Label>
            <DatePicker value={dateFrom} onChange={setDateFrom} className="h-9 text-caption" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">To</Label>
            <DatePicker value={dateTo} onChange={setDateTo} className="h-9 text-caption" />
          </div>
          <InstitutionFilterSelect
            mode="submitters"
            value={institutionId}
            onValueChange={setInstitutionId}
            label="Member institution"
            allLabel="All submitters"
            triggerClassName="h-9 min-w-[200px]"
          />
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Compare institution</Label>
            <Select value={compareInstitutionId} onValueChange={setCompareInstitutionId}>
              <SelectTrigger className="h-9 min-w-[200px] text-caption">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-caption">
                  No comparison
                </SelectItem>
                {submitters.map((i) => (
                  <SelectItem key={i.id} value={i.id} className="text-caption">
                    {i.tradingName ?? i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Source type</Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger className="h-9 min-w-[160px] text-caption">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-caption">
                  All source types
                </SelectItem>
                {sourceTypeOptions.map((st) => (
                  <SelectItem key={st} value={st} className="text-caption">
                    {formatSourceTypeLabel(st)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {adjustedMetrics.map((m) => (
          <div
            key={m.id}
            className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
          >
            <p className="text-caption font-medium uppercase tracking-wider text-muted-foreground">{m.label}</p>
            <p className="mt-2 font-sans text-h2 font-bold text-foreground tabular-nums">
              {m.value}
              {m.unit === "%" ? "%" : ""}
            </p>
            {m.threshold != null && (
              <p className="mt-1 text-caption text-muted-foreground">
                Threshold: {m.threshold}
                {m.unit}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <h2 className="text-h4 font-semibold text-foreground">Data quality trend (anomaly detection)</h2>
        <p className="mt-1 text-caption text-muted-foreground">
          Primary line reflects the selected institution (mock offset). Add a second institution to compare. Threshold at {THRESHOLD}%.
        </p>
        <div className="mt-4 h-[280px]">
          <ChartContainer config={trendConfig} className="h-full w-full">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={[88, 98]}
                tickFormatter={(v) => `${v}%`}
              />
              <ReferenceLine y={THRESHOLD} stroke="hsl(var(--warning))" strokeDasharray="4 4" />
              <ChartTooltip content={<ChartTooltipContent labelKey="period" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-value)"
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const isAnomaly = payload?.isAnomaly;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isAnomaly ? 6 : 3}
                      fill={isAnomaly ? "hsl(var(--destructive))" : "var(--color-value)"}
                      stroke={isAnomaly ? "hsl(var(--destructive))" : "transparent"}
                      strokeWidth={2}
                    />
                  );
                }}
              />
              {compareInstitutionId !== "none" && compareInstitutionId !== "all" ? (
                <Line
                  type="monotone"
                  dataKey="compareValue"
                  stroke="var(--color-compareValue)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              ) : null}
            </LineChart>
          </ChartContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <h2 className="text-h4 font-semibold text-foreground">Schema & mapping drift alerts</h2>
        <p className="mt-1 text-caption text-muted-foreground">Filtered by date range and source type</p>
        <ul className="mt-4 space-y-2">
          {filteredDrift.length === 0 ? (
            <li className="text-caption text-muted-foreground">No drift alerts for the current filters.</li>
          ) : (
            filteredDrift.map((d) => (
              <li
                key={d.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3",
                  d.severity === "high" && "border-destructive/50 bg-destructive/5",
                  d.severity === "medium" && "border-warning/50 bg-warning/5",
                  d.severity === "low" && "border-border bg-muted/20"
                )}
              >
                <div>
                  <p className="text-body font-medium">{d.message}</p>
                  <p className="text-caption text-muted-foreground">
                    {d.source} · {d.type} · {new Date(d.timestamp).toLocaleString()}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5",
                    badgeTextClasses,
                    d.severity === "high" && "bg-destructive/15 text-destructive",
                    d.severity === "medium" && "bg-warning/15 text-warning",
                    d.severity === "low" && "bg-muted text-muted-foreground"
                  )}
                >
                  {d.severity}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
