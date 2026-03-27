import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BatchPipelineRow } from "@/api/dashboard-types";
import { cn } from "@/lib/utils";

/** Match Member Data Quality: strictly greater than 90% reads as on-track (green). */
function qualityClass(q: number) {
  if (q > 90) return "text-success";
  if (q > 80) return "text-orange-500";
  return "text-destructive";
}

function statusBadgeClass(status: BatchPipelineRow["status"]) {
  switch (status) {
    case "processing":
      return "border-0 bg-warning/15 text-warning";
    case "completed":
      return "border-0 bg-success/15 text-success";
    case "error":
      return "border-0 bg-destructive/15 text-destructive";
    case "queued":
      return "border-0 bg-muted text-muted-foreground";
    default:
      return "border-0 bg-muted text-muted-foreground";
  }
}

export const BATCH_PIPELINE_STATUS_QUERY = "status=queued,processing";

export function ActiveBatchPipelineTable({
  rows,
  loading,
  onViewAll,
  onRowNavigate,
}: {
  rows: BatchPipelineRow[];
  loading?: boolean;
  onViewAll?: () => void;
  /** Navigate when a row is clicked (e.g. deep-link to batch jobs with filters). */
  onRowNavigate?: (row: BatchPipelineRow) => void;
}) {
  return (
    <Card className="min-w-0 border-border shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <CardTitle className="text-h4 font-semibold text-foreground">Active Batch Pipeline</CardTitle>
          <p className="mt-1 text-caption text-muted-foreground">
            Batches currently in Processing status (same source as Monitoring → Data Submission → Batch). Progress and quality follow each job&apos;s records and success rate.
          </p>
        </div>
        <div className="flex shrink-0 sm:items-start">
          <Button size="sm" onClick={onViewAll} variant="outline" className="h-8 w-full sm:w-auto">
            View all
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-w-0 p-4 pt-0">
        <div
          className="w-full max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
          role="region"
          aria-label="Batch pipeline table, scroll horizontally on small screens"
        >
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <caption className="sr-only">Batches in processing with progress and quality</caption>
            <thead>
              <tr className="text-caption text-muted-foreground border-b border-border">
                <th
                  scope="col"
                  className="sticky left-0 z-[1] bg-card py-2 pl-0 pr-2 text-left font-medium shadow-[4px_0_12px_-4px_rgba(15,23,42,0.12)] dark:shadow-[4px_0_12px_-4px_rgba(0,0,0,0.35)]"
                >
                  Batch ID
                </th>
                <th scope="col" className="py-2 pl-2 pr-2 text-left font-medium whitespace-nowrap">
                  Member
                </th>
                <th scope="col" className="py-2 px-2 text-left font-medium whitespace-nowrap">
                  Format
                </th>
                <th scope="col" className="py-2 px-2 text-right font-medium whitespace-nowrap">
                  Records
                </th>
                <th scope="col" className="min-w-[160px] py-2 px-2 text-left font-medium whitespace-nowrap sm:min-w-[200px]">
                  Progress
                </th>
                <th scope="col" className="py-2 px-2 text-right font-medium whitespace-nowrap">
                  Quality
                </th>
                <th scope="col" className="py-2 pl-2 pr-0 text-left font-medium whitespace-nowrap">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(loading ? [] : rows).map((r) => (
                <tr
                  key={r.id}
                  role={onRowNavigate ? "link" : undefined}
                  tabIndex={onRowNavigate ? 0 : undefined}
                  className={cn(
                    "group transition-colors hover:bg-muted/30",
                    onRowNavigate && "cursor-pointer",
                  )}
                  onClick={() => onRowNavigate?.(r)}
                  onKeyDown={(e) => {
                    if (!onRowNavigate) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onRowNavigate(r);
                    }
                  }}
                >
                  <td className="sticky left-0 z-[1] bg-card py-3 pr-2 font-mono text-primary shadow-[4px_0_12px_-4px_rgba(15,23,42,0.12)] transition-colors group-hover:bg-muted/30 dark:shadow-[4px_0_12px_-4px_rgba(0,0,0,0.35)]">
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      {r.priority === "critical" && (
                        <span
                          aria-label="Critical priority"
                          className="h-2 w-2 shrink-0 rounded-full bg-destructive"
                        />
                      )}
                      {r.id}
                    </span>
                  </td>
                  <td className="max-w-[9rem] py-3 pl-2 pr-2 font-medium text-foreground sm:max-w-none">
                    <span className="block truncate sm:whitespace-nowrap" title={r.member}>
                      {r.member}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <Badge variant="outline" className="border-0 bg-muted text-foreground whitespace-nowrap">
                      {r.format}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-muted-foreground whitespace-nowrap tabular-nums">
                    {new Intl.NumberFormat("en-IN").format(r.records)}
                  </td>
                  <td className="min-w-[160px] py-3 px-2 sm:min-w-[200px]">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="h-1.5 min-w-[72px] flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            r.status === "completed"
                              ? "bg-success"
                              : r.status === "error"
                                ? "bg-destructive"
                                : "bg-primary",
                          )}
                          style={{ width: `${r.progress}%` }}
                        />
                      </div>
                      <span className="w-9 shrink-0 text-right text-caption text-muted-foreground tabular-nums sm:w-10">
                        {r.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right font-mono whitespace-nowrap tabular-nums">
                    {r.quality === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className={qualityClass(r.quality)}>{r.quality.toFixed(1)}%</span>
                    )}
                  </td>
                  <td className="py-3 pl-2 pr-0 whitespace-nowrap">
                    <Badge
                      variant="outline"
                      className={cn("shrink-0 capitalize", statusBadgeClass(r.status))}
                      aria-label={`Status: ${r.status}`}
                    >
                      {r.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-caption text-muted-foreground">
                    No batches in processing right now. Open batch monitoring for the full queue and history.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="py-3 text-caption text-muted-foreground">
                    Loading batches…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

