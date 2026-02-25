import { useOutletContext } from "react-router-dom";
import type { MonitoringOutletContext } from "./MonitoringLayout";
import { SlaConfigurationPanel } from "./alert-engine/SlaConfigurationPanel";
import { SlaBreachHistory } from "./alert-engine/SlaBreachHistory";
import { AutoRemediationSettings } from "./alert-engine/AutoRemediationSettings";

export function MonitoringSlaConfigurationPage() {
  const { filters } = useOutletContext<MonitoringOutletContext>();
  return (
    <div className="space-y-8 animate-fade-in">
      <SlaConfigurationPanel />
      <SlaBreachHistory filters={filters} />
      <AutoRemediationSettings />
    </div>
  );
}
