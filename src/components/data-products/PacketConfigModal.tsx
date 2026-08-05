import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  productCatalogPacketOptions,
  SOURCE_TYPE_LABELS,
  type ProductCatalogPacketOption,
} from "@/data/data-products-mock";
import {
  inferAttributeMode,
  inferFieldPii,
  inferFieldType,
} from "@/data/product-management-types";
import { useSchemaRegistryList } from "@/hooks/api/useSchemaMapper";
import { cn } from "@/lib/utils";
import { badgeTextClasses } from "@/lib/typography";
import { ATTRIBUTE_MODE_LABEL } from "@/components/data-products/AttributeBadges";

export interface PacketConfigSavePayload {
  selectedFields: string[];
  disabledFields?: string[];
  selectedDerivedFields: string[];
}

function buildInitialDraft(
  id: string,
  catalog: ProductCatalogPacketOption[],
  getPacketConfig: (packetId: string) => {
    selectedFields: string[];
    disabledFields?: string[];
    selectedDerivedFields: string[];
  }
): { raw: string[]; rawDisabled: string[]; derived: string[] } {
  const p = catalog.find((o) => o.id === id);
  const c = getPacketConfig(id);
  const raw = c.selectedFields.length > 0 ? [...c.selectedFields] : [...(p?.fields ?? [])];
  const rawSet = new Set(raw);
  const rawDisabled = (c.disabledFields ?? [])
    .map(String)
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((f) => rawSet.has(f));
  return {
    raw,
    rawDisabled,
    derived: (c.selectedDerivedFields?.length ?? 0) > 0 ? [...c.selectedDerivedFields] : [],
  };
}

interface PacketConfigModalProps {
  /** Catalogue-order ids for this source-type row (one or more packets). */
  packetIds: string[];
  /** Resolved packet rows (API catalogue or static seed); defaults to `productCatalogPacketOptions`. */
  catalogOptions?: ProductCatalogPacketOption[];
  onClose: () => void;
  getPacketConfig: (packetId: string) => {
    selectedFields: string[];
    disabledFields?: string[];
    selectedDerivedFields: string[];
  };
  onSave: (packetId: string, payload: PacketConfigSavePayload) => void;
}

