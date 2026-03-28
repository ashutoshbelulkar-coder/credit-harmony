import { useQuery } from "@tanstack/react-query";
import type {
  AgentFleetItem,
  AnomalyItem,
  BatchPipelineRow,
  CommandCenterSnapshot,
  DashboardActivityItem,
  DashboardActivitySnapshot,
  DashboardCharts,
  DashboardMetrics,
  DashboardRange,
  DashboardSnapshot,
  MemberQualityPoint,
  TopInstitution,
} from "./dashboard-types";
import { dashboardRangeKey } from "./dashboard-types";
import { get, buildQuery } from "@/lib/api-client";
import {
  fetchDashboardActivity,
  fetchDashboardCommandCenter,
  type DashboardCommandCenterPayload,
} from "@/services/dashboard.service";
import { QK } from "@/lib/query-keys";

function metricsQueryParams(range: DashboardRange): Record<string, string> {
  if (range.kind === "preset") return { range: range.preset };
  return {
    range: "custom",
    from: range.from.toISOString().slice(0, 10),
    to: (range.to ?? new Date()).toISOString().slice(0, 10),
  };
}

async function fetchDashboardMetrics(range: DashboardRange): Promise<DashboardMetrics> {
  const raw = await get<Record<string, unknown>>(`/v1/dashboard/metrics${buildQuery(metricsQueryParams(range))}`);
  return {
    apiVolume24h: Number(raw.apiVolume24h ?? 0),
    apiVolumeChange: String(raw.apiVolumeChange ?? "—"),
    errorRate: Number(raw.errorRate ?? 0),
    errorRateChange: String(raw.errorRateChange ?? "—"),
    slaHealth: Number(raw.slaHealth ?? 0),
    slaHealthChange: String(raw.slaHealthChange ?? "—"),
    dataQualityScore: Number(raw.dataQualityScore ?? raw.dataQuality ?? 0),
    dataQualityChange: String(raw.dataQualityChange ?? "—"),
  };
}

async function fetchDashboardCharts(range: DashboardRange): Promise<DashboardCharts> {
  return get<DashboardCharts>(`/v1/dashboard/charts${buildQuery(metricsQueryParams(range))}`);
}

/** Compact label for enquiry counts (matches KPI-style “349K”). */
function formatEnquiryVolumeLabel(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  const v = Math.round(n);
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    const s = m >= 10 ? `${Math.round(m)}M` : `${Math.round(m * 10) / 10}M`;
    return s.replace(/\.0M$/, "M");
  }
  if (v >= 10_000) return `${Math.round(v / 1000)}K`;
  if (v >= 1_000) {
    const k = Math.round(v / 100) / 10;
    const s = `${k}K`;
    return s.replace(/\.0K$/, "K");
  }
  return String(v);
}

/**
 * Maps GET /dashboard/charts `topInstitutions` (DB-backed enquiry counts per institution).
 * Returns null if the payload has no `topInstitutions` key (legacy API).
 */
const AGENT_FLEET_TYPES = new Set<AgentFleetItem["type"]>([
  "ingestion",
  "schema",
  "quality",
  "compliance",
  "anomaly",
  "scoring",
  "orchestrator",
  "rag",
  "xai",
]);

function parseAgentFleetRow(row: Record<string, unknown>): AgentFleetItem | null {
  if (row.id == null || row.name == null) return null;
  const typeRaw = String(row.type ?? "orchestrator");
  const type = AGENT_FLEET_TYPES.has(typeRaw as AgentFleetItem["type"])
    ? (typeRaw as AgentFleetItem["type"])
    : "orchestrator";
  const st = String(row.status ?? "idle");
  const status = st === "active" || st === "warning" || st === "idle" ? st : "idle";
  return {
    id: String(row.id),
    name: String(row.name),
    type,
    status,
    task: String(row.task ?? ""),
    latencyMs: Number(row.latencyMs ?? 0),
    accuracyPct: Number(row.accuracyPct ?? 0),
  };
}

function parseBatchPipelineRow(row: Record<string, unknown>): BatchPipelineRow | null {
  if (row.id == null || row.member == null) return null;
  const statusRaw = String(row.status ?? "queued");
  const status: BatchPipelineRow["status"] =
    statusRaw === "processing" ||
    statusRaw === "completed" ||
    statusRaw === "error" ||
    statusRaw === "queued"
      ? statusRaw
      : "queued";
  const fmt = String(row.format ?? "TUDF");
  const format = fmt === "CSV" || fmt === "JSON" || fmt === "TUDF" ? fmt : "TUDF";
  const pr = String(row.priority ?? "normal");
  const priority: BatchPipelineRow["priority"] =
    pr === "low" || pr === "normal" || pr === "critical" ? pr : "normal";
  const q = row.quality;
  return {
    id: String(row.id),
    member: String(row.member),
    format,
    records: Number(row.records ?? 0),
    progress: Number(row.progress ?? 0),
    quality: q == null || q === "" ? null : Number(q),
    status,
    time: String(row.time ?? ""),
    priority,
  };
}

function parseAnomalyRow(row: Record<string, unknown>): AnomalyItem | null {
  if (row.id == null || row.title == null) return null;
  const sev = String(row.severity ?? "info");
  const severity = (["critical", "warning", "info"] as const).includes(sev as AnomalyItem["severity"])
    ? (sev as AnomalyItem["severity"])
    : "info";
  return {
    id: String(row.id),
    severity,
    title: String(row.title),
    description: String(row.description ?? ""),
    time: String(row.time ?? ""),
    detectedBy: String(row.detectedBy ?? "Alert Engine"),
    ctaLabel: String(row.ctaLabel ?? "Review"),
    href: String(row.href ?? "/monitoring/alert-engine"),
  };
}

