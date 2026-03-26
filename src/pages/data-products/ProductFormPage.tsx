import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, Info, Settings2 } from "lucide-react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCatalogMock } from "@/contexts/CatalogMockContext";
import {
  buildProductPreviewJson,
  productCatalogPacketOptions,
  type EnquiryConfig,
  type PacketConfig,
  type ProductCatalogPacketGroup,
} from "@/data/data-products-mock";
import { PacketConfigModal } from "@/components/data-products/PacketConfigModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DEFAULT_ENQUIRY: EnquiryConfig = { impactType: "LOW", scope: "SELF", mode: "LIVE" };

const SCOPE_TOOLTIPS: Record<EnquiryConfig["scope"], string> = {
  SELF: "Returns data sourced directly from the subject entity's own records.",
  NETWORK: "Includes linked entities and immediate network connections.",
  CONSORTIUM: "Draws from the shared cross-lender consortium data pool.",
  VERTICAL: "Restricted to a specific industry vertical dataset.",
};

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

/** Groups productCatalogPacketOptions by category preserving insertion order. */
function groupPacketsByCategory() {
  const visiblePacketOptions = productCatalogPacketOptions.filter(
    (opt) => opt.id !== "PKT_SYN"
  );
  const map = new Map<ProductCatalogPacketGroup, typeof productCatalogPacketOptions>();
  for (const opt of visiblePacketOptions) {
    if (!map.has(opt.category)) map.set(opt.category, []);
    map.get(opt.category)!.push(opt);
  }
  return map;
}

const packetGroups = groupPacketsByCategory();

