import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { productMgmtStore } from "@/lib/product-management-demo-store";
import { ProductStatusBadge } from "@/components/data-products/ProductStatusBadge";
import { catalogLabelForPacketId } from "@/data/data-products-mock";
import type { DemoProductVersion, ProductMetadata } from "@/data/product-management-types";

const SCOPE_LABEL: Record<string, string> = {
  SELF: "Self Data",
  NETWORK: "Network Data",
  CONSORTIUM: "Consortium Data",
  VERTICAL: "Vertical Data",
};

const IMPACT_LABEL: Record<string, string> = {
  SOFT: "Soft enquiry",
  HARD: "Hard enquiry",
};

const META_LABELS: Partial<Record<keyof ProductMetadata, string>> = {
  businessUnit: "Business unit",
  targetSegment: "Target segment",
  sapItemCode: "SAP item code",
  sensitivity: "Sensitivity",
  legalConditions: "Legal conditions",
  intendedUse: "Intended use",
  dataAcquisitionType: "Data acquisition type",
  dataAvailabilityType: "Data availability type",
  accessRestrictions: "Access restrictions",
  regulatoryNotes: "Regulatory notes",
};

function computeVersionDiff(a: DemoProductVersion, b: DemoProductVersion) {
  const aSet = new Set(a.packetIds);
  const bSet = new Set(b.packetIds);
  const added = b.packetIds.filter((p) => !aSet.has(p));
  const removed = a.packetIds.filter((p) => !bSet.has(p));
  const shared = b.packetIds.filter((p) => aSet.has(p));
  const fieldChanges = shared.flatMap((pid) => {
    const ca = a.packetConfigs.find((c) => c.packetId === pid);
    const cb = b.packetConfigs.find((c) => c.packetId === pid);
    const fa = new Set(ca?.selectedFields ?? []);
    const fb = new Set(cb?.selectedFields ?? []);
    const fAdded = [...fb].filter((f) => !fa.has(f));
    const fRemoved = [...fa].filter((f) => !fb.has(f));
    if (!fAdded.length && !fRemoved.length) return [];
    return [{ packetId: pid, fAdded, fRemoved }];
  });

  const scopeChanged = a.enquiryConfig.scope !== b.enquiryConfig.scope;
  const impactChanged = a.enquiryConfig.impactType !== b.enquiryConfig.impactType;
  const trendedEnabledChanged = a.trendedConfig.enabled !== b.trendedConfig.enabled;
  const trendedMonthsChanged =
    (a.trendedConfig.enabled || b.trendedConfig.enabled) &&
    a.trendedConfig.maxHistoryMonths !== b.trendedConfig.maxHistoryMonths;

  const profA = new Set(a.profileConfig.includedFields);
  const profB = new Set(b.profileConfig.includedFields);
  const profileAdded = b.profileConfig.includedFields.filter((f) => !profA.has(f));
  const profileRemoved = a.profileConfig.includedFields.filter((f) => !profB.has(f));

  const metaKeys = Object.keys(META_LABELS) as (keyof ProductMetadata)[];
  const metaChanges = metaKeys
    .filter((k) => String(a.metadata[k] ?? "") !== String(b.metadata[k] ?? ""))
    .map((k) => ({
      key: k,
      label: META_LABELS[k]!,
      from: String(a.metadata[k] ?? "") || "—",
      to: String(b.metadata[k] ?? "") || "—",
    }));

  return {
    added,
    removed,
    fieldChanges,
    scopeChanged,
    impactChanged,
    trendedEnabledChanged,
    trendedMonthsChanged,
    profileAdded,
    profileRemoved,
    metaChanges,
  };
}

interface VersionComparePanelProps {
  a: DemoProductVersion;
  b: DemoProductVersion;
  /** Hide the version A/B pickers — used when comparing a fixed pair (e.g. an approval package vs its parent). */
  hidePickers?: boolean;
}

