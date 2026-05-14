import { get, buildQuery, ApiError } from "@/lib/api-client";
import { clientMockFallbackEnabled } from "@/lib/client-mock-fallback";
import { driftAlerts } from "@/data/data-governance-mock";
import { schemaRegistryEntries } from "@/data/schema-mapper-mock";
import { isWithinDateRange } from "@/lib/calc/dateFilter";
import type { DriftAlert } from "@/types/data-governance";

const BASE = "/v1/data-ingestion";

export interface DriftAlertsParams {
  dateFrom?: string;
  dateTo?: string;
  sourceType?: string;
}

export interface DriftAlertsResponse {
  alerts: DriftAlert[];
  requestId?: string;
}

function isNetworkOrServerError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.isServerError || err.status === 408;
}

function filterMockDriftAlerts(params: DriftAlertsParams): DriftAlert[] {
  const dateFrom = params.dateFrom ?? "";
  const dateTo = params.dateTo ?? "";
  const sourceType = params.sourceType ?? "all";
  const namesBySourceType = new Map<string, Set<string>>();
  for (const e of schemaRegistryEntries) {
    if (!namesBySourceType.has(e.sourceType)) namesBySourceType.set(e.sourceType, new Set());
    namesBySourceType.get(e.sourceType)!.add(e.sourceName.toLowerCase());
  }
  return driftAlerts.filter((d) => {
    if (!isWithinDateRange(d.timestamp, dateFrom, dateTo)) return false;
    if (sourceType === "all") return true;
    const names = namesBySourceType.get(sourceType);
    if (!names || names.size === 0) return true;
    const src = d.source.toLowerCase();
    return [...names].some((n) => src.includes(n) || n.includes(src));
  });
}

export async function fetchDriftAlerts(
  params: DriftAlertsParams,
  options?: { allowMockFallback?: boolean }
): Promise<DriftAlertsResponse> {
  const allowMockFallback = options?.allowMockFallback !== false;
  try {
    return await get<DriftAlertsResponse>(`${BASE}/drift-alerts${buildQuery(params)}`);
  } catch (err) {
    if (allowMockFallback && clientMockFallbackEnabled && isNetworkOrServerError(err)) {
      return { alerts: filterMockDriftAlerts(params) };
    }
    throw err;
  }
}
