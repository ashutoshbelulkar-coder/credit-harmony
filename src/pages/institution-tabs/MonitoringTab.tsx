import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, parse, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { CheckCircle2, AlertTriangle, Copy, TrendingUp, ShieldAlert, Clock, Zap } from "lucide-react";
import tabsData from "@/data/institution-tabs.json";

const ICON_MAP = { CheckCircle2, AlertTriangle, Copy, TrendingUp, ShieldAlert, Clock, Zap } as const;
type IconKey = keyof typeof ICON_MAP;

const { ingestionTrendData, schemaDriftData, apiErrorTrendData, rateLimitBreachData } = tabsData.monitoring;

const submissionKpis = tabsData.monitoring.submissionKpis.map((k) => ({
  ...k,
  icon: ICON_MAP[k.iconKey as IconKey],
}));

const subscriberKpis = tabsData.monitoring.subscriberKpis.map((k) => ({
  ...k,
  icon: ICON_MAP[k.iconKey as IconKey],
}));

const ingestionConfig: ChartConfig = {
  success: { label: "Success", color: "hsl(var(--success))" },
  failed: { label: "Failed", color: "hsl(var(--danger))" },
};

const driftConfig: ChartConfig = {
  count: { label: "Drift Count", color: "hsl(var(--warning))" },
};

const errorConfig: ChartConfig = {
  errors: { label: "Errors", color: "hsl(var(--danger))" },
};

const breachConfig: ChartConfig = {
  breaches: { label: "Breaches", color: "hsl(var(--warning))" },
};

const TREND_REF_YEAR = 2026;

function dayLabelInRange(dayLabel: string, fromStr: string, toStr: string): boolean {
  if (!fromStr?.trim() || !toStr?.trim()) return true;
  const d = parse(dayLabel.trim(), "MMM d", new Date(TREND_REF_YEAR, 0, 1));
  if (Number.isNaN(d.getTime())) return true;
  const from = startOfDay(new Date(`${fromStr}T12:00:00`));
  const to = endOfDay(new Date(`${toStr}T12:00:00`));
  return isWithinInterval(d, { start: from, end: to });
}

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
          <p className={cn("text-h3 font-bold mt-1", color)}>{value}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
    </div>
  );
}

export default function MonitoringTab({ isDataSubmitter, isSubscriber }: { isDataSubmitter: boolean; isSubscriber: boolean }) {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(now, "yyyy-MM-dd"));

  const filteredIngestion = useMemo(
    () => ingestionTrendData.filter((row) => dayLabelInRange(row.day, dateFrom, dateTo)),
    [dateFrom, dateTo]
  );
  const filteredApiErrors = useMemo(
    () => apiErrorTrendData.filter((row) => dayLabelInRange(row.day, dateFrom, dateTo)),
    [dateFrom, dateTo]
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-h4 font-semibold text-foreground">Monitoring</h3>
        <p className="text-caption text-muted-foreground mt-1">Real-time health and performance metrics.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-caption font-medium text-muted-foreground mb-3">Date range (charts)</p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">From</Label>
            <DatePicker value={dateFrom} onChange={setDateFrom} className="h-9 text-caption" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">To</Label>
            <DatePicker value={dateTo} onChange={setDateTo} className="h-9 text-caption" />
          </div>
        </div>
        <p className="text-caption text-muted-foreground mt-2">
          Defaults to the current month through today. Trend series use labeled days in {TREND_REF_YEAR}.
        </p>
      </div>

      {isDataSubmitter && (
        <div className="space-y-6">
          <h4 className="text-body font-semibold text-foreground">Data Submission Monitoring</h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {submissionKpis.map((k) => (
              <KpiCard key={k.label} {...k} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <h4 className="text-body font-semibold text-foreground mb-4">Ingestion Trend (7d)</h4>
              <ChartContainer config={ingestionConfig} className="h-[220px] w-full">
                <LineChart data={filteredIngestion.length ? filteredIngestion : ingestionTrendData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="success" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="failed" stroke="hsl(var(--danger))" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </div>
            <div className="bg-card rounded-xl border border-border p-6">
              <h4 className="text-body font-semibold text-foreground mb-4">Schema Drift Alerts</h4>
              <ChartContainer config={driftConfig} className="h-[220px] w-full">
                <BarChart data={schemaDriftData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="field" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </div>
      )}

      {isSubscriber && (
        <div className="space-y-6">
          {isDataSubmitter && <div className="border-t border-border" />}
          <h4 className="text-body font-semibold text-foreground">Subscriber Monitoring</h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {subscriberKpis.map((k) => (
              <KpiCard key={k.label} {...k} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <h4 className="text-body font-semibold text-foreground mb-4">API Error Trend (7d)</h4>
              <ChartContainer config={errorConfig} className="h-[220px] w-full">
                <LineChart data={filteredApiErrors.length ? filteredApiErrors : apiErrorTrendData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="errors" stroke="hsl(var(--danger))" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </div>
            <div className="bg-card rounded-xl border border-border p-6">
              <h4 className="text-body font-semibold text-foreground mb-4">Rate Limit Breaches (Today)</h4>
              <ChartContainer config={breachConfig} className="h-[220px] w-full">
                <BarChart data={rateLimitBreachData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="breaches" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
