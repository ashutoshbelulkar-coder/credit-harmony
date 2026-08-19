import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { DqReportJob, DqReportPrefill } from "@/types/dq-monitoring";
import { DEFAULT_WATCHLIST, DQ_REFRESH_LABEL } from "@/data/dq-monitoring-mock";
import { useDqFilters } from "./dq-filters";
import { DqCtx } from "./dq-context";
import { DqReportsDrawer } from "./DqReportsDrawer";

const TABS = [
  { to: "/data-governance/data-quality-monitoring", label: "Overview", end: true },
  { to: "/data-governance/data-quality-monitoring/members", label: "Members", end: false },
  { to: "/data-governance/data-quality-monitoring/issues", label: "Issues", end: false },
  { to: "/data-governance/data-quality-monitoring/submissions", label: "Submissions", end: false },
];

let hydratedOnce = false;

export default function DqMonitoringLayout() {
  const { filters, setFilters, params, setParams } = useDqFilters();
  const { user } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(!hydratedOnce);
  const [watchlist, setWatchlist] = useState<Set<string>>(() => new Set(DEFAULT_WATCHLIST));
  const [reportsOpen, setReportsOpen] = useState(() => params.get("reports") === "1");
  const [prefill, setPrefill] = useState<DqReportPrefill | null>(null);
  const [jobs, setJobs] = useState<DqReportJob[]>([]);

  useEffect(() => {
    if (hydratedOnce) return;
    const t = window.setTimeout(() => {
      hydratedOnce = true;
      setLoading(false);
    }, 320);
    return () => window.clearTimeout(t);
  }, []);

  const isMemberScoped = Boolean(user?.institutionId);
  const onMemberDetail = location.pathname.includes("/members/") && location.pathname.split("/members/")[1];

  const openReports = (next?: DqReportPrefill) => {
    setPrefill(next ?? null);
    setReportsOpen(true);
    const p = new URLSearchParams(params);
    p.set("reports", "1");
    if (next?.type) p.set("reportType", next.type);
    setParams(p, { replace: true });
  };

  return (
    <DqCtx.Provider
      value={{
        filters,
        setFilters,
        loading,
        watchlist,
        toggleWatchlist: (id) => {
          setWatchlist((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          });
        },
        isMemberScoped,
        openReports,
      }}
    >
      <div className="space-y-6 animate-fade-in min-w-0">
        <div>
          <h1 className="text-h2 font-semibold text-foreground">Data Quality Monitoring</h1>
          <p className="mt-1 text-caption text-muted-foreground">
            Quality of submitted data across members and channels — DQI, issues, movers and threshold events.
          </p>
          <p className="mt-1 text-caption text-muted-foreground">{DQ_REFRESH_LABEL}</p>
        </div>

        {isMemberScoped && (
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-2.5">
            <p className="text-caption text-muted-foreground">
              Member-scoped view for {user?.institutionName ?? "your institution"}. Portfolio figures are shown as anonymised percentiles.
            </p>
          </div>
        )}

        {!onMemberDetail && (
          <nav className="flex flex-wrap gap-1 rounded-md bg-muted/60 p-1 w-full">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={`${tab.to}${location.search}`}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-2.5 py-1.5 text-[11px] leading-[18px] font-medium whitespace-nowrap transition-all",
                    isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        )}

        <Outlet />
      </div>
      <DqReportsDrawer
        open={reportsOpen}
        onOpenChange={(open) => {
          setReportsOpen(open);
          const p = new URLSearchParams(params);
          if (open) p.set("reports", "1");
          else p.delete("reports");
          setParams(p, { replace: true });
        }}
        prefill={prefill}
        jobs={jobs}
        onJobsChange={setJobs}
      />
    </DqCtx.Provider>
  );
}
