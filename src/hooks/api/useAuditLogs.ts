import { useQuery } from "@tanstack/react-query";
import { QK } from "@/lib/query-keys";
import { fetchAuditLogs, type AuditLogParams } from "@/services/auditLogs.service";

export function useAuditLogs(params?: AuditLogParams) {
  return useQuery({
    queryKey: QK.auditLogs.list(params),
    queryFn: () => fetchAuditLogs(params),
  });
}
