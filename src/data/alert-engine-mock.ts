import data from "./alert-engine.json";

export type SlaDomain = "Data Submission API" | "Batch Processing" | "Inquiry API";
export type SeverityLevel = "Info" | "Warning" | "Critical";
export type AlertStatus = "Active" | "Acknowledged" | "Resolved";
export type TimeWindow = "Real-time" | "5 min rolling" | "1 hour rolling" | "Daily";
export type AlertRuleDomain = "Submission API" | "Batch" | "Inquiry API" | "Schema Drift" | "Rate Limit Abuse";
export type RuleStatus = "Enabled" | "Disabled";
export type RemediationAction = "Pause ingestion" | "Auto-retry batch" | "Block API key" | "Reduce rate limit" | "Trigger failover";
export type RemediationDomain = "Data Submission API" | "Batch Processing" | "Inquiry API";

export interface SlaMetricRow {
  metric: string;
  threshold: string;
  current: string;
  status: "Within SLA" | "Breach";
  operator?: ">=" | "<=" | "<" | ">";
  severity?: SeverityLevel;
  timeWindow?: TimeWindow;
}

export interface SlaConfig {
  id: string;
  name: string;
  domain: SlaDomain;
  metrics: SlaMetricRow[];
}

export interface AlertRule {
  id: string;
  name: string;
  domain: AlertRuleDomain;
  condition: string;
  severity: SeverityLevel;
  status: RuleStatus;
  lastTriggered: string | null;
}

export interface ActiveAlert {
  alert_id: string;
  domain: string;
  metric: string;
  current_value: string;
  threshold: string;
  severity: SeverityLevel;
  triggered_at: string;
  status: AlertStatus;
}

export interface SlaBreachRecord {
  id: string;
  slaType: string;
  metric: string;
  threshold: string;
  breachValue: string;
  duration: string;
  detectedAt: string;
  resolvedAt: string | null;
  status: "Open" | "Resolved";
  severity: SeverityLevel;
  institution_id: string;
}

export interface RemediationSetting {
  domain: RemediationDomain;
  actions: { action: RemediationAction; enabled: boolean }[];
}

export const slaConfigs = data.slaConfigs as SlaConfig[];
export const alertRules = data.alertRules as AlertRule[];
export const activeAlerts = data.activeAlerts as ActiveAlert[];
export const alertsTriggeredOverTime = data.alertsTriggeredOverTime as { day: string; count: number }[];
export const alertsByDomain = data.alertsByDomain as { domain: string; count: number }[];
export const severityDistribution = data.severityDistribution as { name: string; value: number }[];
export const mttrTrendData = data.mttrTrendData as { day: string; minutes: number }[];
export const slaBreachHistory = data.slaBreachHistory as SlaBreachRecord[];
export const defaultRemediationSettings = data.remediationSettings as RemediationSetting[];
export const previewImpactBreachCount = data.previewImpactBreachCount as { day: string; breaches: number }[];
export const aiAgents = data.aiAgents as { id: string; label: string }[];
export const defaultEmailBodyHtml = data.defaultEmailBodyHtml as string;
