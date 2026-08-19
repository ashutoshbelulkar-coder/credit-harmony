import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tableHeaderClasses } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv-export";
import { toast } from "sonner";
import {
  DQ_PAGE_SIZE_TABLE,
  filterApiAssessments,
  filterBatches,
  formatInt,
} from "@/data/dq-monitoring-mock";
import { useDqMonitoring } from "./dq-context";
import { DqFilterBar } from "./DqFilterBar";
import {
  DqEmptyState,
  DqGradePill,
  DqPaginationBar,
  DqTableSkeleton,
} from "./dq-shared";
import type { DqApiAssessmentRow, DqBatchRow } from "@/types/dq-monitoring";

function sharePct(part: number, whole: number): string {
  if (!whole) return "0.0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

function downloadBatchDqiReport(batch: DqBatchRow) {
  exportToCsv(`dqi-report-${batch.batchId}`, [batch], [
    { key: "batchId", label: "Batch ID" },
    { key: "memberName", label: "Member" },
    { key: "profile", label: "Profile" },
    { key: "evaluated", label: "Total" },
    { key: "accepted", label: "Accepted" },
    { key: "rejected", label: "Rejected" },
    { key: "dqi", label: "DQI" },
    { key: "grade", label: "Grade" },
    { key: "completedAt", label: "Completed at" },
  ]);
  toast.success("DQI report downloaded.");
}

function downloadApiDqiReport(row: DqApiAssessmentRow) {
  exportToCsv(`dqi-report-${row.id}`, [row], [
    { key: "id", label: "Assessment ID" },
    { key: "memberName", label: "Member" },
    { key: "profile", label: "Profile" },
    { key: "date", label: "Date" },
    { key: "records", label: "Records" },
    { key: "accepted", label: "Accepted" },
    { key: "rejected", label: "Rejected" },
    { key: "dqi", label: "DQI" },
    { key: "grade", label: "Grade" },
    { key: "topCode", label: "Top code" },
  ]);
  toast.success("DQI report downloaded.");
}

export default function DqSubmissionsPage() {
  const { filters, setFilters, loading } = useDqMonitoring();
  const [tab, setTab] = useState<"batches" | "api">("batches");
  const [page, setPage] = useState(1);

  const batches = useMemo(() => filterBatches(filters), [filters]);
  const apiRows = useMemo(() => filterApiAssessments(filters), [filters]);
  const list = tab === "batches" ? batches : apiRows;
  const paged = list.slice((page - 1) * DQ_PAGE_SIZE_TABLE, page * DQ_PAGE_SIZE_TABLE);

  if (loading) return <DqTableSkeleton rows={10} />;

  return (
    <div className="space-y-4">
      <DqFilterBar filters={filters} onChange={(p) => { setFilters(p); setPage(1); }} />
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex rounded-md bg-muted/60 p-1 w-fit">
          <Button
            type="button"
            size="sm"
            variant={tab === "batches" ? "default" : "ghost"}
            className="h-7 text-caption"
            onClick={() => { setTab("batches"); setPage(1); }}
          >
            Batches
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "api" ? "default" : "ghost"}
            className="h-7 text-caption"
            onClick={() => { setTab("api"); setPage(1); }}
          >
            API daily assessments
          </Button>
        </div>

        {list.length === 0 ? (
          <div className="mt-4"><DqEmptyState /></div>
        ) : tab === "batches" ? (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[960px] text-body">
                <thead className="sticky top-0 z-10 bg-[hsl(var(--table-header-bg))]">
                  <tr className="border-b">
                    {["Batch ID", "Member", "Profile", "Total", "Accepted", "Rejected", "DQI", "Grade", "Completed at", "DQI report"].map((h) => (
                      <th key={h} className={cn(tableHeaderClasses, "h-10 px-3 text-left")}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(paged as typeof batches).map((b) => (
                    <tr key={b.batchId} className="border-b hover:bg-muted/50">
                      <td className="px-3 py-2 font-medium tabular-nums">{b.batchId}</td>
                      <td className="px-3 py-2">{b.memberName}</td>
                      <td className="px-3 py-2 text-caption">{b.profile}</td>
                      <td className="px-3 py-2 tabular-nums">{formatInt(b.evaluated)}</td>
                      <td className="px-3 py-2 tabular-nums">{sharePct(b.accepted, b.evaluated)}</td>
                      <td className="px-3 py-2 tabular-nums">{sharePct(b.rejected, b.evaluated)}</td>
                      <td className="px-3 py-2 tabular-nums">{b.dqi.toFixed(1)}</td>
                      <td className="px-3 py-2"><DqGradePill grade={b.grade} /></td>
                      <td className="px-3 py-2 text-caption">{b.completedAt}</td>
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 text-caption"
                          onClick={() => downloadBatchDqiReport(b)}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DqPaginationBar page={page} pageSize={DQ_PAGE_SIZE_TABLE} total={batches.length} onPage={setPage} />
          </>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[860px] text-body">
                <thead className="sticky top-0 z-10 bg-[hsl(var(--table-header-bg))]">
                  <tr className="border-b">
                    {["Member", "Profile name", "Records", "Accepted", "Rejected", "Top code", "DQI report"].map((h) => (
                      <th key={h} className={cn(tableHeaderClasses, "h-10 px-3 text-left")}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(paged as typeof apiRows).map((a) => (
                    <tr key={a.id} className="border-b hover:bg-muted/50">
                      <td className="px-3 py-2">{a.memberName}</td>
                      <td className="px-3 py-2 text-caption">{a.profile}</td>
                      <td className="px-3 py-2 tabular-nums">{formatInt(a.records)}</td>
                      <td className="px-3 py-2 tabular-nums">{formatInt(a.accepted)}</td>
                      <td className="px-3 py-2 tabular-nums">{formatInt(a.rejected)}</td>
                      <td className="px-3 py-2">{a.topCode}</td>
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 text-caption"
                          onClick={() => downloadApiDqiReport(a)}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DqPaginationBar page={page} pageSize={DQ_PAGE_SIZE_TABLE} total={apiRows.length} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
