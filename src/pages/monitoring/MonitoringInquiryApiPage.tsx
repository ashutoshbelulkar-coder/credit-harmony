import { useOutletContext } from "react-router-dom";
import { InquiryApiSection } from "./InquiryApiSection";
import type { MonitoringOutletContext } from "./MonitoringLayout";

export function MonitoringInquiryApiPage() {
  const { filters, setFilters } = useOutletContext<MonitoringOutletContext>();
  return <InquiryApiSection filters={filters} onFiltersChange={setFilters} />;
}
