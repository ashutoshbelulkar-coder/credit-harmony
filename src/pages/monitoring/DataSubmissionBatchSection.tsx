import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { tableHeaderClasses, badgeTextClasses } from "@/lib/typography";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  ComposedChart,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileStack,
  Filter,
  Search,
  Upload,
  XCircle,
} from "lucide-react";
import {
  batchJobs as mockBatchJobs,
  batchKpis as mockBatchKpis,
  batchVolumeTrendData,
  processingDurationTrendData,
  topBatchErrorCategoriesData,
  batchDetails,
  batchConsoleByBatchId,
  type BatchJob,
  type BatchStatus,
  type BatchDetail,
} from "@/data/monitoring-mock";
import { institutions } from "@/data/institutions-mock";
import { useBatchJobs, useBatchKpis } from "@/hooks/api/useBatchJobs";
import type { BatchJobResponse } from "@/services/batchJobs.service";
import { InstitutionFilterSelect } from "@/components/shared/InstitutionFilterSelect";
import { ProcessingTimeline } from "./ProcessingTimeline";
import { BatchExecutionConsole } from "./BatchExecutionConsole";
import type { MonitoringFilters } from "./MonitoringFilterBar";

function getInstitutionName(id: string): string {
  const inst = institutions.find((i) => i.id === id);
  return inst ? (inst.tradingName ?? inst.name) : "—";
}

const statusStyles: Record<BatchStatus, string> = {
  Completed: "bg-success/15 text-success",
  Processing: "bg-primary/15 text-primary",
  Failed: "bg-destructive/15 text-destructive",
  Queued: "bg-muted text-muted-foreground",
  Suspended: "bg-warning/15 text-warning",
  Cancelled: "bg-muted text-muted-foreground line-through decoration-muted-foreground/50",
};

const PAGE_SIZE = 10;
type BatchSortKey = "batch_id" | "status" | "uploaded" | "success_rate" | "duration_seconds";

type BatchTimePeriod = "24h" | "7d" | "30d" | "all";

const BATCH_TIME_OPTIONS: { value: BatchTimePeriod; label: string }[] = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

const PIPELINE_STATUS_VALUE = "__queued_or_processing__";
const CUSTOM_MULTI_STATUS_VALUE = "__custom_multi__";

function isQueuedProcessingMulti(st: BatchStatus[] | null): boolean {
  if (!st || st.length !== 2) return false;
  const set = new Set(st);
  return set.has("Queued") && set.has("Processing");
}

function parseBatchStatusQuery(param: string | null): BatchStatus[] | null {
  if (!param?.trim()) return null;
  const map: Record<string, BatchStatus> = {
    queued: "Queued",
    processing: "Processing",
    completed: "Completed",
    failed: "Failed",
    suspended: "Suspended",
    cancelled: "Cancelled",
  };
  const out = param
    .split(",")
    .map((s) => map[s.trim().toLowerCase()])
    .filter((x): x is BatchStatus => Boolean(x));
  return out.length ? out : null;
}

function isWithinTimePeriod(uploaded: string, period: BatchTimePeriod): boolean {
  if (period === "all") return true;
  const ms = new Date(uploaded.replace(" ", "T")).getTime();
  const now = Date.now();
  const windowMs =
    period === "24h" ? 24 * 60 * 60 * 1000
    : period === "7d" ? 7 * 24 * 60 * 60 * 1000
    : 30 * 24 * 60 * 60 * 1000;
  return now - ms <= windowMs;
}

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
          <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
          <p className="text-h3 font-bold mt-1 text-foreground">{value}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
    </div>
  );
}

const batchVolumeConfig = {
  batches: { label: "Batches", color: "hsl(var(--primary))" },
  success: { label: "Success", color: "hsl(var(--success))" },
  failed: { label: "Failed", color: "hsl(var(--danger))" },
} satisfies ChartConfig;
const durationConfig = { avgSec: { label: "Avg (s)", color: "hsl(var(--primary))" } } satisfies ChartConfig;
const errorCategoriesConfig = { count: { label: "Count", color: "hsl(var(--warning))" } } satisfies ChartConfig;

/** `fetchBatchJobs` returns a paged object `{ content }`, not a raw array — map into mock `BatchJob` row shape. */
function batchJobsFromQuery(data: unknown): BatchJob[] | null {
  if (data == null) return null;
  if (Array.isArray(data)) return data as BatchJob[];
  const content = (data as { content?: unknown }).content;
  if (!Array.isArray(content)) return null;
  return (content as BatchJobResponse[]).map((r) => ({
    batch_id: r.batchId,
    file_name: r.fileName,
    status: r.status as BatchStatus,
    total_records: r.totalRecords,
    success: r.successRecords,
    failed: r.failedRecords,
    success_rate: r.successRate,
    duration_seconds: r.durationSeconds,
    uploaded: r.uploadedAt,
    uploaded_by: r.uploadedBy,
    institution_id: r.institutionId ?? "",
  }));
}

