import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Pencil, Plus, FlaskConical, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses } from "@/lib/typography";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { productPricingLabel } from "@/data/data-products-mock";
import { BRD_STATUS_LABEL, type BrdLifecycleStatus } from "@/data/product-management-types";
import { ProductStatusBadge } from "@/components/data-products/ProductStatusBadge";
import {
  productMgmtStore,
  useProductMgmtStore,
} from "@/lib/product-management-demo-store";
import { toast } from "sonner";

const ALL_STATUSES = Object.keys(BRD_STATUS_LABEL) as BrdLifecycleStatus[];

export default function ProductListPage() {
  const navigate = useNavigate();
  useProductMgmtStore();
  const heads = productMgmtStore.listCatalogueHeads();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return heads.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.productCode.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.metadata.owner.toLowerCase().includes(q) ||
        p.metadata.tags.some((t) => t.toLowerCase().includes(q));
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [heads, search, statusFilter]);

  const formatUpdated = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-sm relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ID, owner, tags…"
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {BRD_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No products match your filters.
          </p>
        ) : (
          filtered.map((p) => {
            const versionCount = productMgmtStore.getVersionsByCode(p.productCode).length;
            return (
              <div
                key={p.id}
                className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-body font-medium text-foreground">{p.name}</span>
                  <ProductStatusBadge status={p.status} />
                </div>
                <p className="text-caption text-muted-foreground">
                  {p.productCode} · v{p.version} · {versionCount} version{versionCount !== 1 ? "s" : ""}
                </p>
                <p className="text-caption text-muted-foreground">
                  {productPricingLabel[p.pricingModel]}
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => navigate(`/data-products/products/${p.id}`)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </Button>
                  {p.status === "draft" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={() => navigate(`/data-products/products/${p.id}/edit`)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
              <tr className="border-b border-border">
                {["ID", "Product", "Ver.", "Status", "Updated", ""].map((label) => (
                    <th
                      key={label || "act"}
                      className={cn(
                        tableHeaderClasses,
                        "px-4 py-3 text-left font-medium",
                        label === "" && "w-40 text-right"
                      )}
                    >
                      {label}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-caption text-muted-foreground"
                  >
                    No products match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 py-3 text-caption text-muted-foreground tabular-nums">
                      {p.productCode}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-body text-foreground">{p.name}</div>
                    </td>
                    <td className="px-4 py-3 text-body text-muted-foreground tabular-nums">
                      v{p.version}
                    </td>
                    <td className="px-4 py-3">
                      <ProductStatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-caption text-muted-foreground tabular-nums">
                      {formatUpdated(p.lastUpdated)}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 h-8"
                        onClick={() => navigate(`/data-products/products/${p.id}`)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </Button>
                      {p.status === "draft" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 h-8"
                          onClick={() => navigate(`/data-products/products/${p.id}/edit`)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
