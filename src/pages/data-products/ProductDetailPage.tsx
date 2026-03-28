import { useNavigate, useParams } from "react-router-dom";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { badgeTextClasses } from "@/lib/typography";
import { useProduct } from "@/hooks/api/useProducts";
import type { ProductLifecycleStatus } from "@/data/data-products-mock";

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


export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProduct(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-caption text-muted-foreground">Loading product…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-muted-foreground">Product not found.</p>
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
    <div className="space-y-6 animate-fade-in max-w-4xl">
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
            <h1 className="text-h2 font-semibold text-foreground break-words">{product.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium",
                  badgeTextClasses,
                  statusStyles[product.status as ProductLifecycleStatus] ?? "bg-muted text-muted-foreground"
                )}
              >
                {statusLabel[product.status as ProductLifecycleStatus] ?? product.status}
              </span>
              {product.lastUpdated && (
                <span className="text-caption text-muted-foreground">
                  Updated {formatUpdated(product.lastUpdated)}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0 self-start"
          onClick={() => navigate(`/data-products/products/${product.id}/edit`)}
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </Button>
      </div>

      {/* Product Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Product info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-muted-foreground">
          <p className="text-caption">{product.description || "—"}</p>
          <p className="text-caption">Product ID: {product.id}</p>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 text-caption">
          <div>
            <p className="text-caption text-muted-foreground">Type</p>
            <p className="text-foreground font-medium">{product.type || "—"}</p>
          </div>
          <div>
            <p className="text-caption text-muted-foreground">Price</p>
            <p className="text-foreground font-medium tabular-nums">
              {product.price != null
                ? `${product.price.toLocaleString()} ${product.currency ?? ""}`
                : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Usage metrics (mock) */}
      <div>
        <h2 className="text-[12px] font-semibold text-foreground mb-3">Usage metrics (mock)</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="px-3 pt-3 pb-1">
              <CardTitle className="text-[10px] font-medium text-muted-foreground">
                Hits (30d)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <p className="text-h3 font-semibold tabular-nums text-foreground">12,480</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="px-3 pt-3 pb-1">
              <CardTitle className="text-[10px] font-medium text-muted-foreground">
                Active subscribers
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <p className="text-h3 font-semibold tabular-nums text-foreground">24</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="px-3 pt-3 pb-1">
              <CardTitle className="text-[10px] font-medium text-muted-foreground">
                Error rate
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <p className="text-h3 font-semibold tabular-nums text-foreground">0.02%</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
