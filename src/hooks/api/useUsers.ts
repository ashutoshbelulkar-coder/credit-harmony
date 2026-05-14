import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QK } from "@/lib/query-keys";
import { ApiError } from "@/lib/api-client";
import {
  fetchUsers,
  suspendUser,
  activateUser,
  inviteUser,
  updateUser,
  deactivateUser,
  type UserListParams,
} from "@/services/users.service";

export function useUsers(params?: UserListParams) {
  return useQuery({
    queryKey: QK.users.list(params),
    queryFn: () => fetchUsers(params),
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => suspendUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.users.all() }); toast.success("User suspended"); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useActivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => activateUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.users.all() }); toast.success("User activated"); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: inviteUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.users.all() }); toast.success("Invitation sent"); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateUser>[1] }) => updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.users.all() });
      toast.success("User updated");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => deactivateUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.users.all() });
      toast.success("User deactivated");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
