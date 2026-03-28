import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QK } from "@/lib/query-keys";
import { ApiError } from "@/lib/api-client";
import { fetchRoles, createRole, updateRole, deleteRole, type CreateRoleRequest } from "@/services/roles.service";

export function useRoles() {
  return useQuery({ queryKey: QK.roles.all(), queryFn: fetchRoles });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRoleRequest) => createRole(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.roles.all() }); toast.success("Role created"); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateRoleRequest> }) => updateRole(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.roles.all() }); toast.success("Role updated"); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.roles.all() }); toast.success("Role deleted"); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
