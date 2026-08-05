import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Plus,
  RotateCcw,
  FlaskConical,
  Eye,
  Flag,
  Package,
  PackageSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DemoProductVersion } from "@/data/product-management-types";
import { ProductStatusBadge } from "@/components/data-products/ProductStatusBadge";
import { resolvePreferredVersion } from "@/components/data-products/lifecycle-menu";
import { productMgmtStore, useProductMgmtStore } from "@/lib/product-management-demo-store";
import { toast } from "sonner";

type SavedViewKey = "all" | "active" | "pending" | "deprecated_consumers" | "drafts";

interface ProductGroup {
  productCode: string;
  versions: DemoProductVersion[];
  head: DemoProductVersion;
  totalConsumers: number;
  updatedAt: string;
  warnings: { versionId: string; version: number; message: string }[];
}

const SAVED_VIEW_DEFS: { key: SavedViewKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "pending", label: "Pending my approval" },
  { key: "deprecated_consumers", label: "Deprecated with consumers" },
  { key: "drafts", label: "Drafts" },
];

function formatUpdated(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function matchesSavedView(g: ProductGroup, view: SavedViewKey): boolean {
  switch (view) {
    case "active":
      return g.versions.some((v) => v.status === "active");
    case "pending":
      return g.versions.some((v) => v.status === "pending_approval");
    case "deprecated_consumers":
      return g.versions.some((v) => v.status === "deprecated" && v.consumerCount > 0);
    case "drafts":
      return g.versions.some((v) => v.status === "draft");
    default:
      return true;
  }
}

/** Compact "v{n} Status(count)" chip — status colour always via ProductStatusBadge. */
function VersionChip({ version }: { version: DemoProductVersion }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className="text-caption tabular-nums text-muted-foreground">v{version.version}</span>
      <ProductStatusBadge status={version.status} />
      {version.status === "deprecated" && version.consumerCount > 0 && (
        <span className="text-caption tabular-nums text-muted-foreground">({version.consumerCount})</span>
      )}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <PackageSearch className="h-8 w-8 text-muted-foreground/50" />
      <p className="text-caption text-muted-foreground max-w-sm">{message}</p>
    </div>
  );
}

