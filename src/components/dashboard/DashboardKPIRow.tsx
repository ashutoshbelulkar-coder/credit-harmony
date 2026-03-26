import { useNavigate } from "react-router-dom";
import { Activity, AlertTriangle, CheckCircle2, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { ElementType } from "react";
import type { DashboardMetrics } from "@/api/dashboard-types";

interface KpiStat {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: ElementType;
  href: string;
}

function formatInt(n: number) {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

function kpiFromMetrics(m: DashboardMetrics | undefined): KpiStat[] {
  const apiVolume = m?.apiVolume24h ?? 0;
  const errorRate = m?.errorRate ?? 0;
  const sla = m?.slaHealth ?? 0;
  const dq = m?.dataQualityScore ?? 0;

  return [
    {
      title: "API Volume (24h)",
      value: apiVolume ? formatInt(apiVolume) : "—",
      change: m?.apiVolumeChange ?? "—",
      trend: (m?.apiVolumeChange ?? "+0%").trim().startsWith("-") ? "down" : "up",
      icon: Activity,
      href: "/monitoring/data-submission-api",
    },
    {
      title: "Error Rate",
      value: errorRate ? `${errorRate.toFixed(2)}%` : "—",
      change: m?.errorRateChange ?? "—",
      trend: (m?.errorRateChange ?? "-0%").trim().startsWith("-") ? "down" : "up",
      icon: AlertTriangle,
      href: "/monitoring/alert-engine",
    },
    {
      title: "SLA Health",
      value: sla ? `${sla.toFixed(1)}%` : "—",
      change: m?.slaHealthChange ?? "—",
      trend: (m?.slaHealthChange ?? "+0%").trim().startsWith("-") ? "down" : "up",
      icon: CheckCircle2,
      href: "/monitoring/sla-configuration",
    },
    {
      title: "Data Quality Score",
      value: dq ? `${dq.toFixed(1)}%` : "—",
      change: m?.dataQualityChange ?? "—",
      trend: (m?.dataQualityChange ?? "+0%").trim().startsWith("-") ? "down" : "up",
      icon: TrendingUp,
      href: "/data-governance/data-quality-monitoring",
    },
  ];
}

export function DashboardKPIRow({ data, loading }: { data?: DashboardMetrics; loading?: boolean }) {
  const navigate = useNavigate();
  const kpiStats = kpiFromMetrics(data);

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
              <span className="text-caption text-muted-foreground">vs last 24h</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
