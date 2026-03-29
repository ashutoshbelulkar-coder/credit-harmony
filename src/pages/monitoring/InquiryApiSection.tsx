import { useMemo, useState } from "react";
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
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Clock,
  Filter,
  Search,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  enquiryKpis,
  enquiryVolumeData,
  enquiryResponseTimeTrendData,
  enquiryByProductData,
  enquirySuccessVsFailedData,
  type EnquiryLogEntry,
  type EnquiryStatus,
} from "@/data/monitoring-mock";
import { InstitutionFilterSelect } from "@/components/shared/InstitutionFilterSelect";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitutions } from "@/hooks/api/useInstitutions";
import { isWithinRelativeWindow, WINDOW_MS } from "@/lib/calc/dateFilter";
import type { MonitoringFilters, TimeRangeValue } from "./MonitoringFilterBar";
import { EnquiryDetailDrawer } from "./EnquiryDetailDrawer";
import { useEnquiries } from "@/hooks/api/useMonitoring";
import type { EnquiryRecord } from "@/services/monitoring.service";
import { SkeletonTable } from "@/components/ui/skeleton-table";

const ENQUIRY_TIME_OPTIONS: { value: TimeRangeValue; label: string }[] = [
  { value: "5m", label: "Last 5 mins" },
  { value: "1h", label: "Last 1 hr" },
  { value: "6h", label: "Last 6 hrs" },
  { value: "24h", label: "Last 24 hrs" },
];

/** Map an API EnquiryRecord → the EnquiryLogEntry shape the detail drawer expects. */
function toMockEnquiry(r: EnquiryRecord): EnquiryLogEntry {
  return {
    enquiry_id: r.enquiryId,
    api_key: "",
    product: r.productName ?? r.enquiryType ?? "Credit Report",
    product_id: r.productId ?? "",
    status: r.status as EnquiryStatus,
    response_time_ms: r.responseTimeMs,
    consumer_id: r.consumerId ?? "—",
    alternate_data_used: r.alternateDataUsed ?? 0,
    timestamp: r.timestamp,
  };
}

function isWithinEnquiryTimeRange(ts: string, timeRange: TimeRangeValue): boolean {
  return isWithinRelativeWindow(ts, WINDOW_MS[timeRange]);
}

const statusStyles: Record<EnquiryStatus, string> = {
  Success: "bg-success/15 text-success",
  Failed: "bg-destructive/15 text-destructive",
};

const PAGE_SIZE = 10;

function KpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
          <p className="text-h3 font-bold mt-1 text-foreground">{value}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
    </div>
  );
}

const volumeConfig = { volume: { label: "Enquiries", color: "hsl(var(--primary))" } } satisfies ChartConfig;
const responseConfig = {
  p95: { label: "P95 (ms)", color: "hsl(var(--primary))" },
  avg: { label: "Avg (ms)", color: "hsl(var(--muted-foreground))" },
} satisfies ChartConfig;
const pieColors = ["hsl(var(--success))", "hsl(var(--danger))"];

