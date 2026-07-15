import { Link, useNavigate, useParams } from "react-router-dom";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  productMgmtStore,
  useProductMgmtStore,
  useProductMgmtVersion,
} from "@/lib/product-management-demo-store";
import { ProductStatusBadge } from "@/components/data-products/ProductStatusBadge";
import { GitCompare } from "lucide-react";

export default function ProductVersionsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useProductMgmtStore();
  const product = useProductMgmtVersion(id);

  if (!product) {
    return <div className="py-20 text-center text-muted-foreground">Product not found.</div>;
  }

  const versions = productMgmtStore.getVersionsByCode(product.productCode);

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <PageBreadcrumb
        segments={[
          { label: "Dashboard", href: "/" },
          { label: "Data Products", href: "/data-products/products" },
          { label: product.name, href: `/data-products/products/${product.id}` },
          { label: "Versions" },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 font-semibold text-foreground">Version history</h1>
          <p className="text-caption text-muted-foreground mt-1">
            {product.productCode} — sequential lineage (never reused)
          </p>
        </div>
        {versions.length >= 2 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              navigate(
                `/data-products/products/${product.id}/versions/compare?a=${versions[1].id}&b=${versions[0].id}`
              )
            }
          >
            <GitCompare className="w-3.5 h-3.5" />
            Compare latest two
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Lineage timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {versions.map((v, i) => {
            const parent = v.parentVersionId
              ? versions.find((x) => x.id === v.parentVersionId)
              : null;
            return (
              <div
                key={v.id}
                className="relative flex gap-4 border-l-2 border-border pl-4 pb-6 last:pb-0"
              >
                <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/data-products/products/${v.id}`}
                      className="text-body font-medium text-foreground hover:underline"
                    >
                      v{v.version}
                    </Link>
                    <ProductStatusBadge status={v.status} />
                    {v.id === product.id && (
                      <span className="text-caption text-muted-foreground">(viewing)</span>
                    )}
                  </div>
                  <p className="text-caption text-muted-foreground">
                    Created {new Date(v.createdAt).toLocaleDateString()} · Updated{" "}
                    {new Date(v.lastUpdated).toLocaleDateString()} · {v.consumerCount} consumers
                  </p>
                  {parent && (
                    <p className="text-caption text-muted-foreground">
                      Cloned from v{parent.version}
                    </p>
                  )}
                  {i < versions.length - 1 && versions[i + 1] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-caption"
                      onClick={() =>
                        navigate(
                          `/data-products/products/${product.id}/versions/compare?a=${versions[i + 1].id}&b=${v.id}`
                        )
                      }
                    >
                      Diff vs v{versions[i + 1].version}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
