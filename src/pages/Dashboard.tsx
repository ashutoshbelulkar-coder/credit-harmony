import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const stats = [
  {
    title: "API Requests (24h)",
    value: "1,284,392",
    change: "+12.3%",
    trend: "up" as const,
    icon: Activity,
    glow: "stat-glow-primary",
  },
  {
    title: "Error Rate",
    value: "0.23%",
    change: "-0.05%",
    trend: "down" as const,
    icon: AlertTriangle,
    glow: "stat-glow-success",
  },
  {
    title: "SLA Compliance",
    value: "99.7%",
    change: "+0.1%",
    trend: "up" as const,
    icon: CheckCircle2,
    glow: "stat-glow-accent",
  },
  {
    title: "Active Institutions",
    value: "47",
    change: "+3",
    trend: "up" as const,
    icon: Users,
    glow: "stat-glow-primary",
  },
];

const recentActivity = [
  { institution: "First National Bank", action: "API key rotated", time: "2 min ago", status: "info" },
  { institution: "Metro Credit Union", action: "Submission API enabled", time: "15 min ago", status: "success" },
  { institution: "Pacific Finance Corp", action: "SLA breach warning", time: "1 hour ago", status: "warning" },
  { institution: "Southern Trust Bank", action: "Onboarding completed", time: "3 hours ago", status: "success" },
  { institution: "First National Bank", action: "Bulk data upload", time: "5 hours ago", status: "info" },
];

const topInstitutions = [
  { name: "First National Bank", requests: "452K", quality: 98, sla: 99.9 },
  { name: "Metro Credit Union", requests: "284K", quality: 95, sla: 99.5 },
  { name: "Pacific Finance Corp", requests: "198K", quality: 92, sla: 98.8 },
  { name: "Southern Trust Bank", requests: "156K", quality: 97, sla: 99.7 },
];

const statusColors: Record<string, string> = {
  info: "bg-info/15 text-info",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
};

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your credit bureau operations
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className={`bg-card rounded-xl border border-border p-5 ${stat.glow} transition-shadow hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-2">{stat.value}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3">
                {stat.trend === "up" ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-success" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-success" />
                )}
                <span className="text-xs font-medium text-success">{stat.change}</span>
                <span className="text-xs text-muted-foreground ml-1">vs last 24h</span>
              </div>
            </div>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-3 bg-card rounded-xl border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
              <button className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                View All
              </button>
            </div>
            <div className="divide-y divide-border">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${statusColors[activity.status]?.split(" ")[0]?.replace("/15", "")}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {activity.institution}
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.action}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Institutions */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Top Institutions</h2>
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="p-5 space-y-4">
              {topInstitutions.map((inst) => (
                <div key={inst.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{inst.name}</span>
                    <span className="text-xs text-muted-foreground">{inst.requests} reqs</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${inst.quality}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground w-8 text-right">
                      {inst.quality}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Data Quality & Mapping Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard title="Data Quality Score" value="94.2%" subtitle="Across all institutions" trend="+1.8%" />
          <MetricCard title="Mapping Accuracy" value="97.6%" subtitle="Auto-mapped fields" trend="+0.4%" />
          <MetricCard title="Match Confidence" value="89.3%" subtitle="Average cluster score" trend="+2.1%" />
        </div>
      </div>
    </DashboardLayout>
  );
};

function MetricCard({ title, value, subtitle, trend }: { title: string; value: string; subtitle: string; trend: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-sm transition-shadow">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
      <div className="flex items-end gap-2 mt-2">
        <span className="text-3xl font-bold text-foreground">{value}</span>
        <span className="text-xs font-medium text-success mb-1 flex items-center gap-0.5">
          <TrendingUp className="w-3 h-3" />
          {trend}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}

export default Dashboard;