export function PacketConfigModal({
  packetIds,
  catalogOptions,
  onClose,
  getPacketConfig,
  onSave,
}: PacketConfigModalProps) {
  const catalog = catalogOptions ?? productCatalogPacketOptions;
  const activePacketId = packetIds[0];
  const [draft] = useState(() => buildInitialDraft(activePacketId, catalog, getPacketConfig));

  const packet = useMemo(
    () => catalog.find((o) => o.id === activePacketId),
    [activePacketId, catalog]
  );

  const registryListParams = packet
    ? { sourceType: packet.sourceType, page: 0, size: 500 }
    : undefined;
  const {
    data: registryPage,
    isLoading: sourcesLoading,
    isError: sourcesError,
    refetch: refetchSources,
  } = useSchemaRegistryList(registryListParams, { enabled: !!packet });

  const registrySourcesForType = useMemo(() => {
    const rows = registryPage?.content ?? [];
    return [...rows].sort((a, b) => a.sourceName.localeCompare(b.sourceName));
  }, [registryPage?.content]);

  const allRawKeys = useMemo(() => {
    if (!packet) return [];
    return [...packet.fields].sort((a, b) => a.localeCompare(b));
  }, [packet]);
  const derivedOptions = useMemo(
    () => (packet?.derivedFields?.length ? packet.derivedFields : []),
    [packet?.derivedFields]
  );

  const [tab, setTab] = useState<"raw" | "derived">("raw");
  const [search, setSearch] = useState("");
  const [checkedRaw, setCheckedRaw] = useState<string[]>(draft.raw);
  const [disabledRaw, setDisabledRaw] = useState<string[]>(draft.rawDisabled ?? []);
  const [checkedDerived, setCheckedDerived] = useState<string[]>(draft.derived);
  const [hoveredField, setHoveredField] = useState<string | null>(null);

  const filteredRaw = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? allRawKeys.filter((f) => f.toLowerCase().includes(q)) : allRawKeys;
  }, [allRawKeys, search]);

  const allVisibleRawSelected =
    filteredRaw.length > 0 && filteredRaw.every((f) => checkedRaw.includes(f));
  const someVisibleRawSelected =
    filteredRaw.some((f) => checkedRaw.includes(f)) && !allVisibleRawSelected;

  const handleSelectAllRaw = (value: boolean | "indeterminate") => {
    if (value === true) {
      setCheckedRaw((prev) => {
        const next = new Set(prev);
        filteredRaw.forEach((f) => next.add(f));
        return [...next];
      });
    } else {
      setCheckedRaw((prev) => prev.filter((f) => !filteredRaw.includes(f)));
      setDisabledRaw((prev) => prev.filter((f) => !filteredRaw.includes(f)));
    }
  };

  const handleRawChange = (field: string, value: boolean | "indeterminate") => {
    setCheckedRaw((prev) =>
      value === true ? [...prev, field] : prev.filter((f) => f !== field)
    );
    if (value !== true) {
      setDisabledRaw((prev) => prev.filter((f) => f !== field));
    }
  };

  const handleSuppress = (field: string) => {
    if (!checkedRaw.includes(field)) return;
    setDisabledRaw((prev) => (prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]));
  };

  const handleDerivedChange = (field: string, value: boolean | "indeterminate") => {
    setCheckedDerived((prev) =>
      value === true ? [...prev, field] : prev.filter((f) => f !== field)
    );
  };

  const handleSave = () => {
    if (checkedRaw.length === 0 && checkedDerived.length === 0) return;
    const rawSet = new Set(checkedRaw);
    const disabled = disabledRaw.filter((f) => rawSet.has(f));
    // Save ONLY the active packet — siblings keep existing config untouched.
    onSave(activePacketId, {
      selectedFields: checkedRaw,
      disabledFields: disabled,
      selectedDerivedFields: checkedDerived,
    });
    onClose();
  };

  const canSave = checkedRaw.length > 0 || checkedDerived.length > 0;

  if (!packet) return null;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg w-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="sr-only">Configure packet fields</DialogTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-normal">
              {packet.label}
            </Badge>
            <Badge variant="outline" className="font-normal">
              {SOURCE_TYPE_LABELS[packet.sourceType]}
            </Badge>
          </div>
          <div className="text-caption text-muted-foreground mt-1 space-y-1">
            <p className="font-medium text-foreground">Sources</p>
            {sourcesLoading && (
              <p className="text-caption text-muted-foreground">Loading sources…</p>
            )}
            {sourcesError && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-caption text-destructive">
                <span>Could not load registry sources.</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-caption"
                  onClick={() => refetchSources()}
                >
                  Retry
                </Button>
              </div>
            )}
            {!sourcesLoading && !sourcesError && registrySourcesForType.length === 0 && (
              <p className="text-caption text-muted-foreground">
                No schema registry sources for this source type yet.
              </p>
            )}
            {!sourcesLoading && !sourcesError && registrySourcesForType.length > 0 && (
              <p className="flex flex-wrap items-baseline gap-x-1 gap-y-1">
                {registrySourcesForType.map((e, i) => (
                  <span key={e.id} className="inline-flex items-baseline gap-x-1">
                    {i > 0 && <span className="text-muted-foreground select-none">·</span>}
                    <Link
                      to={`/data-governance/auto-mapping-review?registry=${encodeURIComponent(e.id)}`}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {e.sourceName}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "raw" | "derived")} className="flex flex-col min-h-0 flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="raw">Raw data</TabsTrigger>
            <TabsTrigger value="derived">Derived fields</TabsTrigger>
          </TabsList>

          <TabsContent value="raw" className="space-y-3 py-2 mt-2 flex flex-col min-h-0 data-[state=inactive]:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search raw fields..."
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 px-1 pb-1 border-b border-border">
              <Checkbox
                id="pkt-modal-select-all-raw"
                checked={allVisibleRawSelected ? true : someVisibleRawSelected ? "indeterminate" : false}
                onCheckedChange={handleSelectAllRaw}
              />
              <Label
                htmlFor="pkt-modal-select-all-raw"
                className="text-caption font-medium cursor-pointer select-none"
              >
                Select all{search ? " matching" : ""}
                <span className="ml-1 text-muted-foreground font-normal">
                  ({filteredRaw.filter((f) => checkedRaw.includes(f)).length} / {filteredRaw.length})
                </span>
              </Label>
            </div>
            <ScrollArea className="h-[min(45vh,280px)] pr-1">
              {filteredRaw.length === 0 ? (
                <p className="text-caption text-muted-foreground py-6 text-center">No fields match your search.</p>
              ) : (
                <ul className="space-y-1">
                  {filteredRaw.map((field) => {
                    const selected = checkedRaw.includes(field);
                    const suppressed = disabledRaw.includes(field);
                    const mode = inferAttributeMode(field);
                    const pii = inferFieldPii(field);
                    const type = inferFieldType(field);
                    return (
                      <li
                        key={field}
                        className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                        onMouseEnter={() => setHoveredField(field)}
                        onMouseLeave={() => setHoveredField(null)}
                      >
                        <Checkbox
                          id={`pkt-raw-${field}`}
                          checked={selected}
                          onCheckedChange={(v) => handleRawChange(field, v)}
                        />
                        <Label
                          htmlFor={`pkt-raw-${field}`}
                          className={cn(
                            "text-body font-mono font-normal cursor-pointer select-none flex-1 break-all",
                            suppressed && "text-muted-foreground line-through"
                          )}
                        >
                          {field}
                        </Label>
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className={cn(
                              "px-1.5 py-0 rounded-full",
                              badgeTextClasses,
                              "bg-muted text-muted-foreground"
                            )}
                          >
                            {type}
                          </span>
                          {pii && (
                            <span
                              className={cn(
                                "px-1.5 py-0 rounded-full ring-1 ring-destructive/50 text-destructive",
                                badgeTextClasses
                              )}
                            >
                              PII
                            </span>
                          )}
                          <span
                            className={cn(
                              "px-1.5 py-0 rounded-full text-[10px] leading-[14px] font-medium normal-case",
                              mode === "TRENDED"
                                ? "bg-primary/15 text-primary"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {ATTRIBUTE_MODE_LABEL[mode]}
                          </span>
                          {selected && (hoveredField === field || suppressed) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="text-caption text-muted-foreground underline-offset-2 hover:underline"
                                  onClick={() => handleSuppress(field)}
                                >
                                  {suppressed ? "Unsuppress" : "Suppress"}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Field stays in the contract but is temporarily suppressed from
                                responses.
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="derived" className="space-y-3 py-2 mt-2 flex flex-col min-h-0 data-[state=inactive]:hidden">
            {derivedOptions.length === 0 ? (
              <p className="text-caption text-muted-foreground py-4 text-center">No derived field templates for this packet.</p>
            ) : (
              <ScrollArea className="h-[min(45vh,280px)] pr-1">
                <ul className="space-y-1">
                  {derivedOptions.map((field) => (
                    <li
                      key={field}
                      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={`pkt-derived-${field}`}
                        checked={checkedDerived.includes(field)}
                        onCheckedChange={(v) => handleDerivedChange(field, v)}
                      />
                      <Label
                        htmlFor={`pkt-derived-${field}`}
                        className="text-body font-mono font-normal cursor-pointer select-none flex-1 break-all"
                      >
                        {field}
                      </Label>
                      <Badge variant="outline" className="shrink-0">
                        future
                      </Badge>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={!canSave}>
            Save configuration
            {canSave && (
              <span className="ml-1.5 text-caption opacity-75">
                ({checkedRaw.length} raw{checkedDerived.length ? `, ${checkedDerived.length} derived` : ""})
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
