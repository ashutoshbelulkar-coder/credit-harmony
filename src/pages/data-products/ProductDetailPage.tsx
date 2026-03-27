import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { badgeTextClasses } from "@/lib/typography";
import { useCatalogMock } from "@/contexts/CatalogMockContext";
import {
  catalogLabelForPacketId,
  normalizeEnquiryConfig,
  productCatalogPacketOptions,
  productPricingLabel,
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

const SCOPE_LABELS: Record<string, string> = {
  SELF: "Self Data",
  NETWORK: "Network Data",
  CONSORTIUM: "Consortium Data",
  VERTICAL: "Vertical Data",
};

const IMPACT_LABELS: Record<string, string> = {
  LOW: "Soft Pull",
  HIGH: "Hard Pull",
};

const MODE_LABELS: Record<string, string> = {
  LIVE: "Live Data",
  SYNTHETIC: "Synthetic Data",
};

const DATA_TYPE_LABELS: Record<string, string> = {
  LATEST: "Latest Data",
  TRENDED: "Trended Data",
};

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products } = useCatalogMock();

  const product = useMemo(() => products.find((p) => p.id === id), [products, id]);

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

  /** Returns the configured field count for a packet, falling back to total fields. */
  const fieldCountLabel = (packetId: string): string => {
    const opt = productCatalogPacketOptions.find((o) => o.id === packetId);
    const cfg = product.packetConfigs?.find((c) => c.packetId === packetId);
    if (!opt) return "";
    const raw =
      cfg && cfg.selectedFields.length > 0 ? cfg.selectedFields.length : opt.fields.length;
    const derived = cfg?.selectedDerivedFields?.length ?? 0;
    const count = raw + derived;
    return `${count} field${count !== 1 ? "s" : ""}${derived ? ` (${derived} derived)` : ""}`;
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
                  statusStyles[product.status]
                )}
              >
                {statusLabel[product.status]}
              </span>
              <span className="text-caption text-muted-foreground">
                Updated {formatUpdated(product.lastUpdated)}
              </span>
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

      {/* Included Packets */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Included packets</CardTitle>
        </CardHeader>
        <CardContent>
          {product.packetIds.length === 0 ? (
            <span className="text-caption text-muted-foreground">None selected.</span>
          ) : (
            <ul className="space-y-2">
              {product.packetIds.map((pid) => {
                const label = catalogLabelForPacketId(pid) ?? pid;
                const count = fieldCountLabel(pid);
                return (
                  <li
                    key={pid}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/80 px-3 py-2"
                  >
                    <span className="text-body text-foreground">{label}</span>
                    {count && (
                      <Badge variant="secondary" className="font-mono text-[10px] font-normal shrink-0">
                        {count}
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Enquiry Configuration */}
      {product.enquiryConfig && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Enquiry configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-caption text-muted-foreground">Impact type</p>
                <p className="text-body font-medium text-foreground mt-0.5">
                  {IMPACT_LABELS[product.enquiryConfig.impactType] ?? product.enquiryConfig.impactType}
                </p>
              </div>
              <div>
                <p className="text-caption text-muted-foreground">Coverage scope</p>
                <p className="text-body font-medium text-foreground mt-0.5">
                  {SCOPE_LABELS[product.enquiryConfig.scope] ?? product.enquiryConfig.scope}
                </p>
              </div>
              <div>
                <p className="text-caption text-muted-foreground">Data mode</p>
                <p className="text-body font-medium text-foreground mt-0.5">
                  {MODE_LABELS[product.enquiryConfig.mode] ?? product.enquiryConfig.mode}
                </p>
              </div>
              <div>
                <p className="text-caption text-muted-foreground">Enquiry data coverage</p>
                <p className="text-body font-medium text-foreground mt-0.5">
                  {DATA_TYPE_LABELS[normalizeEnquiryConfig(product.enquiryConfig).dataType] ??
                    normalizeEnquiryConfig(product.enquiryConfig).dataType}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 text-caption">
          <div>
            <p className="text-caption text-muted-foreground">Model</p>
            <p className="text-foreground font-medium">{productPricingLabel[product.pricingModel]}</p>
          </div>
          <div>
            <p className="text-caption text-muted-foreground">Price</p>
            <p className="text-foreground font-medium tabular-nums">
              {product.pricingModel === "subscription"
                ? `${product.price.toLocaleString()} / mo (mock)`
                : `${product.price.toLocaleString()} / hit (mock)`}
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
