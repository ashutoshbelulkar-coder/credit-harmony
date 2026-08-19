import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tableHeaderClasses } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv-export";
import { toast } from "sonner";
import type { DqMemberRow, DqSavedView } from "@/types/dq-monitoring";
import {
  DQ_PAGE_SIZE_MEMBERS,
  dqMembers,
  filterMembers,
} from "@/data/dq-monitoring-mock";
import { useDqMonitoring } from "./dq-context";
import { DqFilterBar } from "./DqFilterBar";
import {
  DqDelta,
  DqEmptyState,
  DqGradePill,
  DqPaginationBar,
  DqSortHead,
  DqTableSkeleton,
} from "./dq-shared";

type MemberProfileRow = DqMemberRow & { profileName: string };

type SortKey = keyof Pick<DqMemberRow, "name" | "dqi" | "lastAssessment">;

const VIEWS: { key: DqSavedView; label: string }[] = [
  { key: "all", label: "All" },
  { key: "watchlist", label: "Watchlist" },
];

export default function DqMembersPage() {
  const navigate = useNavigate();
  const { filters, setFilters, loading, watchlist, toggleWatchlist } = useDqMonitoring();
  const [view, setView] = useState<DqSavedView>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "dqi", dir: "desc" });

  const rows = useMemo(() => {
    let list = filterMembers(dqMembers, filters, watchlist, view);
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter((m) => m.name.toLowerCase().includes(query) || m.id.toLowerCase().includes(query));
    }
    const exploded: MemberProfileRow[] = list.flatMap((m) => {
      const profiles = m.profiles.length ? m.profiles : ["—"];
      return profiles.map((profileName) => ({ ...m, profileName }));
    });
    exploded.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return exploded;
  }, [filters, watchlist, view, q, sort]);

  const pageRows = rows.slice((page - 1) * DQ_PAGE_SIZE_MEMBERS, page * DQ_PAGE_SIZE_MEMBERS);

  const toggleSort = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }));
    setPage(1);
  };

  if (loading) return <DqTableSkeleton rows={12} cols={8} />;

  return (
    <div className="space-y-4">
      <DqFilterBar filters={filters} onChange={(p) => { setFilters(p); setPage(1); }} />
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search members"
                className="h-8 w-[200px] pl-7 text-caption"
              />
            </div>
            <div className="flex rounded-md border border-input p-0.5">
              {VIEWS.map((v) => (
                <Button
                  key={v.key}
                  type="button"
                  variant={view === v.key ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-caption"
                  onClick={() => {
                    setView(v.key);
                    setPage(1);
                  }}
                >
                  {v.label}
                </Button>
              ))}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-caption"
            onClick={() => {
              exportToCsv(
                "dq_members",
                pageRows,
                [
                  { key: "id", label: "ID" },
                  { key: "name", label: "Member" },
                  { key: "profileName", label: "Profile" },
                  { key: "dqi", label: "DQI" },
                  { key: "grade", label: "Grade" },
                ],
              );
              toast.success("Export started.");
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="mt-4">
            <DqEmptyState />
          </div>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-body">
                <thead className="sticky top-0 z-10 bg-[hsl(var(--table-header-bg))]">
                  <tr className="border-b">
                    <th className={cn(tableHeaderClasses, "h-10 px-2 w-8")} />
                    <th className={cn(tableHeaderClasses, "h-10 px-3 text-left")}>
                      <DqSortHead label="Member" active={sort.key === "name"} dir={sort.dir} onClick={() => toggleSort("name")} />
                    </th>
                    <th className={cn(tableHeaderClasses, "h-10 px-3 text-left")}>Profile name</th>
                    <th className={cn(tableHeaderClasses, "h-10 px-3 text-left")}>
                      <DqSortHead label="Aggregated DQI score" active={sort.key === "dqi"} dir={sort.dir} onClick={() => toggleSort("dqi")} />
                    </th>
                    <th className={cn(tableHeaderClasses, "h-10 px-3 text-left")}>Grade</th>
                    <th className={cn(tableHeaderClasses, "h-10 px-3 text-left")}>Δ</th>
                    <th className={cn(tableHeaderClasses, "h-10 px-3 text-left")}>Last assessment</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((m) => (
                    <tr
                      key={`${m.id}-${m.profileName}`}
                      className="border-b cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/data-governance/data-quality-monitoring/members/${m.id}`)}
                    >
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          aria-label={watchlist.has(m.id) ? "Remove from watchlist" : "Add to watchlist"}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWatchlist(m.id);
                          }}
                        >
                          <Star className={cn("h-3.5 w-3.5", watchlist.has(m.id) ? "fill-warning text-warning" : "text-muted-foreground")} />
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-foreground">{m.name}</p>
                        <p className="text-caption text-muted-foreground">{m.id}</p>
                      </td>
                      <td className="px-3 py-2 text-caption">{m.profileName}</td>
                      <td className="px-3 py-2 tabular-nums font-medium">{m.dqi.toFixed(1)}</td>
                      <td className="px-3 py-2"><DqGradePill grade={m.grade} /></td>
                      <td className="px-3 py-2"><DqDelta value={m.dqi - m.dqiPrev} /></td>
                      <td className="px-3 py-2 text-caption">{m.lastAssessment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DqPaginationBar page={page} pageSize={DQ_PAGE_SIZE_MEMBERS} total={rows.length} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
