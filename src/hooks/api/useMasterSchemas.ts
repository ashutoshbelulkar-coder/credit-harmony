import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QK } from "@/lib/query-keys";
import { ApiError } from "@/lib/api-client";
import {
  fetchMasterSchemasPage,
  fetchMasterSchema,
  fetchMasterSchemaSourceTypes,
  createMasterSchema,
  updateMasterSchema,
  submitMasterSchemaForApproval,
  type MasterSchemaListParams,
} from "@/services/master-schema.service";
import type { MasterSchemaField } from "@/types/master-schema";
import type { SourceType } from "@/types/schema-mapper";

export function useMasterSchemasList(
  params?: MasterSchemaListParams,
  options?: { enabled?: boolean; allowMockFallback?: boolean }
) {
  const enabled = options?.enabled ?? true;
  const allowMockFallback = options?.allowMockFallback !== false;
  return useQuery({
    queryKey: [...QK.masterSchemas.list(params as Record<string, unknown>), allowMockFallback ? "mockOk" : "apiOnly"] as const,
    queryFn: () => fetchMasterSchemasPage(params, { allowMockFallback }),
    enabled: enabled && params != null,
    staleTime: 20_000,
  });
}

export function useMasterSchemaDetail(
  id: string | null | undefined,
  options?: { enabled?: boolean; allowMockFallback?: boolean }
) {
  const allowMockFallback = options?.allowMockFallback !== false;
  const enabled = (options?.enabled ?? true) && !!id;
  return useQuery({
    queryKey: id ? [...QK.masterSchemas.detail(String(id)), allowMockFallback ? "mockOk" : "apiOnly"] as const : ["master-schemas", "none"],
    queryFn: () => fetchMasterSchema(String(id)),
    enabled,
  });
}

export function useMasterSchemaSourceTypes(options?: { enabled?: boolean; allowMockFallback?: boolean }) {
  const allowMockFallback = options?.allowMockFallback !== false;
  return useQuery({
    queryKey: [...QK.masterSchemas.all(), "source-types", allowMockFallback ? "mockOk" : "apiOnly"] as const,
    queryFn: () => fetchMasterSchemaSourceTypes({ allowMockFallback }),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
}

export function useCreateMasterSchema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; sourceType: SourceType; description: string; fields: MasterSchemaField[]; rawJson?: unknown }) =>
      createMasterSchema(body),
    onSuccess: (schema) => {
      qc.invalidateQueries({ queryKey: QK.masterSchemas.all() });
      qc.setQueryData(QK.masterSchemas.detail(schema.id), schema);
      toast.success("Schema created");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useUpdateMasterSchema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name?: string; description?: string; fields?: MasterSchemaField[]; rawJson?: unknown } }) =>
      updateMasterSchema(id, body),
    onSuccess: (schema) => {
      qc.invalidateQueries({ queryKey: QK.masterSchemas.all() });
      qc.setQueryData(QK.masterSchemas.detail(schema.id), schema);
      toast.success("Schema updated");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useSubmitMasterSchemaApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submitMasterSchemaForApproval(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.masterSchemas.all() });
      qc.invalidateQueries({ queryKey: QK.approvals.all() });
      toast.success("Submitted to approval queue");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

