import { useNavigate } from "react-router-dom";
import { Activity, AlertTriangle, CheckCircle2, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { ElementType } from "react";
import type { DashboardMetrics, DashboardRange } from "@/api/dashboard-types";
import { apiVolumeComparisonLabel, apiVolumeKpiTitle } from "@/api/dashboard-types";
import type { DashboardDateRange } from "@/components/dashboard/DashboardDateRangePicker";

interface KpiStat {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: ElementType;
  href: string;
  /** Footnote under delta; defaults to "vs last 24h" for non-volume KPIs */
  comparisonLabel?: string;
}

function formatInt(n: number) {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

function kpiFromMetrics(m: DashboardMetrics | undefined, dateRange?: DashboardDateRange): KpiStat[] {
  const apiVolume = m?.apiVolume24h;
  const errorRate = m?.errorRate;
  const sla = m?.slaHealth;
  const dq = m?.dataQualityScore;

  const dr = dateRange as DashboardRange | undefined;
  const volumeTitle = dr ? apiVolumeKpiTitle(dr) : "API volume (last 30 days)";
  const volumeCompare = dr ? apiVolumeComparisonLabel(dr) : "vs prior period";

  return [
    {
      title: volumeTitle,
      value: Number.isFinite(apiVolume) ? formatInt(apiVolume as number) : "—",
      change: m?.apiVolumeChange ?? "—",
      trend: (m?.apiVolumeChange ?? "+0%").trim().startsWith("-") ? "down" : "up",
      icon: Activity,
      href: "/monitoring/data-submission-api",
      comparisonLabel: volumeCompare,
    },
    {
      title: "Error Rate",
      value: Number.isFinite(errorRate) ? `${(errorRate as number).toFixed(2)}%` : "—",
      change: m?.errorRateChange ?? "—",
      trend: (m?.errorRateChange ?? "-0%").trim().startsWith("-") ? "down" : "up",
      icon: AlertTriangle,
      href: "/monitoring/alert-engine",
      comparisonLabel: volumeCompare,
    },
    {
      title: "SLA Health",
      value: Number.isFinite(sla) ? `${(sla as number).toFixed(1)}%` : "—",
      change: m?.slaHealthChange ?? "—",
      trend: (m?.slaHealthChange ?? "+0%").trim().startsWith("-") ? "down" : "up",
      icon: CheckCircle2,
      href: "/monitoring/sla-configuration",
      comparisonLabel: volumeCompare,
    },
    {
      title: "Data Quality Score",
      value: Number.isFinite(dq) ? `${(dq as number).toFixed(1)}%` : "—",
      change: m?.dataQualityChange ?? "—",
      trend: (m?.dataQualityChange ?? "+0%").trim().startsWith("-") ? "down" : "up",
      icon: TrendingUp,
      href: "/data-governance/data-quality-monitoring",
      comparisonLabel: volumeCompare,
    },
  ];
}

export function DashboardKPIRow({
  data,
  loading,
  dateRange,
}: {
  data?: DashboardMetrics;
  loading?: boolean;
  dateRange?: DashboardDateRange;
}) {
  const navigate = useNavigate();
  const kpiStats = kpiFromMetrics(data, dateRange);

  return (
    <section aria-label="Key performance indicators">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 laptop:grid-cols-12 laptop:gap-3">
        {kpiStats.map((stat) => (
          <div
            key={stat.title}
            className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] laptop:col-span-3 cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => navigate(stat.href)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">{stat.title}</p>
                <p className="mt-2 text-h1 font-bold text-foreground">{loading ? "—" : stat.value}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/5">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {stat.trend === "up" ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-success" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
              )}
              <span className={`text-caption font-medium ${stat.trend === "up" ? "text-success" : "text-destructive"}`}>
                {loading ? "—" : stat.change}
              </span>
              <span className="text-caption text-muted-foreground">{stat.comparisonLabel ?? "vs last 24h"}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
