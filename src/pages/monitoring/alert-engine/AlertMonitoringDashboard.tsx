import { useState } from "react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses, badgeTextClasses } from "@/lib/typography";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  alertsTriggeredOverTime as mockTriggeredOverTime,
  alertsByDomain as mockAlertsByDomain,
  severityDistribution as mockSeverityDist,
  mttrTrendData as mockMttrTrend,
  type ActiveAlert,
  type AlertStatus,
} from "@/data/alert-engine-mock";
import { ArrowUpCircle, CheckCircle2, MoreHorizontal, Search } from "lucide-react";
import { useAlertIncidents, useResolveIncident, useAcknowledgeIncident, useAlertCharts } from "@/hooks/api/useAlerts";
import { useInstitutions } from "@/hooks/api/useInstitutions";
import { institutionDisplayLabel } from "@/lib/institutions-display";
import type { AlertIncidentResponse } from "@/services/alerts.service";

/** Map API AlertIncidentResponse → mock ActiveAlert shape (UI uses snake_case fields) */
function toActiveAlert(r: AlertIncidentResponse): ActiveAlert {
  return {
    alert_id: r.alertId,
    domain: r.domain,
    metric: r.metric,
    current_value: r.currentValue,
    threshold: r.threshold,
    severity: r.severity as ActiveAlert["severity"],
    triggered_at: r.triggeredAt,
    status: r.status as AlertStatus,
  };
}

const cardClass =
  "bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]";

const chartCardClass =
  "bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]";

const severityStyles: Record<string, string> = {
  Critical: "border border-destructive/30 bg-destructive/10 text-destructive",
  Warning: "border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Info: "border border-border bg-muted/80 text-muted-foreground",
};

const statusStyles: Record<AlertStatus, string> = {
  Active: "border border-primary/30 bg-primary/10 text-primary",
  Acknowledged: "border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Resolved: "border border-success/30 bg-success/10 text-success",
};

const alertsOverTimeConfig = { count: { label: "Alerts", color: "hsl(var(--primary))" } } satisfies ChartConfig;
const alertsByDomainConfig = { count: { label: "Count", color: "hsl(var(--primary))" } } satisfies ChartConfig;
const mttrConfig = { minutes: { label: "MTTR (min)", color: "hsl(var(--warning))" } } satisfies ChartConfig;
const donutColors = ["hsl(var(--destructive))", "hsl(var(--warning))", "hsl(var(--muted-foreground))"];

const TABLE_ROW_CLASS = "h-12 max-h-12";
const TABLE_HEADER_CLASS = cn("px-5 py-3", tableHeaderClasses);