export default function ProductFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { products, addProduct, updateProduct } = useCatalogMock();
  const isEdit = Boolean(id);

  const existing = useMemo(
    () => (isEdit ? products.find((p) => p.id === id) : undefined),
    [isEdit, id, products]
  );

  // ── Basic Info ─────────────────────────────────────────────
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // ── Packets ────────────────────────────────────────────────
  const [orderedPacketIds, setOrderedPacketIds] = useState<string[]>([]);
  const [packetConfigs, setPacketConfigs] = useState<PacketConfig[]>([]);
  const [configuringPacketId, setConfiguringPacketId] = useState<string | null>(null);

  // ── Enquiry ────────────────────────────────────────────────
  const [enquiryConfig, setEnquiryConfig] = useState<EnquiryConfig>(DEFAULT_ENQUIRY);

  // ── Hydrate from existing product ──────────────────────────
  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description);
      setOrderedPacketIds([...existing.packetIds]);
      setPacketConfigs(existing.packetConfigs ? [...existing.packetConfigs] : []);
      setEnquiryConfig(existing.enquiryConfig ? { ...existing.enquiryConfig } : DEFAULT_ENQUIRY);
    } else if (!isEdit) {
      setName("");
      setDescription("");
      setOrderedPacketIds([]);
      setPacketConfigs([]);
      setEnquiryConfig(DEFAULT_ENQUIRY);
    }
  }, [existing, isEdit]);

  const labelById = useMemo(
    () => new Map(productCatalogPacketOptions.map((o) => [o.id, o.label])),
    []
  );

  // ── Packet selection ───────────────────────────────────────
  const togglePacket = useCallback((packetId: string) => {
    setOrderedPacketIds((prev) =>
      prev.includes(packetId) ? prev.filter((x) => x !== packetId) : [...prev, packetId]
    );
  }, []);

  // ── Field-level config ─────────────────────────────────────
  const getPacketConfig = useCallback(
    (packetId: string): PacketConfig =>
      packetConfigs.find((c) => c.packetId === packetId) ?? { packetId, selectedFields: [] },
    [packetConfigs]
  );

  const handleSavePacketFields = useCallback((packetId: string, fields: string[]) => {
    setPacketConfigs((prev) => {
      const without = prev.filter((c) => c.packetId !== packetId);
      return [...without, { packetId, selectedFields: fields }];
    });
  }, []);

  // ── Preview JSON ───────────────────────────────────────────
  const previewJson = useMemo(
    () => buildProductPreviewJson(name, orderedPacketIds, packetConfigs, enquiryConfig),
    [name, orderedPacketIds, packetConfigs, enquiryConfig]
  );

  // ── Save ───────────────────────────────────────────────────
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
        status: existing?.status ?? "approval_pending",
        pricingModel: "per_hit" as const,
        price: 0,
        packetIds: orderedPacketIds,
        packetConfigs,
        enquiryConfig,
      });
      toast.success("Product updated");
      navigate(`/data-products/products/${id}`);
    } else {
      const row = addProduct({
        name: name.trim(),
        description: description.trim(),
        status: "approval_pending",
        pricingModel: "per_hit" as const,
        price: 0,
        packetIds: orderedPacketIds,
        packetConfigs,
        enquiryConfig,
      });
      toast.success("Product submitted for approval");
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
            Compose from internal packets, configure fields, set enquiry scope and pricing.
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/data-products/products")}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave}>
            Save product
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── LEFT COLUMN ─────────────────────────────────── */}
        <div className="space-y-6 min-w-0">

          {/* SECTION 1: Basic Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-h4 font-medium">Basic info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="pf-name" className="text-caption">Product name</Label>
                <Input
                  id="pf-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="max-w-md"
                  placeholder="e.g. SME Credit Decision Pack"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-desc" className="text-caption">Description</Label>
                <Textarea
                  id="pf-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="max-w-md resize-y min-h-[80px]"
                  placeholder="Describe the purpose of this product..."
                />
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2: Data Packets */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-h4 font-medium">Data packets</CardTitle>
              <p className="text-caption text-muted-foreground mt-0.5">
                Select packets to include. Click <span className="font-medium text-foreground">Configure</span> to choose specific fields.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from(packetGroups.entries()).map(([group, packets], gi) => (
                <div key={group}>
                  {gi > 0 && <Separator className="mb-4" />}
                  <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {group}
                  </p>
                  <ul className="space-y-1.5">
                    {packets.map((opt) => {
                      const isSelected = orderedPacketIds.includes(opt.id);
                      const cfg = getPacketConfig(opt.id);
                      const fieldCount = cfg.selectedFields.length;
                      return (
                        <li
                          key={opt.id}
                          className={cn(
                            "flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                            isSelected
                              ? "border-primary/30 bg-primary/5"
                              : "border-border/80 bg-transparent hover:bg-muted/30"
                          )}
                        >
                          <Checkbox
                            id={`pkt-${opt.id}`}
                            checked={isSelected}
                            onCheckedChange={() => togglePacket(opt.id)}
                            className="mt-0.5 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <label
                              htmlFor={`pkt-${opt.id}`}
                              className="text-body font-medium cursor-pointer leading-tight"
                            >
                              {opt.label}
                            </label>
                            <p className="text-caption text-muted-foreground mt-0.5 leading-snug">
                              {opt.description}
                            </p>
                          </div>
                          {isSelected && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1.5 px-2 shrink-0 text-caption"
                              onClick={() => setConfiguringPacketId(opt.id)}
                            >
                              <Settings2 className="w-3.5 h-3.5" />
                              Configure
                              {fieldCount > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="h-4 px-1.5 text-[10px] font-mono ml-0.5"
                                >
                                  {fieldCount}
                                </Badge>
                              )}
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* SECTION 3: Enquiry Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-h4 font-medium">Enquiry settings</CardTitle>
              <p className="text-caption text-muted-foreground mt-0.5">
                Define how this product's enquiries are classified and delivered.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Data Coverage Scope */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label className="text-caption font-medium">Data coverage scope</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Scope information"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-caption">
                      <p className="font-medium mb-1">Coverage Scope</p>
                      <ul className="space-y-0.5">
                        {(Object.entries(SCOPE_TOOLTIPS) as [EnquiryConfig["scope"], string][]).map(
                          ([key, desc]) => (
                            <li key={key}>
                              <span className="font-medium">{key}:</span> {desc}
                            </li>
                          )
                        )}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select
                  value={enquiryConfig.scope}
                  onValueChange={(v) =>
                    setEnquiryConfig((prev) => ({ ...prev, scope: v as EnquiryConfig["scope"] }))
                  }
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SELF">Self Data</SelectItem>
                    <SelectItem value="NETWORK">Network Data</SelectItem>
                    <SelectItem value="CONSORTIUM">Consortium Data</SelectItem>
                    <SelectItem value="VERTICAL">Vertical Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Enquiry Impact Type */}
              <div className="space-y-2">
                <Label className="text-caption font-medium">Enquiry impact type</Label>
                <p className="text-caption text-muted-foreground">
                  Soft pull does not affect the subject's credit footprint; hard pull is recorded as a formal enquiry.
                </p>
                <div className="flex gap-2 mt-1">
                  {(["LOW", "HIGH"] as const).map((impact) => (
                    <Button
                      key={impact}
                      type="button"
                      variant={enquiryConfig.impactType === impact ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setEnquiryConfig((prev) => ({ ...prev, impactType: impact }))
                      }
                    >
                      {impact === "LOW" ? "Soft Pull" : "Hard Pull"}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Data Mode */}
              <div className="space-y-2">
                <Label className="text-caption font-medium">Data mode</Label>
                <div className="flex gap-2 mt-1">
                  {(["LIVE", "SYNTHETIC"] as const).map((mode) => (
                    <Button
                      key={mode}
                      type="button"
                      variant={enquiryConfig.mode === mode ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setEnquiryConfig((prev) => ({ ...prev, mode }))
                      }
                    >
                      {mode === "LIVE" ? "Live Data" : "Synthetic Data"}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 4: Ordering */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-h4 font-medium">Packet order</CardTitle>
            </CardHeader>
            <CardContent>
              {orderedPacketIds.length === 0 ? (
                <p className="text-caption text-muted-foreground">Select at least one packet above.</p>
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

        </div>

        {/* ── RIGHT COLUMN: Preview JSON ──────────────────── */}
        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-h4 font-medium">Preview JSON</CardTitle>
            <p className="text-caption text-muted-foreground mt-0.5">
              Live preview of the enquiry payload. Updates as you configure packets and settings.
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[min(70vh,580px)] rounded-md border border-border bg-muted/30">
              <pre className="p-3 text-[10px] leading-relaxed font-mono text-foreground whitespace-pre-wrap break-all">
                {JSON.stringify(previewJson, null, 2)}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Packet configuration modal */}
      <PacketConfigModal
        packetId={configuringPacketId}
        open={configuringPacketId !== null}
        onClose={() => setConfiguringPacketId(null)}
        selectedFields={
          configuringPacketId ? getPacketConfig(configuringPacketId).selectedFields : []
        }
        onSave={handleSavePacketFields}
      />
    </div>
  );
}
