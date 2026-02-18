import { useState } from "react";
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
import { Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const trendConfig = {
  value: { label: "Data Quality Score %", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const THRESHOLD = 94;

export default function DataQualityMonitoringContent() {
  const [view, setView] = useState<"institution" | "source">("institution");
  const [institution, setInstitution] = useState("First National Bank");
  const [dataSource, setDataSource] = useState("CBS Core");

  const exportCSV = () => {
    const headers = ["Metric", "Value", "Unit", "Threshold"];
    const rows = dataQualityMetrics.map((m) => [
      m.label,
      m.value,
      m.unit,
      m.threshold ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data-quality-metrics.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-semibold text-foreground">Data Quality Monitoring</h1>
          <p className="mt-1 text-caption text-muted-foreground">
            Missing fields, invalid format, duplicates, and drift alerts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={exportPDF}>
            <FileText className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {dataQualityMetrics.map((m) => (
          <div
            key={m.id}
            className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
          >
            <p className="text-caption font-medium uppercase tracking-wider text-muted-foreground">
              {m.label}
            </p>
            <p className="mt-2 font-sans text-h2 font-bold text-foreground tabular-nums">
              {m.value}
              {m.unit === "%" ? "%" : ""}
            </p>
            {m.threshold != null && (
              <p className="mt-1 text-caption text-muted-foreground">Threshold: {m.threshold}{m.unit}</p>
            )}
          </div>
        ))}
      </div>

      {/* Anomaly detection chart with threshold */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <h2 className="text-h4 font-semibold text-foreground">Data quality trend (anomaly detection)</h2>
        <p className="mt-1 text-caption text-muted-foreground">
          Spike markers and threshold line at {THRESHOLD}%
        </p>
        <div className="mt-4 h-[280px]">
          <ChartContainer config={trendConfig} className="h-full w-full">
            <LineChart
              data={dataQualityTrendWithAnomaly}
              margin={{ top: 8, right: 24, left: 0, bottom: 8 }}
            >
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

      {/* Comparison view */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-h4 font-semibold text-foreground">Comparison</h2>
          <div className="flex gap-2">
            <Button
              variant={view === "institution" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("institution")}
            >
              By institution
            </Button>
            <Button
              variant={view === "source" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("source")}
            >
              By data source
            </Button>
          </div>
        </div>
        {view === "institution" && (
          <div className="mt-4">
            <Select value={institution} onValueChange={setInstitution}>
              <SelectTrigger className="h-9 w-56">
                <SelectValue placeholder="Institution" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="First National Bank">First National Bank</SelectItem>
                <SelectItem value="Metro Credit Union">Metro Credit Union</SelectItem>
                <SelectItem value="Pacific Finance Corp">Pacific Finance Corp</SelectItem>
              </SelectContent>
            </Select>
            <div className="mt-4 rounded-lg border border-border p-4">
              <p className="text-caption text-muted-foreground">Quality metrics for {institution}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {dataQualityMetrics.map((m) => (
                  <div key={m.id} className="rounded border border-border p-2">
                    <p className="text-caption text-muted-foreground">{m.label}</p>
                    <p className="text-body font-semibold">{m.value}{m.unit}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {view === "source" && (
          <div className="mt-4">
            <Select value={dataSource} onValueChange={setDataSource}>
              <SelectTrigger className="h-9 w-56">
                <SelectValue placeholder="Data source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CBS Core">CBS Core</SelectItem>
                <SelectItem value="Alternate Data">Alternate Data</SelectItem>
                <SelectItem value="Bureau Incoming">Bureau Incoming</SelectItem>
              </SelectContent>
            </Select>
            <div className="mt-4 rounded-lg border border-border p-4">
              <p className="text-caption text-muted-foreground">Quality metrics for {dataSource}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {dataQualityMetrics.map((m) => (
                  <div key={m.id} className="rounded border border-border p-2">
                    <p className="text-caption text-muted-foreground">{m.label}</p>
                    <p className="text-body font-semibold">{m.value}{m.unit}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Drift alerts */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <h2 className="text-h4 font-semibold text-foreground">Schema & mapping drift alerts</h2>
        <p className="mt-1 text-caption text-muted-foreground">Recent drift detection</p>
        <ul className="mt-4 space-y-2">
          {driftAlerts.map((d) => (
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
              <span className={cn(
                "rounded-full px-2 py-0.5 text-caption font-medium",
                d.severity === "high" && "bg-destructive/15 text-destructive",
                d.severity === "medium" && "bg-warning/15 text-warning",
                d.severity === "low" && "bg-muted text-muted-foreground"
              )}>
                {d.severity}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
