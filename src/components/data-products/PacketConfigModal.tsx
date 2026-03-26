import { useEffect, useMemo, useState } from "react";
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
import { productCatalogPacketOptions } from "@/data/data-products-mock";

interface PacketConfigModalProps {
  packetId: string | null;
  open: boolean;
  onClose: () => void;
  selectedFields: string[];
  onSave: (packetId: string, fields: string[]) => void;
}

export function PacketConfigModal({
  packetId,
  open,
  onClose,
  selectedFields,
  onSave,
}: PacketConfigModalProps) {
  const packet = useMemo(
    () => productCatalogPacketOptions.find((o) => o.id === packetId),
    [packetId]
  );

  const [search, setSearch] = useState("");
  const [checked, setChecked] = useState<string[]>([]);

  // Sync internal state when modal opens or packet changes
  useEffect(() => {
    if (open && packet) {
      setSearch("");
      setChecked(
        selectedFields.length > 0 ? [...selectedFields] : [...packet.fields]
      );
    }
  }, [open, packet, selectedFields]);

  const filteredFields = useMemo(() => {
    if (!packet) return [];
    const q = search.trim().toLowerCase();
    return q ? packet.fields.filter((f) => f.toLowerCase().includes(q)) : packet.fields;
  }, [packet, search]);

  const allVisibleSelected =
    filteredFields.length > 0 && filteredFields.every((f) => checked.includes(f));
  const someVisibleSelected =
    filteredFields.some((f) => checked.includes(f)) && !allVisibleSelected;

  const handleSelectAllChange = (value: boolean | "indeterminate") => {
    if (value === true) {
      setChecked((prev) => {
        const next = new Set(prev);
        filteredFields.forEach((f) => next.add(f));
        return [...next];
      });
    } else {
      setChecked((prev) => prev.filter((f) => !filteredFields.includes(f)));
    }
  };

  const handleFieldChange = (field: string, value: boolean | "indeterminate") => {
    setChecked((prev) =>
      value === true ? [...prev, field] : prev.filter((f) => f !== field)
    );
  };

  const handleSave = () => {
    if (!packetId) return;
    onSave(packetId, checked);
    onClose();
  };

  if (!packet) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="text-h4 font-semibold">{packet.label}</DialogTitle>
          <p className="text-caption text-muted-foreground mt-0.5">{packet.description}</p>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fields..."
              className="pl-9"
            />
          </div>

          {/* Select all */}
          <div className="flex items-center gap-2 px-1 pb-1 border-b border-border">
            <Checkbox
              id="pkt-modal-select-all"
              checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
              onCheckedChange={handleSelectAllChange}
            />
            <Label
              htmlFor="pkt-modal-select-all"
              className="text-caption font-medium cursor-pointer select-none"
            >
              Select all{search ? " matching" : ""}
              <span className="ml-1 text-muted-foreground font-normal">
                ({filteredFields.filter((f) => checked.includes(f)).length} / {filteredFields.length})
              </span>
            </Label>
          </div>

          {/* Field list */}
          <ScrollArea className="h-[min(55vh,320px)] pr-1">
            {filteredFields.length === 0 ? (
              <p className="text-caption text-muted-foreground py-6 text-center">
                No fields match your search.
              </p>
            ) : (
              <ul className="space-y-1">
                {filteredFields.map((field) => (
                  <li
                    key={field}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`pkt-field-${field}`}
                      checked={checked.includes(field)}
                      onCheckedChange={(v) => handleFieldChange(field, v)}
                    />
                    <Label
                      htmlFor={`pkt-field-${field}`}
                      className="text-body font-mono font-normal cursor-pointer select-none flex-1"
                    >
                      {field}
                    </Label>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={checked.length === 0}
          >
            Save selection
            {checked.length > 0 && (
              <span className="ml-1.5 text-xs opacity-75">({checked.length})</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
