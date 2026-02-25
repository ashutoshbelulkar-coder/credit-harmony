import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

const kpiStats = [
  {
    title: "API Volume (24h)",
    value: "1,284,392",
    change: "+12.3%",
    trend: "up" as const,
    icon: Activity,
  },
  {
    title: "Error Rate",
    value: "0.23%",
    change: "-0.05%",
    trend: "down" as const,
    icon: AlertTriangle,
  },
  {
    title: "SLA Health",
    value: "99.7%",
    change: "+0.1%",
    trend: "up" as const,
    icon: CheckCircle2,
  },
  {
    title: "Data Quality Score",
    value: "94.2%",
    change: "+1.8%",
    trend: "up" as const,
    icon: TrendingUp,
  },
];

const apiUsageData = [
  { day: "D-29", volume: 920_000, errors: 0.32 },
  { day: "D-24", volume: 980_000, errors: 0.28 },
  { day: "D-19", volume: 1_050_000, errors: 0.26 },
  { day: "D-14", volume: 1_100_000, errors: 0.25 },
  { day: "D-9", volume: 1_180_000, errors: 0.24 },
  { day: "D-4", volume: 1_220_000, errors: 0.23 },
  { day: "Today", volume: 1_284_392, errors: 0.23 },
];

const apiUsageConfig = {
  volume: {
    label: "API Volume",
    color: "hsl(var(--primary))",
  },
  errors: {
    label: "Error Rate (%)",
    color: "hsl(var(--danger))",
  },
} satisfies ChartConfig;

const successFailureData = [
  { name: "Success", value: 92 },
  { name: "Failure", value: 8 },
];

const successFailureConfig = {
  success: {
    label: "Success",
    color: "hsl(var(--success))",
  },
  failure: {
    label: "Failure",
    color: "hsl(var(--danger))",
  },
} satisfies ChartConfig;

const mappingAccuracyData = [
  { week: "W1", accuracy: 96.8 },
  { week: "W2", accuracy: 97.1 },
  { week: "W3", accuracy: 97.4 },
  { week: "W4", accuracy: 97.6 },
  { week: "W5", accuracy: 97.9 },
];

