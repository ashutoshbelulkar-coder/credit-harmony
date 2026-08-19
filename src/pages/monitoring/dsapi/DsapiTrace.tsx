import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tableHeaderClasses } from "@/lib/typography";
import { cn } from "@/lib/utils";
import type { DsapiTraceDetail } from "./dsapiScaleMock";

const CLIENT_WINDOWS = ["1h", "6h", "24h"] as const;

function outcomeBadgeClass(status: string) {
  if (status === "COMPLETED") return "border-0 bg-success/20 text-success";
  if (status === "IN_PROGRESS") return "border-0 bg-warning/20 text-warning";
  return "border-0 bg-destructive/20 text-destructive";
}

function recordStatusBadgeClass(disp: string) {
  if (disp === "Accepted") return "border-0 bg-success/20 text-success";
  if (disp === "Processing") return "border-0 bg-warning/20 text-warning";
  return "border-0 bg-destructive/20 text-destructive";
}

export function DsapiTrace({
  traces,
  initialQuery,
  onQueryConsumed,
}: {
  traces: DsapiTraceDetail[];
  initialQuery: string;
  onQueryConsumed: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<"ref" | "client">("ref");
  const [clientWin, setClientWin] = useState<(typeof CLIENT_WINDOWS)[number]>("24h");
  const [selectedRef, setSelectedRef] = useState<string | null>(initialQuery || null);

  useEffect(() => {
    if (!initialQuery) return;
    setQuery(initialQuery);
    setSelectedRef(initialQuery);
    onQueryConsumed();
    // Parent clears the jump query after consume; omit callback from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return traces.slice(0, 9);
    return traces.filter(
      (t) =>
        t.ref.toLowerCase().includes(q) ||
        t.submitter.toLowerCase().includes(q) ||
        t.submitterId.toLowerCase().includes(q)
    );
  }, [traces, query]);

  const detail = traces.find((t) => t.ref === selectedRef) ?? hits[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex gap-1">
          <Button size="sm" variant={mode === "ref" ? "default" : "outline"} onClick={() => setMode("ref")}>
            Submission ref
          </Button>
          <Button size="sm" variant={mode === "client" ? "default" : "outline"} onClick={() => setMode("client")}>
            Client ID
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === "ref" ? "SUB-FNB-… or submitter name" : "Client ID"}
            className="h-8 pl-8 text-caption"
          />
        </div>
        {mode === "client" && (
          <div className="mt-3 space-y-1.5">
            <Label className="text-caption text-muted-foreground">Time window</Label>
            <div className="flex gap-1">
              {CLIENT_WINDOWS.map((w) => (
                <Button
                  key={w}
                  size="sm"
                  variant={clientWin === w ? "default" : "outline"}
                  onClick={() => setClientWin(w)}
                >
                  {w}
                </Button>
              ))}
            </div>
            <p className="text-caption text-muted-foreground">
              Client-ID search requires a time window of 24 h or less.
            </p>
          </div>
        )}
      </div>

      <div className="grid h-[380px] grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6">
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <h4 className="text-h4 font-semibold text-foreground">Matches</h4>
          </div>
          <div className="min-h-0 min-w-0 flex-1 overflow-auto">
            <table className="w-full min-w-max">
              <thead className="sticky top-0 z-10 bg-muted/95">
                <tr className="border-b border-border">
                  <th className={cn("px-4 py-2 text-left", tableHeaderClasses)}>Timestamp</th>
                  <th className={cn("px-4 py-2 text-left", tableHeaderClasses)}>Ref</th>
                  <th className={cn("px-4 py-2 text-left", tableHeaderClasses)}>Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {hits.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-caption text-muted-foreground">
                      No matches — check the reference format
                    </td>
                  </tr>
                ) : (
                  hits.map((t) => (
                    <tr
                      key={t.ref}
                      className={cn(
                        "cursor-pointer hover:bg-muted/30",
                        detail?.ref === t.ref && "bg-primary/5"
                      )}
                      onClick={() => setSelectedRef(t.ref)}
                    >
                      <td className="whitespace-nowrap px-4 py-2 text-caption tabular-nums text-muted-foreground">
                        {t.received}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-caption font-medium">{t.ref}</td>
                      <td className="px-4 py-2">
                        <Badge className={outcomeBadgeClass(t.status)}>{t.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {!detail ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-caption text-muted-foreground">
              Search a submission reference to open the trace.
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-auto p-6">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-h4 font-semibold text-foreground">{detail.ref}</h4>
                <Badge className={outcomeBadgeClass(detail.status)}>{detail.status}</Badge>
                <span className="text-caption text-muted-foreground">HTTP {detail.http}</span>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <h5 className="mb-2 text-body font-semibold text-foreground">Request metadata</h5>
                  <dl className="space-y-1.5 text-caption">
                    {detail.facts.map((f) => (
                      <div key={f.k} className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">{f.k}</dt>
                        <dd className="font-medium text-foreground">{f.v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div>
                  <h5 className="mb-2 text-body font-semibold text-foreground">Record status</h5>
                  <Badge className={cn("gap-1.5 border-0", recordStatusBadgeClass(detail.disp))}>
                    <span>{detail.disp}</span>
                    <span className="opacity-70">· {detail.dispNote}</span>
                  </Badge>
                </div>

                <div>
                  <h5 className="mb-2 text-body font-semibold text-foreground">Failure reasons</h5>
                  {detail.errors.length === 0 ? (
                    <p className="text-caption text-muted-foreground">
                      {detail.status === "IN_PROGRESS"
                        ? "No failure reasons yet — request is still processing."
                        : "No failure reasons on this record."}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-max">
                        <thead>
                          <tr className="border-b border-border">
                            <th className={cn("px-2 py-2 text-left", tableHeaderClasses)}>Code</th>
                            <th className={cn("px-2 py-2 text-left", tableHeaderClasses)}>Field</th>
                            <th className={cn("px-2 py-2 text-left", tableHeaderClasses)}>Rule ID</th>
                            <th className={cn("px-2 py-2 text-left", tableHeaderClasses)}>Message</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.errors.map((e) => (
                            <tr key={`${e.code}-${e.field}`} className="border-b border-border">
                              <td className="whitespace-nowrap px-2 py-2 text-caption">{e.code}</td>
                              <td className="whitespace-nowrap px-2 py-2 text-caption">{e.field}</td>
                              <td className="whitespace-nowrap px-2 py-2 text-caption">{e.rule}</td>
                              <td className="px-2 py-2 text-caption text-muted-foreground">{e.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
