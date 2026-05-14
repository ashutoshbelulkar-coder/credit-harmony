import { get, post, patch, del, buildQuery, ApiError } from "@/lib/api-client";
import {
  alertRules as mockRules,
  activeAlerts as mockActiveAlerts,
  slaBreachHistory as mockBreachHistory,
  slaConfigs as mockSlaConfigs,
  alertsTriggeredOverTime as mockTriggeredOverTime,
  alertsByDomain as mockByDomain,
  severityDistribution as mockSeverityDist,
  mttrTrendData as mockMttr,
} from "@/data/alert-engine-mock";
import { clientMockFallbackEnabled } from "@/lib/client-mock-fallback";

const BASE_RULES = "/v1/alert-rules";
const BASE_INCIDENTS = "/v1/alert-incidents";
const BASE_SLA = "/v1/sla-configs";

import type { PagedResponse } from "./institutions.service";

export interface AlertRuleResponse {
  id: string;
  name: string;
  domain: string;
  condition: string;
  severity: string;
  status: string;
  lastTriggered?: string | null;
}

export interface AlertIncidentResponse {
  alertId: string;
  domain: string;
  metric: string;
  currentValue: string;
  threshold: string;
  severity: string;
  triggeredAt: string;
  status: string;
}

export interface SlaMetricApiRow {
  metric: string;
  threshold: string;
  current: string;
  status: string;
  configRowId?: string;
  operator?: string;
  severity?: string;
  timeWindow?: string;
}

export interface SlaConfigResponse {
  id: string;
  name: string;
  domain: string;
  metrics: SlaMetricApiRow[];
}

export interface AlertCharts {
  triggeredOverTime: { day: string; count: number }[];
  byDomain: { domain: string; count: number }[];
  severityDistribution: { name: string; value: number }[];
  mttrTrend: { day: string; minutes: number }[];
}

export interface BreachRecord {
  id: string;
  slaType: string;
  metric: string;
  threshold: string;
  breachValue: string;
  duration: string;
  detectedAt: string;
  resolvedAt: string | null;
  status: string;
  severity: string;
  institutionId?: string;
}

function isNetworkOrServerError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.isServerError;
}

function isPlainRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/** Spring GET /sla-configs returns one map per DB row; UI expects configs grouped with `metrics[]`. */
function normaliseSlaConfigsPayload(raw: unknown): SlaConfigResponse[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return mockSlaConfigs as SlaConfigResponse[];
  }
  const first = raw[0];
  if (
    isPlainRecord(first) &&
    Array.isArray(first.metrics) &&
    first.metrics.every((m) => isPlainRecord(m) && typeof m.metric === "string")
  ) {
    return raw as SlaConfigResponse[];
  }

  const rows = raw.filter(isPlainRecord);
  const byDomain = new Map<string, Record<string, unknown>[]>();
  for (const r of rows) {
    const domain =
      String(r.sla_domain ?? r.slaDomain ?? "").trim() ||
      String(r.domain ?? "").trim();
    if (!domain) continue;
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain)!.push(r);
  }

  const out: SlaConfigResponse[] = [];
  for (const [domain, domainRows] of byDomain) {
    domainRows.sort((a, b) => {
      const na = Number(a.id);
      const nb = Number(b.id);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return String(a.id ?? "").localeCompare(String(b.id ?? ""));
    });
    const metrics: SlaMetricApiRow[] = domainRows.map((r) => {
      const op = String(r.threshold_operator ?? r.thresholdOperator ?? ">=");
      const valRaw = r.threshold_value ?? r.thresholdValue;
      const val = valRaw != null && valRaw !== "" ? String(valRaw) : "";
      const unit = r.threshold_unit != null && r.threshold_unit !== "" ? String(r.threshold_unit) : "";
      const metric = String(r.metric_name ?? r.metricName ?? "Metric");
      const sym = op === ">=" ? "≥" : op === "<=" ? "≤" : op;
      const threshold = `${sym} ${val}${unit}`;
      const sevRaw = String(r.severity_level ?? r.severityLevel ?? "WARNING").toLowerCase();
      const severityLabel =
        sevRaw === "critical" ? "Critical" : sevRaw === "info" ? "Info" : "Warning";
      const tw = String(r.time_window_description ?? r.timeWindowDescription ?? "");
      return {
        metric,
        threshold,
        current: "—",
        status: "Within SLA",
        operator: op,
        severity: severityLabel,
        timeWindow: tw || undefined,
        configRowId: String(r.id ?? ""),
      };
    });
    const slug = domain.toLowerCase().replace(/\s+/g, "-");
    out.push({
      id: slug,
      name: `${domain} SLA`,
      domain,
      metrics,
    });
  }
  return out.length > 0 ? out : (mockSlaConfigs as SlaConfigResponse[]);
}

