import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Reorder, useDragControls } from "framer-motion";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { GripVertical } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCatalogMock } from "@/contexts/CatalogMockContext";
import {
  productCatalogPacketOptions,
  type ProductLifecycleStatus,
  type ProductPricingModel,
} from "@/data/data-products-mock";
import { toast } from "sonner";

function ReorderRow({ packetId, label }: { packetId: string; label: string }) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      value={packetId}
      dragListener={false}
      dragControls={dragControls}
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-2 text-body cursor-default"
    >
      <button
        type="button"
        className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground touch-none"
        aria-label={`Reorder ${label}`}
        onPointerDown={(e) => dragControls.start(e)}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="truncate flex-1 text-foreground">{label}</span>
    </Reorder.Item>
  );
}

export default function ProductFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { products, addProduct, updateProduct } = useCatalogMock();
  const isEdit = Boolean(id);

  const existing = useMemo(
    () => (isEdit ? products.find((p) => p.id === id) : undefined),
    [isEdit, id, products]
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProductLifecycleStatus>("draft");
  const [pricingModel, setPricingModel] = useState<ProductPricingModel>("per_hit");
  const [price, setPrice] = useState<number>(0);
  const [orderedPacketIds, setOrderedPacketIds] = useState<string[]>([]);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description);
      setStatus(existing.status);
      setPricingModel(existing.pricingModel);
      setPrice(existing.price);
      setOrderedPacketIds([...existing.packetIds]);
    } else if (!isEdit) {
      setName("");
      setDescription("");
      setStatus("draft");
      setPricingModel("per_hit");
      setPrice(50);
      setOrderedPacketIds([]);
    }
  }, [existing, isEdit]);

  const labelById = useMemo(
    () => new Map(productCatalogPacketOptions.map((o) => [o.id, o.label])),
    []
  );

  const togglePacket = useCallback((packetId: string) => {
    setOrderedPacketIds((prev) => {
      if (prev.includes(packetId)) {
        return prev.filter((x) => x !== packetId);
      }
      return [...prev, packetId];
    });
  }, []);

  const previewJson = useMemo(() => {
    const packets = orderedPacketIds
      .map((pid) => labelById.get(pid))
      .filter((l): l is string => l != null);
    return { product: name || "—", packets };
  }, [name, orderedPacketIds, labelById]);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (orderedPacketIds.length === 0) {
      toast.error("Select at least one data packet");
      return;
    }
    if (isEdit && id) {
      updateProduct(id, {
        name: name.trim(),
        description: description.trim(),
        status,
        pricingModel,
        price: Number.isFinite(price) ? price : 0,
        packetIds: orderedPacketIds,
      });
      toast.success("Product updated");
      navigate(`/data-products/products/${id}`);
    } else {
      const row = addProduct({
        name: name.trim(),
        description: description.trim(),
        status,
        pricingModel,
        price: Number.isFinite(price) ? price : 0,
        packetIds: orderedPacketIds,
      });
      toast.success("Product created");
      navigate(`/data-products/products/${row.id}`);
    }
  };

  if (isEdit && !existing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-muted-foreground">Product not found.</p>
        <Button type="button" variant="outline" onClick={() => navigate("/data-products/products")}>
          Back to products
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <PageBreadcrumb
        segments={[
          { label: "Dashboard", href: "/" },
          { label: "Data Products", href: "/data-products/products" },
          { label: "Products", href: "/data-products/products" },
          { label: isEdit ? "Edit product" : "Create product" },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h2 font-semibold text-foreground">
            {isEdit ? "Edit product" : "Create product"}
          </h1>
          <p className="text-caption text-muted-foreground mt-1">
            Compose from internal packets, set order and pricing. Data packets are not exposed as a standalone module.
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate("/data-products/products")}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave}>
            Save product
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-h4 font-medium">Basic info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="pf-name" className="text-caption">
                  Product name
                </Label>
                <Input
                  id="pf-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="max-w-md"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-desc" className="text-caption">
                  Description
                </Label>
                <Textarea
                  id="pf-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="max-w-md resize-y min-h-[80px]"
                />
              </div>
              <div className="space-y-1.5 max-w-xs">
                <Label className="text-caption">Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as ProductLifecycleStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-h4 font-medium">Data packet selection</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {productCatalogPacketOptions.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center gap-3 rounded-md border border-border/80 px-3 py-2"
                  >
                    <Checkbox
                      id={`pkt-${o.id}`}
                      checked={orderedPacketIds.includes(o.id)}
                      onCheckedChange={() => togglePacket(o.id)}
                    />
                    <label htmlFor={`pkt-${o.id}`} className="flex-1 text-body cursor-pointer">
                      {o.label}
                    </label>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-h4 font-medium">Ordering</CardTitle>
            </CardHeader>
            <CardContent>
              {orderedPacketIds.length === 0 ? (
                <p className="text-caption text-muted-foreground">Select at least one packet.</p>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={orderedPacketIds}
                  onReorder={setOrderedPacketIds}
                  className="space-y-2"
                >
                  {orderedPacketIds.map((pid) => (
                    <ReorderRow
                      key={pid}
                      packetId={pid}
                      label={labelById.get(pid) ?? pid}
                    />
                  ))}
                </Reorder.Group>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-h4 font-medium">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-w-md">
              <div className="space-y-1.5">
                <Label className="text-caption">Pricing model</Label>
                <Select
                  value={pricingModel}
                  onValueChange={(v) => setPricingModel(v as ProductPricingModel)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_hit">Per hit</SelectItem>
                    <SelectItem value="subscription">Subscription</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-price" className="text-caption">
                  Price
                </Label>
                <Input
                  id="pf-price"
                  type="number"
                  min={0}
                  step={1}
                  value={Number.isFinite(price) ? price : 0}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-h4 font-medium">Preview JSON</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[min(70vh,520px)] rounded-md border border-border bg-muted/30">
              <pre className="p-3 text-[10px] leading-relaxed font-mono text-foreground whitespace-pre-wrap break-all">
                {JSON.stringify(previewJson, null, 2)}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
