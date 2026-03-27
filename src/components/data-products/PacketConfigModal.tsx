import { useEffect, useMemo, useState } from "react";
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
  derivedFieldTemplatesByPacketId,
  getAllRawFieldKeysForPacketOption,
  productCatalogPacketOptions,
  SOURCE_TYPE_LABELS,
} from "@/data/data-products-mock";
import { schemaRegistryEntries } from "@/data/schema-mapper-mock";

export interface PacketConfigSavePayload {
  selectedFields: string[];
  selectedDerivedFields: string[];
}

interface PacketConfigModalProps {
  packetId: string | null;
  open: boolean;
  onClose: () => void;
  selectedFields: string[];
  selectedDerivedFields?: string[];
  onSave: (packetId: string, payload: PacketConfigSavePayload) => void;
}

export function PacketConfigModal({
  packetId,
  open,
  onClose,
  selectedFields,
  selectedDerivedFields = [],
  onSave,
}: PacketConfigModalProps) {
  const packet = useMemo(
    () => productCatalogPacketOptions.find((o) => o.id === packetId),
    [packetId]
  );

  /** All Schema Mapper registry sources for this packet’s source type (same data as Data Governance → Schema Mapper). */
  const registrySourcesForType = useMemo(() => {
    if (!packet) return [];
    return schemaRegistryEntries
      .filter((e) => e.sourceType === packet.sourceType)
      .slice()
      .sort((a, b) => a.sourceName.localeCompare(b.sourceName));
  }, [packet]);

  const allRawKeys = useMemo(() => (packet ? getAllRawFieldKeysForPacketOption(packet) : []), [packet]);
  const derivedOptions = useMemo(
    () => (packetId ? derivedFieldTemplatesByPacketId[packetId] ?? [] : []),
    [packetId]
  );

  const [tab, setTab] = useState<"raw" | "derived">("raw");
  const [search, setSearch] = useState("");
  const [checkedRaw, setCheckedRaw] = useState<string[]>([]);
  const [checkedDerived, setCheckedDerived] = useState<string[]>([]);

  useEffect(() => {
    if (open && packet) {
      setTab("raw");
      setSearch("");
      const defaultRaw =
        selectedFields.length > 0 ? [...selectedFields] : [...packet.fields];
      setCheckedRaw(defaultRaw);
      setCheckedDerived(
        selectedDerivedFields.length > 0 ? [...selectedDerivedFields] : []
      );
    }
  }, [open, packet, selectedFields, selectedDerivedFields]);

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
    if (!packetId) return;
    if (checkedRaw.length === 0 && checkedDerived.length === 0) return;
    onSave(packetId, { selectedFields: checkedRaw, selectedDerivedFields: checkedDerived });
    onClose();
  };

  const canSave = checkedRaw.length > 0 || checkedDerived.length > 0;

  if (!packet) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg w-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-h4 font-semibold">{packet.label}</DialogTitle>
            <Badge variant="secondary" className="font-normal">
              Source type: {SOURCE_TYPE_LABELS[packet.sourceType]}
            </Badge>
          </div>
          <p className="text-caption text-muted-foreground mt-0.5">{packet.description}</p>
          {registrySourcesForType.length > 0 && (
            <div className="text-caption text-muted-foreground mt-1 space-y-1">
              <p className="font-medium text-foreground">
                Schema Mapper registry ({SOURCE_TYPE_LABELS[packet.sourceType]})
              </p>
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
            </div>
          )}
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "raw" | "derived")} className="flex flex-col min-h-0 flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="raw">Raw data</TabsTrigger>
            <TabsTrigger value="derived">Derived fields</TabsTrigger>
          </TabsList>

          <TabsContent value="raw" className="space-y-3 py-2 mt-2 flex flex-col min-h-0 data-[state=inactive]:hidden">
            <p className="text-caption text-muted-foreground">
              Raw field paths match Schema Mapper for this source type (merged with any packet-only fields).
            </p>
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
