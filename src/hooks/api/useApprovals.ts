import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QK } from "@/lib/query-keys";
import { ApiError } from "@/lib/api-client";
import {
  fetchApprovals,
  approveItem,
  rejectItem,
  requestChanges,
  type ApprovalListParams,
} from "@/services/approvals.service";

export function useApprovals(params?: ApprovalListParams) {
  return useQuery({
    queryKey: QK.approvals.list(params),
    queryFn: () => fetchApprovals(params),
  });
}

export function useApproveItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) => approveItem(id, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.approvals.all() });
      qc.invalidateQueries({ queryKey: QK.products.all() });
      qc.invalidateQueries({ queryKey: QK.consortiums.all() });
      qc.invalidateQueries({ queryKey: QK.institutions.all() });
      qc.invalidateQueries({ queryKey: QK.alerts.rules() });
      qc.invalidateQueries({ queryKey: QK.schemaMapper.all() });
      toast.success("Item approved");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useRejectItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectItem(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.approvals.all() });
      qc.invalidateQueries({ queryKey: QK.products.all() });
      qc.invalidateQueries({ queryKey: QK.consortiums.all() });
      qc.invalidateQueries({ queryKey: QK.institutions.all() });
      qc.invalidateQueries({ queryKey: QK.alerts.rules() });
      qc.invalidateQueries({ queryKey: QK.schemaMapper.all() });
      toast.success("Item rejected");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useRequestChanges() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => requestChanges(id, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.approvals.all() });
      qc.invalidateQueries({ queryKey: QK.products.all() });
      qc.invalidateQueries({ queryKey: QK.consortiums.all() });
      qc.invalidateQueries({ queryKey: QK.institutions.all() });
      qc.invalidateQueries({ queryKey: QK.alerts.rules() });
      qc.invalidateQueries({ queryKey: QK.schemaMapper.all() });
      toast.success("Changes requested");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
