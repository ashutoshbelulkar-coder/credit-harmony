import { useState } from "react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses, badgeTextClasses } from "@/lib/typography";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Activity,
  CheckCircle2,
  Clock,
  Key,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  apiSubmissionKpis,
  apiCallVolume30Days,
  latencyTrendData,
  successVsFailureData,
  topRejectionReasonsData,
  apiSubmissionRequests,
  dataSubmitterIdByApiKey,
  type ApiSubmissionRequest,
  type ApiRequestStatus,
} from "@/data/monitoring-mock";
import { institutions } from "@/data/institutions-mock";
import type { MonitoringFilters, TimeRangeValue } from "./MonitoringFilterBar";
import { RequestDetailDrawer } from "./RequestDetailDrawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

const statusStyles: Record<ApiRequestStatus, string> = {
  Success: "bg-success/15 text-success",
  Failed: "bg-destructive/15 text-destructive",
  Partial: "bg-warning/15 text-warning",
  "Rate Limited": "bg-warning/15 text-warning",
};

const dataSubmitters = institutions.filter((i) => i.isDataSubmitter);

function getInstituteName(apiKey: string): string {
  const id = dataSubmitterIdByApiKey[apiKey];
  if (!id) return "—";
  const inst = institutions.find((i) => i.id === id);
  return inst ? (inst.tradingName ?? inst.name) : "—";
}

const TIME_RANGE_OPTIONS: { value: TimeRangeValue; label: string }[] = [
  { value: "5m", label: "Last 5 mins" },
  { value: "1h", label: "Last 1 hr" },
  { value: "6h", label: "Last 6 hrs" },
  { value: "24h", label: "Last 24 hrs" },
];

const successRateColor = (pct: number) =>
  pct >= 99 ? "text-success" : pct >= 95 ? "text-warning" : "text-destructive";

const PAGE_SIZE = 10;

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
          <p className={cn("text-h3 font-bold mt-1", color)}>{value}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
    </div>
  );
}

const volumeConfig = { volume: { label: "API Calls", color: "hsl(var(--primary))" } } satisfies ChartConfig;
const latencyConfig = {
  p95: { label: "P95 (ms)", color: "hsl(var(--primary))" },
  p99: { label: "P99 (ms)", color: "hsl(var(--warning))" },
} satisfies ChartConfig;
const rejectionConfig = { count: { label: "Count", color: "hsl(var(--danger))" } } satisfies ChartConfig;
const pieColors = ["hsl(var(--success))", "hsl(var(--danger))"];

function parseTimestampToMs(ts: string): number {
  return new Date(ts.replace(" ", "T")).getTime();
}

function isWithinTimeRange(ts: string, timeRange: TimeRangeValue): boolean {
  const ms = parseTimestampToMs(ts);
  const now = Date.now();
  const windowMs =
    timeRange === "5m" ? 5 * 60 * 1000
    : timeRange === "1h" ? 60 * 60 * 1000
    : timeRange === "6h" ? 6 * 60 * 60 * 1000
    : 24 * 60 * 60 * 1000;
  return now - ms <= windowMs;
}

