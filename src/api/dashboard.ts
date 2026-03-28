import { useQuery } from "@tanstack/react-query";
import type { DashboardCharts, DashboardMetrics, DashboardRange, DashboardSnapshot } from "./dashboard-types";
import { dashboardRangeKey } from "./dashboard-types";
import { createMockDashboardSnapshot } from "./dashboard-mock";
import { get, buildQuery } from "@/lib/api-client";
import { fetchDashboardActivity, fetchDashboardCommandCenter } from "@/services/dashboard.service";
import type { DashboardActivityItem } from "./dashboard-types";
import { QK } from "@/lib/query-keys";

async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  return get<DashboardMetrics>("/v1/dashboard/metrics");
}

async function fetchDashboardCharts(range: DashboardRange): Promise<DashboardCharts> {
  const key = range.kind === "preset" ? range.preset : "custom";
  return get<DashboardCharts>(`/v1/dashboard/charts${buildQuery({ range: key })}`);
}

async function fetchDashboardSnapshot(range: DashboardRange): Promise<DashboardSnapshot> {
  const [metrics, charts] = await Promise.all([
    fetchDashboardMetrics(),
    fetchDashboardCharts(range),
  ]);

  // Fetch live activity and command-center; fall back to mock if backend unavailable
  const mockOverlay = createMockDashboardSnapshot(range);
  let liveActivity = mockOverlay.activity;
  let liveCommandCenter = mockOverlay.commandCenter;

  try {
    const [activityRows, ccData] = await Promise.all([
      fetchDashboardActivity(),
      fetchDashboardCommandCenter(),
    ]);

    liveActivity = {
      recentActivity: activityRows.slice(0, 10).map((r) => ({
        institution: r.userName ?? r.userEmail ?? "System",
        action: r.description ?? r.actionType,
        time: r.occurredAt,
        status: (r.auditOutcome === "success" ? "success" : r.auditOutcome === "failure" ? "warning" : "info") as DashboardActivityItem["status"],
      })),
      topInstitutions: mockOverlay.activity.topInstitutions,
    };

    liveCommandCenter = {
      ...mockOverlay.commandCenter,
      // Enrich anomalies count from real data
      anomalies: mockOverlay.commandCenter.anomalies.map((a, idx) =>
        idx === 0
          ? { ...a, description: `${ccData.activeAlerts} active alerts · ${ccData.pendingApprovals} pending approvals` }
          : a
      ),
    };
  } catch {
    // silently fall back to mock overlay
  }

  return {
    range,
    metrics,
    charts,
    activity: liveActivity,
    commandCenter: liveCommandCenter,
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

export function useDashboardCommandCenter() {
  return useQuery({
    queryKey: QK.dashboard.commandCenter(),
    queryFn: fetchDashboardCommandCenter,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useDashboardActivity() {
  return useQuery({
    queryKey: QK.dashboard.activity(),
    queryFn: fetchDashboardActivity,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

