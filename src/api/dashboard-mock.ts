import type {
  AnomalyItem,
  BatchPipelineRow,
  CommandCenterSnapshot,
  DashboardActivitySnapshot,
  DashboardActivityStatus,
  DashboardCharts,
  DashboardMetrics,
  DashboardRange,
  DashboardSnapshot,
  AgentFleetItem,
  MemberQualityPoint,
} from "./dashboard-types";
import { dashboardRangeKey, effectiveRangeDays } from "./dashboard-types";
import { mockAgents } from "@/data/agents-mock";
import dashboardData from "@/data/dashboard.json";
import { batchJobs, type BatchJob, type BatchStatus as MonitoringBatchStatus } from "@/data/monitoring-mock";
import { institutions } from "@/data/institutions-mock";
import { formatDistanceToNow } from "date-fns";

function formatFromFileName(fileName: string): BatchPipelineRow["format"] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".json")) return "JSON";
  if (lower.endsWith(".csv")) return "CSV";
  return "TUDF";
}

function mapMonitoringStatusToPipeline(s: MonitoringBatchStatus): BatchPipelineRow["status"] {
  switch (s) {
    case "Completed":
      return "completed";
    case "Processing":
      return "processing";
    case "Failed":
      return "error";
    case "Queued":
      return "queued";
    case "Suspended":
      return "processing";
    case "Cancelled":
      return "queued";
    default:
      return "processing";
  }
}

function memberNameForInstitution(institutionId: string): string {
  const inst = institutions.find((i) => i.id === institutionId);
  return inst ? (inst.tradingName ?? inst.name) : institutionId;
}

