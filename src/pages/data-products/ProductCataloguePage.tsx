import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses } from "@/lib/typography";
import { BRD_STATUS_LABEL, type BrdLifecycleStatus } from "@/data/product-management-types";
import { productCatalogPacketOptions } from "@/data/data-products-mock";
import { ProductStatusBadge } from "@/components/data-products/ProductStatusBadge";
import { productMgmtStore, useProductMgmtStore } from "@/lib/product-management-demo-store";

export default function ProductCataloguePage() {
  const navigate = useNavigate();
  useProductMgmtStore();
  const versions = productMgmtStore.listVersions().filter((v) => v.status !== "archived");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [packetFilter, setPacketFilter] = useState("all");
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => {
    const s = new Set<string>();
    versions.forEach((v) => v.metadata.categories.forEach((c) => s.add(c)));
    return [...s];
  }, [versions]);

  const filtered = useMemo(() => {
    return versions.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.productCode.toLowerCase().includes(q) ||
        p.metadata.owner.toLowerCase().includes(q) ||
        p.metadata.tags.some((t) => t.toLowerCase().includes(q)) ||
        p.packetIds.some((id) => id.toLowerCase().includes(q));
      const matchStatus = status === "all" || p.status === status;
      const matchPacket = packetFilter === "all" || p.packetIds.includes(packetFilter);
      const matchCat =
        category === "all" || p.metadata.categories.includes(category);
      return matchSearch && matchStatus && matchPacket && matchCat;
    });
  }, [versions, search, status, packetFilter, category]);

  const impact =
    packetFilter !== "all" ? productMgmtStore.getProductsUsingPacket(packetFilter) : [];

  return (
    <div className="space-y-6 animate-fade-in pb-6">
      <PageBreadcrumb
        segments={[
          { label: "Dashboard", href: "/" },
          { label: "Data Products", href: "/data-products/products" },
          { label: "Catalogue" },
        ]}
      />

      <div>
        <h1 className="text-h2 font-semibold text-foreground">Product catalogue</h1>
        <p className="mt-0.5 text-caption text-muted-foreground">
          Discover versions by metadata, status, and packet impact (governance view).
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-sm relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search name, code, owner, tag…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(BRD_STATUS_LABEL) as BrdLifecycleStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {BRD_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={packetFilter} onValueChange={setPacketFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Packet impact" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any packet</SelectItem>
            {productCatalogPacketOptions.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {packetFilter !== "all" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Packet impact —{" "}
              {productCatalogPacketOptions.find((o) => o.id === packetFilter)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-caption text-muted-foreground">
            {impact.length} product version(s) reference this packet:{" "}
            {impact.map((v) => `${v.name} v${v.version}`).join("; ") || "none"}
          </CardContent>
        </Card>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full min-w-max">
          <thead className="bg-muted/80">
            <tr className="border-b border-border">
              {["Code", "Name", "Ver.", "Category", "Owner", "Status", ""].map((h) => (
                <th
                  key={h || "x"}
                  className={cn(tableHeaderClasses, "px-4 py-3 text-left", !h && "text-right")}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-caption text-muted-foreground">{p.productCode}</td>
                <td className="px-4 py-3 text-body">{p.name}</td>
                <td className="px-4 py-3 text-caption">v{p.version}</td>
                <td className="px-4 py-3 text-caption text-muted-foreground">
                  {p.metadata.categories.join(", ")}
                </td>
                <td className="px-4 py-3 text-caption">{p.metadata.owner}</td>
                <td className="px-4 py-3">
                  <ProductStatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/data-products/products/${p.id}`)}
                  >
                    Open
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