export function DataSubmissionApiSection({
  filters,
  onFiltersChange,
}: {
  filters: MonitoringFilters;
  onFiltersChange: (f: MonitoringFilters) => void;
}) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof ApiSubmissionRequest | "">("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedRequest, setSelectedRequest] = useState<ApiSubmissionRequest | null>(null);

  const set = (partial: Partial<MonitoringFilters>) =>
    onFiltersChange({ ...filters, ...partial });

  const filtered = apiSubmissionRequests.filter((r) => {
    if (filters.status !== "all" && r.status !== filters.status) return false;
    if (filters.dataSubmitterId !== "all" && dataSubmitterIdByApiKey[r.api_key] !== filters.dataSubmitterId) return false;
    if (!isWithinTimeRange(r.timestamp, filters.timeRange)) return false;
    if (filters.requestIdSearch.trim() && !r.request_id.toLowerCase().includes(filters.requestIdSearch.trim().toLowerCase())) return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    if (!sortKey) return 0;
    const va = a[sortKey];
    const vb = b[sortKey];
    if (typeof va === "number" && typeof vb === "number") return sortDir === "asc" ? va - vb : vb - va;
    if (typeof va === "string" && typeof vb === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    return 0;
  });
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: keyof ApiSubmissionRequest) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else setSortKey(key);
    setPage(1);
  };

  const kpis = [
    { label: "Total API Calls (Today)", value: apiSubmissionKpis.totalCallsToday.toLocaleString(), icon: Activity, color: "text-foreground" },
    { label: "Success Rate %", value: `${apiSubmissionKpis.successRatePercent}%`, icon: CheckCircle2, color: successRateColor(apiSubmissionKpis.successRatePercent) },
    { label: "P95 Latency (ms)", value: apiSubmissionKpis.p95LatencyMs, icon: Clock, color: "text-foreground" },
    { label: "Avg Processing Time (ms)", value: apiSubmissionKpis.avgProcessingTimeMs, icon: Clock, color: "text-foreground" },
    { label: "Rejection Rate %", value: `${apiSubmissionKpis.rejectionRatePercent}%`, icon: XCircle, color: "text-foreground" },
    { label: "Active API Keys", value: apiSubmissionKpis.activeApiKeys, icon: Key, color: "text-foreground" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <h4 className="text-body font-semibold text-foreground mb-4">API Call Volume (Last 30 Days)</h4>
          <ChartContainer config={volumeConfig} className="h-[220px] w-full">
            <LineChart data={apiCallVolume30Days} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="volume" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <h4 className="text-body font-semibold text-foreground mb-4">Latency Trend (P95 / P99)</h4>
          <ChartContainer config={latencyConfig} className="h-[220px] w-full">
            <LineChart data={latencyTrendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="p95" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="p99" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <h4 className="text-body font-semibold text-foreground mb-4">Success vs Failure</h4>
          <ChartContainer config={{ success: { label: "Success", color: "hsl(var(--success))" }, failure: { label: "Failure", color: "hsl(var(--danger))" } }} className="h-[220px] w-full">
            <PieChart>
              <Pie data={successVsFailureData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80}>
                {successVsFailureData.map((_, i) => (
                  <Cell key={i} fill={pieColors[i]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <h4 className="text-body font-semibold text-foreground mb-4">Top Rejection Reasons</h4>
          <ChartContainer config={rejectionConfig} className="h-[220px] w-full">
            <BarChart data={topRejectionReasonsData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="reason" width={120} tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="hsl(var(--danger))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <h4 className="text-body font-semibold text-foreground mb-4">Live Request Monitoring</h4>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-caption text-muted-foreground">Request ID</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={filters.requestIdSearch}
                  onChange={(e) => set({ requestIdSearch: e.target.value })}
                  className="h-9 pl-8 w-[180px] text-caption"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-caption text-muted-foreground">Status</Label>
              <Select value={filters.status} onValueChange={(v) => set({ status: v })}>
                <SelectTrigger className="h-9 w-[140px] text-caption">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-caption">All statuses</SelectItem>
                  {(["Success", "Failed", "Partial", "Rate Limited"] as const).map((s) => (
                    <SelectItem key={s} value={s} className="text-caption">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-caption text-muted-foreground">Institute</Label>
              <Select value={filters.dataSubmitterId} onValueChange={(v) => set({ dataSubmitterId: v })}>
                <SelectTrigger className="h-9 min-w-[180px] max-w-[220px] text-caption">
                  <SelectValue placeholder="Institute" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-caption">All data submission institutes</SelectItem>
                  {dataSubmitters.map((i) => (
                    <SelectItem key={i.id} value={i.id} className="text-caption">{i.tradingName ?? i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-caption text-muted-foreground">Time</Label>
              <Select value={filters.timeRange} onValueChange={(v) => set({ timeRange: v as TimeRangeValue })}>
                <SelectTrigger className="h-9 w-[140px] text-caption">
                  <SelectValue placeholder="Time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-caption">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
              <tr className="border-b border-border">
                <th className={cn("text-left px-5 py-3 cursor-pointer", tableHeaderClasses)} onClick={() => toggleSort("request_id")}>Request ID</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Institute</th>
                <th className={cn("text-left px-5 py-3 cursor-pointer", tableHeaderClasses)} onClick={() => toggleSort("status")}>Status</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Error reason</th>
                <th className={cn("text-right px-5 py-3 cursor-pointer", tableHeaderClasses)} onClick={() => toggleSort("response_time_ms")}>Response Time</th>
                <th className={cn("text-right px-5 py-3", tableHeaderClasses)}>Records</th>
                <th className={cn("text-left px-5 py-3 cursor-pointer", tableHeaderClasses)} onClick={() => toggleSort("timestamp")}>Timestamp</th>
                <th className={cn("text-right px-5 py-3", tableHeaderClasses)}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.map((r) => (
                <tr key={r.request_id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4 text-caption font-medium text-foreground">{r.request_id}</td>
                  <td className="px-5 py-4 text-caption text-muted-foreground">{getInstituteName(r.api_key)}</td>
                  <td className="px-5 py-4">
                    <span className={cn("px-2.5 py-1 rounded-full", badgeTextClasses, statusStyles[r.status])}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-caption text-muted-foreground">{r.error_code ?? "—"}</td>
                  <td className="px-5 py-4 text-caption text-right tabular-nums">{r.response_time_ms} ms</td>
                  <td className="px-5 py-4 text-caption text-right">{r.records}</td>
                  <td className="px-5 py-4 text-caption text-muted-foreground whitespace-nowrap">{r.timestamp}</td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRequest(r)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <span className="text-caption text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-caption font-medium transition-colors",
                  p === page ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <RequestDetailDrawer request={selectedRequest} onClose={() => setSelectedRequest(null)} />
    </div>
  );
}
