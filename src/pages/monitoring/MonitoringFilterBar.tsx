import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { InstitutionFilterSelect } from "@/components/shared/InstitutionFilterSelect";

export type TimeRangeValue = "5m" | "1h" | "6h" | "24h";

export interface MonitoringFilters {
  dateFrom: string;
  dateTo: string;
  apiKey: string;
  status: string;
  source: string;
  /** Data submitter institution id (Data Submission API). */
  dataSubmitterId: string;
  /** Subscriber institution id (Inquiry API). */
  subscriberId: string;
  /** Time window for live request monitoring: 5m, 1h, 6h, 24h. */
  timeRange: TimeRangeValue;
  /** Search by request ID (substring). */
  requestIdSearch: string;
}

export type MonitoringFilterEntityMode = "data-submission-api" | "inquiry-api" | null;

interface MonitoringFilterBarProps {
  filters: MonitoringFilters;
  onFiltersChange: (f: MonitoringFilters) => void;
  /** Which entity dropdown to show: data submitters or subscribers. */
  entityFilterMode?: MonitoringFilterEntityMode;
}

export const defaultMonitoringFilters: MonitoringFilters = {
  dateFrom: "",
  dateTo: "",
  apiKey: "all",
  status: "all",
  source: "all",
  dataSubmitterId: "all",
  subscriberId: "all",
  timeRange: "24h",
  requestIdSearch: "",
};

export function MonitoringFilterBar({ filters, onFiltersChange, entityFilterMode = null }: MonitoringFilterBarProps) {
  const set = (partial: Partial<MonitoringFilters>) =>
    onFiltersChange({ ...filters, ...partial });

  const showDateRange =
    entityFilterMode === "data-submission-api" || entityFilterMode === "inquiry-api";

  return (
    <div className="flex flex-wrap items-end gap-3">
      {showDateRange && (
        <>
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Date from</Label>
            <DatePicker
              value={filters.dateFrom}
              onChange={(v) => set({ dateFrom: v })}
              placeholder="Any"
              className="h-9 min-w-[140px] text-caption"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Date to</Label>
            <DatePicker
              value={filters.dateTo}
              onChange={(v) => set({ dateTo: v })}
              placeholder="Any"
              className="h-9 min-w-[140px] text-caption"
            />
          </div>
        </>
      )}
      {entityFilterMode === "data-submission-api" && (
        <InstitutionFilterSelect
          mode="submitters"
          value={filters.dataSubmitterId}
          onValueChange={(v) => set({ dataSubmitterId: v })}
          triggerClassName="h-9 min-w-[180px] max-w-[240px]"
        />
      )}
      {entityFilterMode === "inquiry-api" && (
        <InstitutionFilterSelect
          mode="subscribers"
          value={filters.subscriberId}
          onValueChange={(v) => set({ subscriberId: v })}
          triggerClassName="h-9 min-w-[180px] max-w-[240px]"
        />
      )}
    </div>
  );
}
