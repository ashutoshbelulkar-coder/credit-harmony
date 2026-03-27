import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { institutions } from "@/data/institutions-mock";
import { cn } from "@/lib/utils";

export type InstitutionFilterMode = "submitters" | "subscribers" | "all";

export function InstitutionFilterSelect({
  mode,
  value,
  onValueChange,
  label = "Institution",
  allLabel = "All institutions",
  triggerClassName,
  id,
}: {
  mode: InstitutionFilterMode;
  value: string;
  onValueChange: (institutionId: string) => void;
  label?: string;
  allLabel?: string;
  triggerClassName?: string;
  id?: string;
}) {
  const list = useMemo(() => {
    if (mode === "submitters") return institutions.filter((i) => i.isDataSubmitter);
    if (mode === "subscribers") return institutions.filter((i) => i.isSubscriber);
    return institutions;
  }, [mode]);

  return (
    <div className="space-y-1.5">
      {label ? (
        <Label htmlFor={id} className="text-caption text-muted-foreground">
          {label}
        </Label>
      ) : null}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} className={cn("h-8 text-caption", triggerClassName)}>
          <SelectValue placeholder={allLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-caption">
            {allLabel}
          </SelectItem>
          {list.map((i) => (
            <SelectItem key={i.id} value={i.id} className="text-caption">
              {i.tradingName ?? i.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
