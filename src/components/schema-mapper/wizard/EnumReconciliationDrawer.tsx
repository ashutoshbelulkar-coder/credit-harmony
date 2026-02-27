import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, AlertTriangle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EnumReconciliation, EnumMappingEntry } from "@/types/schema-mapper";

interface EnumReconciliationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reconciliation: EnumReconciliation | null;
  onSave: (updated: EnumReconciliation) => void;
}

export function EnumReconciliationDrawer({
  open,
  onOpenChange,
  reconciliation,
  onSave,
}: EnumReconciliationDrawerProps) {
  const [mappings, setMappings] = useState<EnumMappingEntry[]>([]);
  const [availableMasterValues, setAvailableMasterValues] = useState<string[]>([]);
  const [newMasterValue, setNewMasterValue] = useState("");

  useEffect(() => {
    if (reconciliation) {
      setMappings(reconciliation.mappings.map((m) => ({ ...m })));
      setAvailableMasterValues([...reconciliation.masterEnumValues]);
    }
  }, [reconciliation]);

  if (!reconciliation) return null;

  const allMapped = mappings.every((m) => m.masterValue.length > 0);
  const hasDuplicateLabels = new Set(mappings.map((m) => m.masterValue)).size < mappings.filter((m) => m.masterValue).length;

  const updateMapping = (idx: number, masterValue: string) => {
    setMappings((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], masterValue, isApproved: true };
      return next;
    });
  };

  const addMasterValue = () => {
    if (!newMasterValue.trim()) return;
    const val = newMasterValue.trim().toLowerCase();
    if (!availableMasterValues.includes(val)) {
      setAvailableMasterValues((prev) => [...prev, val]);
    }
    setNewMasterValue("");
  };

  const handleSave = () => {
    onSave({
      ...reconciliation,
      mappings: mappings.map((m) => ({ ...m, isApproved: true })),
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-h4">Enum Reconciliation</SheetTitle>
          <SheetDescription className="text-caption">
            Map source enum values for <span className="font-semibold">{reconciliation.sourceFieldName}</span> to master schema enums
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Detected Source Values */}
          <div>
            <Label className="text-caption text-muted-foreground mb-2 block">
              Detected Source Values
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {reconciliation.detectedValues.map((v) => (
                <Badge key={v} variant="secondary" className="text-[9px] leading-[12px] font-mono">
                  {v}
                </Badge>
              ))}
            </div>
          </div>

          {/* Master Enum Values */}
          <div>
            <Label className="text-caption text-muted-foreground mb-2 block">
              Master Enum Values
            </Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {availableMasterValues.map((v) => (
                <Badge key={v} variant="outline" className="text-[9px] leading-[12px] font-mono">
                  {v}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add new value..."
                value={newMasterValue}
                onChange={(e) => setNewMasterValue(e.target.value)}
                className="h-7 text-caption"
                onKeyDown={(e) => e.key === "Enter" && addMasterValue()}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-7 shrink-0"
                onClick={addMasterValue}
                disabled={!newMasterValue.trim()}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Mapping Table */}
          <div className="space-y-2">
            <Label className="text-caption text-muted-foreground">Value Mapping</Label>
            {mappings.map((m, idx) => (
              <div
                key={m.sourceValue}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
              >
                <span className="text-body font-mono font-medium text-foreground min-w-[80px]">
                  {m.sourceValue}
                </span>
                <span className="text-muted-foreground">→</span>
                <Select
                  value={m.masterValue}
                  onValueChange={(v) => updateMapping(idx, v)}
                >
                  <SelectTrigger className="h-7 flex-1 text-caption">
                    <SelectValue placeholder="Select master value" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMasterValues.map((v) => (
                      <SelectItem key={v} value={v} className="text-caption font-mono">
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {m.isApproved ? (
                  <Check className="h-3.5 w-3.5 text-success shrink-0" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Validation */}
          {!allMapped && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-caption text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              All source enum values must be mapped before proceeding
            </div>
          )}
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!allMapped}>
            Save Enum Mapping
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