export function AlertMonitoringDashboard() {
  const { data: apiIncidents } = useAlertIncidents();
  const { data: apiCharts } = useAlertCharts();
  const { data: institutionsPage } = useInstitutions({ size: 10 });
  const { mutate: resolveIncident, isPending: resolving } = useResolveIncident();
  const { mutate: acknowledgeIncident } = useAcknowledgeIncident();

  const [institution, setInstitution] = useState("all");
  const [search, setSearch] = useState("");

  const alerts: ActiveAlert[] = (() => {
    if (!apiIncidents) return [];
    const rows = Array.isArray(apiIncidents)
      ? apiIncidents
      : (apiIncidents as { content?: AlertIncidentResponse[] }).content ?? [];
    return rows.map(toActiveAlert);
  })();

  // Chart data — use API data when available, fall back to static mock
  const alertsTriggeredOverTime = apiCharts?.triggeredOverTime ?? mockTriggeredOverTime;
  const alertsByDomain = apiCharts?.byDomain ?? mockAlertsByDomain;
  const severityDistribution = apiCharts?.severityDistribution ?? mockSeverityDist;
  const mttrTrendData = apiCharts?.mttrTrend ?? mockMttrTrend;

  const filteredAlerts = alerts.filter((a) => {
    // Text search across ID, domain, metric, current value
    if (search) {
      const q = search.toLowerCase();
      if (!a.alert_id.toLowerCase().includes(q) &&
          !a.domain.toLowerCase().includes(q) &&
          !a.metric.toLowerCase().includes(q) &&
          !a.current_value.toLowerCase().includes(q)) return false;
    }
    // Institution filter — applied when a specific institution is selected
    // Alert records carry an optional institution_id field; filter is skipped when "all"
    if (institution !== "all") {
      const alertInstitution = (a as typeof a & { institution_id?: string }).institution_id;
      if (alertInstitution && alertInstitution !== institution) return false;
    }
    return true;
  });

  const institutionOptions = [
    { value: "all", label: "All institutions" },
    ...(institutionsPage?.content ?? []).slice(0, 8).map((i) => ({
      value: String(i.id),
      label: institutionDisplayLabel(i),
    })),
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <section className="flex flex-1 flex-col min-h-0 gap-3">
        {/* Toolbar: single row, 36px */}
        <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Select value={institution} onValueChange={setInstitution}>
            <SelectTrigger className="h-9 w-full sm:w-[200px] text-body" id="alert-institution">
              <SelectValue placeholder="Source name" />
            </SelectTrigger>
            <SelectContent>
              {institutionOptions.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-body">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1 sm:max-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search alerts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-body"
            />
          </div>
        </div>

        {/* Table card: page scroll; table scrolls horizontally only */}
        <div className={cn(cardClass, "min-w-0")}>
          <h4 className="text-body font-semibold text-foreground mb-4 shrink-0">Active Alerts</h4>
          <div className="min-w-0 overflow-x-auto overflow-y-visible">
            <table className="w-full border-collapse min-w-[720px]">
              <thead className="sticky top-0 z-10 bg-[hsl(var(--table-header-bg))] backdrop-blur border-b border-border">
                <tr className={TABLE_ROW_CLASS}>
                  <th className={cn(TABLE_HEADER_CLASS, "text-left w-[100px] min-w-[100px]")}>Alert ID</th>
                  <th className={cn(TABLE_HEADER_CLASS, "text-left w-[110px] min-w-[110px]")}>Domain</th>
                  <th className={cn(TABLE_HEADER_CLASS, "text-left w-[100px] min-w-[100px]")}>Metric</th>
                  <th className={cn(TABLE_HEADER_CLASS, "text-left w-[72px] min-w-[72px]")}>Current</th>
                  <th className={cn(TABLE_HEADER_CLASS, "text-left w-[80px] min-w-[80px]")}>Threshold</th>
                  <th className={cn(TABLE_HEADER_CLASS, "text-left w-[72px] min-w-[72px]")}>Severity</th>
                  <th className={cn(TABLE_HEADER_CLASS, "text-left w-[120px] min-w-[120px] xl:whitespace-nowrap")}>
                    <span className="xl:inline">Trigger Time</span>
                    <span className="hidden xl:inline"> </span>
                  </th>
                  <th className={cn(TABLE_HEADER_CLASS, "text-left w-[72px] min-w-[72px]")}>Status</th>
                  <th className={cn(TABLE_HEADER_CLASS, "text-right w-[88px] min-w-[88px]")}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAlerts.map((a) => (
                  <tr
                    key={a.alert_id}
                    className={cn(TABLE_ROW_CLASS, "hover:bg-muted/40 transition-colors duration-150")}
                  >
                    <td className="px-5 py-4 text-caption font-medium text-foreground">{a.alert_id}</td>
                    <td className="px-5 py-4 text-caption text-muted-foreground">{a.domain}</td>
                    <td className="px-5 py-4 text-body text-foreground">{a.metric}</td>
                    <td className="px-5 py-4 text-caption tabular-nums">{a.current_value}</td>
                    <td className="px-5 py-4 text-caption text-muted-foreground">{a.threshold}</td>
                    <td className="px-5 py-4">
                      <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 font-medium", badgeTextClasses, severityStyles[a.severity])}>
                        {a.severity}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-caption text-muted-foreground whitespace-nowrap">{a.triggered_at}</td>
                    <td className="px-5 py-4">
                      <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 font-medium", badgeTextClasses, statusStyles[a.status])}>
                        {a.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="hidden lg:flex items-center justify-end gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                              disabled={resolving}
                              onClick={() => resolveIncident(a.alert_id)}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">Resolve</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => acknowledgeIncident(a.alert_id)}
                            >
                              <ArrowUpCircle className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">Acknowledge</TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="lg:hidden">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => resolveIncident(a.alert_id)}>
                              Resolve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => acknowledgeIncident(a.alert_id)}>
                              Acknowledge
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          </div>
        </div>

        {/* Charts: same card and chart dimensions as project theme */}
        <div className="shrink-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={chartCardClass}>
            <h4 className="text-body font-semibold text-foreground mb-4">Alerts Over Time</h4>
            <ChartContainer config={alertsOverTimeConfig} className="h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full">
              <LineChart data={alertsTriggeredOverTime} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </div>
          <div className={chartCardClass}>
            <h4 className="text-body font-semibold text-foreground mb-4">By Domain</h4>
            <ChartContainer config={alertsByDomainConfig} className="h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full">
              <BarChart data={alertsByDomain} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="domain" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        <div className="shrink-0 grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
          <div className={chartCardClass}>
            <h4 className="text-body font-semibold text-foreground mb-4">Severity Distribution</h4>
            <ChartContainer
              config={{ Critical: { label: "Critical", color: "hsl(var(--destructive))" }, Warning: { label: "Warning", color: "hsl(var(--warning))" }, Info: { label: "Info", color: "hsl(var(--muted-foreground))" } }}
              className="h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full"
            >
              <PieChart>
                <Pie data={severityDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80}>
                  {severityDistribution.map((_, i) => (
                    <Cell key={i} fill={donutColors[i]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </div>
          <div className={chartCardClass}>
            <h4 className="text-body font-semibold text-foreground mb-4">Mean Time to Resolution (MTTR)</h4>
            <ChartContainer config={mttrConfig} className="h-[200px] min-h-[200px] md:h-[220px] laptop:h-[240px] w-full">
              <LineChart data={mttrTrendData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="minutes" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}
