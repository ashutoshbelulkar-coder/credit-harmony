import { useOutletContext } from "react-router-dom";
import { DataSubmissionBatchSection } from "./DataSubmissionBatchSection";
import type { MonitoringOutletContext } from "./MonitoringLayout";

export function MonitoringDataSubmissionBatchPage() {
  const { filters } = useOutletContext<MonitoringOutletContext>();
  return <DataSubmissionBatchSection filters={filters} />;
}
