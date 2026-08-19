import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import { useApiRequests, useMonitoringKpis } from "@/hooks/api/useMonitoring";
import { DsapiChrome, type DsapiChromeState } from "./DsapiChrome";
import { DsapiOverview } from "./DsapiOverview";
import { DsapiSubmitters } from "./DsapiSubmitters";
import { DsapiTrace } from "./DsapiTrace";
import {
  buildDsapiSnapshot,
  formatDateTimeFromIso,
  type DsapiFailureRow,
  type DsapiWindow,
} from "./dsapiScaleMock";

function windowToApiRange(w: DsapiWindow): { dateFrom?: string; dateTo?: string } {
  const to = new Date();
  const from = new Date(to);
  const hours = w === "1h" ? 1 : w === "24h" ? 24 : w === "7d" ? 24 * 7 : w === "30d" ? 24 * 30 : 24 * 90;
  from.setHours(from.getHours() - hours);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
  };
}

export function DsapiMonitoringPage() {
  const [chrome, setChrome] = useState<DsapiChromeState>({
    window: "24h",
    pathway: "all",
    profile: "all",
    submitterId: "all",
  });
  const [filterCode, setFilterCode] = useState<string | null>(null);
  const [latView, setLatView] = useState<"structured" | "documents">("structured");
  const [tab, setTab] = useState("overview");
  const [traceQuery, setTraceQuery] = useState("");

  const snapshot = useMemo(
    () =>
      buildDsapiSnapshot({
        window: chrome.window,
        pathway: chrome.pathway,
        profile: chrome.profile,
        submitterId: chrome.submitterId,
        filterCode,
      }),
    [chrome, filterCode]
  );

  const range = windowToApiRange(chrome.window);
  const live = useApiRequests({
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
    institutionId: chrome.submitterId !== "all" ? chrome.submitterId : undefined,
    page: 0,
    size: 50,
  });
  const kpisQuery = useMonitoringKpis();

  const overlayFailures: DsapiFailureRow[] | null = useMemo(() => {
    const rows = live.data?.content;
    if (!rows?.length) return null;
    const failed = rows.filter((r) => {
      const s = r.status.toLowerCase();
      return s.includes("fail") || s.includes("reject") || s.includes("rate");
    });
    if (failed.length === 0) return null;
    return failed.slice(0, 50).map((r) => ({
      id: r.requestId,
      time: formatDateTimeFromIso(r.timestamp),
      submitterId: r.institutionId ?? "unknown",
      submitter: r.institutionId ?? r.apiKey,
      pathway: r.endpoint.includes("bulk") ? "Documents" : "Structured",
      ref: r.requestId,
      http: r.status.toLowerCase().includes("rate") ? 429 : 400,
      code: r.errorCode ?? "ERR_VALIDATION_FAILED",
      latencyMs: r.responseTimeMs,
    }));
  }, [live.data?.content]);

  const overviewSnapshot = overlayFailures
    ? { ...snapshot, failures: overlayFailures }
    : snapshot;

  const goTrace = (ref: string) => {
    setTraceQuery(ref);
    setTab("trace");
  };

  return (
    <div className="space-y-6 laptop:space-y-5 animate-fade-in min-w-0">
      {kpisQuery.isError && (
        <ApiErrorCard
          error={kpisQuery.error}
          onRetry={() => void kpisQuery.refetch()}
          className="mb-2"
        />
      )}

      <DsapiChrome title="Data Submission API" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="submitters">Submitters</TabsTrigger>
          <TabsTrigger value="trace">Trace</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <DsapiOverview
            snapshot={overviewSnapshot}
            chrome={chrome}
            onChromeChange={(partial) => setChrome((s) => ({ ...s, ...partial }))}
            filterCode={filterCode}
            onFilterCode={setFilterCode}
            latView={latView}
            onLatView={setLatView}
            onTrace={goTrace}
          />
        </TabsContent>
        <TabsContent value="submitters" className="mt-4">
          <DsapiSubmitters
            rows={snapshot.submitters}
            filterCode={filterCode}
            onClearCode={() => setFilterCode(null)}
            onLockSubmitter={(id) => {
              setChrome((s) => ({ ...s, submitterId: id }));
              setTab("overview");
            }}
          />
        </TabsContent>
        <TabsContent value="trace" className="mt-4 min-w-0">
          <DsapiTrace
            traces={snapshot.traces}
            initialQuery={traceQuery}
            onQueryConsumed={() => setTraceQuery("")}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
