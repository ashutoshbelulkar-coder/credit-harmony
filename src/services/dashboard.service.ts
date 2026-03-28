import { get, buildQuery, ApiError } from "@/lib/api-client";

const BASE = "/v1/dashboard";
const USE_MOCK = import.meta.env.VITE_USE_MOCK_FALLBACK === "true";

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
    if (USE_MOCK && isNetworkOrServerError(err)) {
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

export interface DashboardCommandCenter {
  pendingApprovals: number;
  activeAlerts: number;
  pendingOnboarding: number;
  activeInstitutions: number;
  recentErrors1h: number;
}

export async function fetchDashboardCommandCenter(): Promise<DashboardCommandCenter> {
  return get<DashboardCommandCenter>(`${BASE}/command-center`);
}
