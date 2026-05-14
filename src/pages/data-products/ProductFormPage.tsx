import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Info, Settings2 } from "lucide-react";
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
import {
  useProduct,
  useProductPacketCatalog,
  useCreateProduct,
  useUpdateProduct,
} from "@/hooks/api/useProducts";
import type { ProductResponse } from "@/services/products.service";
import {
  buildProductPreviewJson,
  productCatalogPacketOptions,
  DEFAULT_ENQUIRY_CONFIG,
  normalizeEnquiryConfig,
  type EnquiryConfig,
  type PacketConfig,
} from "@/data/data-products-mock";
import {
  buildProductFormPacketRows,
  filterCatalogOptionsForProductForm,
  groupPacketRowsByCategory,
  sortPacketIdsByCatalogOrder,
  type ProductFormPacketRow,
} from "@/lib/product-packet-catalog";
import { PacketConfigModal } from "@/components/data-products/PacketConfigModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


const SCOPE_TOOLTIPS: Record<EnquiryConfig["scope"], string> = {
  SELF: "Returns data sourced directly from the subject entity's own records.",
  NETWORK: "Includes linked entities and immediate network connections.",
  CONSORTIUM: "Draws from the shared cross-lender consortium data pool.",
  VERTICAL: "Restricted to a specific industry vertical dataset.",
};

