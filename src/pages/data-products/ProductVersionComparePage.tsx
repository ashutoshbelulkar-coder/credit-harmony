import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  productMgmtStore,
  useProductMgmtStore,
  useProductMgmtVersion,
} from "@/lib/product-management-demo-store";
import { ProductStatusBadge } from "@/components/data-products/ProductStatusBadge";
import { catalogLabelForPacketId } from "@/data/data-products-mock";
import { useNavigate } from "react-router-dom";

export default function ProductVersionComparePage() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  useProductMgmtStore();
  const anchor = useProductMgmtVersion(id);

  const versions = anchor
    ? productMgmtStore.getVersionsByCode(anchor.productCode)
    : [];

  const aId = params.get("a") ?? versions[1]?.id ?? versions[0]?.id;
  const bId = params.get("b") ?? versions[0]?.id;
  const a = aId ? productMgmtStore.getVersion(aId) : undefined;
  const b = bId ? productMgmtStore.getVersion(bId) : undefined;

  const diff = useMemo(() => {
    if (!a || !b) return null;
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
    const metaKeys = ["owner", "businessUnit", "targetSegment", "sensitivity"] as const;
    const metaDiff = metaKeys.filter((k) => a.metadata[k] !== b.metadata[k]);
    return { added, removed, fieldChanges, metaDiff };
  }, [a, b]);

  if (!anchor) {
    return <div className="py-20 text-center text-muted-foreground">Product not found.</div>;
  }

  const setPair = (key: "a" | "b", value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next);
  };

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

      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <p className="text-caption text-muted-foreground">Version A (baseline)</p>
          <Select value={aId} onValueChange={(v) => setPair("a", v)}>
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
          <Select value={bId} onValueChange={(v) => setPair("b", v)}>
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

      {a && b && (
        <div className="grid gap-4 md:grid-cols-2">
          {[a, b].map((v) => (
            <Card key={v.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
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
      )}

      {diff && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Diff summary (B vs A)</CardTitle>
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
              <p className="font-medium text-foreground">Metadata changes</p>
              <p className="text-muted-foreground">
                {diff.metaDiff.length ? diff.metaDiff.join(", ") : "None"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
