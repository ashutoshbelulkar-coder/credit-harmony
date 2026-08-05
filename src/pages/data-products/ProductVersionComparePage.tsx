import { useParams, useSearchParams } from "react-router-dom";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import {
  productMgmtStore,
  useProductMgmtStore,
  useProductMgmtVersion,
} from "@/lib/product-management-demo-store";
import { VersionComparePanel } from "@/components/data-products/VersionComparePanel";

export default function ProductVersionComparePage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  useProductMgmtStore();
  const anchor = useProductMgmtVersion(id);

  const versions = anchor
    ? productMgmtStore.getVersionsByCode(anchor.productCode)
    : [];

  const aId = params.get("a") ?? versions[1]?.id ?? versions[0]?.id;
  const bId = params.get("b") ?? versions[0]?.id;
  const a = aId ? productMgmtStore.getVersion(aId) : undefined;
  const b = bId ? productMgmtStore.getVersion(bId) : undefined;

  if (!anchor) {
    return <div className="py-20 text-center text-muted-foreground">Product not found.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <PageBreadcrumb
        segments={[
          { label: "Dashboard", href: "/" },
          { label: "Data Products", href: "/data-products/products" },
          { label: anchor.name, href: `/data-products/products/${anchor.id}` },
          { label: "Compare versions" },
        ]}
      />

      <div>
        <h1 className="text-h2 font-semibold text-foreground">Version compare</h1>
        <p className="text-caption text-muted-foreground mt-1">
          Side-by-side definition and metadata differences
        </p>
      </div>

      {a && b ? (
        <VersionComparePanel a={a} b={b} />
      ) : (
        <p className="text-caption text-muted-foreground">Select two versions to compare.</p>
      )}
    </div>
  );
}
