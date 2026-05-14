import { useQuery } from "@tanstack/react-query";
import { QK } from "@/lib/query-keys";
import {
  fetchApiRequests,
  fetchMonitoringKpis,
  fetchEnquiries,
  fetchMonitoringCharts,
  type ApiRequestListParams,
} from "@/services/monitoring.service";

export function useApiRequests(params?: ApiRequestListParams) {
  return useQuery({
    queryKey: QK.monitoring.apiRequests(params),
    queryFn: () => fetchApiRequests(params),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useMonitoringKpis() {
  return useQuery({
    queryKey: QK.monitoring.kpis(),
    queryFn: fetchMonitoringKpis,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useEnquiries(params?: ApiRequestListParams) {
  return useQuery({
    queryKey: QK.monitoring.enquiries(params),
    queryFn: () => fetchEnquiries(params),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useMonitoringCharts() {
  return useQuery({
    queryKey: ["monitoring", "charts"] as const,
    queryFn: fetchMonitoringCharts,
    staleTime: 60_000,
  });
}