function parseUploaded(uploaded: string): Date {
  const iso = uploaded.includes("T") ? uploaded : uploaded.replace(" ", "T");
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function relativeUploaded(uploaded: string): string {
  try {
    return formatDistanceToNow(parseUploaded(uploaded), { addSuffix: true });
  } catch {
    return uploaded;
  }
}

function computeProgress(job: BatchJob): number {
  if (job.status === "Completed") return 100;
  if (job.status === "Cancelled") return 0;
  if (job.status === "Queued") return 0;
  if (job.total_records <= 0) return 0;
  if (job.status === "Failed") {
    return Math.min(100, Math.round((job.success / job.total_records) * 100));
  }
  return Math.min(100, Math.round((job.success / job.total_records) * 100));
}

function computeQuality(job: BatchJob): number | null {
  if (job.status === "Queued" && job.total_records === 0) return null;
  return parseFloat(job.success_rate.toFixed(1));
}

function priorityForJob(job: BatchJob): BatchPipelineRow["priority"] {
  if (job.status === "Failed") return "critical";
  if (job.status === "Queued" || job.status === "Cancelled") return "low";
  return "normal";
}

export function batchJobsToPipelineRows(jobs: BatchJob[]): BatchPipelineRow[] {
  const sorted = [...jobs].sort((a, b) => {
    const active = (s: MonitoringBatchStatus) =>
      s === "Queued" || s === "Processing" ? 0 : s === "Failed" ? 2 : s === "Cancelled" ? 1 : 1;
    const ra = active(a.status);
    const rb = active(b.status);
    if (ra !== rb) return ra - rb;
    return parseUploaded(b.uploaded).getTime() - parseUploaded(a.uploaded).getTime();
  });
  return sorted.map((job) => ({
    id: job.batch_id,
    member: memberNameForInstitution(job.institution_id),
    format: formatFromFileName(job.file_name),
    records: job.total_records,
    progress: computeProgress(job),
    quality: computeQuality(job),
    status: mapMonitoringStatusToPipeline(job.status),
    time: relativeUploaded(job.uploaded),
    priority: priorityForJob(job),
  }));
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? "+" : "-";
  return `${sign}${Math.abs(n).toFixed(1)}%`;
}

function trendBarCount(range: DashboardRange): number {
  if (range.kind === "preset") {
    switch (range.preset) {
      case "today":
        return 8;
      case "7d":
        return 7;
      case "30d":
        return 10;
      case "90d":
        return 12;
      default:
        return 7;
    }
  }
  const d = effectiveRangeDays(range);
  return Math.min(14, Math.max(5, Math.ceil(d / 7)));
}

function trendLabels(range: DashboardRange, barCount: number): string[] {
  if (range.kind === "preset" && range.preset === "today") {
    return Array.from({ length: barCount }, (_, i) => `${String(3 * i).padStart(2, "0")}h`);
  }
  if (range.kind === "preset" && range.preset === "7d") {
    return Array.from({ length: barCount }, (_, i) => (i === barCount - 1 ? "Today" : `D-${barCount - 1 - i}`));
  }
  if (range.kind === "preset" && (range.preset === "30d" || range.preset === "90d")) {
    const step = range.preset === "30d" ? 3 : 7;
    return Array.from({ length: barCount }, (_, i) =>
      i === barCount - 1 ? "Now" : `D-${(barCount - 1 - i) * step}`
    );
  }
  return Array.from({ length: barCount }, (_, i) => `P${i + 1}`);
}

export function createMockDashboardSnapshot(range: DashboardRange): DashboardSnapshot {
  const key = dashboardRangeKey(range);
  // Stable “daily run rate” so only the selected window length changes totals (longer ⇒ more requests).
  const stable = mulberry32(hashString("hcb-dashboard:stable-base"));
  const rand = mulberry32(hashString(`hcb-dashboard:${key}`));

  const periodDays = effectiveRangeDays(range);
  const dailyVolume = 880_000 + Math.floor(stable() * 520_000); // ~0.88–1.4M requests / day
  const windowJitter = 0.97 + rand() * 0.06;
  const totalApiVolume = Math.max(1, Math.round(dailyVolume * periodDays * windowJitter));

  const errorRate = clamp(0.15 + stable() * 0.25, 0.05, 1.5);
  const slaHealth = clamp(99.3 + stable() * 0.6, 95, 100);
  const dataQualityScore = clamp(92 + stable() * 6.5, 80, 100);

  const metrics: DashboardMetrics = {
    apiVolume24h: totalApiVolume,
    apiVolumeChange: fmtChange((rand() - 0.35) * 12),
    errorRate: parseFloat(errorRate.toFixed(2)),
    errorRateChange: fmtChange((rand() - 0.6) * 0.5),
    slaHealth: parseFloat(slaHealth.toFixed(1)),
    slaHealthChange: fmtChange((rand() - 0.45) * 0.4),
    dataQualityScore: parseFloat(dataQualityScore.toFixed(1)),
    dataQualityChange: fmtChange((rand() - 0.35) * 4),
  };

  const bars = trendBarCount(range);
  const labels = trendLabels(range, bars);
  const weights = Array.from({ length: bars }, () => 0.55 + rand() * 0.9);
  const wSum = weights.reduce((a, b) => a + b, 0);
  const apiUsageTrend = weights.map((w, i) => {
    const v = Math.round((totalApiVolume * w) / wSum);
    const e = clamp(errorRate + (rand() - 0.5) * 0.06, 0.05, 2.0);
    return { day: labels[i] ?? `S${i + 1}`, volume: v, errors: parseFloat(e.toFixed(2)) };
  });

  const failCount = Math.round((totalApiVolume * errorRate) / 100);
  const successCount = Math.max(0, totalApiVolume - failCount);

  const charts: DashboardCharts = {
    apiUsageTrend,
    successFailure: {
      success: successCount,
      failure: failCount,
    },
    mappingAccuracy: Array.from({ length: 5 }, (_, i) => ({
      week: `W${i + 1}`,
      accuracy: parseFloat(clamp(96.5 + rand() * 2.6, 90, 100).toFixed(1)),
    })),
    matchConfidence: [
      { bucket: "0–40", count: Math.round(rand() * 10) },
      { bucket: "40–60", count: Math.round(10 + rand() * 18) },
      { bucket: "60–75", count: Math.round(18 + rand() * 26) },
      { bucket: "75–90", count: Math.round(26 + rand() * 32) },
      { bucket: "90–100", count: Math.round(12 + rand() * 26) },
    ],
    slaLatency: Array.from({ length: 7 }, (_, i) => {
      const label = i === 6 ? "Today" : `D-${6 - i}`;
      const p95 = Math.round(220 + rand() * 80);
      const p99 = Math.round(p95 + 40 + rand() * 60);
      return { day: label, p95, p99 };
    }),
    rejectionOverride: Array.from({ length: 5 }, (_, i) => ({
      week: `W${i + 1}`,
      rejected: Math.round(90 + rand() * 70),
      overridden: Math.round(12 + rand() * 18),
    })),
  };

  const institutions = dashboardData.institutions;
  const topReqScale = periodDays / 30;

  const activity: DashboardActivitySnapshot = {
    recentActivity: dashboardData.recentActivity.map((row) => ({
      institution: institutions[row.institutionIndex],
      action: row.action,
      time: row.time,
      status: (row.status === "error" ? "warning" : row.status) as DashboardActivityStatus,
    })),
    // Synthetic top-by-enquiry counts when API is unavailable (matches live /charts topInstitutions semantics).
    topInstitutions: [
      { name: institutions[0], requests: `${Math.max(1, Math.round((300 + rand() * 220) * topReqScale))}K`, quality: Math.round(clamp(dataQualityScore + rand() * 3, 80, 99)), sla: parseFloat(clamp(slaHealth + rand() * 0.2, 95, 100).toFixed(1)) },
      { name: institutions[1], requests: `${Math.max(1, Math.round((180 + rand() * 160) * topReqScale))}K`, quality: Math.round(clamp(dataQualityScore - 2 + rand() * 4, 75, 99)), sla: parseFloat(clamp(slaHealth - 0.2 + rand() * 0.3, 90, 100).toFixed(1)) },
      { name: institutions[2], requests: `${Math.max(1, Math.round((120 + rand() * 120) * topReqScale))}K`, quality: Math.round(clamp(dataQualityScore - 5 + rand() * 5, 70, 99)), sla: parseFloat(clamp(slaHealth - 0.6 + rand() * 0.6, 85, 100).toFixed(1)) },
      { name: institutions[3], requests: `${Math.max(1, Math.round((90 + rand() * 110) * topReqScale))}K`, quality: Math.round(clamp(dataQualityScore - 1 + rand() * 4, 75, 99)), sla: parseFloat(clamp(slaHealth - 0.1 + rand() * 0.3, 90, 100).toFixed(1)) },
    ],
  };

  const typeByAgentId = dashboardData.agentTypeByAgentId as Record<string, AgentFleetItem["type"]>;

  function taskFromAgent(a: (typeof mockAgents)[number]): string {
    const d = a.description.trim();
    if (d.length <= 96) return d;
    return `${d.slice(0, 93)}…`;
  }

  /** Pipeline / governance agents — definitions from JSON, dynamic status/latency via seeded rand. */
  const pipelineAgents: AgentFleetItem[] = dashboardData.pipelineAgentDefinitions.map((def) => ({
    id: def.id,
    name: def.name,
    type: def.type as AgentFleetItem["type"],
    task: def.task,
    status: (rand() > 0.85 ? "warning" : "active") as AgentFleetItem["status"],
    latencyMs: Math.round(8 + rand() * 20),
    accuracyPct: parseFloat(clamp(97 + rand() * 2.5, 0, 100).toFixed(1)),
  }));

  const catalogAgents: AgentFleetItem[] = mockAgents.map((a, idx) => {
    const r = rand();
    const status: AgentFleetItem["status"] =
      r > 0.9 ? "warning" : r > 0.35 ? "active" : "idle";
    return {
      id: a.id,
      name: a.name,
      type: typeByAgentId[a.id] ?? (idx % 2 === 0 ? "scoring" : "orchestrator"),
      status,
      task: taskFromAgent(a),
      latencyMs: Math.round(6 + rand() * 28),
      accuracyPct: parseFloat(clamp(96 + rand() * 3.8, 0, 100).toFixed(1)),
    };
  });

  const agents: AgentFleetItem[] = [...pipelineAgents, ...catalogAgents];

  /** In-flight batches only — same records as Monitoring → Batch, filtered to `Processing` status. */
  const batches: BatchPipelineRow[] = batchJobsToPipelineRows(
    batchJobs.filter((j) => j.status === "Processing")
  );

  const anomalies: AnomalyItem[] = dashboardData.anomalies.map((a) => ({
    id: a.id,
    severity: (a.id === "ANM-441"
      ? rand() > 0.7 ? "critical" : "warning"
      : a.id === "ANM-440" ? "critical" : "info") as AnomalyItem["severity"],
    title: a.title,
    description: "descriptionTemplate" in a
      ? (a.descriptionTemplate as string).replace("{institution}", institutions[(a as { institutionIndex: number }).institutionIndex])
      : (a as { description: string }).description,
    time: a.time,
    detectedBy: a.detectedBy,
    ctaLabel: a.ctaLabel,
    href: a.href,
  }));

  const members = dashboardData.members;
  const periods = range.kind === "preset" && range.preset === "7d"
    ? ["D-6", "D-5", "D-4", "D-3", "D-2", "D-1", "Today"]
    : ["00h", "04h", "08h", "12h", "16h", "20h"];

  const memberQuality: MemberQualityPoint[] = [];
  members.forEach((m) => {
    periods.forEach((p) => {
      const score = parseFloat(clamp(dataQualityScore - 4 + rand() * 8, 85, 100).toFixed(1));
      const recordCount = Math.round(10_000 + rand() * 120_000);
      memberQuality.push({
        member: m,
        period: p,
        qualityScore: score,
        recordCount,
        anomalyFlag: score < 95,
      });
    });
  });

  const commandCenter: CommandCenterSnapshot = { agents, batches, anomalies, memberQuality };

  return { range, metrics, charts, activity, commandCenter };
}

