import { useEffect, useMemo, useState } from "react";
import { Fingerprint, History, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tableHeaderClasses } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { traceSearchKey, type EnquiryTraceDetail } from "./enquiryScaleMock";

const CLIENT_WINDOWS = ["1h", "6h", "24h"] as const;

function statusBadgeClass(status: EnquiryTraceDetail["status"]) {
  if (status === "SUCCESS") return "border-0 bg-success/20 text-success";
  if (status === "NO_DATA") return "border-0 bg-warning/20 text-warning";
  if (status === "FAILED") return "border-0 bg-destructive/20 text-destructive";
  if (status === "GATED") return "border-0 bg-muted text-muted-foreground";
  return "border-0 bg-destructive/30 text-destructive";
}

function productOutcomeClass(o: string) {
  if (o === "SERVED") return "border-0 bg-success/20 text-success";
  if (o === "NO_DATA") return "border-0 bg-warning/20 text-warning";
  return "border-0 bg-destructive/20 text-destructive";
}

export function EnquiryTrace({
  traces,
  initialQuery,
  onQueryConsumed,
  onLockMember,
  filterCode,
}: {
  traces: EnquiryTraceDetail[];
  initialQuery: string;
  onQueryConsumed: () => void;
  onLockMember: (id: string) => void;
  filterCode: string | null;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<"enquiry" | "memberRef">("enquiry");
  const [clientWin, setClientWin] = useState<(typeof CLIENT_WINDOWS)[number]>("24h");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!initialQuery) return;
    setQuery(initialQuery);
    setSelectedKey(initialQuery);
    onQueryConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = traces;
    if (filterCode && !q) {
      list = list.filter((t) => t.errors.some((e) => e.code === filterCode) || t.status === "GATED" || t.status === "FAILED" || t.status === "ERROR");
      list = list.filter((t) => t.errors.some((e) => e.code === filterCode) || t.status !== "SUCCESS");
      const coded = traces.filter((t) => t.errors.some((e) => e.code === filterCode));
      if (coded.length) list = coded;
    }
    if (!q) return list.slice(0, 25);
    if (mode === "memberRef") {
      return list
        .filter(
          (t) =>
            t.xRequestId.toLowerCase() === q ||
            t.idempotencyKey.toLowerCase() === q ||
            t.applicationRef.toLowerCase() === q
        )
        .slice(0, 200);
    }
    return list.filter((t) => traceSearchKey(t).includes(q)).slice(0, 200);
  }, [traces, query, mode, filterCode]);

  const keyOf = (t: EnquiryTraceDetail) => t.enquiryId ?? t.requestId;
  const detail =
    (selectedKey
      ? traces.find((t) => keyOf(t) === selectedKey || t.requestId === selectedKey || t.enquiryId === selectedKey)
      : undefined) ??
    hits[0] ??
    null;

  const stageMax = detail ? Math.max(1, detail.stages.reduce((s, x) => s + x.ms, 0)) : 1;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex gap-1" role="group" aria-label="Trace search mode">
          <Button size="sm" variant={mode === "enquiry" ? "default" : "outline"} onClick={() => setMode("enquiry")}>
            Enquiry ID
          </Button>
          <Button size="sm" variant={mode === "memberRef" ? "default" : "outline"} onClick={() => setMode("memberRef")}>
            Member reference
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              mode === "enquiry"
                ? "ENQ-…, requestId, member name or code"
                : "X-Request-ID, Idempotency-Key or applicationRef"
            }
            className="h-8 pl-8 text-caption"
          />
        </div>
        {mode === "memberRef" && (
          <div className="mt-3 space-y-1.5">
            <Label className="text-caption text-muted-foreground">Time window</Label>
            <div className="flex gap-1">
              {CLIENT_WINDOWS.map((w) => (
                <Button key={w} size="sm" variant={clientWin === w ? "default" : "outline"} onClick={() => setClientWin(w)}>
                  {w}
                </Button>
              ))}
            </div>
            <p className="text-caption text-muted-foreground">
              Member-reference search is limited to the last 24 hours.
            </p>
          </div>
        )}
      </div>

      <div className="grid min-h-[420px] grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
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
                  <th className={cn("px-4 py-2 text-left", tableHeaderClasses)}>Member</th>
                  <th className={cn("px-4 py-2 text-left", tableHeaderClasses)}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {hits.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-caption text-muted-foreground">
                      No matches — check the reference format
                    </td>
                  </tr>
                ) : (
                  hits.map((t) => {
                    const key = keyOf(t);
                    return (
                      <tr
                        key={key}
                        className={cn(
                          "cursor-pointer hover:bg-muted/30",
                          detail && keyOf(detail) === key && "bg-primary/5"
                        )}
                        onClick={() => setSelectedKey(key)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedKey(key);
                          }
                        }}
                        tabIndex={0}
                      >
                        <td className="whitespace-nowrap px-4 py-2 text-caption tabular-nums text-muted-foreground">
                          {t.received}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-caption font-medium">{t.enquiryId ?? t.requestId}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-caption">{t.member}</td>
                        <td className="px-4 py-2">
                          <Badge className={statusBadgeClass(t.status)}>{t.status}</Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {!detail ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-caption text-muted-foreground">
              Search an enquiry ID to open the trace.
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-auto p-6">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-h4 font-semibold text-foreground">{detail.enquiryId ?? detail.requestId}</h4>
                <Badge className={statusBadgeClass(detail.status)}>{detail.status}</Badge>
                <span className="text-caption text-muted-foreground">HTTP {detail.http}</span>
                {detail.footprintCreated ? (
                  <Badge className="gap-1 border-0 bg-primary/15 text-primary">
                    <Fingerprint className="h-3 w-3" />
                    Footprint
                  </Badge>
                ) : null}
                {detail.anchor === "AS_OF" ? (
                  <Badge className="gap-1 border-0 bg-muted text-muted-foreground">
                    <History className="h-3 w-3" />
                    Retro
                  </Badge>
                ) : null}
              </div>
              <p className="mt-2 text-caption text-muted-foreground">{detail.subjectNote}</p>

              <div className="mt-4 space-y-5">
                <div>
                  <h5 className="mb-2 text-body font-semibold text-foreground">Request metadata</h5>
                  <dl className="space-y-1.5 text-caption">
                    {[
                      ["enquiryId", detail.enquiryId ?? "— (gated / error)"],
                      ["requestId", detail.requestId],
                      ["X-Request-ID", detail.xRequestId],
                      ["Idempotency-Key", detail.idempotencyKey],
                      ["Idempotent replay", detail.idempotentReplay ? "Yes" : "No"],
                      ["Member", detail.member],
                      ["Code", detail.code],
                      ["Entity type", detail.entityType],
                      ["Enquiry type", detail.enquiryType],
                      ["Purpose", detail.purpose],
                      ["Anchor", detail.enquiryDate ? `${detail.anchor} · ${detail.enquiryDate}` : detail.anchor],
                      ["Consent reference", detail.consentRef],
                      ["Application ref", detail.applicationRef],
                      ["Received at", detail.received],
                      ["Responded at", detail.responded],
                      ["End-to-end latency", `${detail.latencyMs} ms`],
                      ["Footprint created", detail.footprintCreated ? `Yes · ${detail.footprintId}` : "No"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="text-right font-medium text-foreground">
                          {k === "Member" ? (
                            <button type="button" className="hover:underline" onClick={() => onLockMember(detail.memberId)}>
                              {v}
                            </button>
                          ) : (
                            v
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div>
                  <h5 className="mb-2 text-body font-semibold text-foreground">Latency breakdown</h5>
                  <div className="flex h-3 overflow-hidden rounded-full bg-muted" aria-label="Latency breakdown">
                    {detail.stages.map((s) => (
                      <div
                        key={s.name}
                        className="h-full bg-primary/70 even:bg-primary/40"
                        style={{ width: `${(s.ms / stageMax) * 100}%` }}
                        title={`${s.name}: ${s.ms} ms`}
                      />
                    ))}
                  </div>
                  <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {detail.stages.map((s) => (
                      <li key={s.name} className="flex justify-between text-caption">
                        <span className="text-muted-foreground">{s.name}</span>
                        <span className="tabular-nums">{s.ms} ms</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h5 className="mb-2 text-body font-semibold text-foreground">Products requested</h5>
                  {detail.products.length === 0 ? (
                    <p className="text-caption text-muted-foreground">
                      No product-level records — this request was gated or failed before execution.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-max">
                        <thead>
                          <tr className="border-b border-border">
                            <th className={cn("px-2 py-2 text-left", tableHeaderClasses)}>#</th>
                            <th className={cn("px-2 py-2 text-left", tableHeaderClasses)}>Product</th>
                            <th className={cn("px-2 py-2 text-left", tableHeaderClasses)}>Version</th>
                            <th className={cn("px-2 py-2 text-left", tableHeaderClasses)}>dataScope</th>
                            <th className={cn("px-2 py-2 text-left", tableHeaderClasses)}>Outcome</th>
                            <th className={cn("px-2 py-2 text-left", tableHeaderClasses)}>Packets</th>
                            <th className={cn("px-2 py-2 text-right", tableHeaderClasses)}>Retrieval ms</th>
                            <th className={cn("px-2 py-2 text-left", tableHeaderClasses)}>Reason</th>
                            <th className={cn("px-2 py-2 text-left", tableHeaderClasses)}>enquiryItemId</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.products.map((p) => (
                            <tr key={p.enquiryItemId} className="border-b border-border">
                              <td className="px-2 py-2 text-caption">{p.n}</td>
                              <td className="px-2 py-2 text-caption">
                                {p.productId} — {p.name}
                              </td>
                              <td className="px-2 py-2 text-caption">{p.version}</td>
                              <td className="px-2 py-2 text-caption">{p.dataScope}</td>
                              <td className="px-2 py-2">
                                <Badge className={productOutcomeClass(p.outcome)}>{p.outcome}</Badge>
                              </td>
                              <td className="px-2 py-2 text-caption">{p.packets}</td>
                              <td className="px-2 py-2 text-right text-caption tabular-nums">{p.retrievalMs}</td>
                              <td className="px-2 py-2 text-caption">{p.reason ?? "—"}</td>
                              <td className="px-2 py-2 text-caption">{p.enquiryItemId}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="mt-2 text-caption text-muted-foreground">
                    Enquiry is SUCCESS when any product is SERVED.
                  </p>
                </div>

                <div>
                  <h5 className="mb-2 text-body font-semibold text-foreground">Failure reasons</h5>
                  {detail.errors.length === 0 ? (
                    <div className="space-y-1">
                      <p className="text-caption text-muted-foreground">No failure reasons on this enquiry.</p>
                      {detail.status === "NO_DATA" && (
                        <p className="text-caption text-muted-foreground">
                          NO_DATA is a normal outcome — the subject has no data for the requested products.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-max">
                        <thead>
                          <tr className="border-b border-border">
                            <th className={cn("px-2 py-2 text-left", tableHeaderClasses)}>Code</th>
                            <th className={cn("px-2 py-2 text-left", tableHeaderClasses)}>Field</th>
                            <th className={cn("px-2 py-2 text-left", tableHeaderClasses)}>Rule / Validation</th>
                            <th className={cn("px-2 py-2 text-left", tableHeaderClasses)}>Message</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.errors.map((e, i) => (
                            <tr key={`${e.code}-${e.field}-${i}`} className="border-b border-border">
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
