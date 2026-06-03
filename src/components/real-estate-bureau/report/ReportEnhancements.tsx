import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  CheckCircle2,
  ChevronDown,
  Search,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses } from "@/lib/typography";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ReportSection } from "@/components/real-estate-bureau/report/ReportSections";
import type {
  CersaiVerificationStatus,
  PropertyReport,
} from "@/lib/real-estate-bureau/types";

function cersaiStatusClass(status: CersaiVerificationStatus): string {
  if (status === "MATCH FOUND") return "bg-success/15 text-success border-success/30";
  if (status === "PARTIAL MATCH") return "bg-warning/15 text-warning border-warning/30";
  return "bg-destructive/15 text-destructive border-destructive/30";
}

function DetailGrid({ rows }: { rows: [string, string | number][] }) {
  return (
    <dl className="grid sm:grid-cols-2 gap-3">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-caption text-muted-foreground">{label}</dt>
          <dd className="text-body font-medium text-foreground mt-0.5">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CersaiVerificationSummarySection({ report }: { report: PropertyReport }) {
  const c = report.enhancements.cersaiVerification;
  return (
    <ReportSection title="CERSAI Verification Summary">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Shield className="h-4 w-4 text-primary" />
        <Badge variant="outline" className={cn("text-caption font-semibold", cersaiStatusClass(c.status))}>
          {c.status}
        </Badge>
        <span className="text-caption text-muted-foreground">
          Verification Confidence: {c.verificationConfidence}%
        </span>
      </div>
      <DetailGrid
        rows={[
          ["CERSAI Status", c.status],
          ["Security Interests", c.securityInterests],
          ["Active Charges", c.activeCharges],
          ["Released Charges", c.releasedCharges],
          ["Latest Registration", c.latestRegistration],
        ]}
      />
    </ReportSection>
  );
}

export function SecurityInterestDetailsSection({ report }: { report: PropertyReport }) {
  const items = report.enhancements.securityInterestDetails;
  return (
    <ReportSection title="Security Interest Details">
      <div className="space-y-6">
        {items.map((si) => (
          <div
            key={si.securityInterestId}
            className="rounded-lg border border-border bg-muted/10 p-4"
          >
            <DetailGrid
              rows={[
                ["Security Interest ID", si.securityInterestId],
                ["Security Interest Creation Date", si.creationDate],
                ["Type Of Charge", si.typeOfCharge],
                ["Financing Type", si.financingType],
                ["Security Interest Status", si.status],
                ["Registration Timestamp", si.registrationTimestamp],
                ["Charge Position", si.chargePosition],
              ]}
            />
          </div>
        ))}
      </div>
    </ReportSection>
  );
}

export function SecuredCreditorDetailsSection({ report }: { report: PropertyReport }) {
  return (
    <ReportSection title="Secured Creditor Details">
      <div className="space-y-4">
        {report.enhancements.securedCreditors.map((cr) => (
          <DetailGrid
            key={cr.institutionName}
            rows={[
              ["Institution Name", cr.institutionName],
              ["Institution Type", cr.institutionType],
              ["Branch", cr.branch],
              ["Office Name", cr.officeName],
              ["City", cr.city],
              ["State", cr.state],
              ["Charge Rank", cr.chargeRank],
            ]}
          />
        ))}
      </div>
    </ReportSection>
  );
}

export function BorrowerSecurityMappingSection({ report }: { report: PropertyReport }) {
  return (
    <ReportSection title="Borrower to Security Interest Mapping">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="border-b border-border">
              {["Borrower Name", "Role", "Ownership Flag", "Ownership %", "PAN"].map((h) => (
                <th key={h} className={cn("text-left py-2 pr-4", tableHeaderClasses)}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {report.enhancements.borrowerSecurityMapping.map((b) => (
              <tr key={b.pan}>
                <td className="py-3 text-body font-medium">{b.borrowerName}</td>
                <td className="py-3 text-body">{b.role}</td>
                <td className="py-3 text-body">{b.ownershipFlag}</td>
                <td className="py-3 text-body">{b.ownershipPercent}%</td>
                <td className="py-3 text-caption font-mono">{b.pan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportSection>
  );
}

export function CersaiAssetDetailsSection({ report }: { report: PropertyReport }) {
  const a = report.enhancements.cersaiAsset;
  return (
    <ReportSection title="Asset Details from CERSAI">
      <DetailGrid
        rows={[
          ["Asset ID", a.assetId],
          ["Asset Category", a.assetCategory],
          ["Asset Type", a.assetType],
          ["Asset Sub Type", a.assetSubType],
          ["Asset Description", a.assetDescription],
        ]}
      />
    </ReportSection>
  );
}

export function SecurityInterestHistorySection({ report }: { report: PropertyReport }) {
  return (
    <ReportSection title="Security Interest History">
      <div className="space-y-6">
        {report.enhancements.securityInterestHistory.map((ev, idx) => (
          <div key={ev.year + ev.title} className="relative">
            {idx > 0 && <div className="absolute -top-3 left-7 w-px h-3 bg-border" />}
            <div className="flex gap-4">
              <div className="shrink-0 w-14 text-caption font-bold text-primary">{ev.year}</div>
              <div className="flex-1 border-l-2 border-primary pl-4 pb-1">
                <p className="text-body font-semibold text-foreground">{ev.title}</p>
                <p className="text-body text-foreground mt-0.5">{ev.institution}</p>
                <p className="text-caption text-muted-foreground">{ev.amount}</p>
                <Badge variant="outline" className="text-[10px] mt-2">
                  {ev.status}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ReportSection>
  );
}

export function EncumbranceAnalysisSection({ report }: { report: PropertyReport }) {
  const e = report.enhancements.encumbranceAnalysis;
  return (
    <ReportSection title="Encumbrance Analysis">
      <DetailGrid
        rows={[
          ["Known Mortgages", e.knownMortgages],
          ["Active Charges", e.activeCharges],
          ["Released Charges", e.releasedCharges],
          ["Current Exposure", e.currentExposure],
          ["Historical Exposure", e.historicalExposure],
          ["Charge Concentration", e.chargeConcentration],
        ]}
      />
    </ReportSection>
  );
}

export function ChargeHierarchySection({ report }: { report: PropertyReport }) {
  const h = report.enhancements.chargeHierarchy;
  return (
    <ReportSection title="Charge Hierarchy">
      <DetailGrid
        rows={[
          ["First Charge", h.firstCharge],
          ["Second Charge", h.secondCharge],
          ["Pari Passu", h.pariPassu],
        ]}
      />
    </ReportSection>
  );
}

export function CersaiMemberReconciliationSection({ report }: { report: PropertyReport }) {
  const r = report.enhancements.cersaiMemberReconciliation;
  return (
    <ReportSection title="CERSAI vs Member Data Reconciliation">
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-muted/15 p-4">
          <p className="text-caption font-semibold text-foreground mb-2">Member Submitted</p>
          <p className="text-caption text-muted-foreground">Outstanding</p>
          <p className="text-body font-bold text-foreground mt-1">{r.memberOutstanding}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/15 p-4">
          <p className="text-caption font-semibold text-foreground mb-2">CERSAI</p>
          <p className="text-caption text-muted-foreground">Secured Amount</p>
          <p className="text-body font-bold text-foreground mt-1">{r.cersaiSecuredAmount}</p>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-caption font-semibold text-foreground mb-2">Variance</p>
          <p className="text-body font-bold text-foreground">{r.variance}</p>
          <Badge variant="outline" className="text-[10px] mt-2 bg-success/10 text-success border-success/30">
            {r.status}
          </Badge>
        </div>
      </div>
    </ReportSection>
  );
}

export function OwnershipConsistencySection({ report }: { report: PropertyReport }) {
  const o = report.enhancements.ownershipConsistency;
  return (
    <ReportSection title="Ownership Consistency Check">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border p-4">
          <p className="text-caption font-semibold text-foreground mb-3">Member Data</p>
          <ul className="space-y-2">
            {o.memberData.map((p) => (
              <li key={p.name} className="text-body">
                <span className="font-medium">{p.name}</span>{" "}
                <span className="text-muted-foreground">{p.detail}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-caption font-semibold text-foreground mb-3">CERSAI</p>
          <ul className="space-y-2">
            {o.cersaiData.map((p) => (
              <li key={p.name} className="text-body">
                <span className="font-medium">{p.name}</span>{" "}
                <span className="text-muted-foreground">{p.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
        <span className="text-body font-semibold text-foreground">
          Consistency Result: {o.result}
        </span>
      </div>
    </ReportSection>
  );
}

export function AdvancedBureauInsightsSection({ report }: { report: PropertyReport }) {
  return (
    <ReportSection title="Advanced Risk Insights">
      <ul className="space-y-2">
        {report.enhancements.advancedBureauInsights.map((item) => (
          <li key={item.text} className="flex items-start gap-2 text-body">
            {item.tone === "positive" ? (
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            )}
            <span className="text-foreground">{item.text}</span>
          </li>
        ))}
      </ul>
    </ReportSection>
  );
}

export function PropertyGraphSection({ report }: { report: PropertyReport }) {
  const { nodes, edges } = report.enhancements.propertyGraph;
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <ReportSection title="Property Graph View">
      <p className="text-caption text-muted-foreground mb-4">
        Internal property graph — relationships across property, owners, mortgages, banks, and
        security interests.
      </p>
      <div className="flex flex-col items-center gap-1 py-4">
        {nodes.map((node, i) => (
          <div key={node.id} className="flex flex-col items-center">
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-6 py-3 min-w-[200px] text-center">
              <p className="text-caption text-muted-foreground uppercase tracking-wider text-[9px]">
                {node.label === "Property" ? "Property Node" : node.label.includes("Mortgage") ? "Mortgage" : node.label.includes("Security") ? "CERSAI" : "Owner"}
              </p>
              <p className="text-body font-semibold text-foreground mt-0.5">{node.label}</p>
            </div>
            {i < edges.length && (
              <ArrowDown className="h-5 w-5 text-muted-foreground my-1" aria-hidden />
            )}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        Edges: {edges.map((e) => `${nodeMap[e.from]?.label ?? e.from} → ${nodeMap[e.to]?.label ?? e.to}`).join(" · ")}
      </p>
    </ReportSection>
  );
}

export function DataSourceContributionSection({ report }: { report: PropertyReport }) {
  const items = report.enhancements.dataSourceContribution;
  return (
    <ReportSection title="Data Source Contribution">
      <div className="space-y-3">
        {items.map((d) => (
          <div key={d.source}>
            <div className="flex justify-between text-caption mb-1">
              <span className="text-foreground font-medium">{d.source}</span>
              <span className="text-muted-foreground">{d.percent}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${d.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </ReportSection>
  );
}

export function RawCersaiDetailSection({ report }: { report: PropertyReport }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const json = useMemo(
    () => JSON.stringify(report.enhancements.rawCersaiPayload, null, 2),
    [report.enhancements.rawCersaiPayload]
  );
  const display = useMemo(() => {
    if (!filter.trim()) return json;
    const q = filter.toLowerCase();
    return json
      .split("\n")
      .filter((line) => line.toLowerCase().includes(q))
      .join("\n");
  }, [json, filter]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between px-5 py-3 text-body font-semibold text-foreground border-b border-border bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <span>Raw CERSAI Record (Service II)</span>
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-5 space-y-3">
            <p className="text-caption text-muted-foreground">
              Audit, operations, and compliance view — complete Service II payload.
            </p>
            <div className="relative max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search in JSON…"
                className="h-8 pl-8 text-caption"
              />
            </div>
            <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-muted/20 p-4 text-[11px] leading-relaxed font-mono text-foreground">
              {display || "No matching lines."}
            </pre>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function DetailedAuditDivider() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-border" />
      <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
        Detailed Audit View
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
