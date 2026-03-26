import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AnomalyItem } from "@/api/dashboard-types";
import { cn } from "@/lib/utils";

function severityStyles(sev: AnomalyItem["severity"]) {
  switch (sev) {
    case "critical":
      return {
        border: "border-destructive/20",
        badgeClass: "border-0 bg-destructive/15 text-destructive",
        button: "destructive" as const,
      };
    case "warning":
      return {
        border: "border-warning/20",
        badgeClass: "border-0 bg-warning/15 text-warning",
        button: "secondary" as const,
      };
    case "info":
      return {
        border: "border-info/20",
        badgeClass: "border-0 bg-info/10 text-info",
        button: "secondary" as const,
      };
    default:
      return {
        border: "border-border",
        badgeClass: "border-0 bg-muted text-muted-foreground",
        button: "secondary" as const,
      };
  }
}

export function AnomalyFeed({
  anomalies,
  loading,
  readOnly,
  onAction,
  onViewAll,
}: {
  anomalies: AnomalyItem[];
  loading?: boolean;
  readOnly?: boolean;
  onAction?: (anomaly: AnomalyItem) => void;
  onViewAll?: () => void;
}) {
  const activeCount = anomalies.length;
  const sorted = [...anomalies].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 } as const;
    return order[a.severity] - order[b.severity];
  });

  return (
    <Card className="border-border shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <CardTitle className="text-h4 font-semibold text-foreground">Anomaly Feed</CardTitle>
          <p className="mt-1 text-caption text-muted-foreground">
            ML-detected issues requiring operational action
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="border-0 bg-destructive/10 text-destructive px-2.5 py-0.5">
            {loading ? "—" : `${activeCount} Active`}
          </Badge>
          <Button size="sm" variant="outline" className="h-8" onClick={onViewAll}>
            View all
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {(loading ? [] : sorted.slice(0, 10)).map((a) => {
          const s = severityStyles(a.severity);
          return (
            <div key={a.id} className={cn("rounded-xl border p-3", s.border)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("shrink-0 capitalize", s.badgeClass)}
                      aria-label={`Severity: ${a.severity}`}
                    >
                      {a.severity}
                    </Badge>
                    <span className="text-body font-medium text-foreground truncate">{a.title}</span>
                  </div>
                  <p className="mt-1 text-caption text-muted-foreground">{a.description}</p>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="font-mono">{a.time}</span>
                    <span aria-hidden="true">·</span>
                    <span>Detected by {a.detectedBy}</span>
                  </div>
                </div>
                {!readOnly && (
                  <Button
                    size="sm"
                    variant={s.button}
                    className="h-8 shrink-0"
                    onClick={() => onAction?.(a)}
                  >
                    {a.ctaLabel}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {loading && <div className="text-caption text-muted-foreground">Loading anomalies…</div>}
        {!loading && anomalies.length > 10 && (
          <div className="text-caption text-muted-foreground">
            Showing top 10 anomalies. Use “View all” for full list.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

