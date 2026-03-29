import { parseTimestamp } from "./calc/dateFilter";

/** Row shape for `apiSubmissionRequests` in monitoring.json / Fastify state (snake_case). */
export interface ApiSubmissionRequestRow {
  request_id: string;
  api_key: string;
  endpoint: string;
  status: "Success" | "Failed" | "Partial" | "Rate Limited";
  response_time_ms: number;
  records: number;
  error_code: string | null;
  timestamp: string;
}

const API_KEYS = ["sk_live_***7x2k", "sk_live_***9a1m", "sk_live_***3b4n"] as const;
const ENDPOINTS = ["/submission", "/submission/bulk"] as const;

const STATUS_CYCLE: Array<{
  status: ApiSubmissionRequestRow["status"];
  error_code: string | null;
  records: number;
  response_time_ms: number;
}> = [
  { status: "Success", error_code: null, records: 1120, response_time_ms: 155 },
  { status: "Success", error_code: null, records: 890, response_time_ms: 142 },
  { status: "Failed", error_code: "INVALID_SCHEMA", records: 0, response_time_ms: 205 },
  { status: "Partial", error_code: "MISSING_MANDATORY_FIELD", records: 1200, response_time_ms: 3100 },
  { status: "Rate Limited", error_code: "RATE_LIMIT_EXCEEDED", records: 0, response_time_ms: 72 },
  { status: "Failed", error_code: "AUTHENTICATION_FAILURE", records: 0, response_time_ms: 48 },
  { status: "Success", error_code: null, records: 2100, response_time_ms: 198 },
  { status: "Failed", error_code: "SCHEMA_VERSION_MISMATCH", records: 0, response_time_ms: 290 },
  { status: "Success", error_code: null, records: 640, response_time_ms: 128 },
  { status: "Partial", error_code: "DUPLICATE_RECORDS", records: 1800, response_time_ms: 2750 },
];

function formatTs(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19);
}

function normaliseSeedRow(r: Record<string, unknown>): ApiSubmissionRequestRow | null {
  const request_id = r.request_id != null ? String(r.request_id) : "";
  if (!request_id) return null;
  const status = String(r.status) as ApiSubmissionRequestRow["status"];
  const allowed: ApiSubmissionRequestRow["status"][] = ["Success", "Failed", "Partial", "Rate Limited"];
  if (!allowed.includes(status)) return null;
  return {
    request_id,
    api_key: String(r.api_key ?? ""),
    endpoint: String(r.endpoint ?? "/submission"),
    status,
    response_time_ms: Number(r.response_time_ms ?? 0),
    records: Number(r.records ?? 0),
    error_code: r.error_code != null && String(r.error_code).length > 0 ? String(r.error_code) : null,
    timestamp: String(r.timestamp ?? ""),
  };
}

/**
 * Merges JSON seed rows with synthetic rows so dev always has:
 * - recent history (last 24h, every 30m) for time-range filters
 * - timestamps in the past spanning ~90 days so dashboard range filters behave intuitively
 */
export function buildApiSubmissionRequests(
  seed: ReadonlyArray<Record<string, unknown>>,
  nowMs: number = Date.now()
): ApiSubmissionRequestRow[] {
  const rows: ApiSubmissionRequestRow[] = [];
  for (const r of seed) {
    const row = normaliseSeedRow(r);
    if (row) rows.push(row);
  }

  let seq = 920000;

  for (let i = 0; i < 48; i++) {
    const t = nowMs - i * 30 * 60 * 1000;
    const def = STATUS_CYCLE[i % STATUS_CYCLE.length];
    rows.push({
      request_id: `REQ-${seq++}`,
      api_key: API_KEYS[i % API_KEYS.length],
      endpoint: ENDPOINTS[i % ENDPOINTS.length],
      status: def.status,
      response_time_ms: def.response_time_ms + (i % 17) * 3,
      records: def.records,
      error_code: def.error_code,
      timestamp: formatTs(new Date(t)),
    });
  }

  for (let day = 1; day <= 90; day++) {
    for (let slot = 0; slot < 4; slot++) {
      const off =
        day * 86_400_000 + slot * 150 * 60 * 1000 + ((slot * 37 + day * 11) % 1000) * 1000;
      const t = nowMs - off;
      const idx = (day * 4 + slot) % STATUS_CYCLE.length;
      const def = STATUS_CYCLE[idx];
      rows.push({
        request_id: `REQ-${seq++}`,
        api_key: API_KEYS[(day + slot) % API_KEYS.length],
        endpoint: ENDPOINTS[(day + slot) % ENDPOINTS.length],
        status: def.status,
        response_time_ms: def.response_time_ms + ((day + slot) % 23) * 5,
        records: def.records,
        error_code: def.error_code,
        timestamp: formatTs(new Date(t)),
      });
    }
  }

  rows.sort((a, b) => {
    const tA = parseTimestamp(a.timestamp)?.getTime() ?? 0;
    const tB = parseTimestamp(b.timestamp)?.getTime() ?? 0;
    return tB - tA;
  });

  return rows;
}
