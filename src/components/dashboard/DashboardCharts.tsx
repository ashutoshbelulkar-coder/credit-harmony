import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig,
} from "@/components/ui/chart";
import type { DashboardCharts as DashboardChartsData } from "@/api/dashboard-types";

const apiUsageConfig = {
  volume: { label: "API Volume", color: "hsl(var(--primary))" },
  errors: { label: "Error Rate (%)", color: "hsl(var(--danger))" },
} satisfies ChartConfig;

const successFailureConfig = {
  success: { label: "Success", color: "hsl(var(--success))" },
  failure: { label: "Failure", color: "hsl(var(--danger))" },
} satisfies ChartConfig;

const mappingAccuracyConfig = {
  accuracy: { label: "Mapping Accuracy (%)", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const matchConfidenceConfig = {
  distribution: { label: "Matches", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const slaLatencyConfig = {
  p95: { label: "P95 Latency (ms)", color: "hsl(var(--primary))" },
  p99: { label: "P99 Latency (ms)", color: "hsl(var(--warning))" },
} satisfies ChartConfig;

const rejectionOverrideConfig = {
  rejected: { label: "Rejected", color: "hsl(var(--danger))" },
  overridden: { label: "Overridden", color: "hsl(var(--warning))" },
} satisfies ChartConfig;

export function ApiUsageChart({ data, loading }: { data?: DashboardChartsData; loading?: boolean }) {
  const apiUsageData = data?.apiUsageTrend ?? [];
  const successFailureData = data
    ? [
        { name: "Success", value: data.successFailure.success },
        { name: "Failure", value: data.successFailure.failure },
      ]
    : [];

  return (
    <section aria-label="API usage and reliability" className="grid grid-cols-1 gap-4 laptop:gap-3 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] h-full flex flex-col">
          <header>
            <h2 className="text-h4 font-semibold text-foreground">API Usage Trend (30 days)</h2>
            <p className="mt-1 text-caption text-muted-foreground">Request volume and error rate across the last 30 days</p>
          </header>
          <div className="mt-3 flex-1">
            <ChartContainer config={apiUsageConfig} className="h-[200px] min-h-[200px] md:h-[240px] laptop:h-[260px] desktop:h-[280px] w-full">
              <LineChart data={loading ? [] : apiUsageData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis yAxisId="volume" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <YAxis yAxisId="errors" orientation="right" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => `${v.toFixed(2)}%`} />
                <ChartTooltip content={<ChartTooltipContent labelKey="day" />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line yAxisId="volume" type="monotone" dataKey="volume" stroke="var(--color-volume)" strokeWidth={2} dot={false} />
                <Line yAxisId="errors" type="monotone" dataKey="errors" stroke="var(--color-errors)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4">
        <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] h-full flex flex-col">
          <header>
            <h2 className="text-h4 font-semibold text-foreground">Success vs Failure Rate</h2>
            <p className="mt-1 text-caption text-muted-foreground">Distribution of successful vs failed API calls</p>
          </header>
          <div className="mt-3 flex-1">
            <ChartContainer config={successFailureConfig} className="h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full">
              <PieChart>
                <Pie data={loading ? [] : successFailureData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                  {successFailureData.map((entry) => (
                    <Cell key={entry.name} fill={entry.name === "Success" ? "var(--color-success)" : "var(--color-failure)"} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

export function DataQualityCharts({ data, loading }: { data?: DashboardChartsData; loading?: boolean }) {
  const mappingAccuracyData = data?.mappingAccuracy ?? [];
  const matchConfidenceData = data?.matchConfidence ?? [];

  return (
    <section aria-label="Data quality and matching" className="grid grid-cols-1 gap-4 laptop:gap-3 lg:grid-cols-2 laptop:grid-cols-12">
      <div className="laptop:col-span-6">
        <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] h-full flex flex-col">
          <header>
            <h2 className="text-h4 font-semibold text-foreground">Mapping Accuracy Trend</h2>
            <p className="mt-1 text-caption text-muted-foreground">Weekly auto-mapping accuracy across active integrations</p>
          </header>
          <div className="mt-3 flex-1">
            <ChartContainer config={mappingAccuracyConfig} className="h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full">
              <LineChart data={loading ? [] : mappingAccuracyData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} domain={[96, 100]} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                <ChartTooltip content={<ChartTooltipContent labelKey="week" />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="accuracy" stroke="var(--color-accuracy)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ChartContainer>
          </div>
        </div>
      </div>

      <div className="laptop:col-span-6">
        <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] h-full flex flex-col">
          <header>
            <h2 className="text-h4 font-semibold text-foreground">Match Confidence Distribution</h2>
            <p className="mt-1 text-caption text-muted-foreground">Histogram of entity match confidence across recent decisions</p>
          </header>
          <div className="mt-3 flex-1">
            <ChartContainer config={matchConfidenceConfig} className="h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full">
              <BarChart data={loading ? [] : matchConfidenceData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent labelKey="bucket" />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="count" fill="var(--color-distribution)" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SlaLatencyChart({ data, loading }: { data?: DashboardChartsData; loading?: boolean }) {
  const slaLatencyData = data?.slaLatency ?? [];
  return (
    <section aria-label="SLA latency trend">
      <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <header>
          <h2 className="text-h4 font-semibold text-foreground">SLA Latency Trend (P95 / P99)</h2>
          <p className="mt-1 text-caption text-muted-foreground">End-to-end response times for enquiry and submission APIs</p>
        </header>
        <div className="mt-3">
          <ChartContainer config={slaLatencyConfig} className="h-[200px] min-h-[200px] md:h-[240px] laptop:h-[260px] w-full">
            <LineChart data={loading ? [] : slaLatencyData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => `${v} ms`} />
              <ChartTooltip content={<ChartTooltipContent labelKey="day" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line type="monotone" dataKey="p95" stroke="var(--color-p95)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="p99" stroke="var(--color-p99)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </div>
      </div>
    </section>
  );
}

export function RejectionOverrideChart({ data, loading }: { data?: DashboardChartsData; loading?: boolean }) {
  const rejectionOverrideData = data?.rejectionOverride ?? [];
  return (
    <section aria-label="Rejection and override trends">
      <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <header>
          <h2 className="text-h4 font-semibold text-foreground">Rejection &amp; Override Trends</h2>
          <p className="mt-1 text-caption text-muted-foreground">Weekly trends in automatically rejected and manually overridden cases</p>
        </header>
        <div className="mt-3">
          <ChartContainer config={rejectionOverrideConfig} className="h-[200px] min-h-[200px] md:h-[240px] laptop:h-[260px] w-full">
            <BarChart data={loading ? [] : rejectionOverrideData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent labelKey="week" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="rejected" stackId="trend" fill="var(--color-rejected)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="overridden" stackId="trend" fill="var(--color-overridden)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </section>
  );
}
