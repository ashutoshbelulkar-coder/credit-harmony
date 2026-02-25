import { useState } from "react";
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
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileStack,
  RotateCcw,
  Search,
  Upload,
  XCircle,
} from "lucide-react";
import {
  batchJobs,
  batchKpis,
  batchVolumeTrendData,
  processingDurationTrendData,
  topBatchErrorCategoriesData,
  batchDetails,
  type BatchJob,
  type BatchStatus,
  type BatchDetail,
} from "@/data/monitoring-mock";
import { institutions } from "@/data/institutions-mock";
import { ProcessingTimeline } from "./ProcessingTimeline";
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

const dataSubmitters = institutions.filter((i) => i.isDataSubmitter);

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
  const [page, setPage] = useState(1);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<BatchSortKey>("uploaded");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [batchIdSearch, setBatchIdSearch] = useState("");
  const [institutionFilter, setInstitutionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timePeriod, setTimePeriod] = useState<BatchTimePeriod>("all");

  const filtered = batchJobs.filter((b) => {
    if (batchIdSearch.trim() && !b.batch_id.toLowerCase().includes(batchIdSearch.trim().toLowerCase())) return false;
    if (institutionFilter !== "all" && b.institution_id !== institutionFilter) return false;
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
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

  if (detail) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={() => setSelectedBatchId(null)}>
          <ArrowLeft className="w-4 h-4" />
          Back to Batch Jobs
        </Button>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <p className="text-caption text-muted-foreground">Batch ID</p>
            <p className="text-body font-semibold mt-1">{detail.batch_id}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <p className="text-caption text-muted-foreground">File Name</p>
            <p className="text-body font-semibold mt-1">{detail.file_name}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <p className="text-caption text-muted-foreground">Upload Time</p>
            <p className="text-body font-semibold mt-1">{detail.upload_time}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <p className="text-caption text-muted-foreground">Duration</p>
            <p className="text-body font-semibold mt-1">{detail.duration_seconds}s</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <p className="text-caption text-muted-foreground">Total / Success / Failed</p>
            <p className="text-body font-semibold mt-1">{detail.total_records} / {detail.success_records} / {detail.failed_records}</p>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <h4 className="text-body font-semibold text-foreground mb-4">Processing Timeline</h4>
          <ProcessingTimeline steps={detail.timeline} />
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h4 className="text-h4 font-semibold text-foreground">Record-Level Failures</h4>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => exportFailuresCSV(detail.record_failures)}>
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/95">
                <tr className="border-b border-border">
                  <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Record ID</th>
                  <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Field</th>
                  <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Error Type</th>
                  <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Error Message</th>
                  <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {detail.record_failures.map((f) => (
                  <tr key={f.record_id} className="hover:bg-muted/30">
                    <td className="px-5 py-4 text-caption font-medium">{f.record_id}</td>
                    <td className="px-5 py-4 text-caption">{f.field}</td>
                    <td className="px-5 py-4 text-caption">{f.error_type}</td>
                    <td className="px-5 py-4 text-caption">{f.error_message}</td>
                    <td className="px-5 py-4">
                      <span className={cn("px-2 py-0.5 rounded-full", badgeTextClasses, f.severity === "Error" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning")}>
                        {f.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {detail.schema_drift && detail.schema_drift.length > 0 && (
          <>
            <Alert className="border-warning/50 bg-warning/5">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>New Fields Detected – Review Required</AlertTitle>
              <AlertDescription>This batch introduced new fields. Review suggested mappings below.</AlertDescription>
            </Alert>
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
              <table className="w-full">
                <thead className="bg-muted/95">
                  <tr className="border-b border-border">
                    <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Field</th>
                    <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Suggested Mapping</th>
                    <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Confidence</th>
                    <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {detail.schema_drift.map((d) => (
                    <tr key={d.field} className="hover:bg-muted/30">
                      <td className="px-5 py-4 text-caption font-medium">{d.field}</td>
                      <td className="px-5 py-4 text-caption">{d.suggested_mapping}</td>
                      <td className="px-5 py-4 text-caption">{(d.confidence * 100).toFixed(0)}%</td>
                      <td className="px-5 py-4 text-caption">{d.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
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
          <ChartContainer config={batchVolumeConfig} className="h-[220px] w-full">
            <ComposedChart data={batchVolumeTrendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
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
          <ChartContainer config={durationConfig} className="h-[220px] w-full">
            <LineChart data={processingDurationTrendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
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
        <ChartContainer config={errorCategoriesConfig} className="h-[220px] w-full">
          <BarChart data={topBatchErrorCategoriesData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="category" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <h4 className="text-body font-semibold text-foreground mb-4">Batch Jobs</h4>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-caption text-muted-foreground">Batch ID</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={batchIdSearch}
                  onChange={(e) => { setBatchIdSearch(e.target.value); setPage(1); }}
                  className="h-9 pl-8 w-[180px] text-caption"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-caption text-muted-foreground">Institution</Label>
              <Select value={institutionFilter} onValueChange={(v) => { setInstitutionFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 min-w-[180px] max-w-[220px] text-caption">
                  <SelectValue placeholder="Institution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-caption">All institutions</SelectItem>
                  {dataSubmitters.map((i) => (
                    <SelectItem key={i.id} value={i.id} className="text-caption">{i.tradingName ?? i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-caption text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-[140px] text-caption">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-caption">All statuses</SelectItem>
                  {(["Completed", "Processing", "Failed", "Queued"] as const).map((s) => (
                    <SelectItem key={s} value={s} className="text-caption">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-caption text-muted-foreground">Time period</Label>
              <Select value={timePeriod} onValueChange={(v) => { setTimePeriod(v as BatchTimePeriod); setPage(1); }}>
                <SelectTrigger className="h-9 w-[140px] text-caption">
                  <SelectValue placeholder="Time period" />
                </SelectTrigger>
                <SelectContent>
                  {BATCH_TIME_OPTIONS.map((o) => (
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
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="View details"
                        onClick={() => setSelectedBatchId(b.batch_id)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Download error file"
                        disabled={b.failed === 0}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Reprocess"
                        disabled={b.status !== "Failed"}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
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
    </div>
  );
}
