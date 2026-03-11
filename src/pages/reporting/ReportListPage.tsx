import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { tableHeaderClasses, badgeTextClasses } from "@/lib/typography";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReporting } from "./ReportingLayout";
import {
  getReportTypesForFilter,
  removeReport,
  setReportStatus,
  type ReportRow,
  type ReportStatus,
} from "./reporting-store";
import { ChevronDown, ChevronUp, Download, Filter, Loader2, Plus, RotateCcw, X } from "lucide-react";

const statusStyles: Record<ReportStatus, string> = {
  Queued: "bg-muted text-muted-foreground",
  Processing: "bg-primary/15 text-primary",
  Completed: "bg-success/15 text-success",
  Failed: "bg-destructive/15 text-destructive",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "Queued", label: "Queued" },
  { value: "Processing", label: "Processing" },
  { value: "Completed", label: "Completed" },
  { value: "Failed", label: "Failed" },
];

interface FilterState {
  dateFrom: string;
  dateTo: string;
  reportId: string;
  reportType: string;
  status: string;
}

const defaultFilters: FilterState = {
  dateFrom: "",
  dateTo: "",
  reportId: "",
  reportType: "all",
  status: "all",
};

function parseReportDateRange(dateRange: string): { from: string; to: string } | null {
  const parts = dateRange.split(" – ");
  if (parts.length < 2 || !parts[0]?.trim() || !parts[1]?.trim()) return null;
  try {
    const from = new Date(parts[0].trim()).toISOString().slice(0, 10);
    const to = new Date(parts[1].trim()).toISOString().slice(0, 10);
    return { from, to };
  } catch {
    return null;
  }
}

function applyFilters(rows: ReportRow[], applied: FilterState): ReportRow[] {
  return rows.filter((r) => {
    if (applied.reportId && !r.reportId.toLowerCase().includes(applied.reportId.toLowerCase()))
      return false;
    if (applied.reportType !== "all" && r.reportType !== applied.reportType) return false;
    if (applied.status !== "all" && r.status !== applied.status) return false;
    if (applied.dateFrom && r.dateRange) {
      const range = parseReportDateRange(r.dateRange);
      if (range && range.to < applied.dateFrom) return false;
    }
    if (applied.dateTo && r.dateRange) {
      const range = parseReportDateRange(r.dateRange);
      if (range && range.from > applied.dateTo) return false;
    }
    return true;
  });
}

