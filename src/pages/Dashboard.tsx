import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardKPIRow } from "@/components/dashboard/DashboardKPIRow";
import { ApiUsageChart, DataQualityCharts, SlaLatencyChart, RejectionOverrideChart } from "@/components/dashboard/DashboardCharts";
import { DashboardActivity } from "@/components/dashboard/DashboardActivity";
import { DashboardDateRangePicker } from "@/components/dashboard/DashboardDateRangePicker";

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 md:space-y-8 laptop:space-y-6 desktop:space-y-8 animate-fade-in min-w-0">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-h2 font-semibold text-foreground">Hybrid Credit Bureau</h1>
            <p className="mt-1 text-caption text-muted-foreground">
              Executive overview of API performance, data quality, and SLA health
            </p>
          </div>
          <DashboardDateRangePicker />
        </div>

        <DashboardKPIRow />
        <ApiUsageChart />
        <DataQualityCharts />
        <SlaLatencyChart />
        <RejectionOverrideChart />
        <DashboardActivity />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
