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
import { dashboardRangeKey } from "./dashboard-types";
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
  if (job.status === "Queued") return "low";
  return "normal";
}

export function batchJobsToPipelineRows(jobs: BatchJob[]): BatchPipelineRow[] {
  const sorted = [...jobs].sort((a, b) => {
    const active = (s: MonitoringBatchStatus) => (s === "Queued" || s === "Processing" ? 0 : s === "Failed" ? 2 : 1);
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

export function createMockDashboardSnapshot(range: DashboardRange): DashboardSnapshot {
  const key = dashboardRangeKey(range);
  const rand = mulberry32(hashString(`hcb-dashboard:${key}`));

  // Base knobs (kept stable per range)
  const baseVolume = 900_000 + Math.floor(rand() * 600_000);
  const errorRate = clamp(0.15 + rand() * 0.25, 0.05, 1.5);
  const slaHealth = clamp(99.3 + rand() * 0.6, 95, 100);
  const dataQualityScore = clamp(92 + rand() * 6.5, 80, 100);

  const metrics: DashboardMetrics = {
    apiVolume24h: baseVolume,
    apiVolumeChange: fmtChange((rand() - 0.35) * 20),
    errorRate: parseFloat(errorRate.toFixed(2)),
    errorRateChange: fmtChange((rand() - 0.6) * 0.5),
    slaHealth: parseFloat(slaHealth.toFixed(1)),
    slaHealthChange: fmtChange((rand() - 0.45) * 0.4),
    dataQualityScore: parseFloat(dataQualityScore.toFixed(1)),
    dataQualityChange: fmtChange((rand() - 0.35) * 4),
  };

  // Keep charts aligned with the same base metrics.
  const apiUsageTrend = Array.from({ length: 7 }, (_, i) => {
    const label = i === 6 ? "Today" : `D-${(6 - i) * 5}`;
    const v = Math.round(baseVolume * (0.78 + rand() * 0.35));
    const e = clamp(errorRate + (rand() - 0.5) * 0.06, 0.05, 2.0);
    return { day: label, volume: v, errors: parseFloat(e.toFixed(2)) };
  });

  const charts: DashboardCharts = {
    apiUsageTrend,
    successFailure: {
      success: Math.round(clamp(100 - errorRate * 10 - rand() * 3, 85, 99)),
      failure: 0,
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
  charts.successFailure.failure = 100 - charts.successFailure.success;

  const institutions = dashboardData.institutions;

  const activity: DashboardActivitySnapshot = {
    recentActivity: dashboardData.recentActivity.map((row) => ({
      institution: institutions[row.institutionIndex],
      action: row.action,
      time: row.time,
      status: (row.status === "error" ? "warning" : row.status) as DashboardActivityStatus,
    })),
    topInstitutions: [
      { name: institutions[0], requests: `${Math.round(300 + rand() * 220)}K`, quality: Math.round(clamp(dataQualityScore + rand() * 3, 80, 99)), sla: parseFloat(clamp(slaHealth + rand() * 0.2, 95, 100).toFixed(1)) },
      { name: institutions[1], requests: `${Math.round(180 + rand() * 160)}K`, quality: Math.round(clamp(dataQualityScore - 2 + rand() * 4, 75, 99)), sla: parseFloat(clamp(slaHealth - 0.2 + rand() * 0.3, 90, 100).toFixed(1)) },
      { name: institutions[2], requests: `${Math.round(120 + rand() * 120)}K`, quality: Math.round(clamp(dataQualityScore - 5 + rand() * 5, 70, 99)), sla: parseFloat(clamp(slaHealth - 0.6 + rand() * 0.6, 85, 100).toFixed(1)) },
      { name: institutions[3], requests: `${Math.round(90 + rand() * 110)}K`, quality: Math.round(clamp(dataQualityScore - 1 + rand() * 4, 75, 99)), sla: parseFloat(clamp(slaHealth - 0.1 + rand() * 0.3, 90, 100).toFixed(1)) },
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

