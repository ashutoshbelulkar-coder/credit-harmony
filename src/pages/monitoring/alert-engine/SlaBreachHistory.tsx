import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses } from "@/lib/typography";
import { slaBreachHistory, type SlaBreachRecord, type SeverityLevel } from "@/data/alert-engine-mock";
import { institutions } from "@/data/institutions-mock";
import type { MonitoringFilters } from "../MonitoringFilterBar";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const cardClass =
  "bg-card rounded-xl border border-border overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.06)]";

const DOMAINS = ["Data Submission API", "Batch Processing", "Inquiry API", "All"];
const SEVERITIES: (SeverityLevel | "All")[] = ["All", "Critical", "Warning", "Info"];

const institutionsList = institutions;

const severityStyles: Record<SeverityLevel, string> = {
  Critical: "bg-destructive/15 text-destructive",
  Warning: "bg-warning/15 text-warning",
  Info: "bg-muted text-muted-foreground",
};

export function SlaBreachHistory({ filters }: { filters: MonitoringFilters }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [domainFilter, setDomainFilter] = useState<string>("All");
  const [severityFilter, setSeverityFilter] = useState<string>("All");
  const [institutionFilter, setInstitutionFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = [
    dateFrom !== "",
    dateTo !== "",
    domainFilter !== "All",
    severityFilter !== "All",
    institutionFilter !== "all",
  ].filter(Boolean).length;

  const filtered = useMemo(() => {
    return slaBreachHistory.filter((row) => {
      if (domainFilter !== "All" && row.slaType !== domainFilter) return false;
      if (severityFilter !== "All" && row.severity !== severityFilter) return false;
      if (institutionFilter !== "all" && row.institution_id !== institutionFilter) return false;
      const rowDate = row.detectedAt.slice(0, 10);
      if (dateFrom && rowDate < dateFrom) return false;
      if (dateTo && rowDate > dateTo) return false;
      return true;
    });
  }, [domainFilter, severityFilter, institutionFilter, dateFrom, dateTo]);

  return (
    <section>
      <h3 className="text-h4 font-semibold text-foreground mb-4">SLA Breach History</h3>
      <div className={cardClass}>
        <div className="px-4 pt-4 pb-4 border-b border-border md:px-6 md:pt-6">
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
                  <Label className="text-caption">Date from</Label>
                  <DatePicker value={dateFrom} onChange={setDateFrom} className="h-8 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-caption">Date to</Label>
                  <DatePicker value={dateTo} onChange={setDateTo} className="h-8 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-caption">Domain</Label>
                  <Select value={domainFilter} onValueChange={setDomainFilter}>
                    <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOMAINS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-caption">Severity</Label>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-caption">Institution</Label>
                  <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
                    <SelectTrigger className="h-8 w-full"><SelectValue placeholder="All institutions" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All institutions</SelectItem>
                      {institutionsList.map((i) => <SelectItem key={i.id} value={i.id}>{i.tradingName ?? i.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <div className="hidden md:flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-caption">Date from</Label>
              <DatePicker value={dateFrom} onChange={setDateFrom} className="h-8 w-[160px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-caption">Date to</Label>
              <DatePicker value={dateTo} onChange={setDateTo} className="h-8 w-[160px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-caption">Domain</Label>
              <Select value={domainFilter} onValueChange={setDomainFilter}>
                <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOMAINS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-caption">Severity</Label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-caption">Institution</Label>
              <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
                <SelectTrigger className="h-8 min-w-[180px] max-w-[220px]"><SelectValue placeholder="All institutions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All institutions</SelectItem>
                  {institutionsList.map((i) => <SelectItem key={i.id} value={i.id}>{i.tradingName ?? i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
              <tr className="border-b border-border">
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>SLA Type</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Metric</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Threshold</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Breach Value</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Detected At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4 text-body text-foreground">{row.slaType}</td>
                  <td className="px-5 py-4 text-caption text-muted-foreground">{row.metric}</td>
                  <td className="px-5 py-4 text-caption">{row.threshold}</td>
                  <td className="px-5 py-4 text-caption tabular-nums text-destructive">{row.breachValue}</td>
                  <td className="px-5 py-4 text-caption text-muted-foreground whitespace-nowrap">{row.detectedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
