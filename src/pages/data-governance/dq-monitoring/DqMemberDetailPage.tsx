import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Star } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { detailPageTabTriggerBaseClasses, tableHeaderClasses } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv-export";
import { toast } from "sonner";
import {
  DQ_PORTFOLIO_MEDIAN,
  getMemberDetail,
  formatInt,
} from "@/data/dq-monitoring-mock";
import { useDqMonitoring } from "./dq-context";
import {
  DqDelta,
  DqEmptyState,
  DqEventStatusPill,
  DqFileMonitoringLink,
  DqGradePill,
  DqSeverityPill,
} from "./dq-shared";

const trendConfig = {
  dqi: { label: "DQI", color: "hsl(var(--primary))" },
  acceptedPct: { label: "Acceptance %", color: "hsl(var(--secondary))" },
} satisfies ChartConfig;

const DIMS = [
  { key: "validity" as const, label: "Validity", weight: 40 },
  { key: "completeness" as const, label: "Completeness", weight: 35 },
  { key: "dupIntegrity" as const, label: "Duplicates & Integrity", weight: 25 },
];

export default function DqMemberDetailPage() {
  const { memberId = "FNB" } = useParams();
  const navigate = useNavigate();
  const { watchlist, toggleWatchlist, loading } = useDqMonitoring();
  const detail = getMemberDetail(memberId);
  const [tab, setTab] = useState("trend");
  const [hourly, setHourly] = useState(false);

  if (loading) return <p className="text-caption text-muted-foreground">Loading member…</p>;
  if (!detail) return <DqEmptyState message="Member not found." />;

  const m = detail.member;
  const delta = m.dqi - m.dqiPrev;

  return (
    <div className="space-y-4">
      <Button type="button" variant="ghost" size="sm" className="h-8 -ml-2 text-caption" onClick={() => navigate("/data-governance/data-quality-monitoring/members")}>
        <ArrowLeft className="mr-1 h-3.5 w-3.5" />
        Members
      </Button>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-h3 font-semibold text-foreground">{m.name}</h2>
              <DqGradePill grade={m.grade} />
              <span className="text-h3 font-bold tabular-nums text-foreground">{m.dqi.toFixed(1)}</span>
              <DqDelta value={delta} />
            </div>
            <p className="mt-1 text-caption text-muted-foreground">
              {m.id} · {m.tier} · {m.sourceTypes.join(", ")} · {m.contact}
            </p>
            <p className="mt-1 text-caption text-muted-foreground">
              {detail.batchCount} batches this period · {detail.apiSourceTypeCount} API source types
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-caption"
              onClick={() => toggleWatchlist(m.id)}
            >
              <Star className={cn("h-3.5 w-3.5", watchlist.has(m.id) ? "fill-warning text-warning" : "")} />
              Watchlist
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-caption"
              onClick={() => {
                exportToCsv("dq_member_scorecard", [m], [
                  { key: "id", label: "ID" },
                  { key: "name", label: "Member" },
                  { key: "dqi", label: "DQI" },
                  { key: "grade", label: "Grade" },
                  { key: "validity", label: "Validity" },
                  { key: "completeness", label: "Completeness" },
                  { key: "dupIntegrity", label: "Dup & Integrity" },
                ]);
                toast.success("Scorecard downloaded.");
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Download scorecard
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="mb-3 flex w-full flex-wrap gap-1 bg-muted/60 p-1">
            {["trend", "dimensions", "issues", "submissions", "events"].map((t) => (
              <TabsTrigger key={t} value={t} className={detailPageTabTriggerBaseClasses}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="trend" className="space-y-3">
            <div className="flex justify-end">
              <Button type="button" size="sm" variant={hourly ? "default" : "outline"} className="h-7 text-caption" onClick={() => setHourly((h) => !h)}>
                Hourly (API)
              </Button>
            </div>
            <div className="h-[260px]">
              <ChartContainer config={trendConfig} className="h-full w-full" aria-label={`${m.name} DQI trend`}>
                <LineChart data={detail.trend} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <ReferenceArea y1={90} y2={100} fill="hsl(var(--success))" fillOpacity={0.06} />
                  <ReferenceArea y1={80} y2={90} fill="hsl(var(--primary))" fillOpacity={0.04} />
                  <ReferenceArea y1={70} y2={80} fill="hsl(var(--warning))" fillOpacity={0.05} />
                  <ReferenceArea y1={60} y2={70} fill="hsl(var(--crif-orange))" fillOpacity={0.05} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval={hourly ? 0 : 4} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
                  <ReferenceLine y={DQ_PORTFOLIO_MEDIAN} stroke="hsl(var(--crif-orange))" strokeDasharray="4 4" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="dqi" stroke="var(--color-dqi)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="acceptedPct" stroke="var(--color-acceptedPct)" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ChartContainer>
            </div>
            <p className="text-caption text-muted-foreground">Orange dashed line is portfolio median {DQ_PORTFOLIO_MEDIAN}.</p>
          </TabsContent>

          <TabsContent value="dimensions" className="space-y-4">
            {DIMS.map((d) => {
              const value = m[d.key];
              const prev = d.key === "validity" ? value - 0.4 : d.key === "completeness" ? value - 0.2 : value + 0.1;
              return (
                <div key={d.key}>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-body font-medium text-foreground">
                      {d.label} <span className="text-caption text-muted-foreground">({d.weight}%)</span>
                    </p>
                    <span className="flex items-center gap-2">
                      <span className="text-body tabular-nums font-semibold">{value.toFixed(0)}</span>
                      <DqDelta value={value - prev} />
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="issues">
            <table className="w-full min-w-[640px] text-body">
              <thead>
                <tr className="border-b">
                  {["Error code", "Field", "Severity", "Records"].map((h) => (
                    <th key={h} className={cn(tableHeaderClasses, "h-10 px-3 text-left")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detail.issues.map((i) => (
                  <tr key={`${i.code}-${i.field}`} className="border-b">
                    <td className="px-3 py-2">
                      <Link to={`/data-governance/data-quality-monitoring/issues?issue=${i.code}`} className="text-primary hover:underline">
                        {i.code}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{i.field}</td>
                    <td className="px-3 py-2"><DqSeverityPill severity={i.severity} /></td>
                    <td className="px-3 py-2 tabular-nums">{formatInt(i.records)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-4">
            <p className="text-caption font-medium text-muted-foreground">Batches</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-body">
                <thead>
                  <tr className="border-b">
                    {["Batch ID", "Evaluated", "Accepted", "Rejected", "DQI", ""].map((h) => (
                      <th key={h} className={cn(tableHeaderClasses, "h-10 px-3 text-left")}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detail.batches.slice(0, 12).map((b) => (
                    <tr key={b.batchId} className="border-b">
                      <td className="px-3 py-2 tabular-nums">{b.batchId}</td>
                      <td className="px-3 py-2 tabular-nums">{formatInt(b.evaluated)}</td>
                      <td className="px-3 py-2 tabular-nums">{formatInt(b.accepted)}</td>
                      <td className="px-3 py-2 tabular-nums">{formatInt(b.rejected)}</td>
                      <td className="px-3 py-2 tabular-nums">{b.dqi.toFixed(1)}</td>
                      <td className="px-3 py-2"><DqFileMonitoringLink batchId={b.batchId} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-caption font-medium text-muted-foreground">API days</p>
            {detail.apiDays.length === 0 ? (
              <p className="text-caption text-muted-foreground">No API daily assessments in this window.</p>
            ) : (
              <ul className="space-y-1">
                {detail.apiDays.slice(0, 8).map((a) => (
                  <li key={a.id} className="text-body">
                    {a.date} · {a.sourceType} · {formatInt(a.records)} records · {a.acceptedPct.toFixed(1)}% accepted
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="events">
            {detail.events.length === 0 ? (
              <p className="text-caption text-muted-foreground">No threshold events for this member.</p>
            ) : (
              <table className="w-full min-w-[720px] text-body">
                <thead>
                  <tr className="border-b">
                    {["Batch ID", "Stage", "Status", "Age"].map((h) => (
                      <th key={h} className={cn(tableHeaderClasses, "h-10 px-3 text-left")}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detail.events.map((e) => (
                    <tr key={e.id} className="border-b">
                      <td className="px-3 py-2">{e.batchId}</td>
                      <td className="px-3 py-2">{e.stageLabel}</td>
                      <td className="px-3 py-2"><DqEventStatusPill status={e.status} /></td>
                      <td className="px-3 py-2">{e.age}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
