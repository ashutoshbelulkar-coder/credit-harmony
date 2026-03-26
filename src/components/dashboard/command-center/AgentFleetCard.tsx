import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgentFleetItem } from "@/api/dashboard-types";
import { cn } from "@/lib/utils";

function statusDot(status: AgentFleetItem["status"]) {
  switch (status) {
    case "active":
      return "bg-success";
    case "warning":
      return "bg-warning";
    case "idle":
      return "bg-muted-foreground/40";
    default:
      return "bg-muted-foreground/40";
  }
}

export function AgentFleetCard({
  agents,
  loading,
}: {
  agents: AgentFleetItem[];
  loading?: boolean;
}) {
  const activeCount = agents.filter((a) => a.status === "active").length;

  return (
    <Card className="border-border shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <CardTitle className="text-h4 font-semibold text-foreground">AI Agent Fleet</CardTitle>
          <p className="mt-1 text-caption text-muted-foreground">
            Real-time operational status of system agents
          </p>
        </div>
        <div className="shrink-0 rounded-full border border-border bg-muted px-2.5 py-1 text-caption text-muted-foreground">
          {loading ? "—" : `${activeCount} Active`}
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[min(520px,55vh)] overflow-y-auto pr-1">
          {(loading ? [] : agents).map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-muted/50 transition-colors"
            >
              <div className={cn("h-2 w-2 rounded-full shrink-0", statusDot(a.status))} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-body font-medium text-foreground truncate">{a.name}</span>
                  <span className="text-caption font-mono text-muted-foreground whitespace-nowrap">
                    {a.latencyMs}ms · {a.accuracyPct.toFixed(1)}%
                  </span>
                </div>
                <div className="text-caption text-muted-foreground truncate">{a.task}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-caption text-muted-foreground">Loading agents…</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

