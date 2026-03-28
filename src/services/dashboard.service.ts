import { get, buildQuery, ApiError } from "@/lib/api-client";
import { clientMockFallbackEnabled } from "@/lib/client-mock-fallback";
import type { DashboardRange } from "@/api/dashboard-types";

const BASE = "/v1/dashboard";

export interface DashboardMetrics {
  apiVolume24h: number;
  apiVolumeChange: string;
  errorRate: number;
  errorRateChange: string;
  slaHealth: number;
  slaHealthChange: string;
  dataQuality: number;
  dataQualityChange: string;
}

export interface DashboardCharts {
  successFailure: { success: number; failure: number };
  apiUsageTrend: { day: string; volume: number }[];
  mappingAccuracy: { period: string; accuracy: number }[];
  matchConfidence: { bucket: string; count: number }[];
  slaLatency: { day: string; p95: number; p99: number }[];
  topInstitutions: { name: string; requests: number; quality: number; sla: number }[];
}

function isNetworkOrServerError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.isServerError;
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  return get<DashboardMetrics>(`${BASE}/metrics`);
}

export async function fetchDashboardCharts(range: string): Promise<DashboardCharts> {
  return get<DashboardCharts>(`${BASE}/charts${buildQuery({ range })}`);
}

/**
 * Fetches both metrics and charts in parallel.
 * Falls back to mock data (via dashboard-mock.ts) when backend is unreachable.
 */
export async function fetchDashboardSnapshot(range: string) {
  try {
    const [metrics, charts] = await Promise.all([
      fetchDashboardMetrics(),
      fetchDashboardCharts(range),
    ]);
    return { metrics, charts };
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) {
      return null; // Caller falls back to createMockDashboardSnapshot
    }
    throw err;
  }
}

// ── Dashboard Activity ────────────────────────────────────────────────────────

export interface DashboardActivityRow {
  id: number;
  actionType: string;
  entityType: string;
  entityId: string;
  description: string;
  auditOutcome: string;
  occurredAt: string;
  userName: string;
  userEmail: string;
}

export async function fetchDashboardActivity(): Promise<DashboardActivityRow[]> {
  return get<DashboardActivityRow[]>(`${BASE}/activity`);
}

// ── Dashboard Command Center ──────────────────────────────────────────────────

export interface DashboardCommandCenterPayload {
  pendingApprovals: number;
  activeAlerts: number;
  pendingOnboarding: number;
  activeInstitutions: number;
  recentErrors1h: number;
  /** Fleet + pipeline + anomalies + member quality (DB-backed when backend supports them). */
  agents?: unknown[];
  batches?: unknown[];
  anomalies?: unknown[];
  memberQuality?: unknown[];
}

function commandCenterQueryParams(range: DashboardRange): Record<string, string> {
  if (range.kind === "preset") return { range: range.preset };
  return {
    range: "custom",
    from: range.from.toISOString().slice(0, 10),
    to: (range.to ?? new Date()).toISOString().slice(0, 10),
  };
}

export async function fetchDashboardCommandCenter(range: DashboardRange): Promise<DashboardCommandCenterPayload> {
  return get<DashboardCommandCenterPayload>(
    `${BASE}/command-center${buildQuery(commandCenterQueryParams(range))}`
  );
}
