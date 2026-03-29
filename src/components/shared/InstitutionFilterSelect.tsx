import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitutions } from "@/hooks/api/useInstitutions";
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
  const { user } = useAuth();
  /** Filter dropdowns must reflect live members from the API — no institutions-mock fallback. */
  const { data: page, isPending, isError } = useInstitutions(
    { size: 300 },
    { enabled: !!user, allowMockFallback: false }
  );
  const institutions = page?.content ?? [];

  const list = useMemo(() => {
    if (mode === "submitters") return institutions.filter((i) => i.isDataSubmitter);
    if (mode === "subscribers") return institutions.filter((i) => i.isSubscriber);
    return institutions;
  }, [mode, institutions]);

  return (
    <div className="space-y-1.5">
      {label ? (
        <Label htmlFor={id} className="text-caption text-muted-foreground">
          {label}
        </Label>
      ) : null}
      <Select value={value} onValueChange={onValueChange} disabled={isPending}>
        <SelectTrigger
          id={id}
          className={cn("h-8 text-caption", triggerClassName)}
          aria-busy={isPending}
          aria-invalid={isError}
        >
          <SelectValue
            placeholder={
              isPending ? "Loading institutions…" : isError ? "Could not load institutions" : allLabel
            }
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-caption">
            {allLabel}
          </SelectItem>
          {list.map((i) => (
            <SelectItem key={i.id} value={String(i.id)} className="text-caption">
              {i.tradingName ?? i.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