// ─── Alert Rules ──────────────────────────────────────────────────────────────

export async function fetchAlertRules(): Promise<AlertRuleResponse[]> {
  try {
    return await get<AlertRuleResponse[]>(BASE_RULES);
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) return mockRules as AlertRuleResponse[];
    throw err;
  }
}

export async function createAlertRule(data: Partial<AlertRuleResponse>): Promise<AlertRuleResponse> {
  return post<AlertRuleResponse>(BASE_RULES, data);
}

export async function updateAlertRule(id: string, data: Partial<AlertRuleResponse>): Promise<AlertRuleResponse> {
  return patch<AlertRuleResponse>(`${BASE_RULES}/${id}`, data);
}

export async function deleteAlertRule(id: string): Promise<void> {
  return del(`${BASE_RULES}/${id}`);
}

export async function activateAlertRule(id: string): Promise<void> {
  return post(`${BASE_RULES}/${id}/activate`);
}

export async function deactivateAlertRule(id: string): Promise<void> {
  return post(`${BASE_RULES}/${id}/deactivate`);
}

// ─── Alert Incidents ──────────────────────────────────────────────────────────

export async function fetchAlertIncidents(params?: { status?: string; page?: number; size?: number }): Promise<PagedResponse<AlertIncidentResponse>> {
  try {
    return await get<PagedResponse<AlertIncidentResponse>>(`${BASE_INCIDENTS}${buildQuery(params ?? {})}`);
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) {
      const list = mockActiveAlerts.map((a) => ({
        alertId: a.alert_id,
        domain: a.domain,
        metric: a.metric,
        currentValue: a.current_value,
        threshold: a.threshold,
        severity: a.severity,
        triggeredAt: a.triggered_at,
        status: a.status,
      }));
      return { content: list, totalElements: list.length, totalPages: 1, page: 0, size: list.length };
    }
    throw err;
  }
}

export async function acknowledgeIncident(id: string): Promise<void> {
  return post(`${BASE_INCIDENTS}/${id}/acknowledge`);
}

export async function resolveIncident(id: string): Promise<void> {
  return post(`${BASE_INCIDENTS}/${id}/resolve`);
}

// ─── SLA Configs ──────────────────────────────────────────────────────────────

export async function fetchSlaConfigs(): Promise<SlaConfigResponse[]> {
  try {
    const raw = await get<unknown>(BASE_SLA);
    return normaliseSlaConfigsPayload(raw);
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) return mockSlaConfigs as SlaConfigResponse[];
    throw err;
  }
}

/** Spring PATCH accepts `{ thresholdValue }` only (see `SlaConfigController`). */
export async function updateSlaConfig(id: string, data: { thresholdValue: number | string }): Promise<void> {
  await patch<void>(`${BASE_SLA}/${id}`, { thresholdValue: data.thresholdValue });
}

// ─── Charts & History ────────────────────────────────────────────────────────

export async function fetchAlertCharts(): Promise<AlertCharts> {
  try {
    return await get<AlertCharts>("/v1/alert-incidents/charts");
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) {
      return {
        triggeredOverTime: mockTriggeredOverTime,
        byDomain: mockByDomain,
        severityDistribution: mockSeverityDist,
        mttrTrend: mockMttr,
      };
    }
    throw err;
  }
}

export async function fetchBreachHistory(params?: { domain?: string; severity?: string; dateFrom?: string; dateTo?: string }): Promise<BreachRecord[]> {
  try {
    return await get<BreachRecord[]>(`/v1/alert-incidents/breach-history${buildQuery(params ?? {})}`);
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) return mockBreachHistory as BreachRecord[];
    throw err;
  }
}
