export type DashboardRangePreset = "today" | "7d" | "30d" | "90d";

export type DashboardRange =
  | { kind: "preset"; preset: DashboardRangePreset }
  | { kind: "custom"; from: Date; to?: Date };

export type DashboardMetrics = {
  apiVolume24h: number;
  apiVolumeChange: string;
  errorRate: number;
  errorRateChange: string;
  slaHealth: number;
  slaHealthChange: string;
  dataQualityScore: number;
  dataQualityChange: string;
};

export type ApiUsageTrendPoint = { day: string; volume: number; errors: number };
export type SlaLatencyPoint = { day: string; p95: number; p99: number };
export type MappingAccuracyPoint = { week: string; accuracy: number };
export type MatchConfidencePoint = { bucket: string; count: number };
export type RejectionOverridePoint = { week: string; rejected: number; overridden: number };

export type DashboardCharts = {
  apiUsageTrend: ApiUsageTrendPoint[];
  successFailure: { success: number; failure: number };
  mappingAccuracy: MappingAccuracyPoint[];
  matchConfidence: MatchConfidencePoint[];
  slaLatency: SlaLatencyPoint[];
  rejectionOverride: RejectionOverridePoint[];
};

export type DashboardSnapshot = {
  range: DashboardRange;
  metrics: DashboardMetrics;
  charts: DashboardCharts;
  activity: DashboardActivitySnapshot;
  commandCenter: CommandCenterSnapshot;
};

export type DashboardActivityStatus = "info" | "success" | "warning";

export type DashboardActivityItem = {
  institution: string;
  action: string;
  time: string;
  status: DashboardActivityStatus;
};

export type TopInstitution = {
  name: string;
  requests: string;
  quality: number;
  sla: number;
};

export type DashboardActivitySnapshot = {
  recentActivity: DashboardActivityItem[];
  topInstitutions: TopInstitution[];
};

export type AgentStatus = "active" | "warning" | "idle";

export type AgentFleetItem = {
  id: string;
  name: string;
  type: "ingestion" | "schema" | "quality" | "compliance" | "anomaly" | "scoring" | "orchestrator" | "rag" | "xai";
  status: AgentStatus;
  task: string;
  latencyMs: number;
  accuracyPct: number;
};

export type BatchStatus = "processing" | "completed" | "error" | "queued";

export type BatchPipelineRow = {
  id: string;
  member: string;
  format: "TUDF" | "CSV" | "JSON";
  records: number;
  progress: number;
  quality: number | null;
  status: BatchStatus;
  time: string;
  priority: "low" | "normal" | "critical";
};

export type AnomalySeverity = "critical" | "warning" | "info";

export type AnomalyItem = {
  id: string;
  severity: AnomalySeverity;
  title: string;
  description: string;
  time: string;
  detectedBy: string;
  ctaLabel: string;
  href: string;
};

export type MemberQualityPoint = {
  member: string;
  period: string;
  qualityScore: number;
  recordCount: number;
  anomalyFlag: boolean;
};

export type CommandCenterSnapshot = {
  agents: AgentFleetItem[];
  batches: BatchPipelineRow[];
  anomalies: AnomalyItem[];
  memberQuality: MemberQualityPoint[];
};

export function dashboardRangeKey(range: DashboardRange): string {
  if (range.kind === "preset") return range.preset;
  const from = range.from.toISOString().slice(0, 10);
  const to = range.to ? range.to.toISOString().slice(0, 10) : "open";
  return `custom:${from}:${to}`;
}