function parseMemberQualityRow(row: Record<string, unknown>): MemberQualityPoint | null {
  if (row.member == null || row.period == null) return null;
  return {
    member: String(row.member),
    period: String(row.period),
    qualityScore: Number(row.qualityScore ?? 0),
    recordCount: Number(row.recordCount ?? 0),
    anomalyFlag: Boolean(row.anomalyFlag),
  };
}

function mergeCommandCenterSnapshot(
  base: CommandCenterSnapshot,
  cc: DashboardCommandCenterPayload
): CommandCenterSnapshot {
  const agents = Array.isArray(cc.agents)
    ? cc.agents
        .map((r) => parseAgentFleetRow(r as Record<string, unknown>))
        .filter((x): x is AgentFleetItem => x != null)
    : base.agents;
  const batches = Array.isArray(cc.batches)
    ? cc.batches
        .map((r) => parseBatchPipelineRow(r as Record<string, unknown>))
        .filter((x): x is BatchPipelineRow => x != null)
    : base.batches;
  const anomalies = Array.isArray(cc.anomalies)
    ? cc.anomalies
        .map((r) => parseAnomalyRow(r as Record<string, unknown>))
        .filter((x): x is AnomalyItem => x != null)
    : base.anomalies;
  const memberQuality = Array.isArray(cc.memberQuality)
    ? cc.memberQuality
        .map((r) => parseMemberQualityRow(r as Record<string, unknown>))
        .filter((x): x is MemberQualityPoint => x != null)
    : base.memberQuality;

  return { agents, batches, anomalies, memberQuality };
}

function normalizeDashboardCharts(charts: DashboardCharts): DashboardCharts {
  return {
    ...charts,
    mappingAccuracy: (charts.mappingAccuracy ?? []).map((p) => {
      const row = p as { week?: unknown; period?: unknown; accuracy?: unknown };
      return {
        week: String(row.week ?? row.period ?? ""),
        accuracy: Number(row.accuracy ?? 0),
      };
    }),
    matchConfidence: (charts.matchConfidence ?? []).map((p) => ({
      bucket: String((p as { bucket?: unknown }).bucket ?? ""),
      count: Number((p as { count?: unknown }).count ?? 0),
    })),
    rejectionOverride: (charts.rejectionOverride ?? []).map((p) => ({
      week: String((p as { week?: unknown }).week ?? ""),
      rejected: Number((p as { rejected?: unknown }).rejected ?? 0),
      overridden: Number((p as { overridden?: unknown }).overridden ?? 0),
    })),
  };
}

function topInstitutionsFromChartsPayload(charts: Record<string, unknown>): TopInstitution[] | null {
  if (!("topInstitutions" in charts)) return null;
  const raw = charts.topInstitutions;
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return [];
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    const count = Number(r.enquiryCount ?? r.requests ?? 0);
    return {
      name: String(r.name ?? "—"),
      requests: formatEnquiryVolumeLabel(count),
      quality: Math.round(Number(r.quality ?? 0)),
      sla: Math.round(Number(r.sla ?? 0) * 10) / 10,
    };
  });
}

const EMPTY_COMMAND_CENTER: CommandCenterSnapshot = {
  agents: [],
  batches: [],
  anomalies: [],
  memberQuality: [],
};

async function fetchDashboardSnapshot(range: DashboardRange): Promise<DashboardSnapshot> {
  const [metrics, chartsRaw] = await Promise.all([
    fetchDashboardMetrics(range),
    fetchDashboardCharts(range),
  ]);
  const charts = normalizeDashboardCharts(chartsRaw);

  const topParsed = topInstitutionsFromChartsPayload(charts as unknown as Record<string, unknown>);
  const topInstitutions = topParsed !== null ? topParsed : [];

  let liveActivity: DashboardActivitySnapshot = {
    recentActivity: [],
    topInstitutions,
  };
  let liveCommandCenter: CommandCenterSnapshot = { ...EMPTY_COMMAND_CENTER };

  try {
    const aux = Promise.all([fetchDashboardActivity(), fetchDashboardCommandCenter(range)]);
    const timeoutMs = 12_000;
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("dashboard-aux-timeout")), timeoutMs);
    });
    const [activityRows, ccData] = await Promise.race([aux, timeout]);

    liveActivity = {
      ...liveActivity,
      recentActivity: activityRows.slice(0, 10).map((r) => ({
        institution: r.userName ?? r.userEmail ?? "System",
        action: r.description ?? r.actionType,
        time: r.occurredAt,
        status: (r.auditOutcome === "success" ? "success" : r.auditOutcome === "failure" ? "warning" : "info") as DashboardActivityItem["status"],
      })),
    };

    liveCommandCenter = mergeCommandCenterSnapshot(EMPTY_COMMAND_CENTER, ccData);
  } catch {
    // Timeout or network — keep API-derived metrics/charts; activity/CC stay empty unless partially filled above
  }

  return {
    range,
    metrics,
    charts,
    activity: liveActivity,
    commandCenter: liveCommandCenter,
  };
}

export function useDashboardSnapshot(range: DashboardRange) {
  return useQuery({
    queryKey: ["dashboardSnapshot", dashboardRangeKey(range)],
    queryFn: () => fetchDashboardSnapshot(range),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}

export function useDashboardCommandCenter(range: DashboardRange = { kind: "preset", preset: "30d" }) {
  return useQuery({
    queryKey: [...QK.dashboard.commandCenter(), dashboardRangeKey(range)] as const,
    queryFn: () => fetchDashboardCommandCenter(range),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useDashboardActivity() {
  return useQuery({
    queryKey: QK.dashboard.activity(),
    queryFn: fetchDashboardActivity,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

