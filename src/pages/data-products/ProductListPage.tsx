import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Pencil, Plus, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses, badgeTextClasses } from "@/lib/typography";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import { useProducts } from "@/hooks/api/useProducts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  configuredProducts,
  productPricingLabel,
  productStatusFromApi,
  type ConfiguredProduct,
  type ProductLifecycleStatus,
} from "@/data/data-products-mock";

const statusStyles: Record<ProductLifecycleStatus, string> = {
  active: "bg-success/15 text-success",
  draft: "bg-warning/15 text-warning",
  approval_pending: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};

const statusLabel: Record<ProductLifecycleStatus, string> = {
  active: "Active",
  draft: "Draft",
  approval_pending: "Approval Pending",
};

export default function ProductListPage() {
  const navigate = useNavigate();
  const { data: apiProducts, isLoading, isError, error, refetch } = useProducts({ size: 100 });
  const products = useMemo((): ConfiguredProduct[] => {
    const apiList = apiProducts?.content ?? [];
    const apiById = new Map(apiList.map((p) => [p.id, p]));
    return configuredProducts.map((p) => {
      const o = apiById.get(p.id);
      if (!o) return p;
      return {
        ...p,
        name: o.name,
        description: o.description ?? p.description,
        status: productStatusFromApi(o.status),
        lastUpdated: o.lastUpdated ?? p.lastUpdated,
        price: o.price ?? p.price,
      };
    });
  }, [apiProducts]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [products, search, statusFilter]);

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
    <div className="space-y-6 animate-fade-in">
      <PageBreadcrumb
        segments={[
          { label: "Dashboard", href: "/" },
          { label: "Data Products", href: "/data-products/products" },
          { label: "Products" },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-h2 font-semibold text-foreground">Products</h1>
          <p className="text-caption text-muted-foreground mt-1">
            Configure catalogue products from internal data packets, pricing, and enquiry settings.
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:min-w-[min(100%,22rem)] sm:max-w-xl sm:grid-cols-2 sm:gap-2 sm:shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 min-h-8 w-full justify-center gap-1.5 px-3"
            onClick={() => navigate("/data-products/enquiry-simulation")}
          >
            <FlaskConical className="h-4 w-4 shrink-0" />
            <span className="text-center leading-tight">Enquiry simulation</span>
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 min-h-8 w-full justify-center gap-1.5 px-3"
            onClick={() => navigate("/data-products/products/create")}
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="text-center leading-tight">Create product</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-sm relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <SkeletonTable rows={5} cols={5} />}
      {isError && <ApiErrorCard error={error} onRetry={() => refetch()} />}

      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No products match your filters.
          </p>
        ) : (
          filtered.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-body font-medium text-foreground">{p.name}</span>
                <Badge
                  variant="outline"
                  className={cn(badgeTextClasses, statusStyles[p.status])}
                >
                  {statusLabel[p.status]}
                </Badge>
              </div>
              <p className="text-caption text-muted-foreground">Product ID: {p.id}</p>
              <p className="text-caption text-muted-foreground">
                {p.packetIds.length} packets · {productPricingLabel[p.pricingModel]} · Updated{" "}
                {formatUpdated(p.lastUpdated)}
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => navigate(`/data-products/products/${p.id}/edit`)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
              <tr className="border-b border-border">
                {[
                  "Product ID",
                  "Product name",
                  "Packets",
                  "Status",
                  "Last updated",
                  "",
                ].map((label) => (
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
                      {p.id}
                    </td>
                    <td className="px-4 py-3 text-body text-foreground">{p.name}</td>
                    <td className="px-4 py-3 text-body text-muted-foreground tabular-nums">
                      {p.packetIds.length}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex px-2 py-0.5 rounded-full",
                          badgeTextClasses,
                          statusStyles[p.status]
                        )}
                      >
                        {statusLabel[p.status]}
                      </span>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 h-8"
                        onClick={() => navigate(`/data-products/products/${p.id}/edit`)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Button>
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
