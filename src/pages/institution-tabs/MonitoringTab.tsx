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

/* ── Submission Monitoring Data ── */
const submissionKpis = [
  { label: "Ingestion Success Rate", value: "99.2%", icon: CheckCircle2, color: "text-success" },
  { label: "Schema Drift Alerts", value: "3", icon: AlertTriangle, color: "text-warning" },
  { label: "Duplicate Rate", value: "0.4%", icon: Copy, color: "text-foreground" },
  { label: "Volume Spikes", value: "2", icon: TrendingUp, color: "text-info" },
];

const ingestionTrendData = [
  { day: "Feb 13", success: 4820, failed: 38 },
  { day: "Feb 14", success: 5100, failed: 42 },
  { day: "Feb 15", success: 4950, failed: 35 },
  { day: "Feb 16", success: 5300, failed: 51 },
  { day: "Feb 17", success: 5080, failed: 29 },
  { day: "Feb 18", success: 5250, failed: 44 },
  { day: "Feb 19", success: 5400, failed: 37 },
];

const schemaDriftData = [
  { field: "phone_number", count: 12 },
  { field: "date_of_birth", count: 8 },
  { field: "account_type", count: 5 },
  { field: "currency", count: 3 },
];

/* ── Subscriber Monitoring Data ── */
const subscriberKpis = [
  { label: "API Error Rate", value: "0.18%", icon: ShieldAlert, color: "text-danger" },
  { label: "Rate Limit Breaches", value: "7", icon: Zap, color: "text-warning" },
  { label: "Abuse Detection", value: "0", icon: ShieldAlert, color: "text-success" },
  { label: "Alt Data Latency", value: "142ms", icon: Clock, color: "text-foreground" },
];

const apiErrorTrendData = [
  { day: "Feb 13", errors: 24, requests: 12400 },
  { day: "Feb 14", errors: 18, requests: 13200 },
  { day: "Feb 15", errors: 31, requests: 11800 },
  { day: "Feb 16", errors: 15, requests: 14100 },
  { day: "Feb 17", errors: 22, requests: 13500 },
  { day: "Feb 18", errors: 19, requests: 14800 },
  { day: "Feb 19", errors: 26, requests: 15200 },
];

const rateLimitBreachData = [
  { hour: "06:00", breaches: 0 },
  { hour: "09:00", breaches: 2 },
  { hour: "12:00", breaches: 3 },
  { hour: "15:00", breaches: 1 },
  { hour: "18:00", breaches: 1 },
  { hour: "21:00", breaches: 0 },
];

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
