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
  productCatalogPacketOptions,
  SOURCE_TYPE_LABELS,
  type ProductCatalogPacketOption,
} from "@/data/data-products-mock";
import { useSchemaRegistryList, useSourceTypeFields } from "@/hooks/api/useSchemaMapper";

export interface PacketConfigSavePayload {
  selectedFields: string[];
  selectedDerivedFields: string[];
}

function buildInitialDrafts(
  ids: string[],
  catalog: ProductCatalogPacketOption[],
  getPacketConfig: (packetId: string) => {
    selectedFields: string[];
    selectedDerivedFields: string[];
  }
): Record<string, { raw: string[]; derived: string[] }> {
  const drafts: Record<string, { raw: string[]; derived: string[] }> = {};
  for (const id of ids) {
    const p = catalog.find((o) => o.id === id);
    const c = getPacketConfig(id);
    drafts[id] = {
      raw: c.selectedFields.length > 0 ? [...c.selectedFields] : [...(p?.fields ?? [])],
      derived:
        (c.selectedDerivedFields?.length ?? 0) > 0 ? [...c.selectedDerivedFields] : [],
    };
  }
  return drafts;
}

interface PacketConfigModalProps {
  /** Catalogue-order ids for this source-type row (one or more packets). */
  packetIds: string[];
  /** Resolved packet rows (API catalogue or static seed); defaults to `productCatalogPacketOptions`. */
  catalogOptions?: ProductCatalogPacketOption[];
  onClose: () => void;
  getPacketConfig: (packetId: string) => {
    selectedFields: string[];
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
  const [activePacketId, setActivePacketId] = useState(packetIds[0]);
  const [packetDrafts, setPacketDrafts] = useState(() =>
    buildInitialDrafts(packetIds, catalog, getPacketConfig)
  );

  const packet = useMemo(
    () => catalog.find((o) => o.id === activePacketId),
    [activePacketId, catalog]
  );

  const sourceTypeKey = packet?.sourceType ?? "";
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
  const {
    data: sourceTypeFieldsRes,
    isLoading: rawFieldsLoading,
    isError: rawFieldsError,
    refetch: refetchRawFields,
  } = useSourceTypeFields(sourceTypeKey || undefined, {
    enabled: sourceTypeKey.length > 0,
  });

  /** Union of API field paths for this source type and catalogue packet-only fields. */
  const allRawKeys = useMemo(() => {
    if (!packet) return [];
    const fromApi =
      sourceTypeFieldsRes?.fields
        ?.map((f) => String(f.path ?? "").trim())
        .filter(Boolean) ?? [];
    const set = new Set<string>([...fromApi, ...packet.fields]);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [packet, sourceTypeFieldsRes?.fields]);
  const derivedOptions = useMemo(
    () => (packet?.derivedFields?.length ? packet.derivedFields : []),
    [packet?.derivedFields]
  );

  const [tab, setTab] = useState<"raw" | "derived">("raw");
  const [search, setSearch] = useState("");
  const initialActiveDraft = packetDrafts[packetIds[0]];
  const [checkedRaw, setCheckedRaw] = useState<string[]>(initialActiveDraft.raw);
  const [checkedDerived, setCheckedDerived] = useState<string[]>(initialActiveDraft.derived);

  const switchActivePacket = (nextId: string) => {
    if (nextId === activePacketId) return;
    const merged = {
      ...packetDrafts,
      [activePacketId]: { raw: checkedRaw, derived: checkedDerived },
    };
    setPacketDrafts(merged);
    setActivePacketId(nextId);
    setCheckedRaw(merged[nextId].raw);
    setCheckedDerived(merged[nextId].derived);
    setTab("raw");
    setSearch("");
  };

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
    }
  };

  const handleRawChange = (field: string, value: boolean | "indeterminate") => {
    setCheckedRaw((prev) =>
      value === true ? [...prev, field] : prev.filter((f) => f !== field)
    );
  };

  const handleDerivedChange = (field: string, value: boolean | "indeterminate") => {
    setCheckedDerived((prev) =>
      value === true ? [...prev, field] : prev.filter((f) => f !== field)
    );
  };

  const handleSave = () => {
    const merged = {
      ...packetDrafts,
      [activePacketId]: { raw: checkedRaw, derived: checkedDerived },
    };
    const hasAny = packetIds.some(
      (id) => merged[id].raw.length > 0 || merged[id].derived.length > 0
    );
    if (!hasAny) return;
    for (const id of packetIds) {
      const d = merged[id];
      onSave(id, { selectedFields: d.raw, selectedDerivedFields: d.derived });
    }
    onClose();
  };

  const mergedPreview = {
    ...packetDrafts,
    [activePacketId]: { raw: checkedRaw, derived: checkedDerived },
  };
  const canSave = packetIds.some(
    (id) => mergedPreview[id].raw.length > 0 || mergedPreview[id].derived.length > 0
  );

  if (!packet) return null;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg w-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="sr-only">Configure packet fields</DialogTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-normal">
              Source type: {SOURCE_TYPE_LABELS[packet.sourceType]}
            </Badge>
          </div>
          {packetIds.length > 1 && (
            <div className="mt-2 space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Packet
              </p>
              <div className="flex flex-wrap gap-1.5">
                {packetIds.map((id) => {
                  const meta = catalog.find((o) => o.id === id);
                  return (
                    <Button
                      key={id}
                      type="button"
                      size="sm"
                      variant={id === activePacketId ? "default" : "outline"}
                      className="h-7 text-caption"
                      onClick={() => switchActivePacket(id)}
                    >
                      {meta?.label ?? id}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
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
            <p className="text-caption text-muted-foreground">
              Raw field paths for this source type are loaded from the Schema Mapper API and merged with any
              packet-only fields from the catalogue.
            </p>
            {rawFieldsLoading && (
              <p className="text-caption text-muted-foreground">Loading field catalogue…</p>
            )}
            {rawFieldsError && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-caption text-destructive">
                <span>Could not load fields from the API.</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-caption"
                  onClick={() => refetchRawFields()}
                >
                  Retry
                </Button>
              </div>
            )}
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
                  {filteredRaw.map((field) => (
                    <li
                      key={field}
                      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={`pkt-raw-${field}`}
                        checked={checkedRaw.includes(field)}
                        onCheckedChange={(v) => handleRawChange(field, v)}
                      />
                      <Label
                        htmlFor={`pkt-raw-${field}`}
                        className="text-body font-mono font-normal cursor-pointer select-none flex-1 break-all"
                      >
                        {field}
                      </Label>
                    </li>
                  ))}
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
                      <Badge variant="outline" className="shrink-0 text-[10px]">
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
              <span className="ml-1.5 text-xs opacity-75">
                ({checkedRaw.length} raw{checkedDerived.length ? `, ${checkedDerived.length} derived` : ""})
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
