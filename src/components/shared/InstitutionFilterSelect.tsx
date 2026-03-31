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
import type { InstitutionListParams } from "@/services/institutions.service";
import { institutionDisplayLabel } from "@/lib/institutions-display";
import { cn } from "@/lib/utils";

export type InstitutionFilterMode = "submitters" | "subscribers" | "all";

function defaultAllLabelForMode(mode: InstitutionFilterMode): string {
  if (mode === "submitters") return "All submitters";
  if (mode === "subscribers") return "All subscribers";
  return "All institutions";
}

export function InstitutionFilterSelect({
  mode,
  value,
  onValueChange,
  label = "Member institution",
  allLabel: allLabelProp,
  triggerClassName,
  id,
}: {
  mode: InstitutionFilterMode;
  value: string;
  onValueChange: (institutionId: string) => void;
  label?: string;
  /** Omit to use mode default: All submitters / All subscribers / All institutions */
  allLabel?: string;
  triggerClassName?: string;
  id?: string;
}) {
  const allLabel = allLabelProp ?? defaultAllLabelForMode(mode);
  const { user } = useAuth();
  const listParams = useMemo((): InstitutionListParams => {
    if (mode === "submitters") return { page: 0, size: 300, role: "dataSubmitter" };
    if (mode === "subscribers") return { page: 0, size: 300, role: "subscriber" };
    return { page: 0, size: 300 };
  }, [mode]);

  /** Lists are loaded from the API (`role` filters data submitters / subscribers on the server). */
  const { data: page, isPending, isError, error } = useInstitutions(listParams, {
    enabled: !!user,
    allowMockFallback: false,
  });
  const list = page?.content ?? [];

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
              {institutionDisplayLabel(i)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isError ? (
        <p className="text-caption text-destructive" role="alert">
          {error instanceof Error ? error.message : "Could not load institutions."}
        </p>
      ) : null}
    </div>
  );
}
