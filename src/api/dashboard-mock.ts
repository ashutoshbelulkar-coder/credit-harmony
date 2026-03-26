import type {
  AnomalyItem,
  BatchPipelineRow,
  CommandCenterSnapshot,
  DashboardActivitySnapshot,
  DashboardCharts,
  DashboardMetrics,
  DashboardRange,
  DashboardSnapshot,
  AgentFleetItem,
  MemberQualityPoint,
} from "./dashboard-types";
import { dashboardRangeKey } from "./dashboard-types";
import { mockAgents } from "@/data/agents-mock";

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

  const institutions = [
    "First National Bank",
    "Metro Credit Union",
    "Pacific Finance Corp",
    "Southern Trust Bank",
    "Gulf National Bank",
    "Axis Capital Partners",
    "Kotak Microfinance",
    "Yes Bank",
  ];

  const activity: DashboardActivitySnapshot = {
    recentActivity: [
      { institution: institutions[0], action: "API key rotated", time: "2 min ago", status: "info" },
      { institution: institutions[1], action: "Submission API enabled", time: "15 min ago", status: "success" },
      { institution: institutions[2], action: "SLA breach warning", time: "1 hour ago", status: "warning" },
      { institution: institutions[3], action: "Onboarding completed", time: "3 hours ago", status: "success" },
      { institution: institutions[0], action: "Bulk data upload", time: "5 hours ago", status: "info" },
    ],
    topInstitutions: [
      { name: institutions[0], requests: `${Math.round(300 + rand() * 220)}K`, quality: Math.round(clamp(dataQualityScore + rand() * 3, 80, 99)), sla: parseFloat(clamp(slaHealth + rand() * 0.2, 95, 100).toFixed(1)) },
      { name: institutions[1], requests: `${Math.round(180 + rand() * 160)}K`, quality: Math.round(clamp(dataQualityScore - 2 + rand() * 4, 75, 99)), sla: parseFloat(clamp(slaHealth - 0.2 + rand() * 0.3, 90, 100).toFixed(1)) },
      { name: institutions[2], requests: `${Math.round(120 + rand() * 120)}K`, quality: Math.round(clamp(dataQualityScore - 5 + rand() * 5, 70, 99)), sla: parseFloat(clamp(slaHealth - 0.6 + rand() * 0.6, 85, 100).toFixed(1)) },
      { name: institutions[3], requests: `${Math.round(90 + rand() * 110)}K`, quality: Math.round(clamp(dataQualityScore - 1 + rand() * 4, 75, 99)), sla: parseFloat(clamp(slaHealth - 0.1 + rand() * 0.3, 90, 100).toFixed(1)) },
    ],
  };

  const typeByAgentId: Record<string, AgentFleetItem["type"]> = {
    banking: "scoring",
    "bureau-operator": "orchestrator",
    "loan-underwriter": "scoring",
    "real-estate": "scoring",
    insurance: "compliance",
    employment: "compliance",
    utilities: "rag",
    automotive: "scoring",
    "b2b-trade": "scoring",
    self: "rag",
  };

  function taskFromAgent(a: (typeof mockAgents)[number]): string {
    const d = a.description.trim();
    if (d.length <= 96) return d;
    return `${d.slice(0, 93)}…`;
  }

  /** Pipeline / governance agents (names align with Monitoring & Data Governance modules). */
  const pipelineAgents: AgentFleetItem[] = [
    {
      id: "pipeline-ingestion",
      name: "Ingestion",
      type: "ingestion",
      status: rand() > 0.82 ? "warning" : "active",
      task: "Receiving and staging member data submissions (batch / API)",
      latencyMs: Math.round(8 + rand() * 14),
      accuracyPct: parseFloat(clamp(99 + rand() * 0.8, 0, 100).toFixed(1)),
    },
    {
      id: "pipeline-schema-mapper",
      name: "Schema Mapper",
      type: "schema",
      status: rand() > 0.88 ? "warning" : "active",
      task: "AI-assisted mapping to canonical bureau schema (Auto-Mapping Review)",
      latencyMs: Math.round(10 + rand() * 18),
      accuracyPct: parseFloat(clamp(97.5 + rand() * 1.8, 0, 100).toFixed(1)),
    },
    {
      id: "pipeline-data-validation",
      name: "Data Validation",
      type: "quality",
      status: rand() > 0.85 ? "warning" : "active",
      task: "Running validation rules and field checks against submissions",
      latencyMs: Math.round(6 + rand() * 12),
      accuracyPct: parseFloat(clamp(99.2 + rand() * 0.7, 0, 100).toFixed(1)),
    },
    {
      id: "pipeline-identity-resolution",
      name: "Identity Resolution",
      type: "orchestrator",
      status: rand() > 0.9 ? "warning" : "active",
      task: "Entity matching and match review queue (Identity Resolution)",
      latencyMs: Math.round(12 + rand() * 20),
      accuracyPct: parseFloat(clamp(97 + rand() * 2.2, 0, 100).toFixed(1)),
    },
  ];

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

  const formats = ["TUDF", "CSV", "JSON"] as const;
  const statuses = ["processing", "completed", "error", "queued"] as const;
  const batches: BatchPipelineRow[] = Array.from({ length: 6 }, (_, i) => {
    const status = statuses[Math.floor(rand() * statuses.length)];
    const progress = status === "completed" ? 100 : status === "queued" ? 0 : Math.round(15 + rand() * 80);
    const quality = status === "queued" ? null : parseFloat(clamp(dataQualityScore - 6 + rand() * 10, 80, 100).toFixed(1));
    const priority = rand() > 0.86 ? "critical" : rand() > 0.6 ? "normal" : "low";
    return {
      id: `BTC-${String(8800 + i).padStart(4, "0")}`,
      member: institutions[(i + 1) % institutions.length],
      format: formats[Math.floor(rand() * formats.length)],
      records: Math.round(50_000 + rand() * 280_000),
      progress,
      quality,
      status,
      time: `${Math.round(4 + rand() * 40)}m ago`,
      priority,
    };
  });

  const anomalies: AnomalyItem[] = [
    {
      id: "ANM-441",
      severity: rand() > 0.7 ? "critical" : "warning",
      title: "Volume spike detected",
      description: `${institutions[2]} submitted >200% above baseline. Review batch for quarantine.`,
      time: "8 min ago",
      detectedBy: "Bureau Operations Intelligence",
      ctaLabel: "Review Batch",
      href: "/monitoring/data-submission-batch",
    },
    {
      id: "ANM-440",
      severity: "critical",
      title: "Duplicate identifier pattern",
      description: "High duplication detected across concurrent submissions. Validate dedup rules and member payloads.",
      time: "14 min ago",
      detectedBy: "Bureau Operations Intelligence",
      ctaLabel: "Open Quality Monitoring",
      href: "/data-governance/data-quality-monitoring",
    },
    {
      id: "ANM-438",
      severity: "info",
      title: "Schema mapping change",
      description: "Unrecognized segment detected in submission payload. Review mapping coverage.",
      time: "42 min ago",
      detectedBy: "Bureau Operations Intelligence",
      ctaLabel: "Review Auto Mapping",
      href: "/data-governance/auto-mapping-review",
    },
  ];

  const members = [
    "HDFC",
    "SBI",
    "ICICI",
    "Axis",
    "Kotak",
    "Yes Bank",
    "PNB",
    "Bank of Baroda",
  ];
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

