import { cn } from "@/lib/utils";
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
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-h4 font-semibold text-foreground">Monitoring</h3>
        <p className="text-caption text-muted-foreground mt-1">Real-time health and performance metrics.</p>
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
                <LineChart data={ingestionTrendData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
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
                <LineChart data={apiErrorTrendData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
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
