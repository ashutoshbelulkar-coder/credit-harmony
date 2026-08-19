import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { DqFilters, DqPeriodPreset } from "@/types/dq-monitoring";
import { dqMembers, DQ_MEMBER_COUNT, DQ_PROFILES } from "@/data/dq-monitoring-mock";

const PERIODS: { value: DqPeriodPreset; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "custom", label: "Custom" },
];

function MemberMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const matches = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = query
      ? dqMembers.filter((m) => m.name.toLowerCase().includes(query) || m.id.toLowerCase().includes(query))
      : dqMembers;
    return list.slice(0, 50);
  }, [q]);
  const label =
    value.length === 0
      ? `All ${DQ_MEMBER_COUNT.toLocaleString("en-US")} members`
      : value.length === 1
        ? (dqMembers.find((m) => m.id === value[0])?.name ?? value[0])
        : `${value.length} members`;

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="block text-caption leading-4 text-muted-foreground">Member</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 w-[240px] justify-between text-caption font-normal">
            <span className="truncate">{label}</span>
            <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput value={q} onValueChange={setQ} placeholder="Search members…" className="text-caption h-9" />
            <CommandList>
              <CommandEmpty className="text-caption py-4">No members found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  className="text-caption"
                  onSelect={() => {
                    onChange([]);
                    setOpen(false);
                  }}
                >
                  All {DQ_MEMBER_COUNT.toLocaleString("en-US")} members
                </CommandItem>
                {matches.map((m) => {
                  const selected = value.includes(m.id);
                  return (
                    <CommandItem
                      key={m.id}
                      className="text-caption"
                      onSelect={() => {
                        onChange(selected ? value.filter((id) => id !== m.id) : [...value, m.id]);
                      }}
                    >
                      <Check className={cn("mr-2 h-3 w-3", selected ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{m.name}</span>
                      <span className="ml-auto text-muted-foreground">{m.id}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function DqFilterBar({
  filters,
  onChange,
}: {
  filters: DqFilters;
  onChange: (patch: Partial<DqFilters>) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-caption font-medium text-muted-foreground">Filters</p>
        {filters.memberIds.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-caption"
            onClick={() => onChange({ memberIds: [] })}
          >
            <X className="mr-1 h-3 w-3" />
            Clear members
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="flex flex-col gap-1.5">
          <Label className="block text-caption leading-4 text-muted-foreground">Period</Label>
          <div className="flex h-8 items-center gap-1">
            {PERIODS.map((p) => (
              <Button
                key={p.value}
                type="button"
                variant={filters.period === p.value ? "default" : "outline"}
                size="sm"
                className={cn("h-8 px-2.5 text-caption", filters.period === p.value && "text-primary-foreground")}
                onClick={() => onChange({ period: p.value })}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
        {filters.period === "custom" && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label className="block text-caption leading-4 text-muted-foreground">From</Label>
              <DatePicker value={filters.from} onChange={(from) => onChange({ from, period: "custom" })} className="h-8 text-caption" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="block text-caption leading-4 text-muted-foreground">To</Label>
              <DatePicker value={filters.to} onChange={(to) => onChange({ to, period: "custom" })} className="h-8 text-caption" />
            </div>
          </>
        )}
        <MemberMultiSelect value={filters.memberIds} onChange={(memberIds) => onChange({ memberIds })} />
        <div className="flex flex-col gap-1.5">
          <Label className="block text-caption leading-4 text-muted-foreground">Profile</Label>
          <Select value={filters.profile} onValueChange={(profile) => onChange({ profile })}>
            <SelectTrigger className="h-8 min-w-[180px] text-caption">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-caption">
                All profiles
              </SelectItem>
              {DQ_PROFILES.map((p) => (
                <SelectItem key={p} value={p} className="text-caption">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
