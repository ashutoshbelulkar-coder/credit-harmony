import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QK } from "@/lib/query-keys";
import { ApiError } from "@/lib/api-client";
import {
  fetchDatasourcesPage,
  fetchDatasource,
  createDatasource,
  updateDatasource,
  submitDatasourceForApproval,
  submitDatasourceReview,
  type DatasourceCreateBody,
  type DatasourceListParams,
  type DatasourceReviewBody,
  type DatasourceUpdateBody,
} from "@/services/datasource-onboarding.service";

export function useDatasourcesList(
  params?: DatasourceListParams,
  options?: { enabled?: boolean; allowMockFallback?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const allowMockFallback = options?.allowMockFallback !== false;
  return useQuery({
    queryKey: [
      ...QK.datasourceOnboarding.list(params as Record<string, unknown>),
      allowMockFallback ? "mockOk" : "apiOnly",
    ] as const,
    queryFn: () => fetchDatasourcesPage(params, { allowMockFallback }),
    enabled: enabled && params != null,
    staleTime: 20_000,
  });
}

export function useDatasourceDetail(
  id: string | null | undefined,
  options?: { enabled?: boolean; allowMockFallback?: boolean },
) {
  const allowMockFallback = options?.allowMockFallback !== false;
  const enabled = (options?.enabled ?? true) && !!id;
  return useQuery({
    queryKey: id
      ? ([...QK.datasourceOnboarding.detail(String(id)), allowMockFallback ? "mockOk" : "apiOnly"] as const)
      : (["datasource-onboarding", "none"] as const),
    queryFn: () => fetchDatasource(String(id), { allowMockFallback }),
    enabled,
  });
}

export function useCreateDatasource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DatasourceCreateBody) => createDatasource(body),
    onSuccess: (ds) => {
      qc.invalidateQueries({ queryKey: QK.datasourceOnboarding.all() });
      qc.invalidateQueries({ queryKey: QK.auditLogs.all() });
      qc.setQueryData(QK.datasourceOnboarding.detail(ds.id), ds);
      toast.success("Datasource created");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useUpdateDatasource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: DatasourceUpdateBody }) =>
      updateDatasource(id, body),
    onSuccess: (ds) => {
      qc.invalidateQueries({ queryKey: QK.datasourceOnboarding.all() });
      qc.invalidateQueries({ queryKey: QK.auditLogs.all() });
      qc.setQueryData(QK.datasourceOnboarding.detail(ds.id), ds);
      toast.success("Datasource saved");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useSubmitDatasourceForApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submitDatasourceForApproval(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.datasourceOnboarding.all() });
      qc.invalidateQueries({ queryKey: QK.approvals.all() });
      qc.invalidateQueries({ queryKey: QK.auditLogs.all() });
      toast.success("Submitted to approval queue");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useSubmitDatasourceReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: DatasourceReviewBody }) =>
      submitDatasourceReview(id, body),
    onSuccess: (ds) => {
      qc.invalidateQueries({ queryKey: QK.datasourceOnboarding.all() });
      qc.invalidateQueries({ queryKey: QK.approvals.all() });
      qc.invalidateQueries({ queryKey: QK.auditLogs.all() });
      qc.setQueryData(QK.datasourceOnboarding.detail(ds.id), ds);
      toast.success(`Review ${ds.profileReviewStatus.toLowerCase().replace("_", " ")}`);
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