export function VersionComparePanel({ a, b, hidePickers }: VersionComparePanelProps) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const versions = productMgmtStore.getVersionsByCode(a.productCode);

  const diff = useMemo(() => computeVersionDiff(a, b), [a, b]);

  const setPair = (key: "a" | "b", value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next);
  };

  return (
    <div className="space-y-6">
      {!hidePickers && (
        <div className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <p className="text-caption text-muted-foreground">Version A (baseline)</p>
            <Select value={a.id} onValueChange={(v) => setPair("a", v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    v{v.version} ({v.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-caption text-muted-foreground">Version B</p>
            <Select value={b.id} onValueChange={(v) => setPair("b", v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    v{v.version} ({v.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { v: a, tag: "Baseline" },
          { v: b, tag: "Compared" },
        ].map(({ v, tag }) => (
          <Card key={v.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/data-products/products/${v.id}`}
                  className="hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/data-products/products/${v.id}`);
                  }}
                >
                  v{v.version}
                </Link>
                <ProductStatusBadge status={v.status} />
                <Badge variant="outline">{tag}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-caption space-y-1">
              <p className="font-mono text-muted-foreground">{v.definitionFingerprint}</p>
              <ul className="list-disc pl-4">
                {v.packetIds.map((pid) => (
                  <li key={pid}>{catalogLabelForPacketId(pid) ?? pid}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Diff summary (Compared vs Baseline)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-caption">
          <div>
            <p className="font-medium text-foreground">Packets added</p>
            <p className="text-muted-foreground">
              {diff.added.length
                ? diff.added.map((p) => catalogLabelForPacketId(p) ?? p).join(", ")
                : "None"}
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">Packets removed</p>
            <p className="text-muted-foreground">
              {diff.removed.length
                ? diff.removed.map((p) => catalogLabelForPacketId(p) ?? p).join(", ")
                : "None"}
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">Field changes</p>
            {diff.fieldChanges.length === 0 ? (
              <p className="text-muted-foreground">None</p>
            ) : (
              <ul className="space-y-1">
                {diff.fieldChanges.map((fc) => (
                  <li key={fc.packetId}>
                    {catalogLabelForPacketId(fc.packetId) ?? fc.packetId}: +
                    {fc.fAdded.join(", ") || "—"} / −{fc.fRemoved.join(", ") || "—"}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">Enquiry &amp; trended changes</p>
            {!diff.scopeChanged &&
            !diff.impactChanged &&
            !diff.trendedEnabledChanged &&
            !diff.trendedMonthsChanged ? (
              <p className="text-muted-foreground">None</p>
            ) : (
              <ul className="space-y-1">
                {diff.scopeChanged && (
                  <li>
                    Scope: {SCOPE_LABEL[a.enquiryConfig.scope] ?? a.enquiryConfig.scope} →{" "}
                    {SCOPE_LABEL[b.enquiryConfig.scope] ?? b.enquiryConfig.scope}
                  </li>
                )}
                {diff.impactChanged && (
                  <li>
                    Impact: {IMPACT_LABEL[a.enquiryConfig.impactType] ?? a.enquiryConfig.impactType}{" "}
                    → {IMPACT_LABEL[b.enquiryConfig.impactType] ?? b.enquiryConfig.impactType}
                  </li>
                )}
                {diff.trendedEnabledChanged && (
                  <li>
                    Trended: {a.trendedConfig.enabled ? "Enabled" : "Disabled"} →{" "}
                    {b.trendedConfig.enabled ? "Enabled" : "Disabled"}
                  </li>
                )}
                {diff.trendedMonthsChanged && (
                  <li>
                    Max history: {a.trendedConfig.maxHistoryMonths} mo → {b.trendedConfig.maxHistoryMonths}{" "}
                    mo
                  </li>
                )}
              </ul>
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">Profile block changes</p>
            {diff.profileAdded.length === 0 && diff.profileRemoved.length === 0 ? (
              <p className="text-muted-foreground">None</p>
            ) : (
              <p className="text-muted-foreground">
                {diff.profileAdded.length ? `+ ${diff.profileAdded.join(", ")}` : null}
                {diff.profileAdded.length && diff.profileRemoved.length ? " · " : null}
                {diff.profileRemoved.length ? `− ${diff.profileRemoved.join(", ")}` : null}
              </p>
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">Metadata changes</p>
            {diff.metaChanges.length === 0 ? (
              <p className="text-muted-foreground">None</p>
            ) : (
              <ul className="space-y-1">
                {diff.metaChanges.map((m) => (
                  <li key={m.key}>
                    <span className="text-foreground">{m.label}:</span> {m.from} → {m.to}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
        <Users className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-caption text-foreground">
          <span className="font-medium">{a.consumerCount}</span> consumer
          {a.consumerCount === 1 ? "" : "s"} currently on v{a.version} (baseline). Changes take effect
          only for consumers who adopt v{b.version}.
        </p>
      </div>
    </div>
  );
}
