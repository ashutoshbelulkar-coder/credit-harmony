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
  fetchProductSubscriptions,
  fetchBillingSummary,
  fetchMonitoringSummary,
  type InstitutionListParams,
  type InstitutionResponse,
} from "@/services/institutions.service";

export function useInstitutions(params?: InstitutionListParams) {
  return useQuery({
    queryKey: QK.institutions.list(params),
    queryFn: () => fetchInstitutions(params),
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
      toast.success("Institution registered successfully");
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

export function useProductSubscriptions(id: string | number | undefined) {
  return useQuery({
    queryKey: QK.institutions.productSubscriptions(id ?? ""),
    queryFn: () => fetchProductSubscriptions(id!),
    enabled: !!id,
  });
}

export function useBillingSummary(id: string | number | undefined) {
  return useQuery({
    queryKey: QK.institutions.billingSummary(id ?? ""),
    queryFn: () => fetchBillingSummary(id!),
    enabled: !!id,
  });
}

export function useMonitoringSummary(id: string | number | undefined) {
  return useQuery({
    queryKey: QK.institutions.monitoringSummary(id ?? ""),
    queryFn: () => fetchMonitoringSummary(id!),
    enabled: !!id,
  });
}
