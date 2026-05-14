import { useQuery } from "@tanstack/react-query";
import { QK } from "@/lib/query-keys";
import { fetchDriftAlerts, type DriftAlertsParams } from "@/services/data-ingestion.service";

export function useDriftAlerts(
  params: DriftAlertsParams,
  options?: { enabled?: boolean; allowMockFallback?: boolean }
) {
  const allowMockFallback = options?.allowMockFallback !== false;
  return useQuery({
    queryKey: QK.dataIngestion.driftAlerts({ ...params, allowMockFallback }),
    queryFn: () => fetchDriftAlerts(params, { allowMockFallback }),
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });
}
