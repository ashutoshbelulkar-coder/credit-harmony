import { createContext, useContext, useState, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getReports, type ReportRow } from "./reporting-store";

type ReportingContextValue = {
  reports: ReportRow[];
  refreshReports: () => void;
};

const ReportingContext = createContext<ReportingContextValue | null>(null);

export function useReporting() {
  const ctx = useContext(ReportingContext);
  if (!ctx) throw new Error("useReporting must be used within ReportingLayout");
  return ctx;
}

export function ReportingLayout() {
  const [reports, setReports] = useState<ReportRow[]>(() => getReports());
  const refreshReports = useCallback(() => setReports(getReports()), []);

  return (
    <ReportingContext.Provider value={{ reports, refreshReports }}>
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <Outlet />
        </div>
      </DashboardLayout>
    </ReportingContext.Provider>
  );
}
