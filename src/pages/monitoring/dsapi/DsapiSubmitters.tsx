import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tableHeaderClasses } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { formatCompact, type DsapiSubmitterRow } from "./dsapiScaleMock";

const PAGE_SIZE = 25;

type Quick = "all" | "throttled" | "inactive" | "highReject" | "insufficient";

export function DsapiSubmitters({
  rows,
  filterCode,
  onClearCode,
  onLockSubmitter,
}: {
  rows: DsapiSubmitterRow[];
  filterCode: string | null;
  onClearCode: () => void;
  onLockSubmitter: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [quick, setQuick] = useState<Quick>("all");
  const [page, setPage] = useState(1);
  const [sortDir, setSortDir] = useState<-1 | 1>(-1);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = rows;
    if (needle) {
      list = list.filter(
        (r) => r.name.toLowerCase().includes(needle) || r.code.toLowerCase().includes(needle)
      );
    }
    if (quick === "throttled") list = list.filter((r) => r.throttled);
    if (quick === "inactive") list = list.filter((r) => r.inactive);
    if (quick === "highReject") list = list.filter((r) => r.rejects > 50);
    if (quick === "insufficient") list = list.filter((r) => r.insufficient);
    if (filterCode) list = list.filter((r) => r.topCode === filterCode);
    return [...list].sort((a, b) => sortDir * (a.volume - b.volume));
  }, [rows, q, quick, filterCode, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const chips: { id: Quick; label: string }[] = [
    { id: "all", label: "All" },
    { id: "throttled", label: "Throttled" },
    { id: "inactive", label: "No activity" },
    { id: "highReject", label: "High reject" },
    { id: "insufficient", label: "Insufficient data" },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="space-y-3 border-b border-border px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search submitters"
              className="h-8 pl-8 text-caption"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSortDir((d) => (d === -1 ? 1 : -1))}
          >
            Sort by volume {sortDir === -1 ? "▾" : "▴"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {chips.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={quick === c.id ? "default" : "outline"}
              onClick={() => {
                setQuick(c.id);
                setPage(1);
              }}
            >
              {c.label}
            </Button>
          ))}
          {filterCode && (
            <Button size="sm" variant="outline" onClick={onClearCode}>
              {filterCode} ✕
            </Button>
          )}
        </div>
      </div>

      <div className="min-w-0 overflow-x-auto">
        <table className="w-full min-w-max">
          <thead className="sticky top-0 z-10 bg-muted/95">
            <tr className="border-b border-border">
              <th className={cn("px-4 py-3 text-left", tableHeaderClasses)}>Submitter</th>
              <th className={cn("px-4 py-3 text-left", tableHeaderClasses)}>Code</th>
              <th className={cn("px-4 py-3 text-right", tableHeaderClasses)}>Volume</th>
              <th className={cn("px-4 py-3 text-left", tableHeaderClasses)}>Acceptance</th>
              <th className={cn("px-4 py-3 text-right", tableHeaderClasses)}>Rejects</th>
              <th className={cn("px-4 py-3 text-right", tableHeaderClasses)}>P95</th>
              <th className={cn("px-4 py-3 text-right", tableHeaderClasses)}>Throughput</th>
              <th className={cn("px-4 py-3 text-left", tableHeaderClasses)}>Timestamp</th>
              <th className={cn("px-4 py-3 text-left", tableHeaderClasses)}>Top code</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {slice.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-caption text-muted-foreground">
                  No results for the selected filters
                </td>
              </tr>
            ) : (
              slice.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-left text-caption font-medium text-foreground hover:underline"
                      onClick={() => onLockSubmitter(r.id)}
                    >
                      {r.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-caption text-muted-foreground">{r.code}</td>
                  <td className="px-4 py-3 text-right text-caption tabular-nums">{formatCompact(r.volume)}</td>
                  <td className="px-4 py-3">
                    {r.insufficient ? (
                      <span className="text-caption text-muted-foreground">Insufficient data</span>
                    ) : (
                      <div className="flex min-w-[120px] items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              r.acceptance > 95 ? "bg-success" : r.acceptance > 85 ? "bg-warning" : "bg-destructive"
                            )}
                            style={{ width: `${Math.min(100, r.acceptance)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-caption tabular-nums">{r.acceptance.toFixed(1)}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-caption tabular-nums">{formatCompact(r.rejects)}</td>
                  <td className="px-4 py-3 text-right text-caption tabular-nums">
                    {r.insufficient ? "—" : `${r.p95} ms`}
                  </td>
                  <td className="px-4 py-3 text-right text-caption tabular-nums">{formatCompact(r.throughput)}</td>
                  <td className="px-4 py-3 text-caption text-muted-foreground">{r.lastSeen}</td>
                  <td className="px-4 py-3 text-caption">{r.topCode}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <span className="text-caption text-muted-foreground">
          {filtered.length === 0
            ? "0 submitters"
            : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
          >
            Previous
          </Button>
          <span className="px-2 text-caption text-muted-foreground">
            {safePage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => setPage(safePage + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
