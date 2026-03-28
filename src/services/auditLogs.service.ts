import { get, buildQuery, ApiError } from "@/lib/api-client";
import type { PagedResponse } from "./institutions.service";

const BASE = "/v1/audit-logs";
const USE_MOCK = import.meta.env.VITE_USE_MOCK_FALLBACK === "true";

export interface AuditLogEntry {
  id: number;
  userId?: number;
  userEmail?: string;
  actionType: string;
  entityType: string;
  entityId: string;
  description?: string;
  ipAddressHash?: string;
  auditOutcome: string;
  occurredAt: string;
}

export interface AuditLogParams {
  userId?: string | number;
  actionType?: string;
  entityType?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

function isNetworkOrServerError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.isServerError;
}

export async function fetchAuditLogs(params?: AuditLogParams): Promise<PagedResponse<AuditLogEntry>> {
  try {
    return await get<PagedResponse<AuditLogEntry>>(`${BASE}${buildQuery(params ?? {})}`);
  } catch (err) {
    if (USE_MOCK && isNetworkOrServerError(err)) {
      // Fall back to user-management mock activity logs
      const { mockActivity } = await import("@/data/user-management-mock");
      const list = (mockActivity ?? []).map((a, i) => ({
        id: i + 1,
        userEmail: a.userEmail ?? a.user,
        actionType: a.action ?? a.actionType ?? "UNKNOWN",
        entityType: a.entityType ?? "SYSTEM",
        entityId: a.entityId ?? String(i),
        description: a.description ?? a.details,
        auditOutcome: a.outcome ?? "SUCCESS",
        occurredAt: a.timestamp ?? a.time ?? new Date().toISOString(),
      })) as AuditLogEntry[];
      const page = params?.page ?? 0;
      const size = params?.size ?? 20;
      return { content: list.slice(page * size, (page + 1) * size), totalElements: list.length, totalPages: Math.max(1, Math.ceil(list.length / size)), page, size };
    }
    throw err;
  }
}
