import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
}

const DISPLAY_FORMAT = "dd MMM yyyy";
const VALUE_FORMAT = "yyyy-MM-dd";

function parseValue(value: string): Date | undefined {
  if (!value || value.length < 10) return undefined;
  const d = parse(value.slice(0, 10), VALUE_FORMAT, new Date());
  return isValid(d) ? d : undefined;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className,
  id,
  disabled = false,
  min,
  max,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseValue(value);
  const minDate = min ? parseValue(min) : undefined;
  const maxDate = max ? parseValue(max) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    onChange(format(date, VALUE_FORMAT));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          className={cn(
            "flex h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background md:text-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className={cn("truncate", value ? "text-foreground" : "")}>
            {selected ? format(selected, DISPLAY_FORMAT) : placeholder}
          </span>
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            if (maxDate && date > maxDate) return true;
            return false;
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
