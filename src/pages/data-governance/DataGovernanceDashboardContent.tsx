import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  GitCompare,
  AlertTriangle,
  Target,
  RotateCcw,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
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
import {
  governanceKpis,
  mappingAccuracyTrend30,
  mappingAccuracyTrend60,
  mappingAccuracyTrend90,
  validationFailureBySource,
  matchConfidenceDistribution,
  overrideVsAutoAcceptTrend,
  dataQualityScoreTrend,
  rejectionReasonsBreakdown,
} from "@/data/data-governance-mock";

const KPI_ICONS = [
  GitCompare,
  AlertTriangle,
  Target,
  RotateCcw,
  ShieldCheck,
  Clock,
];

const mappingAccuracyConfig = {
  accuracy: { label: "Mapping Accuracy (%)", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const validationFailureConfig = {
  failures: { label: "Failures", color: "hsl(var(--danger))" },
  rate: { label: "Rate %", color: "hsl(var(--warning))" },
} satisfies ChartConfig;

const matchConfidenceConfig = {
  count: { label: "Matches", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const overrideTrendConfig = {
  override: { label: "Override", color: "hsl(var(--warning))" },
  autoAccept: { label: "Auto-Accept", color: "hsl(var(--success))" },
} satisfies ChartConfig;

const dataQualityConfig = {
  score: { label: "Data Quality Score %", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const rejectionConfig = {
  value: { label: "Count", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

function useCountUp(end: number | string, duration = 1200): number | string {
  const num = typeof end === "string" ? parseFloat(end) : end;
  const isNumeric = !Number.isNaN(num);
  const [value, setValue] = useState(isNumeric ? 0 : num);
  useEffect(() => {
    if (!isNumeric) return;
    let start = 0;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setValue(Number((progress * num).toFixed(1)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [num, duration, isNumeric]);
  return isNumeric ? value : end;
}

export function DataGovernanceDashboard() {
  const [range, setRange] = useState<"30" | "60" | "90">("30");
  const mappingData =
    range === "30"
      ? mappingAccuracyTrend30
      : range === "60"
        ? mappingAccuracyTrend60
        : mappingAccuracyTrend90;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-h2 font-semibold text-foreground">Data Governance</h1>
        <p className="mt-1 text-caption text-muted-foreground">
          Mapping accuracy, validation, match confidence, and quality trends
        </p>
      </div>

      {/* KPI Cards – 6 cards, equal height */}
      <section aria-label="Key performance indicators" className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 2xl:grid-cols-6">
        {governanceKpis.map((kpi, idx) => (
          <KpiCard key={kpi.id} kpi={kpi} icon={KPI_ICONS[idx]} />
        ))}
      </section>

      {/* Row 1: Mapping Accuracy Trend + Validation Failure by Source */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="xl:col-span-7 2xl:col-span-8"
        >
          <div className="h-full rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] xl:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-h4 font-semibold text-foreground">Mapping Accuracy Trend</h2>
                <p className="mt-1 text-caption text-muted-foreground">Accuracy over selected period</p>
              </div>
              <div className="flex gap-1.5">
                {(["30", "60", "90"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setRange(d)}
                    className={`rounded-lg border px-2.5 py-1 text-caption font-medium transition-colors ${
                      range === d
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 h-[260px]">
              <ChartContainer config={mappingAccuracyConfig} className="h-full w-full">
                <LineChart data={mappingData} margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    domain={[90, 100]}
                    tickFormatter={(v) => `${v}%`}
                    fontSize={10}
                    width={36}
                  />
                  <ChartTooltip content={<ChartTooltipContent labelKey="period" />} />
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
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="xl:col-span-5 2xl:col-span-4"
        >
          <div className="h-full rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] xl:p-6">
            <h2 className="text-h4 font-semibold text-foreground">Validation Failure by Source</h2>
            <p className="mt-1 text-caption text-muted-foreground">Failure count by source</p>
            <div className="mt-4 h-[260px]">
              <ChartContainer config={validationFailureConfig} className="h-full w-full">
                <BarChart
                  data={validationFailureBySource}
                  margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
                  <YAxis type="category" dataKey="source" width={72} tickLine={false} axisLine={false} tickMargin={4} fontSize={10} />
                  <ChartTooltip content={<ChartTooltipContent labelKey="source" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="failures" fill="var(--color-failures)" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Row 2: Match Confidence Distribution + Override vs Auto-Accept */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="h-full rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] xl:p-6">
            <h2 className="text-h4 font-semibold text-foreground">Match Confidence Distribution</h2>
            <p className="mt-1 text-caption text-muted-foreground">Histogram of entity match confidence</p>
            <div className="mt-4 h-[240px]">
              <ChartContainer config={matchConfidenceConfig} className="h-full w-full">
                <BarChart
                  data={matchConfidenceDistribution}
                  margin={{ top: 8, right: 12, left: -8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={4} fontSize={10} width={32} />
                  <ChartTooltip content={<ChartTooltipContent labelKey="bucket" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <div className="h-full rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] xl:p-6">
            <h2 className="text-h4 font-semibold text-foreground">Override vs Auto-Accept Trend</h2>
            <p className="mt-1 text-caption text-muted-foreground">Weekly override and auto-accept counts</p>
            <div className="mt-4 h-[240px]">
              <ChartContainer config={overrideTrendConfig} className="h-full w-full">
                <BarChart
                  data={overrideVsAutoAcceptTrend}
                  margin={{ top: 8, right: 12, left: -8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={4} fontSize={10} width={32} />
                  <ChartTooltip content={<ChartTooltipContent labelKey="period" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="override" stackId="trend" fill="var(--color-override)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="autoAccept" stackId="trend" fill="var(--color-autoAccept)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Row 3: Data Quality Score Trend + Rejection Reasons Donut */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="xl:col-span-7 2xl:col-span-8"
        >
          <div className="h-full rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] xl:p-6">
            <h2 className="text-h4 font-semibold text-foreground">Data Quality Score Trend</h2>
            <p className="mt-1 text-caption text-muted-foreground">Quality score over time</p>
            <div className="mt-4 h-[260px]">
              <ChartContainer config={dataQualityConfig} className="h-full w-full">
                <LineChart data={dataQualityScoreTrend} margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    domain={[90, 100]}
                    tickFormatter={(v) => `${v}%`}
                    fontSize={10}
                    width={36}
                  />
                  <ChartTooltip content={<ChartTooltipContent labelKey="period" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="var(--color-score)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="xl:col-span-5 2xl:col-span-4"
        >
          <div className="h-full rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] xl:p-6">
            <h2 className="text-h4 font-semibold text-foreground">Rejection Reasons Breakdown</h2>
            <p className="mt-1 text-caption text-muted-foreground">Distribution of rejection reasons</p>
            <div className="mt-4 h-[260px]">
              <ChartContainer config={rejectionConfig} className="h-full w-full">
                <PieChart>
                  <Pie
                    data={rejectionReasonsBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {rejectionReasonsBreakdown.map((_, i) => (
                      <Cell key={i} fill={`hsl(var(--chart-${(i % 5) + 1}))`} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

function KpiCard({
  kpi,
  icon: Icon,
}: {
  kpi: (typeof governanceKpis)[0];
  icon: React.ComponentType<{ className?: string }>;
}) {
  const displayValue = useCountUp(kpi.value, 1200);
  const trend = kpi.trend ?? "neutral";
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] xl:p-4 2xl:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">{kpi.label}</p>
          <p className="mt-1.5 font-sans text-h3 font-bold text-foreground tabular-nums xl:text-h2 2xl:text-h1">
            {displayValue}
            {kpi.unit === "%" ? "%" : ""}
          </p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 2xl:h-9 2xl:w-9">
          <Icon className="h-4 w-4 text-primary 2xl:h-5 2xl:w-5" />
        </div>
      </div>
      {trend !== "neutral" && (
        <div className="mt-2 flex items-center gap-1.5">
          {trend === "up" ? (
            <ArrowUpRight className="h-3 w-3 text-success" />
          ) : trend === "down" ? (
            <ArrowDownRight className="h-3 w-3 text-destructive" />
          ) : (
            <Minus className="h-3 w-3 text-muted-foreground" />
          )}
          <span className={`text-caption font-medium ${trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"}`}>
            vs prior period
          </span>
        </div>
      )}
    </div>
  );
}
