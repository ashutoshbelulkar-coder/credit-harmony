import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileSearch,
  Flag,
  GitBranch,
  GitCompare,
  History,
  Users,
} from "lucide-react";

import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { badgeTextClasses, detailPageTabTriggerBaseClasses, tableHeaderClasses } from "@/lib/typography";

import { catalogLabelForPacketId, formatImpactOption } from "@/data/data-products-mock";
import {
  BRD_STATUS_LABEL,
  LOCAL_CPO_LABEL,
  type BrdLifecycleStatus,
  type DemoProductVersion,
  type Subscription,
} from "@/data/product-management-types";
import { ProductStatusBadge } from "@/components/data-products/ProductStatusBadge";
import { VersionLifecycleActions, ManageLifecycleMenu } from "@/components/data-products/VersionLifecycleActions";
import { VersionSwitcher } from "@/components/data-products/VersionSwitcher";
import { VersionStateBanner } from "@/components/data-products/VersionStateBanner";
import {
  AttributeModeBadge,
  AttributeSensitivityChip,
  AttributeTypeChip,
  PopulatedByChip,
  PortStatusBadge,
  SensitivityBadge,
} from "@/components/data-products/AttributeBadges";
import { getDictionaryPacket } from "@/data/attribute-dictionary";
import {
  productMgmtStore,
  useProductMgmtStore,
  useProductMgmtVersion,
} from "@/lib/product-management-demo-store";

type IconComponent = React.ComponentType<{ className?: string }>;

const LIVE_STATUSES = new Set<BrdLifecycleStatus>([
  "active",
  "deprecated",
  "inactive",
  "archived",
]);

const SCOPE_LABEL: Record<string, string> = {
  SELF: "Self Data",
  NETWORK: "Network Data",
  CONSORTIUM: "Consortium Data",
  VERTICAL: "Vertical Data",
};

const CHANNEL_LABEL: Record<string, string> = {
  ENQUIRY_API: "Enquiry API",
  BATCH_EXTRACT: "Batch extract",
};

const SUBSCRIPTION_STATUS_STYLES: Record<Subscription["status"], string> = {
  pending: "bg-warning/15 text-warning",
  active: "bg-success/15 text-success",
  expired: "bg-muted text-muted-foreground",
  rejected: "bg-destructive/15 text-destructive",
};

const LEGAL_TRUNCATE_LENGTH = 220;

const productDetailTabTriggerClasses = cn(
  detailPageTabTriggerBaseClasses,
  "text-muted-foreground hover:bg-muted hover:text-foreground",
  "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
);

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

/** Approval attribution — never blank for a non-draft version (BRD Phase 9 expectation). */
function getApprovalInfo(version: DemoProductVersion): { by: string; at: string | null } {
  const approvedCycle = [...version.approvalCycles].reverse().find((c) => c.status === "approved");
  const decision = [...(approvedCycle?.decisions ?? [])].reverse().find((d) => d.decision === "approve");
  if (decision) return { by: decision.actor, at: decision.at };

  const audit = productMgmtStore
    .getAuditEvents({ versionId: version.id })
    .find((e) => e.action === "approved");
  if (audit) return { by: audit.actor, at: audit.at };

  if (version.status === "draft") return { by: "", at: null };
  return { by: LOCAL_CPO_LABEL, at: null };
}

function getActivatedAt(version: DemoProductVersion): string | null {
  const audit = productMgmtStore
    .getAuditEvents({ versionId: version.id })
    .find((e) => e.action === "activated" || e.action === "reactivated");
  if (audit?.at) return audit.at;
  if (LIVE_STATUSES.has(version.status) && version.metadata.effectiveStart) {
    return version.metadata.effectiveStart;
  }
  return null;
}

function getWindDown(
  version: DemoProductVersion,
  subscriptions: Subscription[]
): { daysRemaining: number; notMigrated: number } | null {
  if (version.status !== "deprecated" || !version.deprecationNoticeAt || !version.deprecationWindowDays) {
    return null;
  }
  const noticeAt = new Date(version.deprecationNoticeAt).getTime();
  const deadline = noticeAt + version.deprecationWindowDays * 24 * 60 * 60 * 1000;
  const daysRemaining = Math.max(0, Math.ceil((deadline - Date.now()) / (24 * 60 * 60 * 1000)));
  const notMigrated = subscriptions.filter(
    (s) => s.pinnedVersionId === version.id && s.status === "active"
  ).length;
  return { daysRemaining, notMigrated };
}

