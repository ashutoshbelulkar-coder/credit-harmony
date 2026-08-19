import { RefreshCw } from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { tableHeaderClasses } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { DqKpiRangeTag } from "@/pages/data-governance/dq-monitoring/dq-shared";
import { EnquiryFilters, type EnquiryChromeState } from "./EnquiryChrome";
import {
  ENQUIRY_CONSTANTS,
  formatCompact,
  type EnquiryProductMixRow,
  type EnquirySnapshot,
} from "./enquiryScaleMock";

const funnelConfig = {
  success: { label: "Success", color: "hsl(var(--chart-2))" },
  noData: { label: "No data", color: "hsl(var(--chart-3))" },
  failed: { label: "Failed", color: "hsl(var(--destructive))" },
  gated: { label: "Gated", color: "hsl(var(--muted-foreground))" },
  platformError: { label: "Platform error", color: "hsl(var(--destructive))" },
} satisfies ChartConfig;

const latencyConfig = {
  p50: { label: "P50", color: "hsl(var(--chart-5))" },
  p95: { label: "P95", color: "hsl(var(--primary))" },
  p99: { label: "P99", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const mixConfig = {
  served: { label: "SERVED", color: "hsl(var(--chart-2))" },
  noData: { label: "NO_DATA", color: "hsl(var(--chart-3))" },
  failed: { label: "FAILED", color: "hsl(var(--destructive))" },
} satisfies ChartConfig;

const paretoConfig = {
  count: { label: "Count", color: "hsl(var(--destructive))" },
} satisfies ChartConfig;

function kpiRangeStatus(slo: EnquirySnapshot["kpis"][number]["slo"]): "acceptable" | "watch" | "out" | undefined {
  if (slo === "ok") return "acceptable";
  if (slo === "watch") return "watch";
  if (slo === "breach") return "out";
  return undefined;
}

function outcomeBadge(outcome: string) {
  if (outcome === "GATED") return "border-0 bg-muted text-muted-foreground";
  if (outcome === "FAILED") return "border-0 bg-destructive/15 text-destructive";
  return "border-0 bg-destructive/25 text-destructive";
}

export function EnquiryOverview({
  snapshot,
  chrome,
  onChromeChange,
  filterCode,
  onFilterCode,
  onTrace,
  onRefresh,
  refreshing,
}: {
  snapshot: EnquirySnapshot;
  chrome: EnquiryChromeState;
  onChromeChange: (partial: Partial<EnquiryChromeState>) => void;
  filterCode: string | null;
  onFilterCode: (code: string | null) => void;
  onTrace: (ref: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const chartH = "h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full";
  const empty = snapshot.totals.requests === 0;
  const failures = filterCode
    ? snapshot.failures.filter((f) => f.code === filterCode)
    : snapshot.failures;

  const copyRef = (ref: string) => {
    void navigator.clipboard?.writeText(ref);
  };

  return (
    <div className="space-y-6 laptop:space-y-5">
      <EnquiryFilters catalog={snapshot.catalog} state={chrome} onChange={onChromeChange} />
      {chrome.memberId !== "all" && (
        <p className="text-caption text-muted-foreground">
          Overview is locked to member {snapshot.catalog.find((m) => m.id === chrome.memberId)?.name ?? chrome.memberId}.{" "}
          <button type="button" className="underline" onClick={() => onChromeChange({ memberId: "all" })}>
            Clear member lock
          </button>
        </p>
      )}
      {chrome.window === "90d" && chrome.memberId === "all" && (
        <p className="text-caption text-muted-foreground">
          Large result set — member ranking and trace matches are capped; narrow the range or select a member.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex items-center gap-2">
          <p className="text-caption text-muted-foreground">
            Data as of {snapshot.asOf} · refreshes every 60s
          </p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            aria-label="Refresh monitoring data"
            onClick={onRefresh}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {empty ? (
        <p className="rounded-xl border border-border bg-card p-8 text-center text-caption text-muted-foreground">
          No traffic in the selected scope
        </p>
      ) : (
        <TooltipProvider delayDuration={200}>
          <section aria-label="Key performance indicators">
            <div className="grid grid-cols-3 gap-4">
              {snapshot.kpis.map((k) => {
                const status = kpiRangeStatus(k.slo);
                return (
                  <Tooltip key={k.id}>
                    <TooltipTrigger asChild>
                      <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-left">
                        <p className="text-caption font-medium uppercase tracking-wider text-muted-foreground">
                          {k.label}
                        </p>
                        <p className="mt-2 font-sans text-h2 font-bold text-foreground tabular-nums whitespace-nowrap">
                          {k.value}
                        </p>
                        {status ? (
                          <div className="mt-1.5">
                            <DqKpiRangeTag status={status} />
                          </div>
                        ) : null}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-caption">{k.tooltip}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </section>
        </TooltipProvider>
      )}

      <div className="space-y-6">
        <div className="min-w-0 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h4 className="mb-4 text-h4 font-semibold text-foreground">Funnel — requests by outcome class</h4>
          <ChartContainer config={funnelConfig} className={chartH} aria-label="Request funnel by outcome class">
            <ComposedChart data={snapshot.buckets} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCompact(Number(v))} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="success" stackId="a" fill="hsl(var(--chart-2))" stroke="hsl(var(--chart-2))" fillOpacity={0.4} />
              <Area type="monotone" dataKey="noData" stackId="a" fill="hsl(var(--chart-3))" stroke="hsl(var(--chart-3))" fillOpacity={0.4} />
              <Area type="monotone" dataKey="failed" stackId="a" fill="hsl(var(--destructive))" stroke="hsl(var(--destructive))" fillOpacity={0.45} />
              <Area type="monotone" dataKey="gated" stackId="a" fill="hsl(var(--muted-foreground))" stroke="hsl(var(--muted-foreground))" fillOpacity={0.25} />
              <Area type="monotone" dataKey="platformError" stackId="a" fill="hsl(var(--destructive))" stroke="hsl(var(--destructive))" fillOpacity={0.8} />
            </ComposedChart>
          </ChartContainer>
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h4 className="mb-1 text-h4 font-semibold text-foreground">End to End Latency P50/P95/P99</h4>
          <p className="mb-4 text-caption text-muted-foreground">Milliseconds</p>
          <ChartContainer config={latencyConfig} className={chartH} aria-label="Latency percentiles">
            <LineChart data={snapshot.buckets} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine y={ENQUIRY_CONSTANTS.latencySloMs} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="p50" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="p95" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="p99" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </div>
      </div>

      <div className="space-y-6">
        <div className="min-w-0 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h4 className="mb-1 text-h4 font-semibold text-foreground">Product mix & outcome</h4>
          <p className="mb-4 text-caption text-muted-foreground">
            Product enquiries split SERVED / NO_DATA / FAILED · click a segment to filter by product
          </p>
          <ChartContainer config={mixConfig} className={chartH} aria-label="Product mix by outcome">
            <BarChart data={snapshot.productMix} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="productId" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCompact(Number(v))} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_label, payload) => {
                      const row = payload?.[0]?.payload as EnquiryProductMixRow | undefined;
                      return row?.name ?? String(_label ?? "");
                    }}
                  />
                }
              />
              {(["served", "noData", "failed"] as const).map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="a"
                  fill={key === "served" ? "hsl(var(--chart-2))" : key === "noData" ? "hsl(var(--chart-3))" : "hsl(var(--destructive))"}
                  cursor="pointer"
                  onClick={(data) => {
                    const id =
                      (data as { payload?: { productId?: string }; productId?: string }).payload?.productId ??
                      (data as { productId?: string }).productId;
                    if (!id || id === "OTHER") return;
                    onChromeChange({ productId: chrome.productId === id ? "all" : id });
                  }}
                />
              ))}
            </BarChart>
          </ChartContainer>
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h4 className="mb-1 text-h4 font-semibold text-foreground">Rejection reasons — Pareto</h4>
          <p className="mb-4 text-caption text-muted-foreground">
            Gated and FAILED codes · click a bar to filter failures, members, and traces (not KPI cards)
          </p>
          <ChartContainer
            config={paretoConfig}
            className="h-[280px] min-h-[280px] md:h-[300px] laptop:h-[320px] w-full"
            aria-label="Rejection Pareto"
          >
            <BarChart
              data={snapshot.pareto}
              layout="vertical"
              margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="code"
                width={236}
                interval={0}
                tick={{ fontSize: 9 }}
                tickMargin={6}
              />
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
                  if (!code || code === "Other") return;
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
                <th className={cn("px-4 py-3 text-left", tableHeaderClasses)}>Member</th>
                <th className={cn("hidden px-4 py-3 text-left laptop:table-cell", tableHeaderClasses)}>Entity</th>
                <th className={cn("px-4 py-3 text-left", tableHeaderClasses)}>Type</th>
                <th className={cn("px-4 py-3 text-left", tableHeaderClasses)}>Ref</th>
                <th className={cn("px-4 py-3 text-left", tableHeaderClasses)}>Outcome</th>
                <th className={cn("px-4 py-3 text-left", tableHeaderClasses)}>Code</th>
                <th className={cn("px-4 py-3 text-right", tableHeaderClasses)}>Latency</th>
                <th className={cn("px-4 py-3 text-right", tableHeaderClasses)}>Trace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {failures.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-caption text-muted-foreground">
                    No failures in scope
                  </td>
                </tr>
              ) : (
                failures.map((f) => (
                  <tr key={f.id} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3 text-caption tabular-nums text-muted-foreground">{f.time}</td>
                    <td className="px-4 py-3 text-caption text-foreground">{f.member}</td>
                    <td className="hidden px-4 py-3 text-caption text-muted-foreground laptop:table-cell">{f.entity}</td>
                    <td className="px-4 py-3 text-caption">{f.type}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-caption font-medium text-foreground hover:underline"
                        onClick={() => copyRef(f.ref)}
                        title="Copy reference"
                      >
                        {f.ref.length > 22 ? `${f.ref.slice(0, 18)}…` : f.ref}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={outcomeBadge(f.outcome)}>{f.outcome}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-caption hover:underline"
                        onClick={() => onFilterCode(filterCode === f.code ? null : f.code)}
                      >
                        {f.code}
                      </button>
                    </td>
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
