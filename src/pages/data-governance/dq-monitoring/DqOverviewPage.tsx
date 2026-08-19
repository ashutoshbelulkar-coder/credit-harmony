import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { tableHeaderClasses } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { DqFilterBar } from "./DqFilterBar";
import { useDqMonitoring } from "./dq-context";
import {
  DqDelta,
  DqEmptyState,
  DqKpiRangeTag,
  DqKpiSkeleton,
  DqSeverityPill,
  DqTableSkeleton,
} from "./dq-shared";
import {
  filterIssues,
  formatInt,
  headlineForFilters,
  isDefaultDqFilters,
} from "@/data/dq-monitoring-mock";
import type { DqHeadlineKpis, DqIssue } from "@/types/dq-monitoring";

function KpiTile({
  label,
  value,
  status,
  onClick,
}: {
  label: string;
  value: string;
  status?: "acceptable" | "watch" | "out";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-border bg-card p-4 shadow-sm text-left cursor-pointer hover:border-primary/30 transition-colors"
    >
      <p className="text-caption font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-sans text-h2 font-bold text-foreground tabular-nums whitespace-nowrap">{value}</p>
      {status ? <div className="mt-1.5"><DqKpiRangeTag status={status} /></div> : null}
    </button>
  );
}

function pctValue(part: number, whole: number): number {
  if (!whole) return 0;
  return (part / whole) * 100;
}

function higherIsBetter(value: number, good: number, watch: number): "acceptable" | "watch" | "out" {
  if (value >= good) return "acceptable";
  if (value >= watch) return "watch";
  return "out";
}

function lowerIsBetter(value: number, good: number, watch: number): "acceptable" | "watch" | "out" {
  if (value <= good) return "acceptable";
  if (value <= watch) return "watch";
  return "out";
}

export default function DqOverviewPage() {
  const navigate = useNavigate();
  const { filters, setFilters, loading } = useDqMonitoring();
  const kpis: DqHeadlineKpis = headlineForFilters(filters);
  const issues = filterIssues(filters);
  const empty = !isDefaultDqFilters(filters) && kpis.recordsEvaluated === 0;
  const warningRules = issues.filter((i) => i.severity === "WARNING").length;
  const infoRules = issues.filter((i) => i.severity === "INFO").length;
  const warningPct = pctValue(warningRules, issues.length);
  const infoPct = pctValue(infoRules, issues.length);
  const rejectedPct = 100 - kpis.acceptedPct;
  const duplicatePct = pctValue(kpis.duplicatesCollapsed, kpis.recordsEvaluated);
  const acceptedStatus = higherIsBetter(kpis.acceptedPct, 95, 90);
  const rejectedStatus = lowerIsBetter(rejectedPct, 5, 10);
  const duplicateStatus = lowerIsBetter(duplicatePct, 1, 3);
  const warningStatus = lowerIsBetter(warningPct, 1, 1);
  const infoStatus = lowerIsBetter(infoPct, 5, 5);

  const sortedIssues = [...issues].sort((a, b) => b.membersAffected - a.membersAffected);

  if (loading) {
    return (
      <div className="space-y-6">
        <DqKpiSkeleton />
        <DqTableSkeleton rows={8} />
      </div>
    );
  }

  if (empty) return <DqEmptyState />;

  return (
    <div className="space-y-6">
      <DqFilterBar filters={filters} onChange={(patch) => setFilters(patch)} />

      <div className="grid grid-cols-3 gap-4">
        <KpiTile label="Records evaluated" value={formatInt(kpis.recordsEvaluated)} onClick={() => navigate("/data-governance/data-quality-monitoring/submissions")} />
        <KpiTile
          label="Accepted"
          value={`${kpis.acceptedPct.toFixed(1)}%`}
          status={acceptedStatus}
          onClick={() => navigate("/data-governance/data-quality-monitoring/submissions")}
        />
        <KpiTile
          label="Rejected"
          value={`${rejectedPct.toFixed(1)}%`}
          status={rejectedStatus}
          onClick={() => navigate("/data-governance/data-quality-monitoring/issues")}
        />
        <KpiTile
          label="% of duplicate records"
          value={`${duplicatePct.toFixed(1)}%`}
          status={duplicateStatus}
          onClick={() => navigate("/data-governance/data-quality-monitoring/issues")}
        />
        <KpiTile
          label="% of warning rules failed"
          value={`${warningPct.toFixed(1)}%`}
          status={warningStatus}
          onClick={() => navigate("/data-governance/data-quality-monitoring/issues?severity=WARNING")}
        />
        <KpiTile
          label="% of Info rules failed"
          value={`${infoPct.toFixed(1)}%`}
          status={infoStatus}
          onClick={() => navigate("/data-governance/data-quality-monitoring/issues?severity=INFO")}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-h4 font-semibold text-foreground">Top quality issues</h2>
          <Button variant="outline" size="sm" className="text-caption" onClick={() => navigate("/data-governance/data-quality-monitoring/issues")}>
            View all
          </Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] caption-bottom text-body">
            <thead className="sticky top-0 z-10 bg-[hsl(var(--table-header-bg))]">
              <tr className="border-b">
                {["Error code", "Rule type", "Field", "Severity", "Impacted records", "Δ vs prior", "Members affected", "First seen"].map((h) => (
                  <th key={h} className={cn(tableHeaderClasses, "h-10 px-3 text-left")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedIssues.map((row: DqIssue) => (
                <tr
                  key={row.code}
                  className="border-b cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/data-governance/data-quality-monitoring/issues?issue=${row.code}`)}
                >
                  <td className="px-3 py-2.5 font-medium text-foreground">{row.code}</td>
                  <td className="px-3 py-2.5">{row.ruleType}</td>
                  <td className="px-3 py-2.5">{row.field}</td>
                  <td className="px-3 py-2.5"><DqSeverityPill severity={row.severity} /></td>
                  <td className="px-3 py-2.5 tabular-nums">{formatInt(row.records)}</td>
                  <td className="px-3 py-2.5"><DqDelta value={row.deltaPct} invert /></td>
                  <td className="px-3 py-2.5 tabular-nums">{formatInt(row.membersAffected)}</td>
                  <td className="px-3 py-2.5 text-caption">{row.firstSeen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
