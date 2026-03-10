import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const presets = [
  { label: "Today", days: 0 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

interface DashboardDateRangePickerProps {
  className?: string;
}

export function DashboardDateRangePicker({ className }: DashboardDateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("30d");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [showCustom, setShowCustom] = useState(false);

  const displayLabel = showCustom && customFrom
    ? `${format(customFrom, "MMM d")} – ${customTo ? format(customTo, "MMM d") : "..."}`
    : selectedPreset === "0" ? "Today" : `Last ${selectedPreset}`;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {presets.map((p) => (
        <Button
          key={p.label}
          variant={selectedPreset === p.label && !showCustom ? "default" : "outline"}
          size="sm"
          className={cn("h-7 px-2.5 text-caption", selectedPreset === p.label && !showCustom && "text-primary-foreground")}
          onClick={() => {
            setSelectedPreset(p.label);
            setShowCustom(false);
          }}
        >
          {p.label}
        </Button>
      ))}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={showCustom ? "default" : "outline"}
            size="sm"
            className="h-7 px-2.5 text-caption gap-1"
          >
            <CalendarIcon className="w-3 h-3" />
            {showCustom ? displayLabel : "Custom"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="end">
          <div className="flex flex-col gap-2">
            <p className="text-caption font-medium text-muted-foreground">Select date range</p>
            <Calendar
              mode="range"
              selected={customFrom && customTo ? { from: customFrom, to: customTo } : undefined}
              onSelect={(range) => {
                if (range?.from) {
                  setCustomFrom(range.from);
                  setCustomTo(range.to);
                  setShowCustom(true);
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
