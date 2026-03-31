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

/** Row shape from GET /v1/dashboard/charts `topInstitutions` (enquiry counts per institution). */
export type TopInstitutionChartRow = {
  name: string;
  enquiryCount: number;
  requests: number;
  quality: number;
  sla: number;
};

export type DashboardCharts = {
  apiUsageTrend: ApiUsageTrendPoint[];
  successFailure: { success: number; failure: number };
  mappingAccuracy: MappingAccuracyPoint[];
  matchConfidence: MatchConfidencePoint[];
  slaLatency: SlaLatencyPoint[];
  rejectionOverride: RejectionOverridePoint[];
  /** DB: COUNT(enquiries) by requesting institution for the selected range. */
  topInstitutions?: TopInstitutionChartRow[];
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

/** `requests` holds a compact formatted enquiry count label (e.g. "349K") from the API. */
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
  /** Ordered row labels: active institutions with data-submitter role (from API). */
  memberQualitySubmitters?: string[];
};

export function dashboardRangeKey(range: DashboardRange): string {
  if (range.kind === "preset") return range.preset;
  const from = range.from.toISOString().slice(0, 10);
  const to = range.to ? range.to.toISOString().slice(0, 10) : "open";
  return `custom:${from}:${to}`;
}

/** Calendar days represented by the range (for volume totals: longer window ⇒ higher counts). */
export function effectiveRangeDays(range: DashboardRange): number {
  if (range.kind === "preset") {
    switch (range.preset) {
      case "today":
        return 1;
      case "7d":
        return 7;
      case "30d":
        return 30;
      case "90d":
        return 90;
      default:
        return 30;
    }
  }
  const end = range.to ?? new Date();
  const ms = end.getTime() - range.from.getTime();
  return Math.max(1, Math.ceil(ms / 86_400_000));
}

/** KPI tile title for total API requests in the selected window. */
export function apiVolumeKpiTitle(range: DashboardRange): string {
  if (range.kind === "preset") {
    switch (range.preset) {
      case "today":
        return "API volume (today)";
      case "7d":
        return "API volume (last 7 days)";
      case "30d":
        return "API volume (last 30 days)";
      case "90d":
        return "API volume (last 90 days)";
      default:
        return "API volume";
    }
  }
  return "API volume (selected range)";
}

/** Footnote under KPI delta — matches comparison window to the selected range. */
export function apiVolumeComparisonLabel(range: DashboardRange): string {
  if (range.kind === "preset") {
    if (range.preset === "today") return "vs yesterday (same hours)";
    if (range.preset === "7d") return "vs prior 7 days";
    if (range.preset === "30d") return "vs prior 30 days";
    if (range.preset === "90d") return "vs prior 90 days";
  }
  return "vs prior period";
}

/** Short label for API usage chart header. */
export function apiUsageChartRangeDescription(range: DashboardRange): string {
  if (range.kind === "preset") {
    switch (range.preset) {
      case "today":
        return "Request volume and error rate for today";
      case "7d":
        return "Request volume and error rate across the last 7 days";
      case "30d":
        return "Request volume and error rate across the last 30 days";
      case "90d":
        return "Request volume and error rate across the last 90 days";
      default:
        return "Request volume and error rate";
    }
  }
  return "Request volume and error rate for the selected date range";
}

export function apiUsageChartHeading(range: DashboardRange): string {
  if (range.kind === "preset") {
    switch (range.preset) {
      case "today":
        return "API usage trend (today)";
      case "7d":
        return "API usage trend (7 days)";
      case "30d":
        return "API usage trend (30 days)";
      case "90d":
        return "API usage trend (90 days)";
      default:
        return "API usage trend";
    }
  }
  return "API usage trend";
}