const mappingAccuracyConfig = {
  accuracy: {
    label: "Mapping Accuracy (%)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const matchConfidenceData = [
  { bucket: "0–40", count: 6 },
  { bucket: "40–60", count: 18 },
  { bucket: "60–75", count: 32 },
  { bucket: "75–90", count: 48 },
  { bucket: "90–100", count: 26 },
];

const matchConfidenceConfig = {
  distribution: {
    label: "Matches",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const slaLatencyData = [
  { day: "D-6", p95: 280, p99: 340 },
  { day: "D-5", p95: 260, p99: 320 },
  { day: "D-4", p95: 250, p99: 310 },
  { day: "D-3", p95: 240, p99: 305 },
  { day: "D-2", p95: 245, p99: 300 },
  { day: "D-1", p95: 238, p99: 298 },
  { day: "Today", p95: 232, p99: 292 },
];

const slaLatencyConfig = {
  p95: {
    label: "P95 Latency (ms)",
    color: "hsl(var(--primary))",
  },
  p99: {
    label: "P99 Latency (ms)",
    color: "hsl(var(--warning))",
  },
} satisfies ChartConfig;

const rejectionOverrideData = [
  { week: "W1", rejected: 120, overridden: 18 },
  { week: "W2", rejected: 110, overridden: 21 },
  { week: "W3", rejected: 130, overridden: 24 },
  { week: "W4", rejected: 118, overridden: 20 },
  { week: "W5", rejected: 112, overridden: 19 },
];

const rejectionOverrideConfig = {
  rejected: {
    label: "Rejected",
    color: "hsl(var(--danger))",
  },
  overridden: {
    label: "Overridden",
    color: "hsl(var(--warning))",
  },
} satisfies ChartConfig;

const recentActivity = [
  { institution: "First National Bank", action: "API key rotated", time: "2 min ago", status: "info" },
  { institution: "Metro Credit Union", action: "Submission API enabled", time: "15 min ago", status: "success" },
  { institution: "Pacific Finance Corp", action: "SLA breach warning", time: "1 hour ago", status: "warning" },
  { institution: "Southern Trust Bank", action: "Onboarding completed", time: "3 hours ago", status: "success" },
  { institution: "First National Bank", action: "Bulk data upload", time: "5 hours ago", status: "info" },
];

const topInstitutions = [
  { name: "First National Bank", requests: "452K", quality: 98, sla: 99.9 },
  { name: "Metro Credit Union", requests: "284K", quality: 95, sla: 99.5 },
  { name: "Pacific Finance Corp", requests: "198K", quality: 92, sla: 98.8 },
  { name: "Southern Trust Bank", requests: "156K", quality: 97, sla: 99.7 },
];

const statusColors: Record<string, string> = {
  info: "bg-info/15 text-info",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
};

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 md:space-y-8 laptop:space-y-6 desktop:space-y-8 animate-fade-in min-w-0">
        {/* Page Header */}
        <div>
          <h1 className="text-h2 font-semibold text-foreground">Hybrid Credit Bureau</h1>
          <p className="mt-1 text-caption text-muted-foreground">
            Executive overview of API performance, data quality, and SLA health
          </p>
        </div>

        {/* Row 1: KPI Cards */}
        <section aria-label="Key performance indicators">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 laptop:grid-cols-12 laptop:gap-3">
            {kpiStats.map((stat) => (
              <div
                key={stat.title}
                className="bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] laptop:col-span-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="mt-2 text-h1 font-bold text-foreground">
                      {stat.value}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/5">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
                  )}
                  <span
                    className={`text-caption font-medium ${
                      stat.trend === "up" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {stat.change}
                  </span>
                  <span className="text-caption text-muted-foreground">vs last 24h</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Row 2: API Usage Trend + Success vs Failure */}
        <section
          aria-label="API usage and reliability"
          className="grid grid-cols-1 gap-4 laptop:gap-3 lg:grid-cols-12"
        >
          <div className="lg:col-span-8">
            <div className="bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] h-full flex flex-col">
              <header className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-h4 font-semibold text-foreground">
                    API Usage Trend (30 days)
                  </h2>
                  <p className="mt-1 text-caption text-muted-foreground">
                    Request volume and error rate across the last 30 days
                  </p>
                </div>
              </header>
              <div className="mt-4 flex-1">
                <ChartContainer
                  config={apiUsageConfig}
                  className="h-[200px] min-h-[200px] md:h-[240px] laptop:h-[260px] desktop:h-[280px] w-full"
                >
                  <LineChart data={apiUsageData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      yAxisId="volume"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                    />
                    <YAxis
                      yAxisId="errors"
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(v) => `${v.toFixed(2)}%`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelKey="day"
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      yAxisId="volume"
                      type="monotone"
                      dataKey="volume"
                      stroke="var(--color-volume)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="errors"
                      type="monotone"
                      dataKey="errors"
                      stroke="var(--color-errors)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] h-full flex flex-col">
              <header className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-h4 font-semibold text-foreground">
                    Success vs Failure Rate
                  </h2>
                  <p className="mt-1 text-caption text-muted-foreground">
                    Distribution of successful vs failed API calls
                  </p>
                </div>
              </header>
              <div className="mt-4 flex-1">
                <ChartContainer
                  config={successFailureConfig}
                  className="h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full"
                >
                  <PieChart>
                    <Pie
                      data={successFailureData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                    >
                      {successFailureData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={
                            entry.name === "Success"
                              ? "var(--color-success)"
                              : "var(--color-failure)"
                          }
                        />
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

        {/* Row 3: Mapping Accuracy + Match Confidence */}
        <section
          aria-label="Data quality and matching"
          className="grid grid-cols-1 gap-4 laptop:gap-3 lg:grid-cols-2 laptop:grid-cols-12"
        >
          <div className="laptop:col-span-6">
            <div className="bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] h-full flex flex-col">
              <header>
                <h2 className="text-h4 font-semibold text-foreground">
                  Mapping Accuracy Trend
                </h2>
                <p className="mt-1 text-caption text-muted-foreground">
                  Weekly auto-mapping accuracy across active integrations
                </p>
              </header>
              <div className="mt-4 flex-1">
                <ChartContainer
                  config={mappingAccuracyConfig}
                  className="h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full"
                >
                  <LineChart
                    data={mappingAccuracyData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="week"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      domain={[96, 100]}
                      tickFormatter={(v) => `${v.toFixed(1)}%`}
                    />
                    <ChartTooltip content={<ChartTooltipContent labelKey="week" />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      stroke="var(--color-accuracy)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ChartContainer>
              </div>
            </div>
          </div>

          <div className="laptop:col-span-6">
            <div className="bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] h-full flex flex-col">
              <header>
                <h2 className="text-h4 font-semibold text-foreground">
                  Match Confidence Distribution
                </h2>
                <p className="mt-1 text-caption text-muted-foreground">
                  Histogram of entity match confidence across recent decisions
                </p>
              </header>
              <div className="mt-4 flex-1">
                <ChartContainer
                  config={matchConfidenceConfig}
                  className="h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full"
                >
                  <BarChart
                    data={matchConfidenceData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="bucket"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <ChartTooltip content={<ChartTooltipContent labelKey="bucket" />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="count"
                      fill="var(--color-distribution)"
                      radius={[4, 4, 0, 0]}
                      barSize={24}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          </div>
        </section>

        {/* Row 4: SLA Latency Trend */}
        <section aria-label="SLA latency trend">
          <div className="bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-h4 font-semibold text-foreground">
                  SLA Latency Trend (P95 / P99)
                </h2>
                <p className="mt-1 text-caption text-muted-foreground">
                  End-to-end response times for enquiry and submission APIs
                </p>
              </div>
            </header>
            <div className="mt-4">
              <ChartContainer
                config={slaLatencyConfig}
                className="h-[200px] min-h-[200px] md:h-[240px] laptop:h-[260px] w-full"
              >
                <LineChart
                  data={slaLatencyData}
                  margin={{ top: 8, right: 24, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(v) => `${v} ms`}
                  />
                  <ChartTooltip content={<ChartTooltipContent labelKey="day" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey="p95"
                    stroke="var(--color-p95)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="p99"
                    stroke="var(--color-p99)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </div>
        </section>

        {/* Row 5: Rejection & Override Trends */}
        <section aria-label="Rejection and override trends">
          <div className="bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-h4 font-semibold text-foreground">
                  Rejection &amp; Override Trends
                </h2>
                <p className="mt-1 text-caption text-muted-foreground">
                  Weekly trends in automatically rejected and manually overridden cases
                </p>
              </div>
            </header>
            <div className="mt-4">
              <ChartContainer
                config={rejectionOverrideConfig}
                className="h-[200px] min-h-[200px] md:h-[240px] laptop:h-[260px] w-full"
              >
                <BarChart
                  data={rejectionOverrideData}
                  margin={{ top: 8, right: 24, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="week"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip content={<ChartTooltipContent labelKey="week" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="rejected"
                    stackId="trend"
                    fill="var(--color-rejected)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="overridden"
                    stackId="trend"
                    fill="var(--color-overridden)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </section>

        {/* Operational snapshot: Recent activity & top institutions */}
        <section
          aria-label="Operational snapshot"
          className="grid grid-cols-1 gap-4 laptop:gap-3 lg:grid-cols-5 laptop:grid-cols-12"
        >
          {/* Recent Activity */}
          <div className="lg:col-span-3 laptop:col-span-7 bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-label uppercase tracking-[0.08em] text-muted-foreground">
                Recent Activity
              </h2>
              <button className="text-caption font-medium text-primary hover:text-primary/80 transition-colors">
                View all
              </button>
            </div>
            <div className="divide-y divide-border">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center gap-4 px-1 py-3">
                  <div
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      statusColors[activity.status]?.split(" ")[1] || ""
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-medium text-foreground">
                      {activity.institution}
                    </p>
                    <p className="text-caption text-muted-foreground">{activity.action}</p>
                  </div>
                  <span className="whitespace-nowrap text-caption text-muted-foreground">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Institutions */}
          <div className="lg:col-span-2 laptop:col-span-5 bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-label uppercase tracking-[0.08em] text-muted-foreground">
                Top Institutions
              </h2>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-4 space-y-4">
              {topInstitutions.map((inst) => (
                <div key={inst.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-body font-medium text-foreground">
                      {inst.name}
                    </span>
                    <span className="text-caption text-muted-foreground">
                      {inst.requests} reqs
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${inst.quality}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-10 text-right text-caption text-muted-foreground">
                      {inst.quality}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

function MetricCard({ title, value, subtitle, trend }: { title: string; value: string; subtitle: string; trend: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </p>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-h1 font-bold text-foreground">{value}</span>
        <span className="mb-1 flex items-center gap-0.5 text-caption font-medium text-success">
          <TrendingUp className="w-3 h-3" />
          {trend}
        </span>
      </div>
      <p className="mt-1 text-caption text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export default Dashboard;
