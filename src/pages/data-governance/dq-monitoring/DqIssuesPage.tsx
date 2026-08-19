import { Fragment, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tableHeaderClasses } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { filterIssues, formatInt } from "@/data/dq-monitoring-mock";
import type { DqIssue } from "@/types/dq-monitoring";
import { useDqMonitoring } from "./dq-context";
import { DqFilterBar } from "./DqFilterBar";
import {
  DqDelta,
  DqEmptyState,
  DqSeverityPill,
  DqSortHead,
  DqTableSkeleton,
} from "./dq-shared";

export default function DqIssuesPage() {
  const { filters, setFilters, loading } = useDqMonitoring();
  const [params, setParams] = useSearchParams();
  const systemicOnly = params.get("systemic") === "1";
  const expandedParam = params.get("issue");
  const [expanded, setExpanded] = useState<string | null>(expandedParam);
  const [sort, setSort] = useState<{ key: keyof DqIssue; dir: "asc" | "desc" }>({
    key: "membersAffected",
    dir: "desc",
  });

  const rows = useMemo(() => {
    const list = filterIssues(filters, systemicOnly);
    return [...list].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [filters, systemicOnly, sort]);

  const toggle = (code: string) => {
    const next = expanded === code ? null : code;
    setExpanded(next);
    const p = new URLSearchParams(params);
    if (next) p.set("issue", next);
    else p.delete("issue");
    setParams(p, { replace: true });
  };

  if (loading) return <DqTableSkeleton rows={10} />;

  return (
    <div className="space-y-4">
      <DqFilterBar filters={filters} onChange={setFilters} />
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        {rows.length === 0 ? (
          <DqEmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-body">
              <thead className="sticky top-0 z-10 bg-[hsl(var(--table-header-bg))]">
                <tr className="border-b">
                  <th className={cn(tableHeaderClasses, "h-10 w-8")} />
                  <th className={cn(tableHeaderClasses, "h-10 px-3 text-left")}>Error code</th>
                  <th className={cn(tableHeaderClasses, "h-10 px-3 text-left")}>Rule type</th>
                  <th className={cn(tableHeaderClasses, "h-10 px-3 text-left")}>Field</th>
                  <th className={cn(tableHeaderClasses, "h-10 px-3 text-left")}>Severity</th>
                  <th className={cn(tableHeaderClasses, "h-10 px-3 text-left")}>
                    <DqSortHead label="Impacted records" active={sort.key === "records"} dir={sort.dir} onClick={() => setSort({ key: "records", dir: sort.key === "records" && sort.dir === "desc" ? "asc" : "desc" })} />
                  </th>
                  <th className={cn(tableHeaderClasses, "h-10 px-3 text-left")}>Δ</th>
                  <th className={cn(tableHeaderClasses, "h-10 px-3 text-left")}>
                    <DqSortHead label="Members affected" active={sort.key === "membersAffected"} dir={sort.dir} onClick={() => setSort({ key: "membersAffected", dir: sort.key === "membersAffected" && sort.dir === "desc" ? "asc" : "desc" })} />
                  </th>
                  <th className={cn(tableHeaderClasses, "h-10 px-3 text-left")}>First seen</th>
                  <th className={cn(tableHeaderClasses, "h-10 px-3 text-left")}>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const open = expanded === row.code;
                  return (
                    <Fragment key={row.code}>
                      <tr className="border-b cursor-pointer hover:bg-muted/50" onClick={() => toggle(row.code)}>
                        <td className="px-2 py-2">
                          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </td>
                        <td className="px-3 py-2 font-medium">{row.code}</td>
                        <td className="px-3 py-2">{row.ruleType}</td>
                        <td className="px-3 py-2">{row.field}</td>
                        <td className="px-3 py-2"><DqSeverityPill severity={row.severity} /></td>
                        <td className="px-3 py-2 tabular-nums">{formatInt(row.records)}</td>
                        <td className="px-3 py-2"><DqDelta value={row.deltaPct} invert /></td>
                        <td className="px-3 py-2 tabular-nums">{formatInt(row.membersAffected)}</td>
                        <td className="px-3 py-2 text-caption">{row.firstSeen}</td>
                        <td className="px-3 py-2 text-caption">{row.lastSeen}</td>
                      </tr>
                      {open && (
                        <tr key={`${row.code}-exp`} className="border-b bg-muted/20">
                          <td colSpan={10} className="px-6 py-3">
                            <p className="text-caption font-medium text-muted-foreground mb-2">Members affected (top 10)</p>
                            <ul className="grid gap-1 sm:grid-cols-2">
                              {row.topMembers.map((m) => (
                                <li key={m.id}>
                                  <Link to={`/data-governance/data-quality-monitoring/members/${m.id}`} className="text-body text-primary hover:underline">
                                    {m.name}
                                  </Link>
                                  <span className="ml-2 text-caption tabular-nums text-muted-foreground">{formatInt(m.records)} records</span>
                                </li>
                              ))}
                            </ul>
                            <p className="mt-3 text-caption text-muted-foreground">
                              Field: {row.field} · Masked sample record IDs: {row.sampleRecordIds.join(", ")}
                            </p>
                            <Button asChild variant="outline" size="sm" className="mt-2 h-7 text-caption">
                              <Link to="/data-governance/master-schema">View rule</Link>
                            </Button>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
