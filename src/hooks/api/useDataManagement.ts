import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { QK } from "@/lib/query-keys";
import {
  createSubject,
  deleteSubject,
  getSubject,
  linkSources,
  listAuditLogForSubject,
  listAvailableSources,
  listSubjects,
  unlinkSource,
  updateSubject,
  type CreateSubjectInput,
  type ListSubjectsParams,
  type UpdateSubjectInput,
} from "@/services/dataManagement.service";
import { DataManagementValidationError } from "@/types/data-management";

function actorEmailFromUser(email: string | undefined): string {
  return email && email.trim() ? email : "anonymous@hcb.local";
}

function describeError(err: unknown): string {
  if (err instanceof DataManagementValidationError) {
    const first = Object.values(err.fieldErrors)[0];
    return first ?? err.message;
  }
  if (err instanceof Error) return err.message;
  return "Unexpected error";
}

export function useSubjects(params?: ListSubjectsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QK.dataManagement.subjects(params as Record<string, unknown>),
    queryFn: () => listSubjects(params),
    enabled: options?.enabled ?? true,
  });
}

export function useSubject(subjectId: string | undefined) {
  return useQuery({
    queryKey: subjectId
      ? QK.dataManagement.subject(subjectId)
      : ["data-management", "subject", "none"],
    queryFn: () => (subjectId ? getSubject(subjectId) : Promise.resolve(null)),
    enabled: Boolean(subjectId),
  });
}

export function useAvailableSources(subjectId: string, query: string) {
  return useQuery({
    queryKey: QK.dataManagement.availableSources(subjectId, query),
    queryFn: () => listAvailableSources(subjectId, query),
    enabled: Boolean(subjectId),
  });
}

export function useSubjectAudit(subjectId: string | undefined) {
  return useQuery({
    queryKey: subjectId
      ? QK.dataManagement.audit(subjectId)
      : ["data-management", "audit", "none"],
    queryFn: () =>
      subjectId ? listAuditLogForSubject(subjectId) : Promise.resolve([]),
    enabled: Boolean(subjectId),
  });
}

function useActor(): string {
  const { user } = useAuth();
  return actorEmailFromUser(user?.email);
}

export function useCreateSubject() {
  const qc = useQueryClient();
  const actor = useActor();
  return useMutation({
    mutationFn: (input: CreateSubjectInput) => createSubject(input, actor),
    onSuccess: (subject) => {
      qc.invalidateQueries({ queryKey: QK.dataManagement.all() });
      toast.success("Subject created", {
        description: `${subject.firstName} ${subject.lastName}`,
      });
    },
    onError: (err) => toast.error(describeError(err)),
  });
}

export function useUpdateSubject(subjectId: string) {
  const qc = useQueryClient();
  const actor = useActor();
  return useMutation({
    mutationFn: (input: UpdateSubjectInput) =>
      updateSubject(subjectId, input, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.dataManagement.all() });
      toast.success("Subject updated");
    },
    onError: (err) => toast.error(describeError(err)),
  });
}

export function useDeleteSubject(subjectId: string) {
  const qc = useQueryClient();
  const actor = useActor();
  return useMutation({
    mutationFn: (comment: string) => deleteSubject(subjectId, comment, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.dataManagement.all() });
      toast.success("Subject deleted");
    },
    onError: (err) => toast.error(describeError(err)),
  });
}

export function useLinkSources(subjectId: string) {
  const qc = useQueryClient();
  const actor = useActor();
  return useMutation({
    mutationFn: ({ sourceIds, comment }: { sourceIds: string[]; comment: string }) =>
      linkSources(subjectId, sourceIds, comment, actor),
    onSuccess: (added) => {
      qc.invalidateQueries({ queryKey: QK.dataManagement.all() });
      toast.success(
        added.length === 1
          ? `Linked source “${added[0].name}”`
          : `Linked ${added.length} sources`
      );
    },
    onError: (err) => toast.error(describeError(err)),
  });
}

export function useUnlinkSource(subjectId: string) {
  const qc = useQueryClient();
  const actor = useActor();
  return useMutation({
    mutationFn: ({ sourceId, comment }: { sourceId: string; comment: string }) =>
      unlinkSource(subjectId, sourceId, comment, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.dataManagement.all() });
      toast.success("Source unlinked");
    },
    onError: (err) => toast.error(describeError(err)),
  });
}

/** Roles that can mutate subjects + their links. Other roles get read-only UI. */
const MUTATING_ROLES = new Set([
  "Super Admin",
  "Bureau Admin",
  "Data Admin",
  "Compliance Officer",
]);

export function useCanManageData(): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return user.roles.some((role) => MUTATING_ROLES.has(role));
}
