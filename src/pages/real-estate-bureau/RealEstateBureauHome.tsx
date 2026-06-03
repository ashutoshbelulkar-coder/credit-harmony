import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { tableHeaderClasses } from "@/lib/typography";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  Filter,
  Plus,
  RotateCcw,
} from "lucide-react";
import { useRealEstateBureau } from "./RealEstateBureauLayout";
import { matchStatusBadgeClass, reportStatusBadgeClass } from "@/lib/real-estate-bureau/reb-status-badges";
import { exportPropertyReportHtml } from "@/lib/real-estate-bureau/export-report-html";
import { toast } from "sonner";
import { SCENARIO_1_FORM, SCENARIO_2_FORM } from "@/lib/real-estate-bureau/mock-data";

interface FilterState {
  inquiryDate: string;
  borrowerName: string;
  propertyLocation: string;
  inquiryStatus: string;
  inquiryId: string;
}

const defaultFilters: FilterState = {
  inquiryDate: "",
  borrowerName: "",
  propertyLocation: "",
  inquiryStatus: "all",
  inquiryId: "",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "Ready", label: "Ready" },
  { value: "Pending", label: "Pending" },
  { value: "Failed", label: "Failed" },
  { value: "Partial", label: "Partial" },
];

export default function RealEstateBureauHome() {
  const navigate = useNavigate();
  const { inquiries, getReport, submitInquiry } = useRealEstateBureau();
  const [filterInputs, setFilterInputs] = useState<FilterState>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    return inquiries.filter((r) => {
      if (
        appliedFilters.inquiryId &&
        !r.inquiryId.toLowerCase().includes(appliedFilters.inquiryId.toLowerCase())
      )
        return false;
      if (
        appliedFilters.borrowerName &&
        !r.borrowerName.toLowerCase().includes(appliedFilters.borrowerName.toLowerCase())
      )
        return false;
      if (
        appliedFilters.propertyLocation &&
        !r.propertySummary.toLowerCase().includes(appliedFilters.propertyLocation.toLowerCase())
      )
        return false;
      if (appliedFilters.inquiryStatus !== "all" && r.reportStatus !== appliedFilters.inquiryStatus)
        return false;
      if (appliedFilters.inquiryDate && r.inquiryDate !== appliedFilters.inquiryDate) return false;
      return true;
    });
  }, [inquiries, appliedFilters]);

  const activeFilterCount = [
    appliedFilters.inquiryDate,
    appliedFilters.borrowerName,
    appliedFilters.propertyLocation,
    appliedFilters.inquiryId,
    appliedFilters.inquiryStatus !== "all",
  ].filter(Boolean).length;

  const handleRerun = (inquiryId: string, scenario?: string) => {
    if (scenario === "multiple_match") {
      submitInquiry(SCENARIO_2_FORM, "multiple_match");
      navigate("/real-estate-bureau/new", { state: { autoRun: true } });
    } else {
      submitInquiry(SCENARIO_1_FORM, "single_match");
      navigate("/real-estate-bureau/new", { state: { autoRun: true } });
    }
    toast.info(`Re-running inquiry ${inquiryId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h2 font-semibold text-foreground">Real Estate Bureau</h1>
          <p className="text-caption text-muted-foreground mt-1">
            Property intelligence inquiries and bureau reports.
          </p>
        </div>
        <Button asChild variant="default" size="sm" className="gap-2 shrink-0">
          <Link to="/real-estate-bureau/new">
            <Plus className="w-4 h-4" /> New Inquiry
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left rounded-md hover:bg-muted/50"
          >
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-body font-medium">Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
            {filtersOpen ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
          </button>
          {filtersOpen && (
            <FilterFields
              filterInputs={filterInputs}
              setFilterInputs={setFilterInputs}
              onSearch={() => setAppliedFilters({ ...filterInputs })}
              onReset={() => {
                setFilterInputs(defaultFilters);
                setAppliedFilters(defaultFilters);
              }}
              stacked
            />
          )}
        </div>
        <div className="hidden md:block">
          <FilterFields
            filterInputs={filterInputs}
            setFilterInputs={setFilterInputs}
            onSearch={() => setAppliedFilters({ ...filterInputs })}
            onReset={() => {
              setFilterInputs(defaultFilters);
              setAppliedFilters(defaultFilters);
            }}
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="bg-muted/95">
              <tr className="border-b border-border">
                {[
                  "INQUIRY ID",
                  "BORROWER NAME",
                  "PROPERTY SUMMARY",
                  "INQUIRY DATE",
                  "MATCH STATUS",
                  "REPORT STATUS",
                  "CREATED BY",
                  "ACTIONS",
                ].map((h) => (
                  <th
                    key={h}
                    className={cn(
                      "px-5 py-3",
                      tableHeaderClasses,
                      h === "ACTIONS" ? "text-right" : "text-left"
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    No inquiries found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.inquiryId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-4 text-caption font-mono font-medium">{r.inquiryId}</td>
                    <td className="px-5 py-4 text-body">{r.borrowerName}</td>
                    <td className="px-5 py-4 text-body text-muted-foreground max-w-[200px] truncate">
                      {r.propertySummary}
                    </td>
                    <td className="px-5 py-4 text-body">{r.inquiryDate}</td>
                    <td className="px-5 py-4">
                      <Badge className={matchStatusBadgeClass(r.matchStatus)}>{r.matchStatus}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge className={reportStatusBadgeClass(r.reportStatus)}>
                        {r.reportStatus}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-body text-muted-foreground">{r.createdBy}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1"
                          disabled={!r.reportId || r.reportStatus === "Failed"}
                          onClick={() =>
                            r.reportId && navigate(`/real-estate-bureau/report/${r.inquiryId}`, {
                              state: { reportId: r.reportId },
                            })
                          }
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1"
                          disabled={!r.reportId}
                          onClick={() => {
                            const report = r.reportId ? getReport(r.reportId) : undefined;
                            if (report) {
                              exportPropertyReportHtml(report);
                              toast.success("Report exported as HTML");
                            }
                          }}
                        >
                          <Download className="w-3.5 h-3.5" /> HTML
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1"
                          onClick={() => handleRerun(r.inquiryId, r.scenario)}
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Re-run
                        </Button>
                      </div>
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

function FilterFields({
  filterInputs,
  setFilterInputs,
  onSearch,
  onReset,
  stacked,
}: {
  filterInputs: FilterState;
  setFilterInputs: React.Dispatch<React.SetStateAction<FilterState>>;
  onSearch: () => void;
  onReset: () => void;
  stacked?: boolean;
}) {
  if (stacked) {
    return (
      <div className="border-t border-border pt-3 mt-2 space-y-3 px-2">
        <FilterInputs filterInputs={filterInputs} setFilterInputs={setFilterInputs} fullWidth />
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 h-8" onClick={onSearch}>
            Search
          </Button>
          <Button variant="outline" size="sm" className="flex-1 h-8" onClick={onReset}>
            Reset
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-end gap-3">
      <FilterInputs filterInputs={filterInputs} setFilterInputs={setFilterInputs} />
      <Button size="sm" className="h-8" onClick={onSearch}>
        Search
      </Button>
      <Button variant="outline" size="sm" className="h-8" onClick={onReset}>
        Reset
      </Button>
    </div>
  );
}

function FilterInputs({
  filterInputs,
  setFilterInputs,
  fullWidth,
}: {
  filterInputs: FilterState;
  setFilterInputs: React.Dispatch<React.SetStateAction<FilterState>>;
  fullWidth?: boolean;
}) {
  const w = fullWidth ? "w-full" : "";
  return (
    <>
      <div className={cn("flex items-center gap-2", fullWidth && "flex-col items-stretch")}>
        {!fullWidth && <Label className="text-caption whitespace-nowrap">Inquiry Date</Label>}
        {fullWidth && <Label className="text-caption">Inquiry Date</Label>}
        <DatePicker
          value={filterInputs.inquiryDate}
          onChange={(v) => setFilterInputs((f) => ({ ...f, inquiryDate: v }))}
          className={cn("h-8", fullWidth ? "w-full" : "w-[140px]", w)}
        />
      </div>
      <div className={cn("flex items-center gap-2", fullWidth && "flex-col items-stretch")}>
        {!fullWidth && <Label className="text-caption whitespace-nowrap">Borrower Name</Label>}
        {fullWidth && <Label className="text-caption">Borrower Name</Label>}
        <Input
          placeholder="Borrower name"
          value={filterInputs.borrowerName}
          onChange={(e) => setFilterInputs((f) => ({ ...f, borrowerName: e.target.value }))}
          className={cn("h-8", fullWidth ? "w-full" : "w-[160px]")}
        />
      </div>
      <div className={cn("flex items-center gap-2", fullWidth && "flex-col items-stretch")}>
        {!fullWidth && <Label className="text-caption whitespace-nowrap">Property Location</Label>}
        {fullWidth && <Label className="text-caption">Property Location</Label>}
        <Input
          placeholder="City, project…"
          value={filterInputs.propertyLocation}
          onChange={(e) => setFilterInputs((f) => ({ ...f, propertyLocation: e.target.value }))}
          className={cn("h-8", fullWidth ? "w-full" : "w-[160px]")}
        />
      </div>
      <div className={cn("flex items-center gap-2", fullWidth && "flex-col items-stretch")}>
        {fullWidth && <Label className="text-caption">Inquiry Status</Label>}
        <Select
          value={filterInputs.inquiryStatus}
          onValueChange={(v) => setFilterInputs((f) => ({ ...f, inquiryStatus: v }))}
        >
          <SelectTrigger className={cn("h-8", fullWidth ? "w-full" : "w-[130px]")}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className={cn("flex items-center gap-2", fullWidth && "flex-col items-stretch")}>
        {!fullWidth && <Label className="text-caption whitespace-nowrap">Inquiry ID</Label>}
        {fullWidth && <Label className="text-caption">Inquiry ID</Label>}
        <Input
          placeholder="REB-INQ-…"
          value={filterInputs.inquiryId}
          onChange={(e) => setFilterInputs((f) => ({ ...f, inquiryId: e.target.value }))}
          className={cn("h-8", fullWidth ? "w-full" : "w-[160px]")}
        />
      </div>
    </>
  );
}