export default function ProductFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { data: existing } = useProduct(isEdit ? id : undefined);
  const { data: packetCatalogRes } = useProductPacketCatalog();
  const { mutate: createProduct, isPending: creating } = useCreateProduct();
  const { mutate: updateProduct, isPending: updating } = useUpdateProduct();

  const catalogOptions = packetCatalogRes?.options ?? productCatalogPacketOptions;
  const catalogOrderIds = useMemo(
    () => filterCatalogOptionsForProductForm(catalogOptions).map((o) => o.id),
    [catalogOptions]
  );
  const visibleCatalogIdSet = useMemo(() => new Set(catalogOrderIds), [catalogOrderIds]);
  const packetRowsByCategory = useMemo(
    () => groupPacketRowsByCategory(buildProductFormPacketRows(catalogOptions)),
    [catalogOptions]
  );

  // ── Basic Info ─────────────────────────────────────────────
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // ── Packets ────────────────────────────────────────────────
  const [orderedPacketIds, setOrderedPacketIds] = useState<string[]>([]);
  const [packetConfigs, setPacketConfigs] = useState<PacketConfig[]>([]);
  const [packetModalIds, setPacketModalIds] = useState<string[] | null>(null);

  // ── Enquiry ────────────────────────────────────────────────
  const [enquiryConfig, setEnquiryConfig] = useState<EnquiryConfig>(DEFAULT_ENQUIRY_CONFIG);

  // ── Hydrate from existing product ──────────────────────────
  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description ?? "");
      const ext = existing as ProductResponse;
      const ids = Array.isArray(ext.packetIds) ? ext.packetIds : [];
      setOrderedPacketIds(sortPacketIdsByCatalogOrder(ids, catalogOrderIds));
      setPacketConfigs(
        Array.isArray(ext.packetConfigs)
          ? (ext.packetConfigs as PacketConfig[])
          : []
      );
      setEnquiryConfig(
        ext.enquiryConfig && typeof ext.enquiryConfig === "object"
          ? normalizeEnquiryConfig(ext.enquiryConfig as Partial<EnquiryConfig>)
          : DEFAULT_ENQUIRY_CONFIG
      );
    } else if (!isEdit) {
      setName("");
      setDescription("");
      setOrderedPacketIds([]);
      setPacketConfigs([]);
      setEnquiryConfig(DEFAULT_ENQUIRY_CONFIG);
    }
  }, [existing, isEdit, catalogOrderIds]);

  // ── Packet selection (row = unique category + Schema Mapper source type) ──
  const togglePacketRow = useCallback(
    (row: ProductFormPacketRow) => {
      setOrderedPacketIds((prev) => {
        const anySelected = row.packetIds.some((pid) => prev.includes(pid));
        const next = anySelected
          ? prev.filter((pid) => !row.packetIds.includes(pid))
          : [...prev, ...row.packetIds.filter((pid) => !prev.includes(pid))];
        return sortPacketIdsByCatalogOrder(next, catalogOrderIds);
      });
    },
    [catalogOrderIds]
  );

  const toggleOrphanPacket = useCallback(
    (packetId: string) => {
      setOrderedPacketIds((prev) => {
        const next = prev.includes(packetId)
          ? prev.filter((x) => x !== packetId)
          : [...prev, packetId];
        return sortPacketIdsByCatalogOrder(next, catalogOrderIds);
      });
    },
    [catalogOrderIds]
  );

  // ── Field-level config ─────────────────────────────────────
  const getPacketConfig = useCallback(
    (packetId: string): PacketConfig =>
      packetConfigs.find((c) => c.packetId === packetId) ?? {
        packetId,
        selectedFields: [],
        disabledFields: [],
        selectedDerivedFields: [],
      },
    [packetConfigs]
  );

  const handleSavePacketFields = useCallback(
    (
      packetId: string,
      payload: {
        selectedFields: string[];
        disabledFields?: string[];
        selectedDerivedFields: string[];
      }
    ) => {
      setPacketConfigs((prev) => {
        const without = prev.filter((c) => c.packetId !== packetId);
        const selectedSet = new Set(payload.selectedFields);
        const disabled =
          payload.disabledFields?.filter((f) => selectedSet.has(f)) ?? [];
        return [
          ...without,
          {
            packetId,
            selectedFields: payload.selectedFields,
            disabledFields: disabled,
            selectedDerivedFields: payload.selectedDerivedFields,
          },
        ];
      });
    },
    []
  );

  // ── Preview JSON ───────────────────────────────────────────
  const previewJson = useMemo(
    () =>
      buildProductPreviewJson(
        name,
        orderedPacketIds,
        packetConfigs,
        normalizeEnquiryConfig(enquiryConfig)
      ),
    [name, orderedPacketIds, packetConfigs, enquiryConfig]
  );

  // ── Save ───────────────────────────────────────────────────
  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (isEdit && id) {
      updateProduct(
        {
          id,
          data: {
            name: name.trim(),
            description: description.trim(),
            status: existing?.status ?? "approval_pending",
            packetIds: orderedPacketIds,
            packetConfigs,
            enquiryConfig: normalizeEnquiryConfig(enquiryConfig),
          },
        },
        { onSuccess: () => navigate(`/data-products/products/${id}`) }
      );
    } else {
      createProduct(
        {
          name: name.trim(),
          description: description.trim(),
          status: "approval_pending",
          packetIds: orderedPacketIds,
          packetConfigs,
          enquiryConfig: normalizeEnquiryConfig(enquiryConfig),
        },
        { onSuccess: (row) => navigate(`/data-products/products/${row.id}`) }
      );
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
          <Button type="button" size="sm" onClick={handleSave} disabled={creating || updating}>
            {creating || updating ? "Saving…" : "Save product"}
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
                Click <span className="font-medium text-foreground">Configure</span> to choose fields per packet.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {packetRowsByCategory.map(([group, rows], gi) => (
                <div key={group}>
                  {gi > 0 && <Separator className="mb-4" />}
                  <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {group}
                  </p>
                  <ul className="space-y-1.5">
                    {rows.map((row) => {
                      const rowFullySelected =
                        row.packetIds.length > 0 &&
                        row.packetIds.every((pid) => orderedPacketIds.includes(pid));
                      const rowPartial =
                        !rowFullySelected &&
                        row.packetIds.some((pid) => orderedPacketIds.includes(pid));
                      const chkId = `pkt-grp-${row.packetIds[0]}`;
                      return (
                        <li
                          key={chkId}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                            rowFullySelected || rowPartial
                              ? "border-primary/30 bg-primary/5"
                              : "border-border/80 bg-transparent hover:bg-muted/30"
                          )}
                        >
                          <Checkbox
                            id={chkId}
                            checked={
                              rowPartial ? "indeterminate" : rowFullySelected
                            }
                            onCheckedChange={() => togglePacketRow(row)}
                            className="shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <label
                              htmlFor={chkId}
                              className="text-[11px] text-muted-foreground cursor-pointer leading-tight block"
                            >
                              {row.sourceTypeLabel}
                            </label>
                          </div>
                          {(rowFullySelected || rowPartial) && (() => {
                            const selectedPkts = row.packets.filter((opt) =>
                              orderedPacketIds.includes(opt.id)
                            );
                            if (selectedPkts.length === 0) return null;

                            const rowFieldCount = selectedPkts.reduce((sum, opt) => {
                              const cfg = getPacketConfig(opt.id);
                              return (
                                sum +
                                cfg.selectedFields.length +
                                (cfg.selectedDerivedFields?.length ?? 0)
                              );
                            }, 0);

                            return (
                              <div className="flex shrink-0 items-center min-w-[7rem]">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1.5 px-2 justify-start text-caption leading-snug overflow-visible"
                                  onClick={() =>
                                    setPacketModalIds(
                                      sortPacketIdsByCatalogOrder(
                                        selectedPkts.map((o) => o.id),
                                        catalogOrderIds
                                      )
                                    )
                                  }
                                >
                                  <Settings2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                                  <span className="min-w-0">Configure</span>
                                  {rowFieldCount > 0 && (
                                    <Badge
                                      variant="secondary"
                                      className="h-4 px-1.5 text-[10px] font-mono shrink-0"
                                    >
                                      {rowFieldCount}
                                    </Badge>
                                  )}
                                </Button>
                              </div>
                            );
                          })()}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              {orderedPacketIds.some((pid) => !visibleCatalogIdSet.has(pid)) && (
                <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5 space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Packets not in the standard catalogue (e.g. custom source). Uncheck to remove
                    from this product.
                  </p>
                  <ul className="space-y-1.5">
                    {orderedPacketIds
                      .filter((pid) => !visibleCatalogIdSet.has(pid))
                      .map((pid) => {
                        const meta = catalogOptions.find((o) => o.id === pid);
                        return (
                          <li
                            key={pid}
                            className="flex items-center gap-3 rounded-md border border-border/60 bg-background/50 px-2 py-2"
                          >
                            <Checkbox
                              id={`pkt-orphan-${pid}`}
                              checked
                              onCheckedChange={() => toggleOrphanPacket(pid)}
                              className="shrink-0"
                            />
                            <label
                              htmlFor={`pkt-orphan-${pid}`}
                              className="text-caption cursor-pointer flex-1 min-w-0"
                            >
                              {meta?.label ?? pid}
                              {meta?.description && (
                                <span className="text-muted-foreground block mt-0.5">
                                  {meta.description}
                                </span>
                              )}
                            </label>
                          </li>
                        );
                      })}
                  </ul>
                </div>
              )}
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

              <Separator />

              {/* Latest vs Trended (enquiry response shape) */}
              <div className="space-y-2">
                <Label className="text-caption font-medium">Enquiry data coverage</Label>
                <p className="text-caption text-muted-foreground">
                  Latest returns the current snapshot; Trended includes historical time series where configured.
                </p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(["LATEST", "TRENDED"] as const).map((dt) => (
                    <Button
                      key={dt}
                      type="button"
                      variant={normalizeEnquiryConfig(enquiryConfig).dataType === dt ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setEnquiryConfig((prev) => ({ ...prev, dataType: dt }))
                      }
                    >
                      {dt === "LATEST" ? "Latest Data" : "Trended Data"}
                    </Button>
                  ))}
                </div>
              </div>
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

      {packetModalIds && (
        <PacketConfigModal
          key={packetModalIds.join(",")}
          packetIds={packetModalIds}
          catalogOptions={catalogOptions}
          onClose={() => setPacketModalIds(null)}
          getPacketConfig={(pid) => {
            const c = getPacketConfig(pid);
            return {
              selectedFields: c.selectedFields,
              disabledFields: c.disabledFields ?? [],
              selectedDerivedFields: c.selectedDerivedFields ?? [],
            };
          }}
          onSave={handleSavePacketFields}
        />
      )}
    </div>
  );
}
