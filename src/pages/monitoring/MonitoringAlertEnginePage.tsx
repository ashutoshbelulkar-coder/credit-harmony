import { AlertRulesDashboard } from "./alert-engine/AlertRulesDashboard";
import { AlertMonitoringDashboard } from "./alert-engine/AlertMonitoringDashboard";

export function MonitoringAlertEnginePage() {
  return (
    <div className="flex flex-1 flex-col min-h-0 gap-4">
      <div className="shrink-0">
        <AlertRulesDashboard />
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <AlertMonitoringDashboard />
      </div>
    </div>
  );
}
