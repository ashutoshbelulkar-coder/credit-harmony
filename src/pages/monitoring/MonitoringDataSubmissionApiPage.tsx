import { useOutletContext } from "react-router-dom";
import { DataSubmissionApiSection } from "./DataSubmissionApiSection";
import type { MonitoringOutletContext } from "./MonitoringLayout";

export function MonitoringDataSubmissionApiPage() {
  const { filters, setFilters } = useOutletContext<MonitoringOutletContext>();
  return <DataSubmissionApiSection filters={filters} onFiltersChange={setFilters} />;
}
