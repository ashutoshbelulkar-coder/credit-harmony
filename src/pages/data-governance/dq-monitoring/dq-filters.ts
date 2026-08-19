import { useSearchParams } from "react-router-dom";
import { useCallback, useMemo } from "react";
import type { DqChannel, DqFilters, DqPeriodPreset } from "@/types/dq-monitoring";
import { defaultDqFilters, periodRange } from "@/data/dq-monitoring-mock";

function asPeriod(v: string | null): DqPeriodPreset {
  if (v === "24h" || v === "7d" || v === "30d" || v === "90d" || v === "custom") return v;
  return "30d";
}

function asChannel(v: string | null): DqChannel {
  if (v === "batch" || v === "api" || v === "all") return v;
  return "all";
}

export function parseDqFilters(params: URLSearchParams): DqFilters {
  const period = asPeriod(params.get("period"));
  const range = periodRange(period, params.get("from") ?? undefined, params.get("to") ?? undefined);
  const members = (params.get("members") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return {
    period,
    from: range.from,
    to: range.to,
    compare: params.get("compare") !== "0",
    channel: asChannel(params.get("channel")),
    memberIds: members,
    sourceType: params.get("sourceType") ?? "all",
    profile: params.get("profile") ?? "all",
    severity: params.get("severity") ?? "all",
    grade: params.get("grade") ?? "all",
  };
}

export function dqFiltersToParams(filters: DqFilters, extras?: Record<string, string | undefined>): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.period !== "30d") p.set("period", filters.period);
  if (filters.period === "custom") {
    p.set("from", filters.from);
    p.set("to", filters.to);
  }
  if (!filters.compare) p.set("compare", "0");
  if (filters.channel !== "all") p.set("channel", filters.channel);
  if (filters.memberIds.length) p.set("members", filters.memberIds.join(","));
  if (filters.sourceType !== "all") p.set("sourceType", filters.sourceType);
  if (filters.profile !== "all") p.set("profile", filters.profile);
  if (filters.severity !== "all") p.set("severity", filters.severity);
  if (filters.grade !== "all") p.set("grade", filters.grade);
  if (extras) {
    for (const [k, v] of Object.entries(extras)) {
      if (v) p.set(k, v);
    }
  }
  return p;
}

export function useDqFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseDqFilters(params), [params]);

  const setFilters = useCallback(
    (patch: Partial<DqFilters>, extras?: Record<string, string | undefined>) => {
      const next: DqFilters = { ...filters, ...patch };
      if (patch.period && patch.period !== "custom") {
        const range = periodRange(patch.period);
        next.from = range.from;
        next.to = range.to;
      }
      const extrasNow: Record<string, string | undefined> = {
        issue: params.get("issue") ?? undefined,
        systemic: params.get("systemic") ?? undefined,
        reports: params.get("reports") ?? undefined,
        reportType: params.get("reportType") ?? undefined,
        ...extras,
      };
      setParams(dqFiltersToParams(next, extrasNow), { replace: true });
    },
    [filters, params, setParams],
  );

  const resetFilters = useCallback(() => {
    setParams(new URLSearchParams(), { replace: true });
  }, [setParams]);

  return { filters, setFilters, resetFilters, params, setParams, defaults: defaultDqFilters() };
}