export function ReportListPage() {
  const { reports, refreshReports } = useReporting();
  const [filterInputs, setFilterInputs] = useState<FilterState>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = [
    appliedFilters.dateFrom !== "",
    appliedFilters.dateTo !== "",
    appliedFilters.reportId.trim().length > 0,
    appliedFilters.reportType !== "all",
    appliedFilters.status !== "all",
  ].filter(Boolean).length;

  const filtered = useMemo(
    () => applyFilters(reports, appliedFilters),
    [reports, appliedFilters],
  );

  const handleSearch = () => setAppliedFilters({ ...filterInputs });
  const handleReset = () => {
    setFilterInputs(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  const handleCancel = (reportId: string) => {
    removeReport(reportId);
    refreshReports();
  };

  const handleRetry = (reportId: string) => {
    setReportStatus(reportId, "Queued");
    refreshReports();
  };

  const handleDownload = (_reportId: string) => {
    // Stub: could trigger file download or toast
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h2 font-semibold text-foreground">Hybrid Credit Reports</h1>
          <p className="text-caption text-muted-foreground mt-1">
            View, filter, and download credit bureau reports.
          </p>
        </div>
        <Button asChild variant="default" size="sm" className="gap-2 shrink-0">
          <Link to="/reporting/new">
            <Plus className="w-4 h-4" /> New Report Request
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
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
                <Label htmlFor="report-date-from-m" className="text-caption text-muted-foreground">Date From</Label>
                <DatePicker id="report-date-from-m" value={filterInputs.dateFrom} onChange={(v) => setFilterInputs((f) => ({ ...f, dateFrom: v }))} className="h-8 w-full text-caption" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="report-date-to-m" className="text-caption text-muted-foreground">Date To</Label>
                <DatePicker id="report-date-to-m" value={filterInputs.dateTo} onChange={(v) => setFilterInputs((f) => ({ ...f, dateTo: v }))} className="h-8 w-full text-caption" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="report-id-m" className="text-caption text-muted-foreground">Report ID</Label>
                <Input id="report-id-m" type="text" placeholder="Report ID" value={filterInputs.reportId} onChange={(e) => setFilterInputs((f) => ({ ...f, reportId: e.target.value }))} className="h-8 w-full text-caption" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-caption text-muted-foreground">Report Type</Label>
                <Select value={filterInputs.reportType} onValueChange={(v) => setFilterInputs((f) => ({ ...f, reportType: v }))}>
                  <SelectTrigger className="h-8 w-full text-caption"><SelectValue placeholder="Report Type" /></SelectTrigger>
                  <SelectContent>
                    {getReportTypesForFilter().map((o) => <SelectItem key={o.value} value={o.value} className="text-caption">{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-caption text-muted-foreground">Status</Label>
                <Select value={filterInputs.status} onValueChange={(v) => setFilterInputs((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-8 w-full text-caption"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} className="text-caption">{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="default" size="sm" className="h-8 flex-1" onClick={handleSearch}>Search</Button>
                <Button variant="outline" size="sm" className="h-8 flex-1" onClick={handleReset}>Reset</Button>
              </div>
            </div>
          )}
        </div>
        <div className="hidden md:flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="report-date-from" className="text-caption text-muted-foreground whitespace-nowrap">Date From</Label>
            <DatePicker id="report-date-from" value={filterInputs.dateFrom} onChange={(v) => setFilterInputs((f) => ({ ...f, dateFrom: v }))} className="h-8 w-[140px] text-caption" />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="report-date-to" className="text-caption text-muted-foreground whitespace-nowrap">Date To</Label>
            <DatePicker id="report-date-to" value={filterInputs.dateTo} onChange={(v) => setFilterInputs((f) => ({ ...f, dateTo: v }))} className="h-8 w-[140px] text-caption" />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="report-id" className="text-caption text-muted-foreground whitespace-nowrap">Report ID</Label>
            <Input id="report-id" type="text" placeholder="Report ID" value={filterInputs.reportId} onChange={(e) => setFilterInputs((f) => ({ ...f, reportId: e.target.value }))} className="h-8 w-[180px] text-caption" />
          </div>
          <Select value={filterInputs.reportType} onValueChange={(v) => setFilterInputs((f) => ({ ...f, reportType: v }))}>
            <SelectTrigger className="h-8 w-[200px] text-caption"><SelectValue placeholder="Report Type" /></SelectTrigger>
            <SelectContent>
              {getReportTypesForFilter().map((o) => <SelectItem key={o.value} value={o.value} className="text-caption">{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterInputs.status} onValueChange={(v) => setFilterInputs((f) => ({ ...f, status: v }))}>
            <SelectTrigger className="h-8 w-[130px] text-caption"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} className="text-caption">{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="default" size="sm" className="h-8" onClick={handleSearch}>Search</Button>
          <Button variant="outline" size="sm" className="h-8" onClick={handleReset}>Reset</Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="bg-muted/95 backdrop-blur">
              <tr className="border-b border-border">
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>REPORT ID</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>REPORT TYPE</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>DATE RANGE</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>CREATED BY</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>STATUS</th>
                <th className={cn("text-right px-5 py-3", tableHeaderClasses)}>ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr key={r.reportId} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4 text-caption font-medium text-foreground">{r.reportId}</td>
                  <td className="px-5 py-4 text-body text-foreground">{r.reportType}</td>
                  <td className="px-5 py-4 text-body text-muted-foreground">{r.dateRange}</td>
                  <td className="px-5 py-4 text-body text-muted-foreground">{r.createdBy}</td>
                  <td className="px-5 py-4">
                    <span className={cn("px-2.5 py-1 rounded-full", badgeTextClasses, statusStyles[r.status])}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-8"
                      disabled={r.status !== "Completed"}
                      onClick={() => r.status === "Completed" && handleDownload(r.reportId)}
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
