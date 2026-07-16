import { useNavigate, useParams } from "react-router-dom";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Pencil,
  Send,
  GitBranch,
  GitCompare,
  History,
} from "lucide-react";
import { catalogLabelForPacketId } from "@/data/data-products-mock";
import {
  BRD_STATUS_LABEL,
  type BrdLifecycleStatus,
  type DemoProductVersion,
} from "@/data/product-management-types";
import { ProductStatusBadge } from "@/components/data-products/ProductStatusBadge";
import { VersionLifecycleActions } from "@/components/data-products/VersionLifecycleActions";
import {
  productMgmtStore,
  useProductMgmtVersion,
  useProductMgmtStore,
} from "@/lib/product-management-demo-store";
import { toast } from "sonner";

const LIVE_STATUSES = new Set<BrdLifecycleStatus>([
  "active",
  "deprecated",
  "inactive",
  "archived",
]);

function formatUpdated(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

function getApprovedBy(version: DemoProductVersion): string {
  const approvedCycle = [...version.approvalCycles]
    .reverse()
    .find((c) => c.status === "approved");
  const decision = [...(approvedCycle?.decisions ?? [])]
    .reverse()
    .find((d) => d.decision === "approve");
  if (decision?.actor) return decision.actor;

  const audit = productMgmtStore
    .getAuditEvents({ versionId: version.id })
    .find((e) => e.action === "approved");
  return audit?.actor ?? "—";
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

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useProductMgmtStore();
  const product = useProductMgmtVersion(id);

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-muted-foreground">Product version not found.</p>
        <button
          type="button"
          onClick={() => navigate("/data-products/products")}
          className="text-primary hover:underline text-sm"
        >
          Back to products
        </button>
      </div>
    );
  }

  const siblings = productMgmtStore.getVersionsByCode(product.productCode);
  const activeSiblings = siblings.filter((v) => v.status === "active");
  const pendingCycle = product.approvalCycles.find((c) => c.status === "pending");
  const canEdit = product.status === "draft";
  const canSubmit = product.status === "draft";

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

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <PageBreadcrumb
        segments={[
          { label: "Dashboard", href: "/" },
          { label: "Data Products", href: "/data-products/products" },
          { label: "Products", href: "/data-products/products" },
          { label: product.name },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="min-w-0">
            <h1 className="text-h2 font-semibold text-foreground break-words">
              {product.name}{" "}
              <span className="text-muted-foreground font-normal">v{product.version}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <ProductStatusBadge status={product.status} />
              <span className="text-caption text-muted-foreground">{product.productCode}</span>
              <span className="text-caption text-muted-foreground">
                Updated {formatUpdated(product.lastUpdated)}
              </span>
            </div>
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
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate(`/data-products/products/${product.id}/edit`)}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
          )}
          {!canEdit && (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleClone}>
              <GitBranch className="w-3.5 h-3.5" />
              Create new version
            </Button>
          )}
          {canSubmit && (
            <Button
              size="sm"
              className="gap-2"
              onClick={() => navigate(`/data-products/products/${product.id}/submit`)}
            >
              <Send className="w-3.5 h-3.5" />
              Submit for approval
            </Button>
          )}
          {pendingCycle && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate(`/data-products/approvals/${pendingCycle.id}`)}
            >
              Open approval
            </Button>
          )}
        </div>
      </div>

      {activeSiblings.length > 1 && product.status === "active" && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-caption text-muted-foreground">
          {activeSiblings.length} concurrent Active versions for {product.productCode} (ceiling demo:
          3). Existing consumers stay on their adopted version.
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Product info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-caption">
          <p className="text-muted-foreground">{product.description || "—"}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Effective start</p>
              <p className="text-foreground">{product.metadata.effectiveStart ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Consumers</p>
              <p className="text-foreground tabular-nums">{product.consumerCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Data packets</CardTitle>
        </CardHeader>
        <CardContent>
          {product.packetIds.length === 0 ? (
            <p className="text-caption text-muted-foreground">No packets configured.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {product.packetIds.map((pid) => {
                const cfg = product.packetConfigs.find((c) => c.packetId === pid);
                return (
                  <li
                    key={pid}
                    className="rounded-md border border-border px-3 py-2 text-caption"
                  >
                    <p className="font-medium text-foreground">
                      {catalogLabelForPacketId(pid) ?? pid}
                    </p>
                    <p className="text-muted-foreground">
                      {(cfg?.selectedFields?.length ?? 0)} fields
                      {(cfg?.selectedDerivedFields?.length ?? 0) > 0
                        ? ` · ${cfg!.selectedDerivedFields!.length} derived`
                        : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between gap-2">
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
                  <TableHead>Version</TableHead>
                  <TableHead>Activated</TableHead>
                  <TableHead>Approved by</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-[72px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {siblings.map((v) => {
                  const activatedAt = getActivatedAt(v);
                  const isCurrent = v.id === product.id;
                  return (
                    <TableRow
                      key={v.id}
                      className={isCurrent ? "bg-muted/40" : undefined}
                    >
                      <TableCell className="font-medium text-foreground">
                        <button
                          type="button"
                          className="hover:underline text-left"
                          onClick={() => navigate(`/data-products/products/${v.id}`)}
                        >
                          v{v.version}
                          {isCurrent ? (
                            <span className="ml-1.5 text-caption font-normal text-muted-foreground">
                              (this)
                            </span>
                          ) : null}
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {activatedAt ? formatDate(activatedAt) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getApprovedBy(v)}
                      </TableCell>
                      <TableCell>
                        <ProductStatusBadge status={v.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <VersionLifecycleActions product={v} viewingId={product.id} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {product.approvalCycles.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Approval history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-caption">
            {[...product.approvalCycles].reverse().map((c) => (
              <div
                key={c.id}
                className="rounded-md border border-border px-3 py-3 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-foreground font-medium">
                      {product.name} v{product.version} · Cycle {c.cycleNumber} · {c.status}
                    </p>
                    <p className="text-muted-foreground">
                      Submitted by {c.submittedBy} on {formatDate(c.submittedAt)}
                    </p>
                    {c.justification ? (
                      <p className="text-muted-foreground mt-1">{c.justification}</p>
                    ) : null}
                  </div>
                  {c.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/data-products/approvals/${c.id}`)}
                    >
                      Review
                    </Button>
                  )}
                </div>
                {c.decisions.length > 0 ? (
                  <ul className="space-y-1.5 border-t border-border pt-2">
                    {c.decisions.map((d) => (
                      <li key={d.id} className="text-muted-foreground">
                        <span className="text-foreground font-medium capitalize">{d.decision}</span>
                        {" by "}
                        <span className="text-foreground">{d.actor}</span>
                        {d.role ? ` (${d.role})` : ""}
                        {" on "}
                        {formatDate(d.at)}
                        {d.comment ? (
                          <span className="block text-muted-foreground/90 mt-0.5">
                            {d.comment}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground border-t border-border pt-2">
                    No approval decisions recorded yet.
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!canEdit && (
        <p className="text-caption text-muted-foreground">
          Published content is immutable ({BRD_STATUS_LABEL[product.status as BrdLifecycleStatus]}).
          Create a new version to change the definition.
        </p>
      )}
    </div>
  );
}
