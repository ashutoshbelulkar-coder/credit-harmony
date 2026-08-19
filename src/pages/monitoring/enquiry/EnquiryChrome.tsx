import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ENQUIRY_ENTITIES,
  ENQUIRY_WINDOWS,
  searchMembers,
  type EnquiryAnchorFilter,
  type EnquiryEntityFilter,
  type EnquiryMember,
  type EnquiryTypeFilter,
  type EnquiryWindow,
} from "./enquiryScaleMock";

export interface EnquiryChromeState {
  window: EnquiryWindow;
  type: EnquiryTypeFilter;
  anchor: EnquiryAnchorFilter;
  entity: EnquiryEntityFilter;
  productId: string;
  memberId: string;
}

export function EnquiryChrome({ title }: { title: string }) {
  return <h1 className="text-h2 font-semibold text-foreground">{title}</h1>;
}

export function EnquiryFilters({
  catalog,
  state,
  onChange,
}: {
  catalog: EnquiryMember[];
  state: EnquiryChromeState;
  onChange: (partial: Partial<EnquiryChromeState>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const hits = useMemo(() => searchMembers(debounced, catalog, 40), [debounced, catalog]);
  const selected = catalog.find((s) => s.id === state.memberId);

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1">
        <Label className="block text-caption text-muted-foreground">Time window</Label>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Time window">
          {ENQUIRY_WINDOWS.map((w) => (
            <Button
              key={w.value}
              type="button"
              size="sm"
              className="h-8"
              variant={state.window === w.value ? "default" : "outline"}
              onClick={() => onChange({ window: w.value })}
            >
              {w.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="block text-caption text-muted-foreground">Entity</Label>
        <Select value={state.entity} onValueChange={(v) => onChange({ entity: v as EnquiryEntityFilter })}>
          <SelectTrigger className="h-8 w-[160px] text-caption">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            {ENQUIRY_ENTITIES.map((e) => (
              <SelectItem key={e.value} value={e.value} className="text-caption">
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-w-[200px] flex-col gap-1">
        <Label className="block text-caption text-muted-foreground">Member</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-[240px] max-w-full justify-between font-normal"
            >
              <span className="truncate">
                {selected ? `${selected.name} · ${selected.code}` : "All members"}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[280px] p-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or member code"
              className="h-8 text-caption"
            />
            <p className="mt-1.5 text-caption text-muted-foreground">
              Server-style search across {catalog.length} members · ≤40 hits
            </p>
            <div className="mt-2 max-h-56 overflow-y-auto">
              <button
                type="button"
                className={cn(
                  "w-full rounded-md px-2 py-1.5 text-left text-caption hover:bg-muted",
                  state.memberId === "all" && "bg-primary/5"
                )}
                onClick={() => {
                  onChange({ memberId: "all" });
                  setOpen(false);
                  setQ("");
                }}
              >
                All members
              </button>
              {hits.length === 0 ? (
                <p className="px-2 py-3 text-caption text-muted-foreground">
                  No members match — search runs on name and member code
                </p>
              ) : (
                hits.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted",
                      state.memberId === s.id && "bg-primary/5"
                    )}
                    onClick={() => {
                      onChange({ memberId: s.id });
                      setOpen(false);
                      setQ("");
                    }}
                  >
                    <span className="truncate text-caption text-foreground">{s.name}</span>
                    <span className="shrink-0 text-caption text-muted-foreground">{s.code}</span>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
