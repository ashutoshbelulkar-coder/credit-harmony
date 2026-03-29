import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  MonitoringFilterBar,
  defaultMonitoringFilters,
  type MonitoringFilters,
} from "./MonitoringFilterBar";
import { MonitoringAlertBanner } from "./MonitoringAlertBanner";
import { useMonitoringKpis } from "@/hooks/api/useMonitoring";
import { ApiErrorCard } from "@/components/ui/api-error-card";

export type MonitoringOutletContext = {
  filters: MonitoringFilters;
  setFilters: React.Dispatch<React.SetStateAction<MonitoringFilters>>;
};

const monitoringTitles: Record<string, string> = {
  "data-submission-api": "Data Submission API",
  "data-submission-batch": "Data Submission Batch",
  "inquiry-api": "Inquiry API",
  "sla-configuration": "SLA Configuration",
  "alert-engine": "Alert Engine",
};

const monitoringDescriptions: Record<string, string> = {
  "data-submission-api": "API request volume, success rate, latency, and rejection reasons for data submission.",
  "data-submission-batch": "Batch job status, processing timeline, failure analysis, and schema drift.",
  "inquiry-api": "Enquiry volume, latency, and response metrics for the inquiry API.",
  "sla-configuration": "SLA thresholds, breach history, and auto-remediation settings.",
  "alert-engine": "Alert rules, active alerts, and alert trends.",
};

export function MonitoringLayout() {
  const [filters, setFilters] = useState<MonitoringFilters>(defaultMonitoringFilters);
  const location = useLocation();
  const pathSegment = location.pathname.split("/monitoring/")[1]?.split("/")[0] ?? "";
  const title = monitoringTitles[pathSegment] ?? "Monitoring";
  const description = monitoringDescriptions[pathSegment] ?? "API usage, error rates, SLA health, and data quality metrics.";

  const kpisQuery = useMonitoringKpis();
  const kpis = kpisQuery.data;
  const kpisReady = kpisQuery.isSuccess && !!kpis;
  const showSuccessRateAlert = kpisReady && kpis.successRatePercent < 95;
  const showLatencyAlert = kpisReady && kpis.p95LatencyMs > 300;

  const isAlertEngine = pathSegment === "alert-engine";

  return (
    <DashboardLayout>
      {isAlertEngine ? (
        <div className="flex flex-1 flex-col min-h-0 animate-fade-in">
          <div className="shrink-0 flex items-center justify-between gap-3 pb-2">
            <div className="min-w-0">
              <h1 className="text-h2 font-semibold text-foreground truncate">{title}</h1>
              <p className="text-caption text-muted-foreground mt-0.5 truncate">{description}</p>
            </div>
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            <Outlet context={{ filters, setFilters } satisfies MonitoringOutletContext} />
          </div>
        </div>
      ) : (
        <div className="space-y-6 laptop:space-y-5 animate-fade-in min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-h2 font-semibold text-foreground">{title}</h1>
              <p className="text-caption text-muted-foreground mt-1">
                {description}
              </p>
            </div>
            {pathSegment !== "sla-configuration" && pathSegment !== "alert-engine" && (
              <MonitoringFilterBar
                filters={filters}
                onFiltersChange={setFilters}
                entityFilterMode={
                  pathSegment === "data-submission-api"
                    ? "data-submission-api"
                    : pathSegment === "inquiry-api"
                      ? "inquiry-api"
                      : null
                }
              />
            )}
          </div>

          {kpisQuery.isError && (
            <ApiErrorCard
              error={kpisQuery.error}
              onRetry={() => void kpisQuery.refetch()}
              className="mb-2"
            />
          )}

          {kpisReady && showSuccessRateAlert && (
            <MonitoringAlertBanner
              type={kpis.successRatePercent < 90 ? "critical" : "warning"}
              title="Success rate below threshold"
              description={`Current success rate is ${kpis.successRatePercent}%. Target is ≥95%.`}
            />
          )}
          {kpisReady && showLatencyAlert && (
            <MonitoringAlertBanner
              type="warning"
              title="Latency spike detected"
              description={`P95 latency is ${kpis.p95LatencyMs} ms. Review recent traffic.`}
            />
          )}

          <Outlet context={{ filters, setFilters } satisfies MonitoringOutletContext} />
        </div>
      )}
    </DashboardLayout>
  );
}
