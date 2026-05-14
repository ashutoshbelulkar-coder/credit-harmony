import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QK } from "@/lib/query-keys";
import { ApiError } from "@/lib/api-client";
import { fetchDataPolicy, saveDataPolicy } from "@/services/dataPolicy.service";
import type { DataPolicy } from "@/types/data-policy";

export function useDataPolicy(params: { institutionId: string; productId: string } | undefined) {
  return useQuery({
    queryKey: params ? QK.dataPolicy.byProduct(params) : ["data-policy", "disabled"],
    queryFn: () => fetchDataPolicy(params!),
    enabled: !!params?.institutionId && !!params?.productId,
    staleTime: 30_000,
  });
}

export function useSaveDataPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (policy: DataPolicy) => saveDataPolicy(policy),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: QK.dataPolicy.all() });
      qc.invalidateQueries({ queryKey: QK.auditLogs.all() });
      qc.setQueryData(QK.dataPolicy.byProduct({ institutionId: saved.institutionId, productId: saved.productId }), saved);
      toast.success("Data Policy Updated Successfully");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

