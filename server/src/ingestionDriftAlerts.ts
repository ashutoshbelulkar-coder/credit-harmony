import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { isWithinDateRange } from "../../src/lib/calc/dateFilter.ts";
import type { AppState } from "./state.js";

export type IngestionDriftAlert = {
  id: string;
  type: "schema" | "mapping";
  source: string;
  message: string;
  timestamp: string;
  severity: "low" | "medium" | "high";
};

function namesForSourceType(state: AppState, sourceType: string): Set<string> | null {
  if (!sourceType || sourceType === "all") return null;
  const set = new Set<string>();
  for (const r of state.schemaMapper.schemaRegistry) {
    if (r.sourceType === sourceType) set.add(String(r.sourceName).toLowerCase());
  }
  return set;
}

function alertMatchesSourceNames(sourceLabel: string, names: Set<string>): boolean {
  const src = sourceLabel.toLowerCase();
  return [...names].some((n) => src.includes(n) || n.includes(src));
}

export function appendIngestionDriftAlert(
  state: AppState,
  row: Omit<IngestionDriftAlert, "id" | "timestamp"> & Partial<Pick<IngestionDriftAlert, "id" | "timestamp">>
): string {
  const id = row.id ?? `drift_${randomUUID().slice(0, 10)}`;
  const timestamp = row.timestamp ?? new Date().toISOString();
  state.ingestionDriftAlerts.unshift({
    id,
    type: row.type,
    source: row.source,
    message: row.message,
    severity: row.severity,
    timestamp,
  });
  return id;
}

export function filterIngestionDriftAlerts(
  state: AppState,
  q: { dateFrom?: string; dateTo?: string; sourceType?: string }
): IngestionDriftAlert[] {
  const dateFrom = q.dateFrom ?? "";
  const dateTo = q.dateTo ?? "";
  const sourceType = q.sourceType ?? "all";
  let list = state.ingestionDriftAlerts.filter((a) => isWithinDateRange(a.timestamp, dateFrom, dateTo));
  if (sourceType !== "all") {
    const names = namesForSourceType(state, sourceType);
    if (names && names.size > 0) {
      list = list.filter((a) => alertMatchesSourceNames(a.source, names));
    }
  }
  return list;
}

export function registerDataIngestionRoutes(
  app: FastifyInstance,
  state: AppState,
  authPreHandler: (req: any, reply: any, done: (e?: Error) => void) => void
) {
  const base = "/api/v1/data-ingestion";

  app.get(`${base}/drift-alerts`, { preHandler: authPreHandler }, async (req) => {
    const q = req.query as Record<string, string | undefined>;
    const alerts = filterIngestionDriftAlerts(state, {
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
      sourceType: q.sourceType,
    });
    return { alerts, requestId: randomUUID() };
  });
}
