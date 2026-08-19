import { createContext, useContext } from "react";
import type { DqFilters, DqReportPrefill } from "@/types/dq-monitoring";

export type DqOutletContext = {
  filters: DqFilters;
  setFilters: (patch: Partial<DqFilters>, extras?: Record<string, string | undefined>) => void;
  loading: boolean;
  watchlist: Set<string>;
  toggleWatchlist: (id: string) => void;
  isMemberScoped: boolean;
  openReports: (prefill?: DqReportPrefill) => void;
};

export const DqCtx = createContext<DqOutletContext | null>(null);

export function useDqMonitoring() {
  const ctx = useContext(DqCtx);
  if (!ctx) throw new Error("useDqMonitoring must be used within DqMonitoringLayout");
  return ctx;
}
