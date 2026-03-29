import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QK } from "@/lib/query-keys";
import { ApiError } from "@/lib/api-client";
import {
  fetchConsortiums,
  fetchConsortiumById,
  fetchConsortiumMembers,
  createConsortium,
  updateConsortium,
  deleteConsortium,
  type ConsortiumListParams,
  type ConsortiumWritePayload,
} from "@/services/consortiums.service";

export function useConsortiums(params?: ConsortiumListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QK.consortiums.list(params),
    queryFn: () => fetchConsortiums(params),
    enabled: options?.enabled ?? true,
  });
}

export function useConsortium(id: string | undefined) {
  return useQuery({
    queryKey: QK.consortiums.detail(id ?? ""),
    queryFn: () => fetchConsortiumById(id!),
    enabled: !!id,
  });
}

export function useConsortiumMembers(id: string | undefined) {
  return useQuery({
    queryKey: QK.consortiums.members(id ?? ""),
    queryFn: () => fetchConsortiumMembers(id!),
    enabled: !!id,
  });
}

export function useCreateConsortium() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ConsortiumWritePayload) => createConsortium(data),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: QK.consortiums.all() });
      qc.invalidateQueries({ queryKey: QK.consortiums.detail(row.id) });
      qc.invalidateQueries({ queryKey: QK.consortiums.members(row.id) });
      qc.invalidateQueries({ queryKey: QK.approvals.all() });
      toast.success("Consortium created");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useUpdateConsortium() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConsortiumWritePayload }) => updateConsortium(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: QK.consortiums.all() });
      qc.invalidateQueries({ queryKey: QK.consortiums.detail(id) });
      qc.invalidateQueries({ queryKey: QK.consortiums.members(id) });
      qc.invalidateQueries({ queryKey: QK.approvals.all() });
      toast.success("Consortium updated");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useDeleteConsortium() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteConsortium(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.consortiums.all() }); toast.success("Consortium deleted"); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
