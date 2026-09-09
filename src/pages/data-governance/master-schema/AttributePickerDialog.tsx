import { useEffect, useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CanonicalAttribute } from "./types";
import { STATUS_STYLES } from "./msm-helpers";

export interface AttributePickerDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title?: string;
  attributes: CanonicalAttribute[];
  filter?: (attr: CanonicalAttribute) => boolean;
  initialId?: string;
  onConfirm: (attributeId: string) => void;
}

function fuzzyMatch(haystack: string, q: string): boolean {
  if (!q) return true;
  const hs = haystack.toLowerCase();
  const qs = q.toLowerCase();
  if (hs.includes(qs)) return true;
  let i = 0;
  for (const ch of hs) {
    if (ch === qs[i]) i += 1;
    if (i >= qs.length) return true;
  }
  return false;
}

export function AttributePickerDialog({
  open,
  onOpenChange,
  title = "Pick attribute",
  attributes,
  filter,
  initialId,
  onConfirm,
}: AttributePickerDialogProps) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(initialId ?? "");

  useEffect(() => {
    if (open) {
      setQ("");
      setSelected(initialId ?? "");
    }
  }, [open, initialId]);

  const rows = useMemo(() => {
    const base = filter ? attributes.filter(filter) : attributes;
    if (!q.trim()) return base;
    return base.filter((a) =>
      fuzzyMatch(
        `${a.attributeId} ${a.canonicalQualifier} ${a.displayName} ${a.definition} ${a.synonyms.join(" ")}`,
        q.trim(),
      ),
    );
  }, [attributes, filter, q]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Search by id, qualifier, display name, definition or synonyms.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search attributes…"
            className="h-9 pl-8"
          />
        </div>
        <ScrollArea className="h-72 rounded-md border border-border">
          <ul className="p-1">
            {rows.length === 0 && (
              <li className="px-3 py-8 text-center text-body text-muted-foreground">No attributes match.</li>
            )}
            {rows.map((a) => {
              const isSelected = selected === a.attributeId;
              return (
                <li key={a.attributeId}>
                  <button
                    type="button"
                    onClick={() => setSelected(a.attributeId)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/50",
                      isSelected && "bg-primary/10 ring-1 ring-primary/30",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-caption text-foreground truncate">{a.attributeId}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {a.canonicalQualifier} · {a.class} · {a.targetTable}
                      </p>
                    </div>
                    <Badge className={cn("text-[9px] leading-[12px] font-medium border-0 shrink-0", STATUS_STYLES[a.status])}>
                      {a.status}
                    </Badge>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selected}
            onClick={() => {
              onConfirm(selected);
              onOpenChange(false);
            }}
          >
            Select
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
