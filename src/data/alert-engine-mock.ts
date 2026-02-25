/**
 * Mock data for Alert Engine & SLA Configurator (Monitoring subsection).
 */

export type SlaDomain = "Data Submission API" | "Batch Processing" | "Inquiry API";
export type SeverityLevel = "Info" | "Warning" | "Critical";
export type AlertStatus = "Active" | "Acknowledged" | "Resolved";
export type TimeWindow = "Real-time" | "5 min rolling" | "1 hour rolling" | "Daily";

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

export const slaConfigs: SlaConfig[] = [
  {
    id: "sla-api",
    name: "Data Submission API SLA",
    domain: "Data Submission API",
    metrics: [
      { metric: "Success Rate %", threshold: "≥ 99%", current: "98.2%", status: "Breach", operator: ">=", severity: "Warning", timeWindow: "1 hour rolling" },
      { metric: "P95 Latency", threshold: "≤ 500ms", current: "245ms", status: "Within SLA", operator: "<=", severity: "Critical", timeWindow: "5 min rolling" },
      { metric: "Rejection Rate", threshold: "≤ 2%", current: "1.8%", status: "Within SLA", operator: "<=", severity: "Warning", timeWindow: "Daily" },
      { metric: "API Availability", threshold: "≥ 99.9%", current: "99.95%", status: "Within SLA", operator: ">=", severity: "Critical", timeWindow: "Daily" },
    ],
  },
  {
    id: "sla-batch",
    name: "Batch Processing SLA",
    domain: "Batch Processing",
    metrics: [
      { metric: "Batch Success Rate", threshold: "≥ 95%", current: "92.1%", status: "Breach", operator: ">=", severity: "Critical", timeWindow: "Daily" },
      { metric: "Processing Duration Limit", threshold: "≤ 5 min", current: "2m 22s", status: "Within SLA", operator: "<=", severity: "Warning", timeWindow: "1 hour rolling" },
      { metric: "Failure Threshold", threshold: "≤ 10%", current: "7.9%", status: "Within SLA", operator: "<=", severity: "Critical", timeWindow: "Daily" },
      { metric: "Queue Backlog Limit", threshold: "≤ 50", current: "12", status: "Within SLA", operator: "<=", severity: "Warning", timeWindow: "Real-time" },
    ],
  },
  {
    id: "sla-inquiry",
    name: "Inquiry API SLA",
    domain: "Inquiry API",
    metrics: [
      { metric: "Enquiry Success Rate", threshold: "≥ 99%", current: "97.1%", status: "Breach", operator: ">=", severity: "Critical", timeWindow: "1 hour rolling" },
      { metric: "P95 Latency", threshold: "≤ 400ms", current: "420ms", status: "Breach", operator: "<=", severity: "Warning", timeWindow: "15 min" },
      { metric: "Rate Limit Breach Threshold", threshold: "≤ 5/hour", current: "3", status: "Within SLA", operator: "<=", severity: "Warning", timeWindow: "1 hour rolling" },
      { metric: "Alternate Data Latency", threshold: "≤ 1.5s", current: "1.2s", status: "Within SLA", operator: "<=", severity: "Warning", timeWindow: "5 min rolling" },
    ],
  },
];

export type AlertRuleDomain = "Submission API" | "Batch" | "Inquiry API" | "Schema Drift" | "Rate Limit Abuse";
export type RuleStatus = "Enabled" | "Disabled";

export interface AlertRule {
  id: string;
  name: string;
  domain: AlertRuleDomain;
  condition: string;
  severity: SeverityLevel;
  status: RuleStatus;
  lastTriggered: string | null;
}

export const alertRules: AlertRule[] = [
  { id: "rule-1", name: "API Success Rate Drop", domain: "Submission API", condition: "Success Rate < 95% for 15 min", severity: "Critical", status: "Enabled", lastTriggered: "2026-02-25 09:12:00" },
  { id: "rule-2", name: "P95 Latency Spike", domain: "Submission API", condition: "P95 latency > 800ms for 15 min", severity: "Warning", status: "Enabled", lastTriggered: "2026-02-24 14:30:00" },
  { id: "rule-3", name: "Batch Failure Rate", domain: "Batch", condition: "Failure % > 10% (daily)", severity: "Critical", status: "Enabled", lastTriggered: "2026-02-25 08:00:00" },
  { id: "rule-4", name: "Queue Backlog", domain: "Batch", condition: "Queue size > 50", severity: "Warning", status: "Enabled", lastTriggered: null },
  { id: "rule-5", name: "Enquiry Latency", domain: "Inquiry API", condition: "P95 > 400ms for 1 hour", severity: "Warning", status: "Enabled", lastTriggered: "2026-02-23 16:45:00" },
  { id: "rule-6", name: "Schema Drift Critical", domain: "Schema Drift", condition: "Drift Severity = Critical", severity: "Critical", status: "Enabled", lastTriggered: "2026-02-22 11:00:00" },
  { id: "rule-7", name: "Rate Limit Abuse", domain: "Rate Limit Abuse", condition: "Violations > 20/hour", severity: "Critical", status: "Disabled", lastTriggered: null },
];

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

