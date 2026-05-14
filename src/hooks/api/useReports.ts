import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QK } from "@/lib/query-keys";
import { ApiError } from "@/lib/api-client";
import {
  fetchReports,
  createReport,
  deleteReport,
  cancelReport,
  retryReport,
  type ReportListParams,
  type CreateReportRequest,
} from "@/services/reports.service";

export function useReports(params?: ReportListParams) {
  return useQuery({ queryKey: QK.reports.list(params), queryFn: () => fetchReports(params) });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReportRequest) => createReport(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.reports.all() }); toast.success("Report requested"); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReport(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.reports.all() }); toast.success("Report deleted"); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useCancelReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelReport(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.reports.all() }); toast.success("Report cancelled"); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useRetryReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => retryReport(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.reports.all() }); toast.success("Report retried"); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
