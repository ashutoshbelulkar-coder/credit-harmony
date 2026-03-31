import { get, buildQuery, ApiError } from "@/lib/api-client";
import { clientMockFallbackEnabled } from "@/lib/client-mock-fallback";
import type { PagedResponse } from "./institutions.service";

const BASE = "/v1/audit-logs";

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
  /** Present on some rows (e.g. governance actions tied to a member institution) */
  institutionId?: string;
}

export interface AuditLogParams {
  userId?: string | number;
  actionType?: string;
  entityType?: string;
  entityId?: string;
  institutionId?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

function isNetworkOrServerError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.isServerError;
}

export type FetchAuditLogsOptions = {
  /** When false, never use `mockActivity` (User Management Activity Log uses API-only when this is false). Default true. */
  allowMockFallback?: boolean;
};

export async function fetchAuditLogs(
  params?: AuditLogParams,
  options?: FetchAuditLogsOptions
): Promise<PagedResponse<AuditLogEntry>> {
  const allowMock = options?.allowMockFallback !== false;
  try {
    return await get<PagedResponse<AuditLogEntry>>(`${BASE}${buildQuery(params ?? {})}`);
  } catch (err) {
    if (allowMock && clientMockFallbackEnabled && isNetworkOrServerError(err)) {
      // Fall back to user-management mock activity logs
      const { mockActivity } = await import("@/data/user-management-mock");
      let list = (mockActivity ?? []).map((a, i) => ({
        id: i + 1,
        userEmail: a.userEmail ?? a.user,
        actionType: a.action ?? a.actionType ?? "UNKNOWN",
        entityType: a.entityType ?? "SYSTEM",
        entityId: a.entityId ?? String(i),
        description: a.description ?? a.details,
        auditOutcome: a.outcome ?? "SUCCESS",
        occurredAt: a.timestamp ?? a.time ?? new Date().toISOString(),
      })) as AuditLogEntry[];
      const inst = params?.institutionId;
      if (inst && inst !== "all") {
        const want = String(inst).replace(/\D/g, "");
        list = list.filter((row) => {
          const rowId = row.institutionId != null ? String(row.institutionId).replace(/\D/g, "") : "";
          return rowId !== "" && rowId === want;
        });
      }
      const page = params?.page ?? 0;
      const size = params?.size ?? 20;
      return { content: list.slice(page * size, (page + 1) * size), totalElements: list.length, totalPages: Math.max(1, Math.ceil(list.length / size)), page, size };
    }
    throw err;
  }
}
