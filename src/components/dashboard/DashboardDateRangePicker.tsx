import { useMemo, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const presets = [
  { label: "Today", value: "today" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
] as const;

export type DashboardDateRange =
  | { kind: "preset"; preset: (typeof presets)[number]["value"] }
  | { kind: "custom"; from: Date; to?: Date };

interface DashboardDateRangePickerProps {
  className?: string;
  value: DashboardDateRange;
  onChange: (next: DashboardDateRange) => void;
}

export function DashboardDateRangePicker({
  className,
  value,
  onChange,
}: DashboardDateRangePickerProps) {
  const [customOpen, setCustomOpen] = useState(false);

  const displayLabel = useMemo(() => {
    if (value.kind === "custom") {
      return `${format(value.from, "MMM d")} – ${value.to ? format(value.to, "MMM d") : "..."}`;
    }
    const preset = presets.find((p) => p.value === value.preset);
    return preset?.label ?? "30d";
  }, [value]);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {presets.map((p) => (
        <Button
          key={p.label}
          variant={value.kind === "preset" && value.preset === p.value ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-7 px-2.5 text-caption",
            value.kind === "preset" && value.preset === p.value && "text-primary-foreground"
          )}
          onClick={() => {
            onChange({ kind: "preset", preset: p.value });
          }}
        >
          {p.label}
        </Button>
      ))}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={value.kind === "custom" ? "default" : "outline"}
            size="sm"
            className="h-7 px-2.5 text-caption gap-1"
            onClick={() => setCustomOpen((o) => !o)}
          >
            <CalendarIcon className="w-3 h-3" />
            {value.kind === "custom" ? displayLabel : "Custom"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="end">
          <div className="flex flex-col gap-2">
            <p className="text-caption font-medium text-muted-foreground">Select date range</p>
            <Calendar
              mode="range"
              selected={
                value.kind === "custom" && value.to ? { from: value.from, to: value.to } : undefined
              }
              onSelect={(range) => {
                if (range?.from) {
                  onChange({ kind: "custom", from: range.from, to: range.to });
                }
              }}
              disabled={(date) => date > new Date()}
              initialFocus
              className="p-3 pointer-events-auto"
              numberOfMonths={1}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
