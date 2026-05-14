import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  initialReports,
  makeReportId,
  type ReportRow,
  type ReportStatus,
} from "./reporting-store";
import { useReports } from "@/hooks/api/useReports";

type AddReportInput = Omit<ReportRow, "reportId" | "status">;

type ReportingContextValue = {
  reports: ReportRow[];
  addReport: (report: AddReportInput) => ReportRow;
  removeReport: (reportId: string) => void;
  setReportStatus: (reportId: string, status: ReportStatus) => void;
};

const ReportingContext = createContext<ReportingContextValue | null>(null);

export function useReporting() {
  const ctx = useContext(ReportingContext);
  if (!ctx) throw new Error("useReporting must be used within ReportingLayout");
  return ctx;
}

export function ReportingLayout() {
  const [reports, setReports] = useState<ReportRow[]>(initialReports);
  const { data: apiReports } = useReports();

  // Seed from API when data arrives (once only — mutations tracked locally)
  useEffect(() => {
    if (!apiReports) return;
    const rows = Array.isArray(apiReports) ? apiReports : (apiReports as { content?: ReportRow[] }).content ?? [];
    if (rows.length > 0) {
      setReports(rows as ReportRow[]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiReports]);
  const counterRef = useRef(initialReports.length);

  const addReport = useCallback((report: AddReportInput): ReportRow => {
    counterRef.current += 1;
    const row: ReportRow = { ...report, reportId: makeReportId(counterRef.current), status: "Queued" };
    setReports((prev) => [row, ...prev]);
    return row;
  }, []);

  const removeReport = useCallback((reportId: string) => {
    setReports((prev) => prev.filter((r) => r.reportId !== reportId));
  }, []);

  const setReportStatus = useCallback((reportId: string, status: ReportStatus) => {
    setReports((prev) =>
      prev.map((r) => (r.reportId === reportId ? { ...r, status } : r))
    );
  }, []);

  return (
    <ReportingContext.Provider value={{ reports, addReport, removeReport, setReportStatus }}>
      <DashboardLayout>
        <div className="space-y-6 laptop:space-y-5 animate-fade-in min-w-0">
          <Outlet />
        </div>
      </DashboardLayout>
    </ReportingContext.Provider>
  );
}
