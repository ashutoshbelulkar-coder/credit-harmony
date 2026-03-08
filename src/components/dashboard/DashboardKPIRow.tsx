import { useNavigate } from "react-router-dom";
import { Activity, AlertTriangle, CheckCircle2, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { ElementType } from "react";

interface KpiStat {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: ElementType;
  href: string;
}

export const kpiStats: KpiStat[] = [
  { title: "API Volume (24h)", value: "1,284,392", change: "+12.3%", trend: "up", icon: Activity, href: "/monitoring/data-submission-api" },
  { title: "Error Rate", value: "0.23%", change: "-0.05%", trend: "down", icon: AlertTriangle, href: "/monitoring/alert-engine" },
  { title: "SLA Health", value: "99.7%", change: "+0.1%", trend: "up", icon: CheckCircle2, href: "/monitoring/sla-configuration" },
  { title: "Data Quality Score", value: "94.2%", change: "+1.8%", trend: "up", icon: TrendingUp, href: "/data-governance/data-quality-monitoring" },
];

export function DashboardKPIRow() {
  const navigate = useNavigate();

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
                <p className="mt-2 text-h1 font-bold text-foreground">{stat.value}</p>
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
                {stat.change}
              </span>
              <span className="text-caption text-muted-foreground">vs last 24h</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
