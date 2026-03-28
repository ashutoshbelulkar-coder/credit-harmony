import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QK } from "@/lib/query-keys";
import { ApiError } from "@/lib/api-client";
import {
  fetchApiKeysByInstitution,
  regenerateApiKey,
  revokeApiKey,
} from "@/services/apiKeys.service";

export function useApiKeys(institutionId: string | number | undefined) {
  return useQuery({
    queryKey: QK.apiKeys.byInstitution(institutionId ?? ""),
    queryFn: () => fetchApiKeysByInstitution(institutionId!),
    enabled: !!institutionId,
  });
}

export function useRegenerateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => regenerateApiKey(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QK.apiKeys.all() });
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success(`API key #${id} regenerated successfully`);
    },
    onError: (e: ApiError) => toast.error(e.message ?? "Failed to regenerate API key"),
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => revokeApiKey(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QK.apiKeys.all() });
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success(`API key #${id} revoked`);
    },
    onError: (e: ApiError) => toast.error(e.message ?? "Failed to revoke API key"),
  });
}
