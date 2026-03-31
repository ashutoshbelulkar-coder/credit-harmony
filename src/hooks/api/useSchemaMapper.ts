import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QK } from "@/lib/query-keys";
import { ApiError } from "@/lib/api-client";
import {
  fetchSchemaRegistryPage,
  fetchSchemaRegistrySourceTypes,
  fetchSourceTypeFields,
  fetchWizardMetadata,
  ingestSchema,
  createMappingJob,
  fetchMapping,
  patchMapping,
  submitMappingApproval,
  type SchemaListParams,
  type IngestBody,
} from "@/services/schema-mapper.service";
import type { ApiFieldMapping } from "@/lib/schema-mapper-api";

export function useSchemaRegistryList(
  params?: SchemaListParams,
  options?: { enabled?: boolean; allowMockFallback?: boolean }
) {
  const enabled = options?.enabled ?? true;
  const allowMockFallback = options?.allowMockFallback !== false;
  return useQuery({
    queryKey: [
      ...QK.schemaMapper.registry(params as Record<string, unknown>),
      allowMockFallback ? "mockOk" : "apiOnly",
    ] as const,
    queryFn: () => fetchSchemaRegistryPage(params, { allowMockFallback }),
    enabled: enabled && params != null,
  });
}

export function useSchemaRegistrySourceTypes(options?: {
  enabled?: boolean;
  allowMockFallback?: boolean;
}) {
  const allowMockFallback = options?.allowMockFallback !== false;
  return useQuery({
    queryKey: [...QK.schemaMapper.schemaRegistrySourceTypes(), allowMockFallback ? "mockOk" : "apiOnly"] as const,
    queryFn: () => fetchSchemaRegistrySourceTypes({ allowMockFallback }),
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
  });
}

export function useSchemaMapperWizardMetadata(options?: {
  enabled?: boolean;
  allowMockFallback?: boolean;
}) {
  const allowMockFallback = options?.allowMockFallback !== false;
  return useQuery({
    queryKey: [...QK.schemaMapper.wizardMetadata(), allowMockFallback ? "mockOk" : "apiOnly"] as const,
    queryFn: () => fetchWizardMetadata({ allowMockFallback }),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSourceTypeFields(
  sourceType: string | undefined,
  options?: { enabled?: boolean; allowMockFallback?: boolean }
) {
  const st = String(sourceType ?? "").trim();
  const allowMockFallback = options?.allowMockFallback !== false;
  const enabled = (options?.enabled ?? true) && st.length > 0;
  return useQuery({
    queryKey: [...QK.schemaMapper.sourceTypeFields(st), allowMockFallback ? "mockOk" : "apiOnly"] as const,
    queryFn: () => fetchSourceTypeFields(st, { allowMockFallback }),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useSchemaMappingDetail(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? QK.schemaMapper.mapping(id) : ["schema-mapper", "mapping", "none"],
    queryFn: () => fetchMapping(id!),
    enabled: !!id,
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      if (s === "queued" || s === "processing") return 800;
      return false;
    },
  });
}

export function useIngestSchema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: IngestBody) => ingestSchema(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.schemaMapper.all() });
      qc.invalidateQueries({ queryKey: QK.dataIngestion.all() });
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useCreateMappingJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { schemaVersionId: string; canonicalVersionId?: string }) => createMappingJob(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.schemaMapper.all() });
      window.setTimeout(() => {
        qc.invalidateQueries({ queryKey: QK.dataIngestion.all() });
      }, 600);
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function usePatchMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { fieldMappings?: ApiFieldMapping[] } }) =>
      patchMapping(id, body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: QK.schemaMapper.mapping(v.id) });
      qc.invalidateQueries({ queryKey: QK.schemaMapper.all() });
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useSubmitMappingApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submitMappingApproval(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.schemaMapper.all() });
      qc.invalidateQueries({ queryKey: QK.approvals.all() });
      toast.success("Submitted to approval queue");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
