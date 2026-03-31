import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { effectiveRangeDays, type DashboardRange, type MemberQualityPoint } from "@/api/dashboard-types";
import type { DashboardDateRange } from "@/components/dashboard/DashboardDateRangePicker";
import { cn } from "@/lib/utils";

function normalizePeriod(period: string): string {
  return period.trim().toLowerCase();
}

/** Cell is non-placeholder: has volume, non-zero score, or anomaly. */
function pointHasRenderableData(p: MemberQualityPoint): boolean {
  return p.recordCount > 0 || p.qualityScore > 0 || p.anomalyFlag;
}

/**
 * Roll-up column "30d" only when (1) the dashboard window is at least ~30 days and
 * (2) the API returned at least one substantive point for that bucket — avoids a misleading
 * 30d column while viewing Today / 7d when the backend still sends a static 30d row.
 */
function periodVisibleForSelectedRange(
  period: string,
  points: MemberQualityPoint[],
  dateRange: DashboardDateRange | undefined
): boolean {
  if (!dateRange) return true;

  if (normalizePeriod(period) !== "30d") return true;

  const forPeriod = points.filter((p) => normalizePeriod(p.period) === "30d");
  if (!forPeriod.some(pointHasRenderableData)) return false;

  const dr = dateRange as DashboardRange;
  return effectiveRangeDays(dr) >= 30;
}

/** Tags use green for any score strictly greater than 90% (project / BRD alignment). */
function scoreClass(score: number) {
  if (score > 90) {
    if (score >= 99.5) return "bg-success/25 text-success border-success/30";
    if (score >= 97) return "bg-success/15 text-success border-success/20";
    return "bg-success/10 text-success border-success/25";
  }
  if (score > 80) return "bg-orange-500/15 text-orange-500 border-orange-500/20";
  return "bg-destructive/15 text-destructive border-destructive/20";
}

export function MemberDataQualityCard({
  points,
  loading,
  dateRange,
  /** When set (from GET /dashboard/command-center), table rows are exactly these active data-submitters. */
  memberRowLabels,
  onOpenQualityCenter,
}: {
  points: MemberQualityPoint[];
  loading?: boolean;
  /** When set, roll-up columns such as `30d` are hidden unless they match the selected window and have data. */
  dateRange?: DashboardDateRange;
  memberRowLabels?: string[];
  onOpenQualityCenter?: () => void;
}) {
  // Simple grid “heatmap-like” table: members x periods (row order from API when provided)
  const membersFromPoints = Array.from(new Set(points.map((p) => p.member)));
  const members =
    memberRowLabels != null && memberRowLabels.length > 0 ? memberRowLabels : membersFromPoints;
  const periodsRaw = Array.from(new Set(points.map((p) => p.period)));
  const periods = periodsRaw.filter((p) => periodVisibleForSelectedRange(p, points, dateRange));

  const byKey = new Map(points.map((p) => [`${p.member}__${p.period}`, p] as const));

  return (
    <Card className="border-border shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <CardTitle className="text-h4 font-semibold text-foreground">Member Data Quality</CardTitle>
          <p className="mt-1 text-caption text-muted-foreground">
            AI anomaly detection per submission source
          </p>
        </div>
        <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={onOpenQualityCenter}>
          Quality Center →
        </Button>
      </CardHeader>
      <CardContent>
        {!loading && periods.length === 0 && members.length > 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            No period columns match this range. The 30-day roll-up appears only for 30d, 90d, or custom ranges of at
            least 30 days when member quality data exists.
          </p>
        ) : null}
        {loading || periods.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <table className="min-w-[720px] w-full">
              <thead>
                <tr className="text-caption text-muted-foreground border-b border-border">
                  <th className="py-2 text-left font-medium">Member</th>
                  {periods.map((p) => (
                    <th key={p} className="py-2 text-center font-medium">
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(loading ? [] : members).map((m) => (
                  <tr key={m}>
                    <td className="py-2 pr-3 text-body font-medium text-foreground whitespace-nowrap">{m}</td>
                    {periods.map((p) => {
                      const point = byKey.get(`${m}__${p}`);
                      return (
                        <td key={p} className="py-2 text-center">
                          {point ? (
                            <span
                              className={cn(
                                "inline-flex items-center justify-center rounded-md border px-2 py-1 text-[10px] font-mono",
                                scoreClass(point.qualityScore)
                              )}
                              title={`${m} · ${p}\nQuality ${point.qualityScore.toFixed(1)}%\nRecords ${new Intl.NumberFormat("en-IN").format(point.recordCount)}${point.anomalyFlag ? "\nFlagged for review" : ""}`}
                            >
                              {point.qualityScore.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-caption text-muted-foreground">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {loading && (
                  <tr>
                    <td colSpan={Math.max(1, periods.length) + 1} className="py-3 text-caption text-muted-foreground">
                      Loading quality…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