function SubscriptionStatusBadge({ status }: { status: Subscription["status"] }) {
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full capitalize",
        badgeTextClasses,
        SUBSCRIPTION_STATUS_STYLES[status]
      )}
    >
      {status}
    </span>
  );
}

function EmptyState({
  icon: Icon,
  message,
  action,
}: {
  icon: IconComponent;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 py-10 text-center">
      <Icon className="w-8 h-8 text-muted-foreground/50" />
      <p className="text-caption text-muted-foreground max-w-sm">{message}</p>
      {action}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-caption text-muted-foreground">{label}</p>
      <div className="text-body text-foreground mt-0.5">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-caption">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right">{value}</span>
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="max-w-6xl space-y-6 animate-fade-in">
      <Skeleton className="h-4 w-64" />
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-10 w-full max-w-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

function OverviewTab({
  product,
  onOpenPacketContract,
}: {
  product: DemoProductVersion;
  onOpenPacketContract: (packetId: string) => void;
}) {
  const [releaseExpanded, setReleaseExpanded] = useState(false);

  const releaseNote = product.metadata.releaseNote || "—";
  const releaseIsLong = releaseNote.length > LEGAL_TRUNCATE_LENGTH;
  const releaseDisplay =
    releaseIsLong && !releaseExpanded
      ? `${releaseNote.slice(0, LEGAL_TRUNCATE_LENGTH).trimEnd()}…`
      : releaseNote;

  const publishedAt = getActivatedAt(product) ?? product.metadata.effectiveStart ?? null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-body text-muted-foreground">
            {product.description || "No description provided."}
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-caption">
            <InfoField label="Business unit" value={product.metadata.businessUnit || "—"} />
            <InfoField label="Segment" value={product.metadata.targetSegment || "—"} />
            <InfoField label="SAP item code" value={product.metadata.sapItemCode || "—"} />
            <InfoField
              label="Subject scope"
              value={
                product.subjectScope === "COMPANY"
                  ? "Company"
                  : product.subjectScope === "BOTH"
                    ? "Both"
                    : "Individual"
              }
            />
            <InfoField
              label="Dictionary version"
              value={product.dictionaryVersion || "—"}
            />
            <InfoField
              label="Sensitivity"
              value={<SensitivityBadge value={product.metadata.sensitivity} />}
            />
            <InfoField
              label="Effective start"
              value={product.metadata.effectiveStart ?? "—"}
            />
            <InfoField label="Environment" value="Demo" />
            <InfoField
              label="Published"
              value={publishedAt ? formatDate(publishedAt) : "Not yet published"}
            />
          </div>

          <div className="space-y-1.5 border-t border-border pt-3">
            <p className="text-caption font-medium text-foreground">Release note</p>
            <p className="text-caption text-muted-foreground whitespace-pre-wrap">{releaseDisplay}</p>
            {releaseIsLong && (
              <button
                type="button"
                className="text-caption text-primary hover:underline"
                onClick={() => setReleaseExpanded((v) => !v)}
              >
                {releaseExpanded ? "Show less" : "More"}
              </button>
            )}
          </div>

          {product.policyWarnings.length > 0 && (
            <div className="space-y-2 border-t border-border pt-3">
              {product.policyWarnings.map((w, i) => (
                <div
                  key={`${w.code}-${i}`}
                  className={cn(
                    "flex items-start gap-2 rounded-md px-3 py-2 text-caption",
                    w.severity === "critical"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-warning/10 text-warning"
                  )}
                >
                  <Flag className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{w.message}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Enquiry settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-caption">
            <InfoRow
              label="Scope"
              value={SCOPE_LABEL[product.enquiryConfig.scope] ?? product.enquiryConfig.scope}
            />
            <InfoRow
              label="Soft enquiry"
              value={formatImpactOption(product.enquiryConfig.soft, "Soft").replace(/^Soft:\s*/, "")}
            />
            <InfoRow
              label="Hard enquiry"
              value={formatImpactOption(product.enquiryConfig.hard, "Hard").replace(/^Hard:\s*/, "")}
            />
            <InfoRow
              label="Trended data"
              value={
                product.trendedConfig.enabled
                  ? `Enabled · up to ${product.trendedConfig.maxHistoryMonths} months`
                  : "Disabled"
              }
            />
            <InfoRow
              label="Retro retrieval"
              value={
                product.retroConfig?.enabled
                  ? `Enabled · up to ${product.retroConfig.maxHistoryMonths} months`
                  : "Disabled"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Composed packets</CardTitle>
          </CardHeader>
          <CardContent>
            {product.packetIds.length === 0 ? (
              <p className="text-caption text-muted-foreground">No packets configured.</p>
            ) : (
              <ul className="space-y-2">
                {product.packetIds.map((pid) => {
                  const cfg = product.packetConfigs.find((c) => c.packetId === pid);
                  const streams = product.eventStreamToggles?.[pid] ?? [];
                  const attrCount =
                    (cfg?.selectedFields?.length ?? 0) + (cfg?.selectedDerivedFields?.length ?? 0);
                  return (
                    <li
                      key={pid}
                      className="rounded-md border border-border px-3 py-2 text-caption flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {catalogLabelForPacketId(pid) ?? pid}
                        </p>
                        <p className="text-muted-foreground">
                          {attrCount} attributes
                          {streams.length > 0
                            ? ` · ${streams.map((s) => s.replace(/_/g, " ")).join(", ")}`
                            : ""}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0"
                        onClick={() => onOpenPacketContract(pid)}
                      >
                        View fields
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Output ports</CardTitle>
        </CardHeader>
        <CardContent>
          {product.outputPorts.length === 0 ? (
            <p className="text-caption text-muted-foreground">No output ports configured.</p>
          ) : (
            <ul className="space-y-2">
              {product.outputPorts.map((p) => (
                <li
                  key={p.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-caption",
                    p.status === "planned" && "opacity-60"
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="text-muted-foreground">
                      {CHANNEL_LABEL[p.channel] ?? p.channel} · {p.contractRef}
                    </p>
                  </div>
                  <PortStatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data Contract tab
// ---------------------------------------------------------------------------

type ContractChipFilter = "all" | "pii" | "sensitive" | "trended" | "derived";

function DataContractTab({
  product,
  packetFilter,
  onPacketFilterChange,
}: {
  product: DemoProductVersion;
  packetFilter: string;
  onPacketFilterChange: (value: string) => void;
}) {
  const [chip, setChip] = useState<ContractChipFilter>("all");

  const packetOptions = product.packetIds.map((pid) => ({
    id: pid,
    label: catalogLabelForPacketId(pid) ?? pid,
  }));

  const filtered = useMemo(() => {
    let rows = product.fieldContract;
    if (packetFilter !== "all") rows = rows.filter((r) => r.packetId === packetFilter);
    if (chip === "pii") rows = rows.filter((r) => r.pii || r.sensitivity === "PII" || r.sensitivity === "Sensitive-PII");
    if (chip === "sensitive") {
      rows = rows.filter((r) => r.sensitivity === "Sensitive-PII" || r.notes?.includes("special category"));
    }
    if (chip === "trended") rows = rows.filter((r) => r.mode === "TRENDED");
    if (chip === "derived") rows = rows.filter((r) => (r.notes ?? "").includes("ƒ"));
    const order = new Map(product.packetIds.map((id, i) => [id, i]));
    return [...rows].sort(
      (a, b) => (order.get(a.packetId) ?? 99) - (order.get(b.packetId) ?? 99) || a.name.localeCompare(b.name)
    );
  }, [product.fieldContract, product.packetIds, packetFilter, chip]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const row of filtered) {
      const list = map.get(row.packetId) ?? [];
      list.push(row);
      map.set(row.packetId, list);
    }
    return product.packetIds
      .filter((pid) => map.has(pid) || packetFilter === pid)
      .map((pid) => [pid, map.get(pid) ?? []] as const);
  }, [filtered, product.packetIds, packetFilter]);

  const copyFingerprint = async () => {
    try {
      await navigator.clipboard.writeText(product.definitionFingerprint);
      toast.success("Fingerprint copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const downloadCsv = () => {
    const header = "Packet,Attribute,Attribute ID,Type,Sensitivity,Mode,Populated by,Notes\n";
    const rows = filtered
      .map((r) =>
        [
          catalogLabelForPacketId(r.packetId) ?? r.packetId,
          r.label ?? r.name,
          r.attributeId ?? r.name,
          r.type,
          r.sensitivity ?? (r.pii ? "PII" : "Standard"),
          r.mode,
          (r.populatedBy ?? []).join("; "),
          r.notes ?? r.description,
        ]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${product.productCode}-v${product.version}-contract.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chips: { id: ContractChipFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "pii", label: "PII" },
    { id: "sensitive", label: "Sensitive-PII" },
    { id: "trended", label: "Trended" },
    { id: "derived", label: "Derived" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Data contract</CardTitle>
          <div className="flex items-center gap-1.5 text-caption text-muted-foreground">
            <span className="font-mono">{product.definitionFingerprint}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={copyFingerprint}
              aria-label="Copy fingerprint"
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={downloadCsv}>
              <Download className="w-3.5 h-3.5" />
              CSV
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-caption">
          <span>Subject scope: {product.subjectScope === "COMPANY" ? "Company" : product.subjectScope === "BOTH" ? "Both" : "Individual"}</span>
          <span>Dictionary {product.dictionaryVersion}</span>
          <SensitivityBadge value={product.metadata.sensitivity} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={packetFilter}
            onValueChange={(v) => onPacketFilterChange(v)}
          >
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Filter by packet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All packets</SelectItem>
              {packetOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-1">
            {chips.map((c) => (
              <Button
                key={c.id}
                type="button"
                size="sm"
                variant={chip === c.id ? "default" : "outline"}
                className="h-7 text-caption"
                onClick={() => setChip(c.id)}
              >
                {c.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {filtered.length === 0 ? (
          <EmptyState icon={FileSearch} message="No fields match the current filters." />
        ) : (
          grouped.map(([pid, rows]) => {
            const streams = product.eventStreamToggles?.[pid] ?? [];
            const populated = getDictionaryPacket(pid)?.populatedBy ?? [];
            return (
              <div key={pid} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-caption font-medium text-foreground">
                    {catalogLabelForPacketId(pid) ?? pid}
                  </p>
                  <span className="text-caption text-muted-foreground">{rows.length} attributes</span>
                  {streams.length > 0 && (
                    <span className="text-caption text-muted-foreground">
                      · {streams.map((s) => s.replace(/_/g, " ")).join(", ")}
                    </span>
                  )}
                  {populated.map((s) => (
                    <PopulatedByChip key={s} source={s} />
                  ))}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={tableHeaderClasses}>Attribute</TableHead>
                      <TableHead className={tableHeaderClasses}>Attribute ID</TableHead>
                      <TableHead className={tableHeaderClasses}>Type</TableHead>
                      <TableHead className={tableHeaderClasses}>Sensitivity</TableHead>
                      <TableHead className={tableHeaderClasses}>Mode</TableHead>
                      <TableHead className={tableHeaderClasses}>Populated by</TableHead>
                      <TableHead className={tableHeaderClasses}>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((f) => (
                      <TableRow key={`${f.packetId}-${f.attributeId ?? f.name}`}>
                        <TableCell className="text-caption text-foreground">
                          <span className="block">{f.label ?? f.name.replace(/_/g, " ")}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{f.name}</span>
                        </TableCell>
                        <TableCell className="font-mono text-caption text-muted-foreground">
                          {f.attributeId ?? f.name}
                        </TableCell>
                        <TableCell>
                          <AttributeTypeChip type={f.type} />
                        </TableCell>
                        <TableCell>
                          <AttributeSensitivityChip
                            sensitivity={f.sensitivity ?? (f.pii ? "PII" : "Standard")}
                          />
                        </TableCell>
                        <TableCell>
                          <AttributeModeBadge mode={f.mode} />
                        </TableCell>
                        <TableCell className="text-caption">
                          <div className="flex flex-wrap gap-1">
                            {(f.populatedBy ?? []).map((s) => (
                              <PopulatedByChip key={s} source={s} />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-caption text-muted-foreground max-w-sm">
                          {f.notes || f.description}
                          {f.deprecatedInDictionary && (
                            <span className="ml-1 inline-block rounded-full bg-warning/15 text-warning px-1.5 py-0 text-[10px]">
                              Deprecated in dictionary — superseded by {f.deprecatedInDictionary}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}


// ---------------------------------------------------------------------------
// Lineage tab
// ---------------------------------------------------------------------------

function LineageConnector({ orientation = "horizontal" }: { orientation?: "horizontal" | "vertical" }) {
  if (orientation === "vertical") {
    return (
      <div className="flex items-center justify-center lg:hidden shrink-0 text-muted-foreground/60 py-0.5">
        <ChevronDown className="w-5 h-5" />
      </div>
    );
  }
  return (
    <div className="hidden lg:flex items-center justify-center shrink-0 text-muted-foreground/60 px-1">
      <ChevronRight className="w-5 h-5" />
    </div>
  );
}

function LineageColumn({
  title,
  nodes,
  tone,
  onNodeClick,
  emptyLabel,
}: {
  title: string;
  nodes: { id: string; label: string; sublabel?: string; pills?: string[] }[];
  tone: "muted" | "primary" | "success";
  onNodeClick?: (id: string) => void;
  emptyLabel?: string;
}) {
  const toneClasses =
    tone === "primary"
      ? "border-primary/40 bg-primary/5 text-foreground"
      : tone === "success"
        ? "border-success/40 bg-success/5 text-foreground"
        : "border-border bg-muted/40 text-foreground";

  const content = (n: { id: string; label: string; sublabel?: string; pills?: string[] }) => (
    <>
      <span className="block">{n.label}</span>
      {n.sublabel && (
        <span className="block text-muted-foreground">{n.sublabel}</span>
      )}
      {n.pills && n.pills.length > 0 && (
        <span className="mt-1 flex flex-wrap gap-1">
          {n.pills.map((p) => (
            <span key={p} className="rounded-full bg-background/80 px-1.5 py-0 border border-border">
              {p}
            </span>
          ))}
        </span>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-2 min-w-[140px] sm:min-w-[160px] flex-1 w-full">
      <p className="text-[10px] leading-[14px] font-medium text-muted-foreground text-center">{title}</p>
      {nodes.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-3 py-4 text-[10px] leading-[14px] text-muted-foreground text-center">
          {emptyLabel ?? "None"}
        </div>
      ) : (
        nodes.map((n) =>
          onNodeClick ? (
            <button
              key={n.id}
              type="button"
              onClick={() => onNodeClick(n.id)}
              className={cn(
                "rounded-md border px-3 py-2 text-[10px] leading-[14px] text-left transition-colors hover:bg-primary/10 min-h-[36px]",
                toneClasses
              )}
            >
              {content(n)}
            </button>
          ) : (
            <div
              key={n.id}
              className={cn(
                "rounded-md border px-3 py-2 text-[10px] leading-[14px] min-h-[36px] flex items-center",
                toneClasses
              )}
            >
              {content(n)}
            </div>
          )
        )
      )}
    </div>
  );
}

/** Jigsaw puzzle piece silhouette for the product version node. */
function ProductJigsawNode({ name, version }: { name: string; version: number }) {
  return (
    <div className="flex flex-col items-center justify-center self-center lg:shrink-0 px-2 py-1">
      <div className="relative w-44 h-36">
        <svg
          viewBox="0 0 128 104"
          className="absolute inset-0 w-full h-full drop-shadow-sm"
          aria-hidden
        >
          <path
            d="M18 8
               H102
               A10 10 0 0 1 112 18
               V40
               C112 40, 128 38, 128 52
               C128 66, 112 64, 112 64
               V86
               A10 10 0 0 1 102 96
               H18
               A10 10 0 0 1 8 86
               V64
               C8 64, 24 66, 24 52
               C24 38, 8 40, 8 40
               V18
               A10 10 0 0 1 18 8
               Z"
            fill="hsl(var(--primary))"
          />
        </svg>
        <div className="absolute inset-y-2 left-[21%] right-[15%] flex flex-col items-center justify-center gap-0.5 text-center">
          <p
            className="text-[10px] leading-[14px] font-semibold text-primary-foreground line-clamp-3 break-words w-full"
            title={name}
          >
            {name}
          </p>
          <p className="text-[10px] leading-[14px] text-primary-foreground/90">v{version}</p>
        </div>
      </div>
      <p className="text-[10px] leading-[14px] text-muted-foreground mt-1 text-center">This product version</p>
    </div>
  );
}

function PacketFieldsDialog({
  packetId,
  product,
  open,
  onOpenChange,
}: {
  packetId: string | null;
  product: DemoProductVersion;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const label = packetId ? catalogLabelForPacketId(packetId) ?? packetId : "";
  const fields = useMemo(() => {
    if (!packetId) return [];
    return product.fieldContract.filter((f) => f.packetId === packetId);
  }, [packetId, product.fieldContract]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-h4 pr-6">{label}</DialogTitle>
          <p className="text-caption text-muted-foreground">Contract fields for this packet in the current product version.</p>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto -mx-1 px-1">
          {fields.length === 0 ? (
            <p className="text-caption text-muted-foreground py-6 text-center">No fields in contract for this packet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tableHeaderClasses}>Field</TableHead>
                  <TableHead className={tableHeaderClasses}>Type</TableHead>
                  <TableHead className={tableHeaderClasses}>Sensitivity</TableHead>
                  <TableHead className={tableHeaderClasses}>Mode</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((f) => (
                  <TableRow key={`${f.packetId}-${f.name}`}>
                    <TableCell className="font-mono text-caption text-foreground">{f.name}</TableCell>
                    <TableCell className="text-caption text-muted-foreground">{f.type}</TableCell>
                    <TableCell>
                      <AttributeSensitivityChip
                        sensitivity={f.sensitivity ?? (f.pii ? "PII" : "Standard")}
                      />
                    </TableCell>
                    <TableCell>
                      <AttributeModeBadge mode={f.mode} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LineageTab({
  product,
  subscriptions,
}: {
  product: DemoProductVersion;
  subscriptions: Subscription[];
}) {
  const [packetDialogId, setPacketDialogId] = useState<string | null>(null);

  const providerNodes = useMemo(() => {
    const ids = new Set(product.packetIds);
    const nodes: { id: string; label: string; sublabel?: string }[] = [];
    if (ids.has("bank_account") || ids.has("subject")) {
      nodes.push({ id: "hdfc", label: "HDFC Bank", sublabel: "via CRIF Connect" });
    }
    if (ids.has("credit_facility") || ids.has("subject")) {
      nodes.push({ id: "zest", label: "ZestMoney" });
      if (ids.has("credit_facility")) nodes.push({ id: "bajaj", label: "Bajaj Finance" });
    }
    if (ids.has("telco_profile")) {
      nodes.push({ id: "airtel", label: "Airtel" });
    }
    if (ids.has("gst_registration")) {
      nodes.push({ id: "gstn", label: "GSTN" });
    }
    if (nodes.length === 0) {
      nodes.push({ id: "bureau", label: "Contributing members" });
    }
    return nodes;
  }, [product.packetIds]);

  const packetNodes = useMemo(
    () =>
      product.packetIds.map((pid) => ({
        id: pid,
        label: catalogLabelForPacketId(pid) ?? pid,
        pills: (product.eventStreamToggles?.[pid] ?? []).map((s) => s.replace(/_/g, " ")),
      })),
    [product.packetIds, product.eventStreamToggles]
  );

  const attributeNodes = useMemo(
    () =>
      product.packetIds.map((pid) => {
        const cfg = product.packetConfigs.find((c) => c.packetId === pid);
        const n = (cfg?.selectedFields?.length ?? 0) + (cfg?.selectedDerivedFields?.length ?? 0);
        return {
          id: `attr-${pid}`,
          label: `${n} attributes`,
          sublabel: catalogLabelForPacketId(pid) ?? pid,
        };
      }),
    [product.packetIds, product.packetConfigs]
  );

  const consumerNodes = subscriptions
    .filter((s) => s.status === "active")
    .map((s) => ({ id: s.id, label: s.institutionName }));

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Traceability</CardTitle>
          <CardDescription className="text-[10px] leading-[14px]">
            Providers contribute packets; attributes compose this product version. Click a packet
            to inspect its contract fields. Subscribers are listed on the Subscribers tab.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-start gap-2 lg:gap-3 overflow-x-auto pb-2">
            <LineageColumn title="Providers" nodes={providerNodes} tone="muted" />
            <LineageConnector orientation="vertical" />
            <LineageConnector orientation="horizontal" />
            <LineageColumn
              title="Packets"
              nodes={packetNodes}
              tone="primary"
              onNodeClick={(id) => setPacketDialogId(id)}
              emptyLabel="No packets"
            />
            <LineageConnector orientation="vertical" />
            <LineageConnector orientation="horizontal" />
            <LineageColumn title="Attributes" nodes={attributeNodes} tone="muted" emptyLabel="No attributes" />
            <LineageConnector orientation="vertical" />
            <LineageConnector orientation="horizontal" />
            <ProductJigsawNode name={product.name} version={product.version} />
            <LineageConnector orientation="vertical" />
            <LineageConnector orientation="horizontal" />
            <LineageColumn
              title="Consumers"
              nodes={consumerNodes}
              tone="success"
              emptyLabel="No subscribers"
            />
          </div>
        </CardContent>
      </Card>

      <PacketFieldsDialog
        packetId={packetDialogId}
        product={product}
        open={packetDialogId != null}
        onOpenChange={(open) => {
          if (!open) setPacketDialogId(null);
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Subscribers tab
// ---------------------------------------------------------------------------

function SubscribersTab({
  product,
  subscriptions,
  siblings,
}: {
  product: DemoProductVersion;
  subscriptions: Subscription[];
  siblings: DemoProductVersion[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Subscribers</CardTitle>
        <CardDescription className="text-[10px] leading-[14px]">
          Institutions subscribed to {product.productCode}, across all versions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {subscriptions.length === 0 ? (
          <EmptyState icon={Users} message="No subscribers yet for this product." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={tableHeaderClasses}>Institution</TableHead>
                <TableHead className={tableHeaderClasses}>Pinned version</TableHead>
                <TableHead className={tableHeaderClasses}>Status</TableHead>
                <TableHead className={tableHeaderClasses}>Requested</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((s) => {
                const pinned = s.pinnedVersionId
                  ? siblings.find((v) => v.id === s.pinnedVersionId)
                  : null;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-body text-foreground">{s.institutionName}</TableCell>
                    <TableCell className="text-caption text-muted-foreground">
                      {pinned ? `v${pinned.version}` : "—"}
                    </TableCell>
                    <TableCell>
                      <SubscriptionStatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="text-caption text-muted-foreground tabular-nums whitespace-nowrap">
                      {formatDate(s.requestedAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Versions tab
// ---------------------------------------------------------------------------

function VersionsTab({
  product,
  siblings,
  subscriptions,
}: {
  product: DemoProductVersion;
  siblings: DemoProductVersion[];
  subscriptions: Subscription[];
}) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>Version history</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1"
                onClick={() => navigate(`/data-products/products/${product.id}/versions`)}
              >
                <History className="w-3.5 h-3.5" />
                Timeline
              </Button>
              {siblings.length >= 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1"
                  onClick={() =>
                    navigate(
                      `/data-products/products/${product.id}/versions/compare?a=${siblings[1]?.id}&b=${siblings[0]?.id}`
                    )
                  }
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  Compare
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {siblings.length === 0 ? (
            <p className="text-caption text-muted-foreground">No versions found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tableHeaderClasses}>Version</TableHead>
                  <TableHead className={tableHeaderClasses}>Status</TableHead>
                  <TableHead className={tableHeaderClasses}>Effective dates</TableHead>
                  <TableHead className={tableHeaderClasses}>Approval</TableHead>
                  <TableHead className={cn(tableHeaderClasses, "text-right w-[72px]")}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {siblings.map((v) => {
                  const isCurrent = v.id === product.id;
                  const approval = getApprovalInfo(v);
                  const windDown = getWindDown(v, subscriptions);
                  return (
                    <TableRow
                      key={v.id}
                      className={cn(
                        "cursor-pointer",
                        isCurrent ? "bg-muted/40" : undefined
                      )}
                      onClick={() => {
                        if (!isCurrent) navigate(`/data-products/products/${v.id}`);
                      }}
                    >
                      <TableCell className="font-medium text-body text-foreground">
                        <span>
                          v{v.version}
                          {isCurrent ? (
                            <span className="ml-1.5 text-caption font-normal text-muted-foreground">
                              (this)
                            </span>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <ProductStatusBadge status={v.status} />
                          {windDown && (
                            <p className="text-caption text-orange-700 dark:text-orange-400">
                              {windDown.daysRemaining} days remaining · {windDown.notMigrated} consumer
                              {windDown.notMigrated !== 1 ? "s" : ""} not migrated
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-caption text-muted-foreground whitespace-nowrap">
                        {v.metadata.effectiveStart ? formatDate(v.metadata.effectiveStart) : "—"}
                        {v.metadata.effectiveEnd ? ` – ${formatDate(v.metadata.effectiveEnd)}` : ""}
                      </TableCell>
                      <TableCell className="text-caption text-muted-foreground">
                        {v.status === "draft"
                          ? "—"
                          : `Approved by ${approval.by}${approval.at ? `, ${formatDate(approval.at)}` : ""}`}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <VersionLifecycleActions product={v} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useProductMgmtStore();
  const product = useProductMgmtVersion(id);

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [contractPacketFilter, setContractPacketFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 150);
    return () => clearTimeout(t);
  }, [id]);

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-muted-foreground">Product version not found.</p>
        <button
          type="button"
          onClick={() => navigate("/data-products/products")}
          className="text-primary hover:underline text-caption"
        >
          Back to products
        </button>
      </div>
    );
  }

  const siblings = productMgmtStore.getVersionsByCode(product.productCode);
  const activeSiblings = siblings.filter((v) => v.status === "active");
  const subscriptions = productMgmtStore.getSubscriptions(product.productCode);

  const handleClone = () => {
    const res = productMgmtStore.createNewVersion(product.id);
    if (!res.ok) {
      if (res.error === "draft_exists") {
        toast.error("A draft already exists for this product", {
          action: {
            label: "Open draft",
            onClick: () => navigate(`/data-products/products/${res.draft.id}`),
          },
        });
      } else toast.error("Could not create version");
      return;
    }
    toast.success(`Draft v${res.version.version} created`);
    navigate(`/data-products/products/${res.version.id}/edit`);
  };

  const openPacketContract = (pid: string) => {
    setContractPacketFilter(pid);
    setTab("contract");
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <PageBreadcrumb
        segments={[
          { label: "Dashboard", href: "/" },
          { label: "Data products", href: "/data-products/products" },
          { label: product.name },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-h2 font-semibold text-foreground break-words">{product.name}</h1>
            <VersionSwitcher current={product} siblings={siblings} />
            <span className="font-mono text-caption text-muted-foreground">{product.productCode}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0 self-start">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() =>
              navigate(`/data-products/audit?productCode=${product.productCode}`)
            }
          >
            <History className="w-3.5 h-3.5" />
            Audit trail
          </Button>
          <ManageLifecycleMenu product={product} />
          <Button size="sm" className="gap-2" onClick={handleClone}>
            <GitBranch className="w-3.5 h-3.5" />
            Create new version
          </Button>
        </div>
      </div>

      <VersionStateBanner
        product={product}
        siblings={siblings}
        subscriptions={subscriptions}
      />

      {activeSiblings.length > 1 && product.status === "active" && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-caption text-muted-foreground">
          {activeSiblings.length} concurrent Active versions for {product.productCode} (ceiling demo:
          3). Existing consumers stay on their adopted version.
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <div className="rounded-xl border border-border bg-card px-1.5 py-1.5 shadow-sm">
          <div className="overflow-x-auto overflow-y-hidden -mx-0.5 md:overflow-visible md:mx-0">
            <TabsList className="h-auto w-max min-w-0 items-center justify-start gap-0.5 rounded-none bg-transparent p-0 md:w-full md:flex-wrap md:min-w-0">
              <TabsTrigger value="overview" className={productDetailTabTriggerClasses}>
                Overview
              </TabsTrigger>
              <TabsTrigger value="contract" className={productDetailTabTriggerClasses}>
                Data Contract
              </TabsTrigger>
              <TabsTrigger value="lineage" className={productDetailTabTriggerClasses}>
                Traceability
              </TabsTrigger>
              <TabsTrigger value="subscribers" className={productDetailTabTriggerClasses}>
                Subscribers
              </TabsTrigger>
              <TabsTrigger value="versions" className={productDetailTabTriggerClasses}>
                Versions
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab product={product} onOpenPacketContract={openPacketContract} />
        </TabsContent>

        <TabsContent value="contract" className="mt-4">
          <DataContractTab
            product={product}
            packetFilter={contractPacketFilter}
            onPacketFilterChange={setContractPacketFilter}
          />
        </TabsContent>

        <TabsContent value="lineage" className="mt-4">
          <LineageTab product={product} subscriptions={subscriptions} />
        </TabsContent>

        <TabsContent value="subscribers" className="mt-4">
          <SubscribersTab product={product} subscriptions={subscriptions} siblings={siblings} />
        </TabsContent>

        <TabsContent value="versions" className="mt-4">
          <VersionsTab product={product} siblings={siblings} subscriptions={subscriptions} />
        </TabsContent>
      </Tabs>

      {product.status !== "draft" && (
        <p className="text-caption text-muted-foreground">
          Published content is immutable ({BRD_STATUS_LABEL[product.status as BrdLifecycleStatus]}).
          Create a new version to change the definition.
        </p>
      )}
    </div>
  );
}