export const activeAlerts: ActiveAlert[] = [
  { alert_id: "ALT-00921", domain: "Submission API", metric: "Success Rate", current_value: "94.2%", threshold: ">= 99%", severity: "Critical", triggered_at: "2026-02-25 10:45:00", status: "Active" },
  { alert_id: "ALT-00922", domain: "Batch", metric: "Batch Success Rate", current_value: "91.0%", threshold: ">= 95%", severity: "Critical", triggered_at: "2026-02-25 09:30:00", status: "Acknowledged" },
  { alert_id: "ALT-00923", domain: "Inquiry API", metric: "P95 Latency", current_value: "520ms", threshold: "<= 400ms", severity: "Warning", triggered_at: "2026-02-25 11:00:00", status: "Active" },
  { alert_id: "ALT-00924", domain: "Submission API", metric: "Rejection Rate", current_value: "2.1%", threshold: "<= 2%", severity: "Warning", triggered_at: "2026-02-25 08:15:00", status: "Resolved" },
];

export const alertsTriggeredOverTime = Array.from({ length: 14 }, (_, i) => ({
  day: `D-${13 - i}`,
  count: 2 + Math.floor(Math.random() * 8),
}));

export const alertsByDomain = [
  { domain: "Submission API", count: 12 },
  { domain: "Batch", count: 8 },
  { domain: "Inquiry API", count: 5 },
  { domain: "Schema Drift", count: 3 },
  { domain: "Rate Limit", count: 2 },
];

export const severityDistribution = [
  { name: "Critical", value: 35 },
  { name: "Warning", value: 52 },
  { name: "Info", value: 13 },
];

export const mttrTrendData = Array.from({ length: 14 }, (_, i) => ({
  day: `D-${13 - i}`,
  minutes: 15 + Math.floor(Math.random() * 45),
}));

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
  /** Institution id associated with the breach. */
  institution_id: string;
}

export const slaBreachHistory: SlaBreachRecord[] = [
  { id: "br-1", slaType: "Data Submission API", metric: "Success Rate %", threshold: "≥ 99%", breachValue: "96.2%", duration: "12 min", detectedAt: "2026-02-25 10:33:00", resolvedAt: "2026-02-25 10:45:00", status: "Resolved", severity: "Warning", institution_id: "1" },
  { id: "br-2", slaType: "Batch Processing", metric: "Batch Success Rate", threshold: "≥ 95%", breachValue: "91.0%", duration: "-", detectedAt: "2026-02-25 09:30:00", resolvedAt: null, status: "Open", severity: "Critical", institution_id: "2" },
  { id: "br-3", slaType: "Inquiry API", metric: "P95 Latency", threshold: "≤ 400ms", breachValue: "520ms", duration: "-", detectedAt: "2026-02-25 11:00:00", resolvedAt: null, status: "Open", severity: "Warning", institution_id: "4" },
  { id: "br-4", slaType: "Data Submission API", metric: "Rejection Rate", threshold: "≤ 2%", breachValue: "2.1%", duration: "8 min", detectedAt: "2026-02-25 08:15:00", resolvedAt: "2026-02-25 08:23:00", status: "Resolved", severity: "Warning", institution_id: "1" },
  { id: "br-5", slaType: "Inquiry API", metric: "Enquiry Success Rate", threshold: "≥ 99%", breachValue: "97.1%", duration: "45 min", detectedAt: "2026-02-24 16:00:00", resolvedAt: "2026-02-24 16:45:00", status: "Resolved", severity: "Critical", institution_id: "3" },
];

export type RemediationAction = "Pause ingestion" | "Auto-retry batch" | "Block API key" | "Reduce rate limit" | "Trigger failover";
export type RemediationDomain = "Data Submission API" | "Batch Processing" | "Inquiry API";

export interface RemediationSetting {
  domain: RemediationDomain;
  actions: { action: RemediationAction; enabled: boolean }[];
}

export const defaultRemediationSettings: RemediationSetting[] = [
  {
    domain: "Data Submission API",
    actions: [
      { action: "Pause ingestion", enabled: false },
      { action: "Block API key", enabled: true },
      { action: "Reduce rate limit", enabled: true },
      { action: "Trigger failover", enabled: false },
    ],
  },
  {
    domain: "Batch Processing",
    actions: [
      { action: "Pause ingestion", enabled: false },
      { action: "Auto-retry batch", enabled: true },
      { action: "Trigger failover", enabled: false },
    ],
  },
  {
    domain: "Inquiry API",
    actions: [
      { action: "Reduce rate limit", enabled: true },
      { action: "Block API key", enabled: false },
      { action: "Trigger failover", enabled: false },
    ],
  },
];

export const previewImpactBreachCount = Array.from({ length: 7 }, (_, i) => ({
  day: `Day ${7 - i}`,
  breaches: Math.floor(Math.random() * 5),
}));
