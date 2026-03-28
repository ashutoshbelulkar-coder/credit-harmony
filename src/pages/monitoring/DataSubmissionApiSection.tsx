import { useState, useMemo } from "react";
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
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  Key,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dataSubmitterIdByApiKey,
  type ApiSubmissionRequest,
  type ApiRequestStatus,
} from "@/data/monitoring-mock";
import { calcApiRequestKpis } from "@/lib/calc/kpiCalc";
import { isWithinRelativeWindow, WINDOW_MS } from "@/lib/calc/dateFilter";
import { institutions } from "@/data/institutions-mock";
import type { MonitoringFilters, TimeRangeValue } from "./MonitoringFilterBar";
import { RequestDetailDrawer } from "./RequestDetailDrawer";
import { useApiRequests, useMonitoringKpis, useMonitoringCharts } from "@/hooks/api/useMonitoring";
import type { ApiRequestRecord } from "@/services/monitoring.service";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { ApiErrorCard } from "@/components/ui/api-error-card";
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

/** Display institution name for an API record — prefers the institutionId field if present. */
function getInstituteDisplay(r: ApiRequestRecord): string {
  if (r.institutionId) {
    const inst = institutions.find((i) => i.id === r.institutionId);
    if (inst) return inst.tradingName ?? inst.name;
  }
  return getInstituteName(r.apiKey);
}

