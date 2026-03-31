import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardKPIRow } from "@/components/dashboard/DashboardKPIRow";
import {
  ApiUsageChart,
  DataQualityCharts,
  SlaLatencyChart,
  RejectionOverrideChart,
} from "@/components/dashboard/DashboardCharts";
import { DashboardActivity } from "@/components/dashboard/DashboardActivity";
import {
  DashboardDateRangePicker,
  type DashboardDateRange,
} from "@/components/dashboard/DashboardDateRangePicker";
import { useState } from "react";
import { useDashboardSnapshot } from "@/api/dashboard";
import { AgentFleetCard } from "@/components/dashboard/command-center/AgentFleetCard";
import { ProcessingThroughputCard } from "@/components/dashboard/command-center/ProcessingThroughputCard";
import {
  ActiveBatchPipelineTable,
  BATCH_PIPELINE_STATUS_QUERY,
} from "@/components/dashboard/command-center/ActiveBatchPipelineTable";
import { AnomalyFeed } from "@/components/dashboard/command-center/AnomalyFeed";
import { MemberDataQualityCard } from "@/components/dashboard/command-center/MemberDataQualityCard";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { exportToCsv } from "@/lib/csv-export";
import type { DashboardRange } from "@/api/dashboard-types";
import { apiVolumeKpiTitle } from "@/api/dashboard-types";
import { ApiErrorCard } from "@/components/ui/api-error-card";

const Dashboard = () => {
  const [range, setRange] = useState<DashboardDateRange>({ kind: "preset", preset: "30d" });
  const [throughputView, setThroughputView] = useState<"24h" | "7d">("24h");
  const snapshot = useDashboardSnapshot(range);
  const navigate = useNavigate();
  const { user } = useAuth();
  const readOnly = user?.roles?.includes("ROLE_VIEWER") ?? false;
  const loading = snapshot.isPending;
  const blocked = snapshot.isError;

  return (
    <DashboardLayout>
      <div className="space-y-6 md:space-y-8 laptop:space-y-6 desktop:space-y-8 animate-fade-in min-w-0">
        {blocked && (
          <ApiErrorCard
            error={snapshot.error}
            onRetry={() => void snapshot.refetch()}
            className="mb-2"
          />
        )}
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-h2 font-semibold text-foreground">Hybrid Credit Bureau</h1>
            <p className="mt-1 text-caption text-muted-foreground">
              Executive overview of API performance, data quality, and SLA health
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DashboardDateRangePicker value={range} onChange={setRange} />
            <button
              type="button"
              className="h-7 px-2.5 rounded-md border border-border bg-background text-caption hover:bg-muted transition-colors"
              title="Download current KPI snapshot as CSV (browser export; not a server-side report job)."
              onClick={() => {
                const data = snapshot.data;
                if (!data) {
                  toast.error("Nothing to export yet.");
                  return;
                }
                exportToCsv(
                  "dashboard_export",
                  [
                    {
                      apiVolume24h: data.metrics.apiVolume24h,
                      errorRate: data.metrics.errorRate,
                      slaHealth: data.metrics.slaHealth,
                      dataQualityScore: data.metrics.dataQualityScore,
                    },
                  ],
                  [
                    { key: "apiVolume24h", label: apiVolumeKpiTitle(range as DashboardRange) },
                    { key: "errorRate", label: "Error Rate (%)" },
                    { key: "slaHealth", label: "SLA Health (%)" },
                    { key: "dataQualityScore", label: "Data Quality Score (%)" },
                  ]
                );
                toast.success("Export started.");
              }}
              aria-label="Export dashboard report as CSV"
            >
              Export
            </button>
          </div>
        </div>

        <DashboardKPIRow data={snapshot.data?.metrics} loading={loading} dateRange={range} />
        <ApiUsageChart data={snapshot.data?.charts} loading={loading} dateRange={range} />
        <DataQualityCharts data={snapshot.data?.charts} loading={loading} />
        <SlaLatencyChart data={snapshot.data?.charts} loading={loading} />
        <RejectionOverrideChart data={snapshot.data?.charts} loading={loading} />
        <DashboardActivity data={snapshot.data?.activity} loading={loading} />

        {/* Command Center panels */}
        <div className="grid grid-cols-1 items-stretch gap-4 laptop:gap-3 lg:grid-cols-12">
          <div className="flex h-full min-h-0 lg:col-span-5">
            <AgentFleetCard
              agents={snapshot.data?.commandCenter?.agents ?? []}
              loading={loading}
            />
          </div>
          <div className="flex h-full min-h-0 lg:col-span-7">
            <ProcessingThroughputCard
              seedApiUsageTrend={snapshot.data?.charts.apiUsageTrend ?? []}
              loading={loading}
              view={throughputView}
              onViewChange={setThroughputView}
            />
          </div>
        </div>

        <ActiveBatchPipelineTable
          rows={snapshot.data?.commandCenter?.batches ?? []}
          loading={loading}
          onViewAll={() =>
            navigate(`/monitoring/data-submission-batch?${BATCH_PIPELINE_STATUS_QUERY}`)
          }
          onRowNavigate={() =>
            navigate(`/monitoring/data-submission-batch?${BATCH_PIPELINE_STATUS_QUERY}`)
          }
        />

        <AnomalyFeed
          anomalies={snapshot.data?.commandCenter?.anomalies ?? []}
          loading={loading}
          readOnly={readOnly}
          onViewAll={() => navigate("/monitoring/alert-engine")}
          onAction={(a) => {
            toast.info(`Opening ${a.ctaLabel}…`);
            setTimeout(() => navigate(a.href), 600);
          }}
        />

        <MemberDataQualityCard
          points={snapshot.data?.commandCenter?.memberQuality ?? []}
          loading={loading}
          dateRange={range}
          memberRowLabels={snapshot.data?.commandCenter?.memberQualitySubmitters}
          onOpenQualityCenter={() => navigate("/data-governance/data-quality-monitoring")}
        />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
