import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tableHeaderClasses } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { formatCompact, formatPct1, type EnquiryMemberRow } from "./enquiryScaleMock";

const PAGE_SIZE = 25;

type Quick =
  | "all"
  | "throttled"
  | "inactive"
  | "highReject"
  | "lowHit"
  | "consent"
  | "insufficient";

export function EnquiryMembers({
  rows,
  filterCode,
  onClearCode,
  onLockMember,
  largeSet,
}: {
  rows: EnquiryMemberRow[];
  filterCode: string | null;
  onClearCode: () => void;
  onLockMember: (id: string) => void;
  largeSet: boolean;
}) {
  const [q, setQ] = useState("");
  const [quick, setQuick] = useState<Quick>("all");
  const [page, setPage] = useState(1);

  const source = largeSet ? rows.slice(0, 400) : rows;

  const counts = useMemo(
    () => ({
      all: source.length,
      throttled: source.filter((r) => r.throttled).length,
      inactive: source.filter((r) => r.silent).length,
      highReject: source.filter((r) => r.highReject).length,
      lowHit: source.filter((r) => r.lowHit).length,
      consent: source.filter((r) => r.consentIssues).length,
      insufficient: source.filter((r) => r.insufficient).length,
    }),
    [source]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = source;
    if (needle) {
      list = list.filter(
        (r) => r.name.toLowerCase().includes(needle) || r.code.toLowerCase().includes(needle)
      );
    }
    if (quick === "throttled") list = list.filter((r) => r.throttled);
    if (quick === "inactive") list = list.filter((r) => r.silent);
    if (quick === "highReject") list = list.filter((r) => r.highReject);
    if (quick === "lowHit") list = list.filter((r) => r.lowHit);
    if (quick === "consent") list = list.filter((r) => r.consentIssues);
    if (quick === "insufficient") list = list.filter((r) => r.insufficient);
    if (filterCode) list = list.filter((r) => r.topCode === filterCode);
    return [...list].sort((a, b) => b.requests - a.requests);
  }, [source, q, quick, filterCode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const chips: { id: Quick; label: string; n: number }[] = [
    { id: "all", label: "All", n: counts.all },
    { id: "throttled", label: "Throttled", n: counts.throttled },
    { id: "inactive", label: "No activity", n: counts.inactive },
    { id: "highReject", label: "High reject", n: counts.highReject },
    { id: "lowHit", label: "Low hit rate", n: counts.lowHit },
    { id: "consent", label: "Consent issues", n: counts.consent },
    { id: "insufficient", label: "Insufficient data", n: counts.insufficient },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="space-y-3 border-b border-border px-4 py-4 md:px-6">
        <p className="text-caption text-muted-foreground">
          Locked-member notice: click a member name to lock Overview to that member.
        </p>
        <div className="relative min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search name or code"
            className="h-8 pl-8 text-caption"
          />
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
              {c.label} ({c.n})
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
              <th className={cn("whitespace-nowrap px-4 py-3 text-left", tableHeaderClasses)}>Member</th>
              <th className={cn("whitespace-nowrap px-4 py-3 text-right", tableHeaderClasses)}>Requests</th>
              <th className={cn("whitespace-nowrap px-4 py-3 text-right", tableHeaderClasses)}>Success rate</th>
              <th className={cn("whitespace-nowrap px-4 py-3 text-right", tableHeaderClasses)}>Rejected %</th>
              <th className={cn("whitespace-nowrap px-4 py-3 text-right", tableHeaderClasses)}>Failed %</th>
              <th className={cn("whitespace-nowrap px-4 py-3 text-right", tableHeaderClasses)}>P95 ms</th>
              <th className={cn("whitespace-nowrap px-4 py-3 text-left", tableHeaderClasses)}>Last seen</th>
              <th className={cn("whitespace-nowrap px-4 py-3 text-left", tableHeaderClasses)}>Top code</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {slice.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-caption text-muted-foreground">
                  No members match the selected filters
                </td>
              </tr>
            ) : (
              slice.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-left text-caption font-medium text-foreground hover:underline"
                      onClick={() => onLockMember(r.id)}
                    >
                      {r.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right text-caption tabular-nums">{formatCompact(r.requests)}</td>
                  <td className="px-4 py-3 text-right text-caption tabular-nums">
                    {r.insufficient ? (
                      <span className="text-muted-foreground">Insufficient data</span>
                    ) : (
                      formatPct1(r.hitRate)
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-caption tabular-nums">{formatPct1(r.rejectedPct)}</td>
                  <td className="px-4 py-3 text-right text-caption tabular-nums">{formatPct1(r.failedPct)}</td>
                  <td className="px-4 py-3 text-right text-caption tabular-nums">
                    {r.insufficient || r.silent ? "—" : `${r.p95}`}
                  </td>
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
            ? "0 members"
            : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
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
