import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QK } from "@/lib/query-keys";
import { ApiError } from "@/lib/api-client";
import {
  fetchInstitutions,
  fetchInstitutionById,
  createInstitution,
  updateInstitution,
  suspendInstitution,
  reactivateInstitution,
  deleteInstitution,
  fetchConsortiumMemberships,
  createConsortiumMembership,
  deleteConsortiumMembership,
  type CreateConsortiumMembershipBody,
  fetchProductSubscriptions,
  addProductSubscriptions,
  patchProductSubscription,
  type AddProductSubscriptionsBody,
  fetchBillingSummary,
  patchInstitutionBilling,
  fetchMonitoringSummary,
  fetchInstitutionApiAccess,
  patchInstitutionApiAccess,
  fetchInstitutionConsent,
  patchInstitutionConsent,
  type InstitutionBillingPatchBody,
  type InstitutionApiAccessPatch,
  type InstitutionConsentPatch,
  fetchInstitutionOverviewCharts,
  type InstitutionListParams,
  type InstitutionResponse,
  type ConsortiumMembershipRow,
  type ProductSubscriptionRow,
} from "@/services/institutions.service";

export function useInstitutions(
  params?: InstitutionListParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: QK.institutions.list(params),
    queryFn: () => fetchInstitutions(params),
    enabled: options?.enabled ?? true,
  });
}

export function useInstitution(id: string | number | undefined) {
  return useQuery({
    queryKey: QK.institutions.detail(String(id ?? "")),
    queryFn: () => fetchInstitutionById(id!),
    enabled: !!id,
  });
}

export function useCreateInstitution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<InstitutionResponse>) => createInstitution(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.institutions.all() });
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useUpdateInstitution(id?: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<InstitutionResponse>) => updateInstitution(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.institutions.all() });
      if (id) qc.invalidateQueries({ queryKey: QK.institutions.detail(String(id)) });
      toast.success("Institution updated");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useSuspendInstitution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => suspendInstitution(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.institutions.all() });
      toast.success("Institution suspended");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useReactivateInstitution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => reactivateInstitution(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.institutions.all() });
      toast.success("Institution reactivated");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useDeleteInstitution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => deleteInstitution(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.institutions.all() });
      toast.success("Institution deleted");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useConsortiumMemberships(id: string | number | undefined) {
  return useQuery({
    queryKey: QK.institutions.consortiumMemberships(id ?? ""),
    queryFn: () => fetchConsortiumMemberships(id!),
    enabled: !!id,
  });
}

