import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QK } from "@/lib/query-keys";
import { ApiError } from "@/lib/api-client";
import {
  fetchBatchJobs,
  fetchBatchJobById,
  fetchBatchDetail,
  fetchBatchKpis,
  retryBatchJob,
  cancelBatchJob,
  type BatchJobParams,
} from "@/services/batchJobs.service";

export function useBatchJobs(params?: BatchJobParams) {
  return useQuery({
    queryKey: QK.monitoring.batchJobs(params),
    queryFn: () => fetchBatchJobs(params),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useBatchJob(id: string | undefined) {
  return useQuery({
    queryKey: QK.monitoring.batchJob(id ?? ""),
    queryFn: () => fetchBatchJobById(id!),
    enabled: !!id,
  });
}

export function useBatchDetail(id: string | undefined) {
  return useQuery({
    queryKey: [...QK.monitoring.batchJob(id ?? ""), "detail"] as const,
    queryFn: () => fetchBatchDetail(id!),
    enabled: !!id,
  });
}

export function useBatchKpis() {
  return useQuery({
    queryKey: ["monitoring", "batch-kpis"] as const,
    queryFn: fetchBatchKpis,
    staleTime: 30_000,
  });
}

export function useRetryBatchJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => retryBatchJob(id),
    onSuccess: (_, id) => { qc.invalidateQueries({ queryKey: QK.monitoring.batchJob(id) }); toast.success("Batch job queued for retry"); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useCancelBatchJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelBatchJob(id),
    onSuccess: (_, id) => { qc.invalidateQueries({ queryKey: QK.monitoring.batchJob(id) }); toast.success("Batch job cancelled"); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
