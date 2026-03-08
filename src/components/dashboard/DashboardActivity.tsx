import { BarChart3 } from "lucide-react";

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

const dotColors: Record<string, string> = {
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
};

export function DashboardActivity() {
  return (
    <section
      aria-label="Operational snapshot"
      className="grid grid-cols-1 gap-4 laptop:gap-3 lg:grid-cols-5 laptop:grid-cols-12"
    >
      {/* Recent Activity */}
      <div className="lg:col-span-3 laptop:col-span-7 bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-label uppercase tracking-[0.08em] text-muted-foreground">Recent Activity</h2>
          <button className="text-caption font-medium text-primary hover:text-primary/80 transition-colors">View all</button>
        </div>
        <div className="divide-y divide-border">
          {recentActivity.map((activity, i) => (
            <div key={i} className="flex items-center gap-4 px-1 py-3">
              <div className={`h-2 w-2 shrink-0 rounded-full ${dotColors[activity.status] || ""}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-medium text-foreground">{activity.institution}</p>
                <p className="text-caption text-muted-foreground">{activity.action}</p>
              </div>
              <span className="whitespace-nowrap text-caption text-muted-foreground">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Institutions */}
      <div className="lg:col-span-2 laptop:col-span-5 bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-label uppercase tracking-[0.08em] text-muted-foreground">Top Institutions</h2>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-4 space-y-4">
          {topInstitutions.map((inst) => (
            <div key={inst.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-body font-medium text-foreground">{inst.name}</span>
                <span className="text-caption text-muted-foreground">{inst.requests} reqs</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${inst.quality}%` }} />
                  </div>
                </div>
                <span className="w-10 text-right text-caption text-muted-foreground">{inst.quality}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
