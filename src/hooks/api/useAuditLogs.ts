import { useQuery } from "@tanstack/react-query";
import { QK } from "@/lib/query-keys";
import {
  fetchAuditLogs,
  type AuditLogParams,
  type FetchAuditLogsOptions,
} from "@/services/auditLogs.service";

export function useAuditLogs(params?: AuditLogParams, options?: FetchAuditLogsOptions) {
  return useQuery({
    queryKey: [...QK.auditLogs.list(params), options?.allowMockFallback ?? true] as const,
    queryFn: () => fetchAuditLogs(params, options),
  });
}
