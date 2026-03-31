import { useEffect, useMemo, useState } from "react";
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
import { dataQualityMetrics, dataQualityTrendWithAnomaly } from "@/data/data-governance-mock";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { badgeTextClasses } from "@/lib/typography";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { InstitutionFilterSelect } from "@/components/shared/InstitutionFilterSelect";
import { format, startOfMonth } from "date-fns";
import { useDriftAlerts } from "@/hooks/api/useDataIngestion";
import { useSchemaRegistrySourceTypes } from "@/hooks/api/useSchemaMapper";

const trendConfig = {
  value: { label: "Score %", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const THRESHOLD = 94;
const DRIFT_PAGE_SIZE = 10;

function formatSourceTypeLabel(sourceType: string) {
  return sourceType.charAt(0).toUpperCase() + sourceType.slice(1);
}

function hashId(id: string): number {
  return id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

export default function DataQualityMonitoring() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(now, "yyyy-MM-dd"));
  const [institutionId, setInstitutionId] = useState("all");
  const [sourceType, setSourceType] = useState<string>("all");
  const [driftPage, setDriftPage] = useState(1);

  const {
    data: sourceTypesPayload,
    isPending: sourceTypesLoading,
    isError: sourceTypesError,
  } = useSchemaRegistrySourceTypes({ allowMockFallback: false });
  const sourceTypeOptions = sourceTypesPayload?.sourceTypes ?? [];

  const {
    data: driftData,
    isLoading: driftLoading,
    isError: driftError,
  } = useDriftAlerts({ dateFrom, dateTo, sourceType });

  const filteredDrift = driftData?.alerts ?? [];

  useEffect(() => {
    setDriftPage(1);
  }, [dateFrom, dateTo, sourceType, institutionId]);

  const driftTotalPages = Math.max(1, Math.ceil(filteredDrift.length / DRIFT_PAGE_SIZE));
  const driftPageSafe = Math.min(driftPage, driftTotalPages);
  const pagedDrift = filteredDrift.slice(
    (driftPageSafe - 1) * DRIFT_PAGE_SIZE,
    driftPageSafe * DRIFT_PAGE_SIZE
  );

  const adjustedMetrics = useMemo(() => {
    const h = institutionId === "all" ? 0 : hashId(institutionId);
    const delta = institutionId === "all" ? 0 : (h % 7) - 3;
    const schemaDrift = filteredDrift.filter((d) => d.type === "schema").length;
    const mappingDrift = filteredDrift.filter((d) => d.type === "mapping").length;
    return dataQualityMetrics.map((m) => {
      if (driftData && m.id === "mq-4") return { ...m, value: schemaDrift };
      if (driftData && m.id === "mq-5") return { ...m, value: mappingDrift };
      if (typeof m.value !== "number") return m;
      const next = Math.min(100, Math.max(0, Math.round(m.value + delta * 0.15)));
      return { ...m, value: next };
    });
  }, [institutionId, driftData, filteredDrift]);

  const chartData = useMemo(() => {
    const p = institutionId === "all" ? 0 : hashId(institutionId);
    return dataQualityTrendWithAnomaly.map((row) => ({
      ...row,
      value: Math.round((row.value + (p % 5) * 0.08) * 10) / 10,
    }));
  }, [institutionId]);

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
            triggerClassName="h-9 min-w-[200px]"
          />
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Source type</Label>
            <Select
              value={sourceType}
              onValueChange={setSourceType}
              disabled={sourceTypesLoading || sourceTypesError}
            >
              <SelectTrigger className="h-9 min-w-[160px] text-caption">
                <SelectValue placeholder={sourceTypesLoading ? "Loading…" : "All source types"} />
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
            {sourceTypesError && (
              <p className="text-caption text-destructive">Could not load source types from Schema Mapper API.</p>
            )}
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
          Trend reflects the selected member institution (mock offset). Threshold at {THRESHOLD}%.
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
            </LineChart>
          </ChartContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <h2 className="text-h4 font-semibold text-foreground">Schema & mapping drift alerts</h2>
        <p className="mt-1 text-caption text-muted-foreground">
          From the Data Ingestion Agent (API). Filtered by date range and source type.
        </p>
        <ul className="mt-4 space-y-2">
          {driftLoading ? (
            <li className="text-caption text-muted-foreground">Loading drift alerts…</li>
          ) : driftError ? (
            <li className="text-caption text-destructive">
              Could not load drift alerts. Check that the API is running and you are signed in.
            </li>
          ) : filteredDrift.length === 0 ? (
            <li className="text-caption text-muted-foreground">No drift alerts for the current filters.</li>
          ) : (
            pagedDrift.map((d) => (
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
        {!driftLoading && !driftError && filteredDrift.length > DRIFT_PAGE_SIZE ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-border pt-4">
            <span className="text-caption text-muted-foreground">
              Showing {(driftPageSafe - 1) * DRIFT_PAGE_SIZE + 1}–
              {Math.min(driftPageSafe * DRIFT_PAGE_SIZE, filteredDrift.length)} of {filteredDrift.length} alerts
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={driftPageSafe <= 1}
                onClick={() => setDriftPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-caption text-muted-foreground px-2">
                {driftPageSafe} / {driftTotalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={driftPageSafe >= driftTotalPages}
                onClick={() => setDriftPage((p) => Math.min(driftTotalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
