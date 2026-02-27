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

function formatDateRange(from: string, to: string): string {
  if (!from || !to) return "";
  const fmt = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };
  return `${fmt(from)} – ${fmt(to)}`;
}

let reportCounter = 0;
function nextReportId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  reportCounter += 1;
  const seq = String(reportCounter).padStart(4, "0");
  return `HCB-REP-${dateStr}-${seq}`;
}

const reports: ReportRow[] = [
  {
    reportId: "HCB-REP-20260225-0012",
    reportType: "Portfolio Risk Snapshot",
    dateRange: "01 Feb 2026 – 25 Feb 2026",
    createdBy: "risk.analyst@bank.com",
    status: "Processing",
  },
  {
    reportId: "HCB-REP-20260225-0011",
    reportType: "Credit Score Summary Report",
    dateRange: "01 Feb 2026 – 24 Feb 2026",
    createdBy: "compliance@fnb.co.ke",
    status: "Completed",
  },
  {
    reportId: "HCB-REP-20260225-0010",
    reportType: "Enquiry Volume Report",
    dateRange: "18 Feb 2026 – 25 Feb 2026",
    createdBy: "ops@metrocu.co.ke",
    status: "Completed",
  },
  {
    reportId: "HCB-REP-20260224-0009",
    reportType: "Submission Volume Report",
    dateRange: "01 Feb 2026 – 24 Feb 2026",
    createdBy: "data.team@bank.com",
    status: "Completed",
  },
  {
    reportId: "HCB-REP-20260224-0008",
    reportType: "SLA Performance Report",
    dateRange: "17 Feb 2026 – 24 Feb 2026",
    createdBy: "sla.manager@bureau.com",
    status: "Completed",
  },
  {
    reportId: "HCB-REP-20260224-0007",
    reportType: "Institution Billing Report",
    dateRange: "01 Feb 2026 – 24 Feb 2026",
    createdBy: "billing@bureau.com",
    status: "Failed",
  },
  {
    reportId: "HCB-REP-20260223-0006",
    reportType: "Consent Audit Report",
    dateRange: "01 Jan 2026 – 23 Feb 2026",
    createdBy: "compliance@bank.com",
    status: "Completed",
  },
  {
    reportId: "HCB-REP-20260223-0005",
    reportType: "Alternate Data Usage Report",
    dateRange: "15 Feb 2026 – 23 Feb 2026",
    createdBy: "analytics@bureau.com",
    status: "Completed",
  },
  {
    reportId: "HCB-REP-20260222-0004",
    reportType: "Utilization Analysis Report",
    dateRange: "01 Feb 2026 – 22 Feb 2026",
    createdBy: "risk.analyst@bank.com",
    status: "Queued",
  },
  {
    reportId: "HCB-REP-20260222-0003",
    reportType: "Portfolio Risk Snapshot",
    dateRange: "01 Jan 2026 – 22 Feb 2026",
    createdBy: "risk.analyst@bank.com",
    status: "Completed",
  },
  {
    reportId: "HCB-REP-20260221-0002",
    reportType: "Enquiry Volume Report",
    dateRange: "14 Feb 2026 – 21 Feb 2026",
    createdBy: "ops@metrocu.co.ke",
    status: "Completed",
  },
  {
    reportId: "HCB-REP-20260221-0001",
    reportType: "Credit Score Summary Report",
    dateRange: "01 Feb 2026 – 21 Feb 2026",
    createdBy: "compliance@fnb.co.ke",
    status: "Completed",
  },
];

export function getReports(): ReportRow[] {
  return [...reports];
}

export function addReport(report: Omit<ReportRow, "reportId" | "status">): ReportRow {
  const reportId = nextReportId();
  const row: ReportRow = {
    ...report,
    reportId,
    status: "Queued",
  };
  reports.push(row);
  return row;
}

export function removeReport(reportId: string): void {
  const idx = reports.findIndex((r) => r.reportId === reportId);
  if (idx >= 0) reports.splice(idx, 1);
}

export function setReportStatus(reportId: string, status: ReportStatus): void {
  const r = reports.find((x) => x.reportId === reportId);
  if (r) r.status = status;
}

export function getReportTypesForFilter(): { value: string; label: string }[] {
  return [
    { value: "all", label: "All" },
    { value: "Credit Score Summary Report", label: "Credit Score Summary Report" },
    { value: "Enquiry Volume Report", label: "Enquiry Volume Report" },
    { value: "Submission Volume Report", label: "Submission Volume Report" },
    { value: "Utilization Analysis Report", label: "Utilization Analysis Report" },
    { value: "Alternate Data Usage Report", label: "Alternate Data Usage Report" },
    { value: "Consent Audit Report", label: "Consent Audit Report" },
    { value: "SLA Performance Report", label: "SLA Performance Report" },
    { value: "Institution Billing Report", label: "Institution Billing Report" },
    { value: "Portfolio Risk Snapshot", label: "Portfolio Risk Snapshot" },
  ];
}

export { formatDateRange };