/** Convert camelCase API record → snake_case shape the detail drawer expects. */
function toMockRequest(r: ApiRequestRecord): ApiSubmissionRequest {
  return {
    request_id: r.requestId,
    api_key: r.apiKey,
    endpoint: r.endpoint,
    status: r.status as ApiRequestStatus,
    response_time_ms: r.responseTimeMs,
    records: r.records,
    error_code: r.errorCode ?? null,
    timestamp: r.timestamp,
  };
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

function isWithinTimeRange(ts: string, timeRange: TimeRangeValue): boolean {
  const windowMs = WINDOW_MS[timeRange as keyof typeof WINDOW_MS];
  return windowMs ? isWithinRelativeWindow(ts, windowMs) : true;
}

export function DataSubmissionApiSection({
  filters,
  onFiltersChange,
}: {
  filters: MonitoringFilters;
  onFiltersChange: (f: MonitoringFilters) => void;
}) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof ApiRequestRecord | "">("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedRequest, setSelectedRequest] = useState<ApiSubmissionRequest | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const set = (partial: Partial<MonitoringFilters>) =>
    onFiltersChange({ ...filters, ...partial });

  // Build server-side filter params; page is 0-indexed on the API
  const apiParams = useMemo(
    () => ({
      status: filters.status !== "all" ? filters.status : undefined,
      institutionId: filters.dataSubmitterId !== "all" ? filters.dataSubmitterId : undefined,
      dateFrom: filters.dateFrom?.trim() || undefined,
      dateTo: filters.dateTo?.trim() || undefined,
      page: page - 1,
      size: PAGE_SIZE,
    }),
    [filters.status, filters.dataSubmitterId, filters.dateFrom, filters.dateTo, page]
  );

  const {
    data: requestsData,
    isLoading: tableLoading,
    error: tableError,
    refetch: refetchTable,
  } = useApiRequests(apiParams);

  const { data: kpisData } = useMonitoringKpis();
  const { data: chartsData } = useMonitoringCharts();

  // Charts — use API data when available
  const volumeData = chartsData?.apiCallVolume30Days ?? [];
  const latencyData = chartsData?.latencyTrendData ?? [];
  const pieData = chartsData?.successVsFailureData ?? [];
  const rejectionData = chartsData?.topRejectionReasonsData ?? [];

  // Client-side refinement on the current page: requestIdSearch + timeRange
  const tableRows = requestsData?.content ?? [];
  const clientFiltered = tableRows.filter((r) => {
    if (!isWithinTimeRange(r.timestamp, filters.timeRange)) return false;
    if (
      filters.requestIdSearch.trim() &&
      !r.requestId.toLowerCase().includes(filters.requestIdSearch.trim().toLowerCase())
    )
      return false;
    return true;
  });

  const sorted = useMemo(() => {
    if (!sortKey) return clientFiltered;
    return [...clientFiltered].sort((a, b) => {
      const va = a[sortKey as keyof ApiRequestRecord];
      const vb = b[sortKey as keyof ApiRequestRecord];
      if (typeof va === "number" && typeof vb === "number")
        return sortDir === "asc" ? va - vb : vb - va;
      if (typeof va === "string" && typeof vb === "string")
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return 0;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientFiltered, sortKey, sortDir]);

  const totalPages = requestsData?.totalPages ?? 1;
  const totalElements = requestsData?.totalElements ?? 0;

  const toggleSort = (key: keyof ApiRequestRecord) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else setSortKey(key);
    setPage(1);
  };

  const activeFilterCount = [
    filters.requestIdSearch.trim().length > 0,
    filters.status !== "all",
    filters.dataSubmitterId !== "all",
    Boolean(filters.dateFrom?.trim() && filters.dateTo?.trim()),
  ].filter(Boolean).length;

  // KPI cards — use server aggregates when available, otherwise compute from current page
  const kpis = useMemo(() => {
    if (kpisData) {
      return [
        { label: "Total API Calls", value: kpisData.totalCallsToday.toLocaleString(), icon: Activity, color: "text-foreground" },
        { label: "Success Rate %", value: `${kpisData.successRatePercent}%`, icon: CheckCircle2, color: successRateColor(kpisData.successRatePercent) },
        { label: "P95 Latency (ms)", value: kpisData.p95LatencyMs, icon: Clock, color: "text-foreground" },
        { label: "Avg Processing Time (ms)", value: kpisData.avgProcessingTimeMs, icon: Clock, color: "text-foreground" },
        { label: "Error Rate %", value: `${kpisData.rejectionRatePercent}%`, icon: XCircle, color: "text-foreground" },
        { label: "Active API Keys", value: kpisData.activeApiKeys, icon: Key, color: "text-foreground" },
      ];
    }
    const local = calcApiRequestKpis(
      sorted.map((r) => ({ status: r.status, response_time_ms: r.responseTimeMs }))
    );
    return [
      { label: "Total API Calls", value: local.totalCalls.toLocaleString(), icon: Activity, color: "text-foreground" },
      { label: "Success Rate %", value: `${local.successRate}%`, icon: CheckCircle2, color: successRateColor(local.successRate) },
      { label: "P95 Latency (ms)", value: local.p95LatencyMs, icon: Clock, color: "text-foreground" },
      { label: "Avg Processing Time (ms)", value: local.avgLatencyMs, icon: Clock, color: "text-foreground" },
      { label: "Error Rate %", value: `${local.errorRate}%`, icon: XCircle, color: "text-foreground" },
      { label: "Active API Keys", value: new Set(sorted.map((r) => r.apiKey)).size, icon: Key, color: "text-foreground" },
    ];
  }, [kpisData, sorted]);

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
          {volumeData.length > 0 ? (
            <ChartContainer config={volumeConfig} className="h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full">
              <LineChart data={volumeData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="volume" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-caption text-muted-foreground">
              No chart data available
            </div>
          )}
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <h4 className="text-body font-semibold text-foreground mb-4">Latency Trend (P95 / P99)</h4>
          {latencyData.length > 0 ? (
            <ChartContainer config={latencyConfig} className="h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full">
              <LineChart data={latencyData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="p95" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p99" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-caption text-muted-foreground">
              No chart data available
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <h4 className="text-body font-semibold text-foreground mb-4">Success vs Failure</h4>
          {pieData.length > 0 ? (
            <ChartContainer config={{ success: { label: "Success", color: "hsl(var(--success))" }, failure: { label: "Failure", color: "hsl(var(--danger))" } }} className="h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={pieColors[i]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-caption text-muted-foreground">
              No chart data available
            </div>
          )}
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <h4 className="text-body font-semibold text-foreground mb-4">Top Rejection Reasons</h4>
          {rejectionData.length > 0 ? (
            <ChartContainer config={rejectionConfig} className="h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full">
              <BarChart data={rejectionData} layout="vertical" margin={{ top: 5, right: 8, bottom: 5, left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="reason" width={120} tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--danger))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-caption text-muted-foreground">
              No chart data available
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="px-4 pt-4 pb-4 border-b border-border md:px-6 md:pt-6">
          <h4 className="text-body font-semibold text-foreground mb-4">Live Request Monitoring</h4>
          {/* Mobile: Filters toggle */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left rounded-md hover:bg-muted/50 transition-colors"
            >
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-body font-medium text-foreground">Filters</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
              <span className="ml-auto">
                {filtersOpen ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </span>
            </button>
            {filtersOpen && (
              <div className="border-t border-border pt-3 mt-2 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-caption text-muted-foreground">Request ID</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={filters.requestIdSearch}
                      onChange={(e) => set({ requestIdSearch: e.target.value })}
                      className="h-8 pl-8 w-full text-caption"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-caption text-muted-foreground">Status</Label>
                  <Select value={filters.status} onValueChange={(v) => { set({ status: v }); setPage(1); }}>
                    <SelectTrigger className="h-8 w-full text-caption">
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
                  <Select value={filters.dataSubmitterId} onValueChange={(v) => { set({ dataSubmitterId: v }); setPage(1); }}>
                    <SelectTrigger className="h-8 w-full text-caption">
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
                    <SelectTrigger className="h-8 w-full text-caption">
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
            )}
          </div>
          {/* Desktop: inline filters */}
          <div className="hidden md:flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-caption text-muted-foreground">Request ID</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={filters.requestIdSearch}
                  onChange={(e) => set({ requestIdSearch: e.target.value })}
                  className="h-8 pl-8 w-[180px] text-caption"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-caption text-muted-foreground">Status</Label>
              <Select value={filters.status} onValueChange={(v) => { set({ status: v }); setPage(1); }}>
                <SelectTrigger className="h-8 w-[140px] text-caption">
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
              <Select value={filters.dataSubmitterId} onValueChange={(v) => { set({ dataSubmitterId: v }); setPage(1); }}>
                <SelectTrigger className="h-8 min-w-[180px] max-w-[220px] text-caption">
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
                <SelectTrigger className="h-8 w-[140px] text-caption">
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

        {tableError ? (
          <div className="p-6">
            <ApiErrorCard error={tableError} onRetry={refetchTable} />
          </div>
        ) : tableLoading ? (
          <SkeletonTable rows={PAGE_SIZE} cols={8} showHeader={false} />
        ) : (
          <>
            <div className="min-w-0 overflow-x-auto">
              <table className="w-full min-w-max">
                <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                  <tr className="border-b border-border">
                    <th className={cn("text-left px-5 py-3 cursor-pointer", tableHeaderClasses)} onClick={() => toggleSort("requestId")}>Request ID</th>
                    <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Institute</th>
                    <th className={cn("text-left px-5 py-3 cursor-pointer", tableHeaderClasses)} onClick={() => toggleSort("status")}>Status</th>
                    <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Error reason</th>
                    <th className={cn("text-right px-5 py-3 cursor-pointer", tableHeaderClasses)} onClick={() => toggleSort("responseTimeMs")}>Response Time</th>
                    <th className={cn("text-right px-5 py-3", tableHeaderClasses)}>Records</th>
                    <th className={cn("text-left px-5 py-3 cursor-pointer", tableHeaderClasses)} onClick={() => toggleSort("timestamp")}>Timestamp</th>
                    <th className={cn("text-right px-5 py-3", tableHeaderClasses)}>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-caption text-muted-foreground">
                        No requests found
                      </td>
                    </tr>
                  ) : sorted.map((r) => (
                    <tr key={r.requestId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4 text-caption font-medium text-foreground">{r.requestId}</td>
                      <td className="px-5 py-4 text-caption text-muted-foreground">{getInstituteDisplay(r)}</td>
                      <td className="px-5 py-4">
                        <span className={cn("px-2.5 py-1 rounded-full", badgeTextClasses, statusStyles[r.status as ApiRequestStatus] ?? "bg-muted text-muted-foreground")}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-caption text-muted-foreground">{r.errorCode ?? "—"}</td>
                      <td className="px-5 py-4 text-caption text-right tabular-nums">{r.responseTimeMs} ms</td>
                      <td className="px-5 py-4 text-caption text-right">{r.records}</td>
                      <td className="px-5 py-4 text-caption text-muted-foreground whitespace-nowrap">{r.timestamp}</td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRequest(toMockRequest(r))}
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
                {totalElements > 0
                  ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalElements)} of ${totalElements} requests`
                  : "0 requests"}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <span className="text-caption text-muted-foreground px-2">{page} / {Math.max(1, totalPages)}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </div>

      <RequestDetailDrawer request={selectedRequest} onClose={() => setSelectedRequest(null)} />
    </div>
  );
}
