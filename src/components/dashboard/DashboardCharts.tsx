import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig,
} from "@/components/ui/chart";

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
  volume: { label: "API Volume", color: "hsl(var(--primary))" },
  errors: { label: "Error Rate (%)", color: "hsl(var(--danger))" },
} satisfies ChartConfig;

const successFailureData = [
  { name: "Success", value: 92 },
  { name: "Failure", value: 8 },
];

const successFailureConfig = {
  success: { label: "Success", color: "hsl(var(--success))" },
  failure: { label: "Failure", color: "hsl(var(--danger))" },
} satisfies ChartConfig;

const mappingAccuracyData = [
  { week: "W1", accuracy: 96.8 },
  { week: "W2", accuracy: 97.1 },
  { week: "W3", accuracy: 97.4 },
  { week: "W4", accuracy: 97.6 },
  { week: "W5", accuracy: 97.9 },
];

const mappingAccuracyConfig = {
  accuracy: { label: "Mapping Accuracy (%)", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const matchConfidenceData = [
  { bucket: "0–40", count: 6 },
  { bucket: "40–60", count: 18 },
  { bucket: "60–75", count: 32 },
  { bucket: "75–90", count: 48 },
  { bucket: "90–100", count: 26 },
];

const matchConfidenceConfig = {
  distribution: { label: "Matches", color: "hsl(var(--primary))" },
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
  p95: { label: "P95 Latency (ms)", color: "hsl(var(--primary))" },
  p99: { label: "P99 Latency (ms)", color: "hsl(var(--warning))" },
} satisfies ChartConfig;

const rejectionOverrideData = [
  { week: "W1", rejected: 120, overridden: 18 },
  { week: "W2", rejected: 110, overridden: 21 },
  { week: "W3", rejected: 130, overridden: 24 },
  { week: "W4", rejected: 118, overridden: 20 },
  { week: "W5", rejected: 112, overridden: 19 },
];

const rejectionOverrideConfig = {
  rejected: { label: "Rejected", color: "hsl(var(--danger))" },
  overridden: { label: "Overridden", color: "hsl(var(--warning))" },
} satisfies ChartConfig;

export function ApiUsageChart() {
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
              <LineChart data={apiUsageData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
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
                <Pie data={successFailureData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
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

export function DataQualityCharts() {
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
              <LineChart data={mappingAccuracyData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
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
              <BarChart data={matchConfidenceData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
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

export function SlaLatencyChart() {
  return (
    <section aria-label="SLA latency trend">
      <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <header>
          <h2 className="text-h4 font-semibold text-foreground">SLA Latency Trend (P95 / P99)</h2>
          <p className="mt-1 text-caption text-muted-foreground">End-to-end response times for enquiry and submission APIs</p>
        </header>
        <div className="mt-3">
          <ChartContainer config={slaLatencyConfig} className="h-[200px] min-h-[200px] md:h-[240px] laptop:h-[260px] w-full">
            <LineChart data={slaLatencyData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
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

export function RejectionOverrideChart() {
  return (
    <section aria-label="Rejection and override trends">
      <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <header>
          <h2 className="text-h4 font-semibold text-foreground">Rejection &amp; Override Trends</h2>
          <p className="mt-1 text-caption text-muted-foreground">Weekly trends in automatically rejected and manually overridden cases</p>
        </header>
        <div className="mt-3">
          <ChartContainer config={rejectionOverrideConfig} className="h-[200px] min-h-[200px] md:h-[240px] laptop:h-[260px] w-full">
            <BarChart data={rejectionOverrideData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
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
