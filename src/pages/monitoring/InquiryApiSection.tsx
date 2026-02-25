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
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Clock,
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
  enquiryLogEntries,
  subscriberIdByApiKey,
  type EnquiryLogEntry,
  type EnquiryStatus,
} from "@/data/monitoring-mock";
import { institutions } from "@/data/institutions-mock";
import type { MonitoringFilters, TimeRangeValue } from "./MonitoringFilterBar";
import { EnquiryDetailDrawer } from "./EnquiryDetailDrawer";

const ENQUIRY_TIME_OPTIONS: { value: TimeRangeValue; label: string }[] = [
  { value: "5m", label: "Last 5 mins" },
  { value: "1h", label: "Last 1 hr" },
  { value: "6h", label: "Last 6 hrs" },
  { value: "24h", label: "Last 24 hrs" },
];

const subscribers = institutions.filter((i) => i.isSubscriber);

function isWithinTimeRange(ts: string, timeRange: TimeRangeValue): boolean {
  const ms = new Date(ts.replace(" ", "T")).getTime();
  const now = Date.now();
  const windowMs =
    timeRange === "5m" ? 5 * 60 * 1000
    : timeRange === "1h" ? 60 * 60 * 1000
    : timeRange === "6h" ? 6 * 60 * 60 * 1000
    : 24 * 60 * 60 * 1000;
  return now - ms <= windowMs;
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
  const [sortKey, setSortKey] = useState<keyof EnquiryLogEntry | "">("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryLogEntry | null>(null);
  const [enquiryIdSearch, setEnquiryIdSearch] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRangeValue>("24h");

  const set = (partial: Partial<MonitoringFilters>) =>
    onFiltersChange?.({ ...filters, ...partial });

  const filtered = enquiryLogEntries.filter((e) => {
    if (filters.status !== "all" && e.status !== filters.status) return false;
    if (filters.subscriberId !== "all" && subscriberIdByApiKey[e.api_key] !== filters.subscriberId) return false;
    if (enquiryIdSearch.trim() && !e.enquiry_id.toLowerCase().includes(enquiryIdSearch.trim().toLowerCase())) return false;
    if (!isWithinTimeRange(e.timestamp, timeRange)) return false;
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

  const toggleSort = (key: keyof EnquiryLogEntry) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else setSortKey(key);
    setPage(1);
  };

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
          <ChartContainer config={volumeConfig} className="h-[220px] w-full">
            <LineChart data={enquiryVolumeData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
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
          <ChartContainer config={responseConfig} className="h-[220px] w-full">
            <LineChart data={enquiryResponseTimeTrendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
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
          <ChartContainer config={{ success: { label: "Success", color: "hsl(var(--success))" }, failed: { label: "Failed", color: "hsl(var(--danger))" } }} className="h-[220px] w-full">
            <BarChart data={enquiryByProductData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
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
          <ChartContainer config={{ Success: { label: "Success", color: "hsl(var(--success))" }, Failed: { label: "Failed", color: "hsl(var(--danger))" } }} className="h-[220px] w-full">
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
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <h4 className="text-body font-semibold text-foreground mb-4">Detailed Enquiry Log</h4>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-caption text-muted-foreground">Enquiry ID</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={enquiryIdSearch}
                  onChange={(e) => { setEnquiryIdSearch(e.target.value); setPage(1); }}
                  className="h-9 pl-8 w-[180px] text-caption"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-caption text-muted-foreground">Status</Label>
              <Select value={filters.status} onValueChange={(v) => { set({ status: v }); setPage(1); }}>
                <SelectTrigger className="h-9 w-[140px] text-caption">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-caption">All statuses</SelectItem>
                  <SelectItem value="Success" className="text-caption">Success</SelectItem>
                  <SelectItem value="Failed" className="text-caption">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-caption text-muted-foreground">Institute</Label>
              <Select value={filters.subscriberId} onValueChange={(v) => { set({ subscriberId: v }); setPage(1); }}>
                <SelectTrigger className="h-9 min-w-[180px] max-w-[220px] text-caption">
                  <SelectValue placeholder="Institute" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-caption">All subscribers</SelectItem>
                  {subscribers.map((i) => (
                    <SelectItem key={i.id} value={i.id} className="text-caption">{i.tradingName ?? i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-caption text-muted-foreground">Time</Label>
              <Select value={timeRange} onValueChange={(v) => { setTimeRange(v as TimeRangeValue); setPage(1); }}>
                <SelectTrigger className="h-9 w-[140px] text-caption">
                  <SelectValue placeholder="Time" />
                </SelectTrigger>
                <SelectContent>
                  {ENQUIRY_TIME_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-caption">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
              <tr className="border-b border-border">
                <th className={cn("text-left px-5 py-3 cursor-pointer", tableHeaderClasses)} onClick={() => toggleSort("enquiry_id")}>Enquiry ID</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>API Key</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Product</th>
                <th className={cn("text-left px-5 py-3 cursor-pointer", tableHeaderClasses)} onClick={() => toggleSort("status")}>Status</th>
                <th className={cn("text-right px-5 py-3 cursor-pointer", tableHeaderClasses)} onClick={() => toggleSort("response_time_ms")}>Response Time</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Consumer ID</th>
                <th className={cn("text-right px-5 py-3", tableHeaderClasses)}>Alt Data Used</th>
                <th className={cn("text-left px-5 py-3 cursor-pointer", tableHeaderClasses)} onClick={() => toggleSort("timestamp")}>Timestamp</th>
                <th className={cn("text-right px-5 py-3", tableHeaderClasses)}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.map((e) => (
                <tr key={e.enquiry_id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4 text-caption font-medium text-foreground">{e.enquiry_id}</td>
                  <td className="px-5 py-4 text-caption text-muted-foreground">{e.api_key}</td>
                  <td className="px-5 py-4 text-body text-foreground">{e.product}</td>
                  <td className="px-5 py-4">
                    <span className={cn("px-2.5 py-1 rounded-full", badgeTextClasses, statusStyles[e.status])}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-caption text-right tabular-nums">{e.response_time_ms} ms</td>
                  <td className="px-5 py-4 text-caption text-muted-foreground">{e.consumer_id}</td>
                  <td className="px-5 py-4 text-caption text-right">{e.alternate_data_used}</td>
                  <td className="px-5 py-4 text-caption text-muted-foreground whitespace-nowrap">{e.timestamp}</td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedEnquiry(e)}
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

      <EnquiryDetailDrawer enquiry={selectedEnquiry} onClose={() => setSelectedEnquiry(null)} />
    </div>
  );
}