export function useCreateConsortiumMembership(institutionId: string | number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateConsortiumMembershipBody) => createConsortiumMembership(institutionId!, body),
    onSuccess: async (newRow) => {
      if (institutionId == null || institutionId === "") return;
      const sid = String(institutionId);
      const key = QK.institutions.consortiumMemberships(sid);
      qc.setQueryData<ConsortiumMembershipRow[]>(key, (old) => {
        const prev = old ?? [];
        if (prev.some((m) => m.membershipId === newRow.membershipId)) return prev;
        return [...prev, newRow];
      });
      await qc.refetchQueries({ queryKey: key });
      await qc.invalidateQueries({ queryKey: QK.institutions.detail(sid) });
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useDeleteConsortiumMembership(institutionId: string | number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: number) => deleteConsortiumMembership(institutionId!, membershipId),
    onSuccess: async (_void, membershipId) => {
      if (institutionId == null || institutionId === "") return;
      const sid = String(institutionId);
      const key = QK.institutions.consortiumMemberships(sid);
      qc.setQueryData<ConsortiumMembershipRow[]>(key, (old) =>
        (old ?? []).filter((m) => m.membershipId !== membershipId)
      );
      await qc.refetchQueries({ queryKey: key });
      await qc.invalidateQueries({ queryKey: QK.institutions.detail(sid) });
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useProductSubscriptions(id: string | number | undefined) {
  return useQuery({
    queryKey: QK.institutions.productSubscriptions(id ?? ""),
    queryFn: () => fetchProductSubscriptions(id!),
    enabled: !!id,
  });
}

export function useAddProductSubscriptions(institutionId: string | number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AddProductSubscriptionsBody) => addProductSubscriptions(institutionId!, body),
    onSuccess: async () => {
      if (institutionId == null || institutionId === "") return;
      const sid = String(institutionId);
      const key = QK.institutions.productSubscriptions(sid);
      await qc.refetchQueries({ queryKey: key });
      await qc.invalidateQueries({ queryKey: QK.institutions.detail(sid) });
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function usePatchProductSubscription(institutionId: string | number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { subscriptionId: number; subscriptionStatus: string }) =>
      patchProductSubscription(institutionId!, args.subscriptionId, {
        subscriptionStatus: args.subscriptionStatus,
      }),
    onSuccess: async (updated) => {
      if (institutionId == null || institutionId === "") return;
      const sid = String(institutionId);
      const key = QK.institutions.productSubscriptions(sid);
      qc.setQueryData<ProductSubscriptionRow[]>(key, (old) => {
        const prev = old ?? [];
        return prev.map((r) => (r.subscriptionId === updated.subscriptionId ? updated : r));
      });
      await qc.refetchQueries({ queryKey: key });
      await qc.invalidateQueries({ queryKey: QK.institutions.detail(sid) });
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useBillingSummary(id: string | number | undefined) {
  return useQuery({
    queryKey: QK.institutions.billingSummary(id ?? ""),
    queryFn: () => fetchBillingSummary(id!),
    enabled: !!id,
  });
}

export function usePatchInstitutionBilling(id: string | number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InstitutionBillingPatchBody) => patchInstitutionBilling(id!, body),
    onSuccess: () => {
      if (id != null && id !== "") {
        const sid = String(id);
        qc.invalidateQueries({ queryKey: QK.institutions.billingSummary(sid) });
        qc.invalidateQueries({ queryKey: QK.institutions.productSubscriptions(sid) });
        qc.invalidateQueries({ queryKey: QK.institutions.detail(sid) });
      }
      toast.success("Billing saved");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useMonitoringSummary(id: string | number | undefined) {
  return useQuery({
    queryKey: QK.institutions.monitoringSummary(id ?? ""),
    queryFn: () => fetchMonitoringSummary(id!),
    enabled: !!id,
  });
}

export function useInstitutionOverviewCharts(id: string | number | undefined) {
  return useQuery({
    queryKey: QK.institutions.overviewCharts(id ?? ""),
    queryFn: () => fetchInstitutionOverviewCharts(id!),
    enabled: !!id,
  });
}

export function useInstitutionApiAccess(id: string | number | undefined) {
  return useQuery({
    queryKey: QK.institutions.apiAccess(id ?? ""),
    queryFn: () => fetchInstitutionApiAccess(id!),
    enabled: !!id,
  });
}

export function usePatchInstitutionApiAccess(id: string | number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InstitutionApiAccessPatch) => patchInstitutionApiAccess(id!, body),
    onSuccess: () => {
      if (id != null && id !== "") {
        const sid = String(id);
        qc.invalidateQueries({ queryKey: QK.institutions.apiAccess(sid) });
        qc.invalidateQueries({ queryKey: QK.institutions.detail(sid) });
      }
      toast.success("API access settings saved");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useInstitutionConsent(id: string | number | undefined) {
  return useQuery({
    queryKey: QK.institutions.consent(id ?? ""),
    queryFn: () => fetchInstitutionConsent(id!),
    enabled: !!id,
  });
}

export function usePatchInstitutionConsent(id: string | number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InstitutionConsentPatch) => patchInstitutionConsent(id!, body),
    onSuccess: () => {
      if (id != null && id !== "") {
        const sid = String(id);
        qc.invalidateQueries({ queryKey: QK.institutions.consent(sid) });
        qc.invalidateQueries({ queryKey: QK.institutions.detail(sid) });
      }
      toast.success("Consent settings saved");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