export default function ProductListPage() {
  const navigate = useNavigate();
  useProductMgmtStore();

  const allVersions = productMgmtStore.listVersions();

  const [search, setSearch] = useState("");
  const [savedView, setSavedView] = useState<SavedViewKey>("all");

  const groups = useMemo<ProductGroup[]>(() => {
    const byCode = new Map<string, DemoProductVersion[]>();
    for (const v of allVersions) {
      const arr = byCode.get(v.productCode) ?? [];
      arr.push(v);
      byCode.set(v.productCode, arr);
    }
    const list: ProductGroup[] = [];
    for (const [productCode, versionsRaw] of byCode) {
      const versions = [...versionsRaw].sort((a, b) => b.version - a.version);
      const head = resolvePreferredVersion(versions) ?? versions[0];
      const totalConsumers = versions.reduce((sum, v) => sum + v.consumerCount, 0);
      const updatedAt = versions.reduce(
        (latest, v) => (new Date(v.lastUpdated) > new Date(latest) ? v.lastUpdated : latest),
        head.lastUpdated
      );
      const warnings = versions.flatMap((v) =>
        v.policyWarnings.map((w) => ({ versionId: v.id, version: v.version, message: w.message }))
      );
      list.push({
        productCode,
        versions,
        head,
        totalConsumers,
        updatedAt,
        warnings,
      });
    }
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [allVersions]);

  const matchesSearch = (g: ProductGroup, q: string) => {
    if (!q) return true;
    return (
      g.productCode.toLowerCase().includes(q) ||
      g.head.name.toLowerCase().includes(q) ||
      g.head.description.toLowerCase().includes(q)
    );
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((g) => matchesSavedView(g, savedView) && matchesSearch(g, q));
  }, [groups, savedView, search]);

  const savedViewCounts = useMemo(() => {
    const counts: Record<SavedViewKey, number> = {
      all: groups.length,
      active: 0,
      pending: 0,
      deprecated_consumers: 0,
      drafts: 0,
    };
    for (const g of groups) {
      if (matchesSavedView(g, "active")) counts.active++;
      if (matchesSavedView(g, "deprecated_consumers")) counts.deprecated_consumers++;
      if (matchesSavedView(g, "drafts")) counts.drafts++;
    }
    counts.pending = allVersions.filter((v) => v.status === "pending_approval").length;
    return counts;
  }, [groups, allVersions]);

  const emptyMessage =
    savedView !== "all" || search
      ? "No products match the current view or search. Try clearing the search or switching saved views."
      : "No products yet. Create your first data product to get started.";

  return (
    <div className="space-y-6 animate-fade-in pb-4 sm:pb-6">
      <PageBreadcrumb
        segments={[
          { label: "Dashboard", href: "/" },
          { label: "Data Products", href: "/data-products/products" },
          { label: "Products" },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-h2 font-semibold text-foreground">Product Configurator</h1>
          <p className="mt-0.5 text-caption text-muted-foreground">
            Govern data products with packet configuration, versioning, and lifecycle (demo data).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            title="Reset demo"
            aria-label="Reset demo"
            onClick={() => {
              productMgmtStore.reset();
              toast.success("Demo data reset");
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-1.5 shrink-0"
            onClick={() => navigate("/data-products/enquiry-simulation")}
          >
            <FlaskConical className="h-3.5 w-3.5" />
            Enquiry simulation
          </Button>
          <Button
            type="button"
            className="gap-1.5 shrink-0"
            onClick={() => navigate("/data-products/products/create")}
          >
            <Plus className="h-3.5 w-3.5" />
            Create product
          </Button>
        </div>
      </div>

      <div className="flex-1 max-w-sm relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, code, tags…"
          className="pl-10"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {SAVED_VIEW_DEFS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setSavedView(v.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] leading-[14px] font-medium transition-colors",
              savedView === v.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-muted/50"
            )}
          >
            {v.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[10px] leading-[14px] tabular-nums",
                savedView === v.key ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              {savedViewCounts[v.key]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState message={emptyMessage} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4">
          {filtered.map((g) => (
            <Card
              key={g.productCode}
              className={cn(
                "group relative cursor-pointer bg-card border border-border text-card-foreground h-full",
                "transition-all duration-200",
                "hover:border-primary/30 hover:shadow-[0_4px_12px_hsl(var(--foreground)/0.06)]",
                "dark:hover:shadow-[0_4px_12px_hsl(var(--foreground)/0.12)]"
              )}
              onClick={() => navigate(`/data-products/products/${g.head.id}`)}
            >
              <CardContent className="p-5 flex flex-col gap-3 h-full">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 shrink-0 rounded-lg border border-primary/20 bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-1.5">
                      <h3 className="text-body font-semibold text-foreground leading-tight line-clamp-2">
                        {g.head.name}
                      </h3>
                      {g.warnings.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Flag
                              className="h-3.5 w-3.5 shrink-0 text-orange-500 mt-0.5"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <ul className="space-y-1 text-caption">
                              {g.warnings.map((w, idx) => (
                                <li key={`${w.versionId}-${idx}`}>
                                  v{w.version}: {w.message}
                                </li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <p className="mt-0.5 text-caption text-muted-foreground font-mono truncate">
                      {g.productCode}
                    </p>
                  </div>
                </div>

                <VersionChip version={g.head} />

                <p className="text-caption text-muted-foreground line-clamp-2">
                  {g.head.description || "No description provided."}
                </p>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] leading-[14px] text-muted-foreground tabular-nums">
                    {g.totalConsumers} subscriber{g.totalConsumers !== 1 ? "s" : ""}
                  </span>
                  <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] leading-[14px] text-muted-foreground tabular-nums">
                    Updated {formatUpdated(g.updatedAt)}
                  </span>
                </div>

                <div className="flex items-stretch gap-2 pt-2 mt-auto" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-0 gap-1.5 text-caption border-border bg-transparent text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                    onClick={() => navigate(`/data-products/products/${g.head.id}`)}
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">View</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
