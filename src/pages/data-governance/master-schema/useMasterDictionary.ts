import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { CanonicalAttribute, DictFilters, DomainCode, EntityType } from "./types";
import { MUTATING_ROLES } from "./types";
import {
  bulkApprove,
  bulkDeprecate,
  bulkReject,
  createEntityTypeRecord,
  fetchAllAttributes,
  fetchAllEntityTypes,
  fetchAttributesPage,
  fetchDomains,
  fetchEntityTypeDetail,
  fetchEntityTypesPage,
  putDomainCodes,
  removeAttribute,
  runAttributeLifecycle,
  saveAttributesBatch,
  snapshotMeta,
  submitEntityTypeForApproval,
  updateEntityTypeRecord,
  upsertAttributesNoBump,
  type EntityTypeListParams,
} from "@/services/master-dictionary.service";

export const MDQ = {
  all: () => ["master-dictionary"] as const,
  entityTypes: (params?: object) => ["master-dictionary", "entity-types", params ?? {}] as const,
  entityTypesAll: () => ["master-dictionary", "entity-types-all"] as const,
  attributes: (params?: object) => ["master-dictionary", "attributes", params ?? {}] as const,
  attributesAll: (params?: object) => ["master-dictionary", "attributes-all", params ?? {}] as const,
  entityType: (code: string) => ["master-dictionary", "entity-type", code] as const,
  domains: () => ["master-dictionary", "domains"] as const,
  snapshot: () => ["master-dictionary", "snapshot"] as const,
};

export function useCanMutateMsm(): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return user.roles.some((r) => (MUTATING_ROLES as readonly string[]).includes(r));
}

export function useIsSuperAdmin(): boolean {
  const { hasRole } = useAuth();
  return hasRole("Super Admin");
}

export function useDictionarySnapshot() {
  return useQuery({
    queryKey: MDQ.snapshot(),
    queryFn: () => snapshotMeta(),
    staleTime: 5_000,
  });
}

export function useEntityTypesList(params?: EntityTypeListParams) {
  return useQuery({
    queryKey: MDQ.entityTypes(params),
    queryFn: () => fetchEntityTypesPage(params),
    staleTime: 5_000,
  });
}

export function useAllEntityTypes() {
  return useQuery({
    queryKey: MDQ.entityTypesAll(),
    queryFn: () => fetchAllEntityTypes(),
    staleTime: 10_000,
  });
}

export function useAttributesPage(params?: Partial<DictFilters> & { page?: number; size?: number }) {
  return useQuery({
    queryKey: MDQ.attributes(params),
    queryFn: () => fetchAttributesPage(params),
    staleTime: 5_000,
  });
}

export function useAllAttributes(params?: Partial<DictFilters>) {
  return useQuery({
    queryKey: MDQ.attributesAll(params),
    queryFn: () => fetchAllAttributes(params),
    staleTime: 5_000,
  });
}

export function useEntityTypeDetail(entityType: string | null | undefined, options?: { enabled?: boolean }) {
  const enabled = (options?.enabled ?? true) && !!entityType;
  return useQuery({
    queryKey: entityType ? MDQ.entityType(entityType) : ["master-dictionary", "none"],
    queryFn: () => fetchEntityTypeDetail(String(entityType)),
    enabled,
    staleTime: 5_000,
  });
}

export function useDomains() {
  return useQuery({
    queryKey: MDQ.domains(),
    queryFn: () => fetchDomains(),
    staleTime: 10_000,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: MDQ.all() });
}

export function useCreateEntityType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: EntityType) => createEntityTypeRecord(body),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Entity type registered");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useUpdateEntityType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, patch }: { code: string; patch: Partial<EntityType> }) => updateEntityTypeRecord(code, patch),
    onSuccess: () => invalidateAll(qc),
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useSaveAttributes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attrs: CanonicalAttribute[]) => saveAttributesBatch(attrs),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Saved");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attrs: CanonicalAttribute[]) => upsertAttributesNoBump(attrs),
    onSuccess: () => invalidateAll(qc),
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useDeleteAttribute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeAttribute(id),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Attribute deleted");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useSubmitEntityType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entityType: string) => submitEntityTypeForApproval(entityType),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Submitted to approval queue");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useAttributeLifecycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      attributeId: string;
      action: "approve" | "reject" | "revise" | "deprecate" | "reinstate" | "reopen";
      comment?: string;
      successorId?: string;
    }) => runAttributeLifecycle(args.attributeId, args.action, { comment: args.comment, successorId: args.successorId }),
    onSuccess: (res) => {
      invalidateAll(qc);
      if (!res.ok) {
        const reasons = res.failed?.[0]?.reasons?.join("; ") ?? "Activation gates failed";
        toast.error(reasons);
      } else if (res.warnings?.length) {
        toast.warning(res.warnings.join("; "));
      }
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useBulkApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkApprove(ids),
    onSuccess: (res) => {
      invalidateAll(qc);
      if (res.warnings?.length) toast.warning(res.warnings.join("; "));
    },
  });
}

export function useBulkReject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, comment }: { ids: string[]; comment: string }) => bulkReject(ids, comment),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Rejected selected");
    },
  });
}

export function useBulkDeprecate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, comment, successorId }: { ids: string[]; comment: string; successorId?: string }) =>
      bulkDeprecate(ids, comment, successorId),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Deprecated selected");
    },
  });
}

export function useSaveDomainCodes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, codes }: { name: string; codes: DomainCode[] }) => putDomainCodes(name, codes),
    onSuccess: (d) => {
      invalidateAll(qc);
      toast.success(`${d.codes.length} attributes referencing ${d.domainName} can now be activated.`);
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
