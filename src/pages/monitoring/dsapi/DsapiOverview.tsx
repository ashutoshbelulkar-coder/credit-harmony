import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { tableHeaderClasses } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { DsapiFilters, type DsapiChromeState } from "./DsapiChrome";
import { formatCompact, type DsapiSnapshot } from "./dsapiScaleMock";

const funnelConfig = {
  accepted: { label: "Accepted", color: "hsl(var(--chart-2))" },
  rejected: { label: "Rejected", color: "hsl(var(--destructive))" },
  preReject: { label: "Pre-reject", color: "hsl(var(--chart-5))" },
  acceptancePct: { label: "Acceptance %", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const latencyConfig = {
  p50: { label: "P50", color: "hsl(var(--chart-5))" },
  p95: { label: "P95", color: "hsl(var(--primary))" },
  p99: { label: "P99", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const docsLatConfig = {
  d50: { label: "P50", color: "hsl(var(--chart-5))" },
  d95: { label: "P95", color: "hsl(var(--primary))" },
  d99: { label: "P99", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const queueConfig = {
  queue: { label: "Queue depth", color: "hsl(var(--primary))" },
  ageMin: { label: "Oldest pending (min)", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const paretoConfig = {
  count: { label: "Count", color: "hsl(var(--destructive))" },
} satisfies ChartConfig;

function sloClass(slo: "ok" | "breach" | "na") {
  if (slo === "ok") return "bg-success/15 text-success border-0";
  if (slo === "breach") return "bg-destructive/15 text-destructive border-0";
  return "";
}

export function DsapiOverview({
  snapshot,
  chrome,
  onChromeChange,
  filterCode,
  onFilterCode,
  latView,
  onLatView,
  onTrace,
}: {
  snapshot: DsapiSnapshot;
  chrome: DsapiChromeState;
  onChromeChange: (partial: Partial<DsapiChromeState>) => void;
  filterCode: string | null;
  onFilterCode: (code: string | null) => void;
  latView: "structured" | "documents";
  onLatView: (v: "structured" | "documents") => void;
  onTrace: (ref: string) => void;
}) {
  const chartH = "h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full";

  return (
    <div className="space-y-6 laptop:space-y-5">
      <DsapiFilters catalog={snapshot.catalog} state={chrome} onChange={onChromeChange} />
      {chrome.window === "90d" && chrome.submitterId === "all" && (
        <p className="text-caption text-muted-foreground">
          Large result set — ranking and traces stay capped; narrow the time range or add a submitter filter for faster browsing.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption text-muted-foreground">vs previous period</p>
        <p className="text-caption text-muted-foreground">Data as of {snapshot.asOf} · refreshes every 60s</p>
      </div>
      <section aria-label="Key performance indicators">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 laptop:gap-3">
          {snapshot.kpis.map((k) => (
            <div
              key={k.id}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {k.label}
                </p>
                {k.slo !== "na" && (
                  <Badge className={sloClass(k.slo)}>{k.sloLabel}</Badge>
                )}
              </div>
              <p className="mt-2 text-h1 font-bold tabular-nums text-foreground">{k.value}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {k.deltaPositive ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-success" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
                )}
                <span
                  className={cn(
                    "text-caption font-medium",
                    k.deltaPositive ? "text-success" : "text-destructive"
                  )}
                >
                  {k.delta}
                </span>
                <span className="text-caption text-muted-foreground">{k.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h4 className="mb-1 text-h4 font-semibold text-foreground">Funnel — requests by outcome class</h4>
          <p className="mb-4 text-caption text-muted-foreground">Acceptance % (right axis)</p>
          <ChartContainer config={funnelConfig} className={chartH} aria-label="Request funnel">
            <ComposedChart data={snapshot.buckets} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={(v) => formatCompact(Number(v))} />
              <YAxis yAxisId="right" orientation="right" domain={[90, 100]} tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area yAxisId="left" type="monotone" dataKey="accepted" stackId="a" fill="hsl(var(--chart-2))" stroke="hsl(var(--chart-2))" fillOpacity={0.35} />
              <Area yAxisId="left" type="monotone" dataKey="rejected" stackId="a" fill="hsl(var(--destructive))" stroke="hsl(var(--destructive))" fillOpacity={0.45} />
              <Area yAxisId="left" type="monotone" dataKey="preReject" stackId="a" fill="hsl(var(--chart-5))" stroke="hsl(var(--chart-5))" fillOpacity={0.35} />
              <Line yAxisId="right" type="monotone" dataKey="acceptancePct" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ChartContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h4 className="text-h4 font-semibold text-foreground">
                {latView === "documents" ? "Latency P50 / P95 / P99 · Documents" : "Latency P50 / P95 / P99 · Structured"}
              </h4>
              <p className="mt-1 text-caption text-muted-foreground">
                {latView === "documents" ? "Minutes" : "Milliseconds"}
              </p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant={latView === "structured" ? "default" : "outline"} onClick={() => onLatView("structured")}>
                Structured
              </Button>
              <Button size="sm" variant={latView === "documents" ? "default" : "outline"} onClick={() => onLatView("documents")}>
                Documents
              </Button>
            </div>
          </div>
          <ChartContainer
            config={latView === "documents" ? docsLatConfig : latencyConfig}
            className={chartH}
            aria-label="Latency percentiles"
          >
            <LineChart data={snapshot.buckets} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {latView === "documents" ? (
                <>
                  <Line type="monotone" dataKey="d50" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="d95" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="d99" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                </>
              ) : (
                <>
                  <Line type="monotone" dataKey="p50" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="p95" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="p99" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                </>
              )}
            </LineChart>
          </ChartContainer>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h4 className="mb-1 text-h4 font-semibold text-foreground">Async pipeline — Documents</h4>
          <p className="mb-4 text-caption text-muted-foreground">Queue depth · oldest pending age (min)</p>
          <ChartContainer config={queueConfig} className={chartH} aria-label="Async document backlog">
            <ComposedChart data={snapshot.buckets} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line yAxisId="left" type="monotone" dataKey="queue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="ageMin" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ChartContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h4 className="mb-1 text-h4 font-semibold text-foreground">Rejection reasons — Pareto</h4>
          <p className="mb-4 text-caption text-muted-foreground">
            % of rejected submissions · click a bar to filter failures and submitters
          </p>
          <ChartContainer config={paretoConfig} className={chartH} aria-label="Rejection Pareto">
            <BarChart data={snapshot.pareto} layout="vertical" margin={{ top: 5, right: 8, bottom: 5, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="code" width={140} tick={{ fontSize: 9 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="count"
                fill="hsl(var(--destructive))"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(data) => {
                  const code =
                    (data as { payload?: { code?: string }; code?: string }).payload?.code ??
                    (data as { code?: string }).code;
                  if (!code) return;
                  onFilterCode(filterCode === code ? null : code);
                }}
              />
            </BarChart>
          </ChartContainer>
          {filterCode && (
            <Button size="sm" variant="outline" className="mt-2" onClick={() => onFilterCode(null)}>
              Clear {filterCode}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-4 md:px-6">
          <h4 className="text-h4 font-semibold text-foreground">Recent failures (last 50)</h4>
        </div>
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="sticky top-0 z-10 bg-muted/95">
              <tr className="border-b border-border">
                <th className={cn("px-4 py-3 text-left", tableHeaderClasses)}>Timestamp</th>
                <th className={cn("px-4 py-3 text-left", tableHeaderClasses)}>Submitter</th>
                <th className={cn("px-4 py-3 text-left", tableHeaderClasses)}>Pathway</th>
                <th className={cn("px-4 py-3 text-left", tableHeaderClasses)}>Ref</th>
                <th className={cn("px-4 py-3 text-left", tableHeaderClasses)}>Code</th>
                <th className={cn("px-4 py-3 text-right", tableHeaderClasses)}>Latency</th>
                <th className={cn("px-4 py-3 text-right", tableHeaderClasses)}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {snapshot.failures.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-caption text-muted-foreground">
                    No failures in scope
                  </td>
                </tr>
              ) : (
                snapshot.failures.map((f) => (
                  <tr key={f.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-caption tabular-nums text-muted-foreground whitespace-nowrap">{f.time}</td>
                    <td className="px-4 py-3 text-caption text-foreground">{f.submitter}</td>
                    <td className="px-4 py-3 text-caption text-muted-foreground">{f.pathway}</td>
                    <td className="px-4 py-3 text-caption font-medium text-foreground">{f.ref}</td>
                    <td className="px-4 py-3 text-caption">{f.code}</td>
                    <td className="px-4 py-3 text-right text-caption tabular-nums">{f.latencyMs} ms</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => onTrace(f.ref)}>
                        Trace
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
