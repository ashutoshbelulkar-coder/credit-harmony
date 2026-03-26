import { useQuery } from "@tanstack/react-query";
import type { DashboardCharts, DashboardMetrics, DashboardRange, DashboardSnapshot } from "./dashboard-types";
import { dashboardRangeKey } from "./dashboard-types";
import { createMockDashboardSnapshot } from "./dashboard-mock";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

async function fetchDashboardMetrics(_range: DashboardRange): Promise<DashboardMetrics> {
  // Keep URL aligned with repo docs (no breaking assumptions).
  return await fetchJson<DashboardMetrics>("/api/dashboard/metrics");
}

async function fetchDashboardCharts(range: DashboardRange): Promise<DashboardCharts> {
  const key = range.kind === "preset" ? range.preset : "custom";
  return await fetchJson<DashboardCharts>(`/api/dashboard/charts?range=${encodeURIComponent(key)}`);
}

async function fetchDashboardSnapshot(range: DashboardRange): Promise<DashboardSnapshot> {
  const [metrics, charts] = await Promise.all([
    fetchDashboardMetrics(range),
    fetchDashboardCharts(range),
  ]);
  // API only returns KPIs + charts; Command Center + activity always come from app mock data
  // (aligned with `src/data/agents-mock.ts` and dashboard-mock) so the UI never shows stale BRD-only names.
  const overlay = createMockDashboardSnapshot(range);
  return {
    range,
    metrics,
    charts,
    activity: overlay.activity,
    commandCenter: overlay.commandCenter,
  };
}

export function useDashboardSnapshot(range: DashboardRange) {
  return useQuery({
    queryKey: ["dashboardSnapshot", dashboardRangeKey(range)],
    queryFn: async () => {
      try {
        return await fetchDashboardSnapshot(range);
      } catch {
        return createMockDashboardSnapshot(range);
      }
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

