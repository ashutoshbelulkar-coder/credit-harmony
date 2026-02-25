import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { institutions } from "@/data/institutions-mock";

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

const dataSubmitters = institutions.filter((i) => i.isDataSubmitter);
const subscribers = institutions.filter((i) => i.isSubscriber);

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

  return (
    <div className="flex flex-wrap items-end gap-3">
      {entityFilterMode === "data-submission-api" && (
        <Select value={filters.dataSubmitterId} onValueChange={(v) => set({ dataSubmitterId: v })}>
          <SelectTrigger className="h-9 min-w-[180px] max-w-[240px] text-caption">
            <SelectValue placeholder="Data submission institute" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-caption">
              All data submission institutes
            </SelectItem>
            {dataSubmitters.map((i) => (
              <SelectItem key={i.id} value={i.id} className="text-caption">
                {i.tradingName ?? i.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {entityFilterMode === "inquiry-api" && (
        <Select value={filters.subscriberId} onValueChange={(v) => set({ subscriberId: v })}>
          <SelectTrigger className="h-9 min-w-[180px] max-w-[240px] text-caption">
            <SelectValue placeholder="Subscriber" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-caption">
              All subscribers
            </SelectItem>
            {subscribers.map((i) => (
              <SelectItem key={i.id} value={i.id} className="text-caption">
                {i.tradingName ?? i.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
