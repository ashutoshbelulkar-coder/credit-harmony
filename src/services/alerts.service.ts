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

export interface SlaConfigResponse {
  id: string;
  name: string;
  domain: string;
  metrics: { metric: string; threshold: string; current: string; status: string }[];
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
    return await get<SlaConfigResponse[]>(BASE_SLA);
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) return mockSlaConfigs as SlaConfigResponse[];
    throw err;
  }
}

export async function updateSlaConfig(id: string, data: Partial<SlaConfigResponse>): Promise<SlaConfigResponse> {
  return patch<SlaConfigResponse>(`${BASE_SLA}/${id}`, data);
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
