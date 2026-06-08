import { cn } from "@/lib/utils";
import { tableHeaderClasses } from "@/lib/typography";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  preScreeningLabel,
  preScreeningSummary,
  riskLevelToPreScreeningOutcome,
} from "@/lib/real-estate-bureau/pre-screening";
import type { PropertyReport } from "@/lib/real-estate-bureau/types";

export function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <h2 className="px-5 py-3 text-body font-semibold text-foreground border-b border-border bg-muted/30">
        {title}
      </h2>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PropertyOverviewSection({ report }: { report: PropertyReport }) {
  const rows = [
    ["Property ID", report.propertyId],
    ["Property Type", `${report.propertyType} — ${report.propertySubtype}`],
    ["Address", report.address],
    ["Survey Number", report.surveyNumber],
    ["Registration Number", report.registrationNumber],
    ["Area", report.area],
  ];
  return (
    <ReportSection title="Property Overview">
      <dl className="grid sm:grid-cols-2 gap-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-caption text-muted-foreground">{label}</dt>
            <dd className="text-body font-medium text-foreground mt-0.5">{value}</dd>
          </div>
        ))}
      </dl>
    </ReportSection>
  );
}

export function OwnershipSection({ report }: { report: PropertyReport }) {
  return (
    <ReportSection title="Ownership">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="border-b border-border">
              <th className={cn("text-left py-2 pr-4", tableHeaderClasses)}>Owner Name</th>
              <th className={cn("text-left py-2 pr-4", tableHeaderClasses)}>Ownership %</th>
              <th className={cn("text-left py-2 pr-4", tableHeaderClasses)}>PAN</th>
              <th className={cn("text-left py-2", tableHeaderClasses)}>Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {report.ownership.map((o) => (
              <tr key={o.pan}>
                <td className="py-3 text-body">{o.ownerName}</td>
                <td className="py-3 text-body">{o.ownershipPercent}%</td>
                <td className="py-3 text-caption font-mono">{o.pan}</td>
                <td className="py-3 text-body">{o.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportSection>
  );
}

function MortgageTable({ rows, title }: { rows: PropertyReport["activeMortgageList"]; title: string }) {
  if (rows.length === 0) return null;
  return (
    <ReportSection title={title}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="border-b border-border">
              {["Lender", "Loan Amount", "Outstanding", "Charge Type", "Status"].map((h) => (
                <th key={h} className={cn("text-left py-2 pr-4", tableHeaderClasses)}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((m, i) => (
              <tr key={i}>
                <td className="py-3 text-body">{m.lender}</td>
                <td className="py-3 text-body">{m.loanAmount}</td>
                <td className="py-3 text-body">{m.outstanding}</td>
                <td className="py-3 text-body">{m.chargeType}</td>
                <td className="py-3">
                  <Badge variant="outline" className="text-[10px]">
                    {m.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportSection>
  );
}

export function MortgageSections({ report }: { report: PropertyReport }) {
  return (
    <>
      <MortgageTable rows={report.activeMortgageList} title="Active Mortgage" />
      <MortgageTable rows={report.historicalMortgageList} title="Historical Mortgage" />
    </>
  );
}

export function CersaiFindingsSection({ report }: { report: PropertyReport }) {
  return (
    <ReportSection title="CERSAI Findings">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="border-b border-border">
              {[
                "Security Interest ID",
                "Charge Holder",
                "Charge Type",
                "Secured Amount",
                "Registration Date",
                "Current Status",
              ].map((h) => (
                <th key={h} className={cn("text-left py-2 pr-4", tableHeaderClasses)}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {report.cersaiFindings.map((c) => (
              <tr key={c.securityInterestId}>
                <td className="py-3 text-caption font-mono">{c.securityInterestId}</td>
                <td className="py-3 text-body">{c.chargeHolder}</td>
                <td className="py-3 text-body">{c.chargeType}</td>
                <td className="py-3 text-body">{c.securedAmount}</td>
                <td className="py-3 text-body">{c.registrationDate}</td>
                <td className="py-3">
                  <Badge className="bg-success/20 text-success border-0">{c.currentStatus}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportSection>
  );
}

export function PropertyTimelineSection({ report }: { report: PropertyReport }) {
  return (
    <ReportSection title="Property Timeline">
      <div className="space-y-4">
        {report.timeline.map((t) => (
          <div key={t.year + t.title} className="flex gap-4">
            <div className="shrink-0 w-14 text-caption font-bold text-primary">{t.year}</div>
            <div className="border-l-2 border-primary pl-4 pb-2">
              <p className="text-body font-semibold text-foreground">{t.title}</p>
              <p className="text-caption text-muted-foreground mt-0.5">{t.description}</p>
            </div>
          </div>
        ))}
      </div>
    </ReportSection>
  );
}

export function DocumentCompletenessSection({ report }: { report: PropertyReport }) {
  const iconFor = (status: string) => {
    if (status === "complete") return <CheckCircle2 className="h-4 w-4 text-success" />;
    if (status === "partial") return <AlertCircle className="h-4 w-4 text-warning" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
  };
  return (
    <ReportSection title="Document Completeness">
      <ul className="space-y-2">
        {report.documentChecklist.map((d) => (
          <li key={d.label} className="flex items-center gap-3 py-1.5">
            {iconFor(d.status)}
            <span className="text-body flex-1">{d.label}</span>
            <Badge variant="outline" className="text-[10px] capitalize">
              {d.status}
            </Badge>
          </li>
        ))}
      </ul>
    </ReportSection>
  );
}

const chartConfig = {
  value: { label: "Valuation (₹ Lakh)", color: "hsl(var(--chart-1))" },
};

export function ValuationTrendSection({ report }: { report: PropertyReport }) {
  return (
    <ReportSection title="Property Valuation Trend">
      <ChartContainer config={chartConfig} className="h-[240px] w-full">
        <LineChart data={report.valuationTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit=" L" />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ChartContainer>
    </ReportSection>
  );
}

export function RiskInsightsSection({ report }: { report: PropertyReport }) {
  const severityClass = (s: string) => {
    if (s === "high") return "border-destructive/30 bg-destructive/5";
    if (s === "medium") return "border-warning/30 bg-warning/5";
    return "border-success/30 bg-success/5";
  };
  return (
    <ReportSection title="Risk Insights">
      <div className="space-y-3">
        {report.riskInsights.map((r) => (
          <div
            key={r.title}
            className={cn("rounded-lg border p-4", severityClass(r.severity))}
          >
            <p className="text-body font-semibold text-foreground">{r.title}</p>
            <p className="text-caption text-muted-foreground mt-1">{r.description}</p>
          </div>
        ))}
      </div>
    </ReportSection>
  );
}

export function RecommendationSection({ report }: { report: PropertyReport }) {
  const outcome =
    report.preScreeningOutcome ?? riskLevelToPreScreeningOutcome(report.recommendation);
  const border =
    outcome === "manual_screening_required"
      ? "border-destructive"
      : outcome === "pre_screen_approved"
        ? "border-success"
        : "border-[hsl(var(--risk-medium))]";
  return (
    <ReportSection title="Pre-Screening Recommendation">
      <div className={cn("rounded-lg border-l-4 p-4 bg-muted/20", border)}>
        <p className="text-body font-semibold text-foreground">{preScreeningLabel(outcome)}</p>
        <p className="text-caption text-muted-foreground mt-1">
          Risk classification: {report.recommendation}
        </p>
        <p className="text-body text-muted-foreground mt-2">
          {report.recommendationText || preScreeningSummary(outcome)}
        </p>
      </div>
    </ReportSection>
  );
}

export function InquiryDetailsSection({ report }: { report: PropertyReport }) {
  return (
    <ReportSection title="Inquiry Details">
      <dl className="grid sm:grid-cols-2 gap-3">
        <div>
          <dt className="text-caption text-muted-foreground">Inquiry ID</dt>
          <dd className="text-body font-mono font-medium">{report.inquiryId}</dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">Inquiry Date</dt>
          <dd className="text-body font-medium">{report.inquiryDate}</dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">Inquiry User</dt>
          <dd className="text-body font-medium">{report.inquiryUser}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-caption text-muted-foreground">Search Parameters</dt>
          <dd className="text-body font-medium">{report.searchParameters}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-caption text-muted-foreground">Sources Used</dt>
          <dd className="flex flex-wrap gap-2 mt-1">
            {report.sourcesUsed.map((s) => (
              <Badge key={s} variant="secondary" className="text-[10px]">
                {s}
              </Badge>
            ))}
          </dd>
        </div>
      </dl>
    </ReportSection>
  );
}