function exportFailuresCSV(failures: BatchDetail["record_failures"]) {
  const headers = ["Record ID", "Field", "Error Type", "Error Message", "Severity"];
  const rows = failures.map((f) => [f.record_id, f.field, f.error_type, f.error_message, f.severity]);
  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "batch-failures.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function DataSubmissionBatchSection({ filters }: { filters: MonitoringFilters }) {
  const { data: apiBatchJobs } = useBatchJobs();
  const { data: apiBatchKpis } = useBatchKpis();
  const batchJobs: BatchJob[] = useMemo(
    () => batchJobsFromQuery(apiBatchJobs) ?? mockBatchJobs,
    [apiBatchJobs]
  );
  const batchKpis = (apiBatchKpis as unknown as typeof mockBatchKpis) ?? mockBatchKpis;

  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<BatchSortKey>("uploaded");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [batchIdSearch, setBatchIdSearch] = useState("");
  const [institutionFilter, setInstitutionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  /** When set, table shows rows matching any of these statuses (e.g. from dashboard deep link). */
  const [statusMultiFilter, setStatusMultiFilter] = useState<BatchStatus[] | null>(null);
  const [timePeriod, setTimePeriod] = useState<BatchTimePeriod>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const statusQueryParam = searchParams.get("status");
  const urlStatusParsed = useMemo(
    () => parseBatchStatusQuery(statusQueryParam),
    [statusQueryParam]
  );

  useEffect(() => {
    if (!urlStatusParsed?.length) return;
    if (urlStatusParsed.length === 1) {
      setStatusFilter(urlStatusParsed[0]);
      setStatusMultiFilter(null);
    } else {
      setStatusMultiFilter(urlStatusParsed);
      setStatusFilter("all");
    }
    setPage(1);
  }, [urlStatusParsed]);

  const statusSelectValue = statusMultiFilter?.length
    ? isQueuedProcessingMulti(statusMultiFilter)
      ? PIPELINE_STATUS_VALUE
      : CUSTOM_MULTI_STATUS_VALUE
    : statusFilter;

  const activeFilterCount = [
    batchIdSearch.trim().length > 0,
    institutionFilter !== "all",
    statusFilter !== "all",
    Boolean(statusMultiFilter?.length),
  ].filter(Boolean).length;

  const filtered = batchJobs.filter((b) => {
    if (batchIdSearch.trim() && !b.batch_id.toLowerCase().includes(batchIdSearch.trim().toLowerCase())) return false;
    if (institutionFilter !== "all" && b.institution_id !== institutionFilter) return false;
    if (statusMultiFilter?.length) {
      if (!statusMultiFilter.includes(b.status)) return false;
    } else if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (!isWithinTimePeriod(b.uploaded, timePeriod)) return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "batch_id") cmp = a.batch_id.localeCompare(b.batch_id);
    else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
    else if (sortKey === "uploaded") cmp = a.uploaded.localeCompare(b.uploaded);
    else if (sortKey === "success_rate") cmp = a.success_rate - b.success_rate;
    else if (sortKey === "duration_seconds") cmp = a.duration_seconds - b.duration_seconds;
    return sortDir === "asc" ? cmp : -cmp;
  });
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: BatchSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else setSortKey(key);
    setPage(1);
  };
  const selectedJob = selectedBatchId ? batchJobs.find((b) => b.batch_id === selectedBatchId) : null;
  const detail: BatchDetail | undefined = selectedBatchId
    ? batchDetails[selectedBatchId] ?? (selectedJob
        ? {
            batch_id: selectedJob.batch_id,
            file_name: selectedJob.file_name,
            upload_time: selectedJob.uploaded,
            processing_start: selectedJob.uploaded,
            processing_end: "-",
            duration_seconds: selectedJob.duration_seconds,
            total_records: selectedJob.total_records,
            success_records: selectedJob.success,
            failed_records: selectedJob.failed,
            timeline: [
              { step: "File Uploaded", timestamp: selectedJob.uploaded, completed: true },
              { step: "Schema Validated", timestamp: "-", completed: selectedJob.status !== "Queued" },
              { step: "Records Parsed", timestamp: "-", completed: selectedJob.status === "Completed" || selectedJob.status === "Failed" },
              { step: "Validation Completed", timestamp: "-", completed: selectedJob.status === "Completed" || selectedJob.status === "Failed" },
              { step: "Stored to DB", timestamp: "-", completed: selectedJob.status === "Completed" },
              { step: "Completed", timestamp: selectedJob.status === "Completed" ? "-" : "-", completed: selectedJob.status === "Completed" || selectedJob.status === "Failed" },
            ],
            record_failures: [],
          }
        : undefined)
    : undefined;

  // Scroll to top when opening batch detail (View) so the new content is visible at top
  useEffect(() => {
    if (!selectedBatchId) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.querySelector("main")?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [selectedBatchId]);

  if (detail) {
    const consoleData = batchConsoleByBatchId[detail.batch_id];
    const institutionName = selectedJob ? getInstitutionName(selectedJob.institution_id) : "—";
    const batchStatus = (selectedJob?.status ?? "Queued") as import("@/data/monitoring-mock").BatchStatus;
    return (
      <BatchExecutionConsole
        key={detail.batch_id}
        detail={detail}
        status={batchStatus}
        consoleData={consoleData}
        institutionName={institutionName}
        onBack={() => setSelectedBatchId(null)}
      />
    );
  }

  const kpis = [
    { label: "Total Batches Today", value: batchKpis.totalBatchesToday, icon: FileStack },
    { label: "Total Records Processed", value: batchKpis.totalRecordsProcessed.toLocaleString(), icon: Upload },
    { label: "Avg Batch Success Rate", value: `${batchKpis.avgBatchSuccessRate}%`, icon: CheckCircle2 },
    { label: "Failed Batches Count", value: batchKpis.failedBatchesCount, icon: XCircle },
    { label: "Avg Processing Duration", value: `${batchKpis.avgProcessingDurationSec}s`, icon: Clock },
    { label: "Queue Backlog Count", value: batchKpis.queueBacklogCount, icon: FileStack },
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
          <h4 className="text-body font-semibold text-foreground mb-4">Batch Volume Trend</h4>
          <ChartContainer config={batchVolumeConfig} className="h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full">
            <ComposedChart data={batchVolumeTrendData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="success" stackId="a" fill="hsl(var(--success))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="failed" stackId="a" fill="hsl(var(--danger))" radius={[0, 0, 0, 0]} />
              <Line type="monotone" dataKey="batches" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ChartContainer>
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <h4 className="text-body font-semibold text-foreground mb-4">Processing Duration Trend</h4>
          <ChartContainer config={durationConfig} className="h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full">
            <LineChart data={processingDurationTrendData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="avgSec" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <h4 className="text-body font-semibold text-foreground mb-4">Top Batch Error Categories</h4>
        <ChartContainer config={errorCategoriesConfig} className="h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full">
          <BarChart data={topBatchErrorCategoriesData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="category" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="px-4 pt-4 pb-4 border-b border-border md:px-6 md:pt-6">
          <h4 className="text-body font-semibold text-foreground mb-4">Batch Jobs</h4>
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
                {filtersOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </span>
            </button>
            {filtersOpen && (
              <div className="border-t border-border pt-3 mt-2 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-caption text-muted-foreground">Batch ID</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Search..." value={batchIdSearch} onChange={(e) => { setBatchIdSearch(e.target.value); setPage(1); }} className="h-8 pl-8 w-full text-caption" />
                  </div>
                </div>
                <InstitutionFilterSelect
                  mode="submitters"
                  value={institutionFilter}
                  onValueChange={(v) => {
                    setInstitutionFilter(v);
                    setPage(1);
                  }}
                  triggerClassName="w-full"
                />
                <div className="space-y-1.5">
                  <Label className="text-caption text-muted-foreground">Status</Label>
                  <Select
                    value={statusSelectValue}
                    onValueChange={(v) => {
                      setPage(1);
                      if (v === PIPELINE_STATUS_VALUE) {
                        setStatusMultiFilter(["Queued", "Processing"]);
                        setStatusFilter("all");
                      } else if (v === CUSTOM_MULTI_STATUS_VALUE) {
                        /* no-op — placeholder from URL */
                      } else {
                        setStatusMultiFilter(null);
                        setStatusFilter(v);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 w-full text-caption"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-caption">All statuses</SelectItem>
                      <SelectItem value={CUSTOM_MULTI_STATUS_VALUE} className="text-caption" disabled>
                        Multiple (URL filter)
                      </SelectItem>
                      <SelectItem value={PIPELINE_STATUS_VALUE} className="text-caption">Queued or Processing</SelectItem>
                      {(["Completed", "Processing", "Failed", "Queued"] as const).map((s) => <SelectItem key={s} value={s} className="text-caption">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-caption text-muted-foreground">Time period</Label>
                  <Select value={timePeriod} onValueChange={(v) => { setTimePeriod(v as BatchTimePeriod); setPage(1); }}>
                    <SelectTrigger className="h-8 w-full text-caption"><SelectValue placeholder="Time period" /></SelectTrigger>
                    <SelectContent>
                      {BATCH_TIME_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} className="text-caption">{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <div className="hidden md:flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-caption text-muted-foreground">Batch ID</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search..." value={batchIdSearch} onChange={(e) => { setBatchIdSearch(e.target.value); setPage(1); }} className="h-8 pl-8 w-[180px] text-caption" />
              </div>
            </div>
            <InstitutionFilterSelect
              mode="submitters"
              value={institutionFilter}
              onValueChange={(v) => {
                setInstitutionFilter(v);
                setPage(1);
              }}
              triggerClassName="min-w-[180px] max-w-[220px]"
            />
            <div className="space-y-1.5">
              <Label className="text-caption text-muted-foreground">Status</Label>
              <Select
                value={statusSelectValue}
                onValueChange={(v) => {
                  setPage(1);
                  if (v === PIPELINE_STATUS_VALUE) {
                    setStatusMultiFilter(["Queued", "Processing"]);
                    setStatusFilter("all");
                  } else if (v === CUSTOM_MULTI_STATUS_VALUE) {
                    /* no-op */
                  } else {
                    setStatusMultiFilter(null);
                    setStatusFilter(v);
                  }
                }}
              >
                <SelectTrigger className="h-8 w-[180px] text-caption"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-caption">All statuses</SelectItem>
                  <SelectItem value={CUSTOM_MULTI_STATUS_VALUE} className="text-caption" disabled>
                    Multiple (URL filter)
                  </SelectItem>
                  <SelectItem value={PIPELINE_STATUS_VALUE} className="text-caption">Queued or Processing</SelectItem>
                  {(["Completed", "Processing", "Failed", "Queued"] as const).map((s) => <SelectItem key={s} value={s} className="text-caption">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-caption text-muted-foreground">Time period</Label>
              <Select value={timePeriod} onValueChange={(v) => { setTimePeriod(v as BatchTimePeriod); setPage(1); }}>
                <SelectTrigger className="h-8 w-[140px] text-caption"><SelectValue placeholder="Time period" /></SelectTrigger>
                <SelectContent>
                  {BATCH_TIME_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} className="text-caption">{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
              <tr className="border-b border-border">
                <th className={cn("text-left px-5 py-3 cursor-pointer", tableHeaderClasses)} onClick={() => toggleSort("batch_id")}>Batch ID</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Institution</th>
                <th className={cn("text-left px-5 py-3 cursor-pointer", tableHeaderClasses)} onClick={() => toggleSort("status")}>Status</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Records</th>
                <th className={cn("text-left px-5 py-3 cursor-pointer", tableHeaderClasses)} onClick={() => toggleSort("success_rate")}>Success Rate</th>
                <th className={cn("text-left px-5 py-3 cursor-pointer", tableHeaderClasses)} onClick={() => toggleSort("duration_seconds")}>Duration</th>
                <th className={cn("text-left px-5 py-3 cursor-pointer", tableHeaderClasses)} onClick={() => toggleSort("uploaded")}>Uploaded</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.map((b) => (
                <tr key={b.batch_id} className={cn("hover:bg-muted/30", b.success_rate > 0 && b.success_rate < 90 && "bg-warning/5")}>
                  <td className="px-5 py-4 text-caption font-medium text-foreground">{b.batch_id}</td>
                  <td className="px-5 py-4 text-caption text-muted-foreground">{getInstitutionName(b.institution_id)}</td>
                  <td className="px-5 py-4">
                    <span className={cn("px-2.5 py-1 rounded-full", badgeTextClasses, statusStyles[b.status])}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-caption">
                    <span>{b.total_records} / {b.total_records}</span>
                    <br />
                    <span className="text-success">✓ {b.success}</span>
                    <br />
                    <span className="text-destructive">✕ {b.failed}</span>
                  </td>
                  <td className="px-5 py-4 text-caption">
                    <span className={cn("inline-flex items-center gap-1", b.success_rate > 0 && b.success_rate < 90 && "text-warning")}>
                      {b.success_rate > 0 ? `${b.success_rate}%` : "-"}
                      {b.success_rate > 0 && b.success_rate < 90 && <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-warning" />}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-caption">{b.duration_seconds > 0 ? `${b.duration_seconds}s` : "-"}</td>
                  <td className="px-5 py-4 text-caption text-muted-foreground">{b.uploaded}</td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedBatchId(b.batch_id)}
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
            {sorted.length > 0
              ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, sorted.length)} of ${sorted.length} batch jobs`
              : "0 batch jobs"}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-caption text-muted-foreground px-2">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
