import reportingData from "@/data/reporting.json";

export type ReportStatus = "Queued" | "Processing" | "Completed" | "Failed";

export interface ReportRow {
  reportId: string;
  reportType: string;
  dateRange: string;
  createdBy: string;
  status: ReportStatus;
  outputFormat?: string;
  institution?: string;
  productType?: string;
}

export const initialReports: ReportRow[] = reportingData.reports as ReportRow[];

export function getReportTypesForFilter(): { value: string; label: string }[] {
  return reportingData.reportTypes;
}

export function formatDateRange(from: string, to: string): string {
  if (!from || !to) return "";
  const fmt = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };
  return `${fmt(from)} – ${fmt(to)}`;
}

export function makeReportId(counter: number): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const seq = String(counter).padStart(4, "0");
  return `HCB-REP-${dateStr}-${seq}`;
}