export function InquiryApiSection({
  filters,
  onFiltersChange,
}: {
  filters: MonitoringFilters;
  onFiltersChange?: (f: MonitoringFilters) => void;
}) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof EnquiryRecord | "">("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryLogEntry | null>(null);
  const [enquiryIdSearch, setEnquiryIdSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { user } = useAuth();

  const activeFilterCount = [
    enquiryIdSearch.trim().length > 0,
    filters.status !== "all",
    filters.subscriberId !== "all",
    Boolean(filters.dateFrom?.trim() && filters.dateTo?.trim()),
  ].filter(Boolean).length;

  const set = (partial: Partial<MonitoringFilters>) =>
    onFiltersChange?.({ ...filters, ...partial });

  // Build server-side filter params; page is 0-indexed on the API
  const apiParams = useMemo(
    () => ({
      status: filters.status !== "all" ? filters.status : undefined,
      institutionId: filters.subscriberId !== "all" ? filters.subscriberId : undefined,
      dateFrom: filters.dateFrom?.trim() || undefined,
      dateTo: filters.dateTo?.trim() || undefined,
      page: page - 1,
      size: PAGE_SIZE,
    }),
    [filters.status, filters.subscriberId, filters.dateFrom, filters.dateTo, page]
  );

  const { data: enquiriesData, isLoading: tableLoading } = useEnquiries(apiParams);

  const { data: institutionsPage } = useInstitutions(
    { size: 300 },
    { enabled: !!user, allowMockFallback: false }
  );

  const tableRows = enquiriesData?.content ?? [];

  // Client-side refinement: enquiryId search and timeRange
  const clientFiltered = tableRows.filter((e) => {
    if (!isWithinEnquiryTimeRange(e.timestamp, filters.timeRange)) return false;
    if (enquiryIdSearch.trim() && !e.enquiryId.toLowerCase().includes(enquiryIdSearch.trim().toLowerCase())) return false;
    return true;
  });

  const filterContextSummary = useMemo(() => {
    const parts: string[] = [];
    if (filters.subscriberId !== "all") {
      const sid = String(filters.subscriberId).replace(/\D/g, "");
      const inst = institutionsPage?.content.find((i) => String(i.id).replace(/\D/g, "") === sid);
      if (inst) parts.push(`Subscriber: ${inst.tradingName ?? inst.name}`);
    }
    if (filters.dateFrom?.trim() && filters.dateTo?.trim()) {
      parts.push(`Dates: ${filters.dateFrom} → ${filters.dateTo}`);
    }
    return parts.length ? parts.join(" · ") : undefined;
  }, [filters.subscriberId, filters.dateFrom, filters.dateTo, institutionsPage?.content]);

  const sorted = useMemo(() => {
    if (!sortKey) return clientFiltered;
    return [...clientFiltered].sort((a, b) => {
      const va = a[sortKey as keyof EnquiryRecord];
      const vb = b[sortKey as keyof EnquiryRecord];
      if (typeof va === "number" && typeof vb === "number") return sortDir === "asc" ? va - vb : vb - va;
      if (typeof va === "string" && typeof vb === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return 0;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientFiltered, sortKey, sortDir]);

  const totalPages = enquiriesData?.totalPages ?? 1;
  const totalElements = enquiriesData?.totalElements ?? 0;

  const toggleSort = (key: keyof EnquiryRecord) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else setSortKey(key);
    setPage(1);
  };

  // KPIs still sourced from mock since no enquiry-specific KPI endpoint exists yet
  const kpis = [
    { label: "Total Enquiries Today", value: enquiryKpis.totalEnquiriesToday.toLocaleString(), icon: Activity },
    { label: "Success Rate %", value: `${enquiryKpis.successRatePercent}%`, icon: CheckCircle2 },
    { label: "P95 Latency", value: `${enquiryKpis.p95LatencyMs} ms`, icon: Clock },
    { label: "Alternate Data Calls", value: enquiryKpis.alternateDataCalls, icon: Zap },
    { label: "Rate Limit Breaches", value: enquiryKpis.rateLimitBreaches, icon: AlertTriangle },
    { label: "Credit Consumption", value: enquiryKpis.creditConsumption.toLocaleString(), icon: CreditCard },
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
          <h4 className="text-body font-semibold text-foreground mb-4">Enquiry Volume</h4>
          <ChartContainer config={volumeConfig} className="h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full">
            <LineChart data={enquiryVolumeData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="volume" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <h4 className="text-body font-semibold text-foreground mb-4">Response Time Trend</h4>
          <ChartContainer config={responseConfig} className="h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full">
            <LineChart data={enquiryResponseTimeTrendData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="p95" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="avg" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <h4 className="text-body font-semibold text-foreground mb-4">Enquiry by Product Type</h4>
          <ChartContainer config={{ success: { label: "Success", color: "hsl(var(--success))" }, failed: { label: "Failed", color: "hsl(var(--danger))" } }} className="h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full">
            <BarChart data={enquiryByProductData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="product" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="success" stackId="a" fill="hsl(var(--success))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="failed" stackId="a" fill="hsl(var(--danger))" radius={[0, 0, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <h4 className="text-body font-semibold text-foreground mb-4">Success vs Failed Enquiries</h4>
          <ChartContainer config={{ Success: { label: "Success", color: "hsl(var(--success))" }, Failed: { label: "Failed", color: "hsl(var(--danger))" } }} className="h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full">
            <PieChart>
              <Pie data={enquirySuccessVsFailedData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80}>
                {enquirySuccessVsFailedData.map((_, i) => (
                  <Cell key={i} fill={pieColors[i]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="px-4 pt-4 pb-3 border-b border-border sm:px-6 sm:pt-6 sm:pb-4">
          <h4 className="text-body font-semibold text-foreground mb-3 sm:mb-4">Detailed Enquiry Log</h4>
          <div className="sm:hidden">
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
                {filtersOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </span>
            </button>
            {filtersOpen && (
              <div className="border-t border-border pt-3 mt-2 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-caption text-muted-foreground">Enquiry ID</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Search..." value={enquiryIdSearch} onChange={(e) => { setEnquiryIdSearch(e.target.value); setPage(1); }} className="h-8 pl-8 w-full text-caption" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-caption text-muted-foreground">Status</Label>
                  <Select value={filters.status} onValueChange={(v) => { set({ status: v }); setPage(1); }}>
                    <SelectTrigger className="h-8 w-full text-caption"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-caption">All statuses</SelectItem>
                      <SelectItem value="Success" className="text-caption">Success</SelectItem>
                      <SelectItem value="Failed" className="text-caption">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <InstitutionFilterSelect
                  mode="subscribers"
                  value={filters.subscriberId}
                  onValueChange={(v) => {
                    set({ subscriberId: v });
                    setPage(1);
                  }}
                  label="Institute"
                  allLabel="All subscribers"
                  triggerClassName="h-8 w-full text-caption"
                />
                <div className="space-y-1.5">
                  <Label className="text-caption text-muted-foreground">Time</Label>
                  <Select value={filters.timeRange} onValueChange={(v) => { set({ timeRange: v as TimeRangeValue }); setPage(1); }}>
                    <SelectTrigger className="h-8 w-full text-caption"><SelectValue placeholder="Time" /></SelectTrigger>
                    <SelectContent>
                      {ENQUIRY_TIME_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} className="text-caption">{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <div className="hidden sm:flex flex-wrap items-end gap-4">
            <div className="space-y-1.5 min-w-0">
              <Label className="text-caption text-muted-foreground">Enquiry ID</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search..." value={enquiryIdSearch} onChange={(e) => { setEnquiryIdSearch(e.target.value); setPage(1); }} className="h-8 pl-8 w-[180px] text-caption" />
              </div>
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label className="text-caption text-muted-foreground">Status</Label>
              <Select value={filters.status} onValueChange={(v) => { set({ status: v }); setPage(1); }}>
                <SelectTrigger className="h-8 w-[140px] text-caption"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-caption">All statuses</SelectItem>
                  <SelectItem value="Success" className="text-caption">Success</SelectItem>
                  <SelectItem value="Failed" className="text-caption">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <InstitutionFilterSelect
              mode="subscribers"
              value={filters.subscriberId}
              onValueChange={(v) => {
                set({ subscriberId: v });
                setPage(1);
              }}
              label="Institute"
              allLabel="All subscribers"
              triggerClassName="h-8 min-w-[180px] max-w-[220px] text-caption"
            />
            <div className="space-y-1.5 min-w-0">
              <Label className="text-caption text-muted-foreground">Time</Label>
              <Select value={filters.timeRange} onValueChange={(v) => { set({ timeRange: v as TimeRangeValue }); setPage(1); }}>
                <SelectTrigger className="h-8 w-[140px] text-caption"><SelectValue placeholder="Time" /></SelectTrigger>
                <SelectContent>
                  {ENQUIRY_TIME_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} className="text-caption">{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {tableLoading ? (
          <SkeletonTable rows={PAGE_SIZE} cols={7} showHeader={false} />
        ) : (
          <>
            <div className="min-w-0 overflow-x-auto">
              <table className="w-full min-w-max">
                <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                  <tr className="border-b border-border">
                    <th className={cn("text-left px-5 py-3 cursor-pointer", tableHeaderClasses)} onClick={() => toggleSort("enquiryId")}>Enquiry ID</th>
                    <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Institution</th>
                    <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Data sources</th>
                    <th className={cn("text-left px-5 py-3 cursor-pointer", tableHeaderClasses)} onClick={() => toggleSort("status")}>Status</th>
                    <th className={cn("text-right px-5 py-3 cursor-pointer", tableHeaderClasses)} onClick={() => toggleSort("responseTimeMs")}>Response Time</th>
                    <th className={cn("text-left px-5 py-3 cursor-pointer", tableHeaderClasses)} onClick={() => toggleSort("timestamp")}>Timestamp</th>
                    <th className={cn("text-right px-5 py-3", tableHeaderClasses)}>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-caption text-muted-foreground">
                        No enquiries found
                      </td>
                    </tr>
                  ) : sorted.map((e) => (
                    <tr key={e.enquiryId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4 text-caption font-medium text-foreground">{e.enquiryId}</td>
                      <td className="px-5 py-4 text-caption text-muted-foreground">{e.institution || "—"}</td>
                      <td className="px-5 py-4 text-body text-foreground">
                        {e.productName ?? e.enquiryType}
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn("px-2.5 py-1 rounded-full", badgeTextClasses, statusStyles[e.status as EnquiryStatus] ?? "bg-muted text-muted-foreground")}>
                          {e.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-caption text-right tabular-nums">{e.responseTimeMs} ms</td>
                      <td className="px-5 py-4 text-caption text-muted-foreground whitespace-nowrap">{e.timestamp}</td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedEnquiry(toMockEnquiry(e))}
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
                {sorted.length === 0
                  ? tableRows.length > 0
                    ? "No enquiries match the current filters on this page."
                    : totalElements === 0
                      ? "0 enquiries"
                      : "No enquiries on this page"
                  : `Showing ${(page - 1) * PAGE_SIZE + 1}–${(page - 1) * PAGE_SIZE + sorted.length} of ${totalElements} enquiries`}
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

      <EnquiryDetailDrawer
        enquiry={selectedEnquiry}
        onClose={() => setSelectedEnquiry(null)}
        filterContextSummary={filterContextSummary}
      />
    </div>
  );
}
