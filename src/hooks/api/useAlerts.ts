import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QK } from "@/lib/query-keys";
import { ApiError } from "@/lib/api-client";
import {
  fetchAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  activateAlertRule,
  deactivateAlertRule,
  fetchAlertIncidents,
  acknowledgeIncident,
  resolveIncident,
  fetchSlaConfigs,
  updateSlaConfig,
  fetchAlertCharts,
  fetchBreachHistory,
  type AlertRuleResponse,
} from "@/services/alerts.service";

export function useAlertRules() {
  return useQuery({ queryKey: QK.alerts.rules(), queryFn: fetchAlertRules });
}

export function useCreateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AlertRuleResponse>) => createAlertRule(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.alerts.rules() });
      qc.invalidateQueries({ queryKey: QK.approvals.all() });
      toast.success("Alert rule submitted for approval");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useUpdateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AlertRuleResponse> }) => updateAlertRule(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.alerts.rules() }); toast.success("Alert rule updated"); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useDeleteAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAlertRule(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.alerts.rules() }); toast.success("Alert rule deleted"); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useToggleAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enable }: { id: string; enable: boolean }) =>
      enable ? activateAlertRule(id) : deactivateAlertRule(id),
    onSuccess: (_, { enable }) => {
      qc.invalidateQueries({ queryKey: QK.alerts.rules() });
      toast.success(`Alert rule ${enable ? "enabled" : "disabled"}`);
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useAlertIncidents(params?: { status?: string; page?: number; size?: number }) {
  return useQuery({
    queryKey: QK.alerts.incidents(params),
    queryFn: () => fetchAlertIncidents(params),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useAcknowledgeIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => acknowledgeIncident(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.alerts.incidents() }); toast.success("Alert acknowledged"); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useResolveIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resolveIncident(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.alerts.incidents() }); toast.success("Alert resolved"); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useSlaConfigs() {
  return useQuery({ queryKey: QK.alerts.slaConfigs(), queryFn: fetchSlaConfigs });
}

export function useUpdateSlaConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { thresholdValue: number | string } }) =>
      updateSlaConfig(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.alerts.slaConfigs() }); toast.success("SLA configuration updated"); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useAlertCharts() {
  return useQuery({ queryKey: ["alerts", "charts"] as const, queryFn: fetchAlertCharts, staleTime: 60_000 });
}

export function useBreachHistory(params?: { domain?: string; severity?: string; dateFrom?: string; dateTo?: string }) {
  return useQuery({ queryKey: QK.alerts.breachHistory(params), queryFn: () => fetchBreachHistory(params) });
}
