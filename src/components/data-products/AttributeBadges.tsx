import { cn } from "@/lib/utils";
import { badgeTextClasses } from "@/lib/typography";
import type { AttributeMode, OutputPort } from "@/data/product-management-types";

export const ATTRIBUTE_MODE_LABEL: Record<AttributeMode, string> = {
  SNAPSHOT: "Snapshot",
  TRENDED: "Trended",
};

export function AttributeModeBadge({ mode }: { mode: AttributeMode }) {
  return (
    <span
      className={cn(
        "px-1.5 py-0 rounded-full text-[10px] leading-[14px] font-medium normal-case",
        mode === "TRENDED" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
      )}
    >
      {ATTRIBUTE_MODE_LABEL[mode]}
    </span>
  );
}

export function PiiBadge() {
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full ring-1 ring-destructive/50 text-destructive",
        badgeTextClasses
      )}
    >
      PII
    </span>
  );
}

export function PortStatusBadge({ status }: { status: OutputPort["status"] }) {
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full",
        badgeTextClasses,
        status === "active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
      )}
    >
      {status === "active" ? "Active" : "Planned"}
    </span>
  );
}

export function SensitivityBadge({ value }: { value: "Low" | "Medium" | "High" }) {
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full",
        badgeTextClasses,
        value === "High"
          ? "bg-destructive/15 text-destructive"
          : value === "Medium"
            ? "bg-warning/15 text-warning"
            : "bg-muted text-muted-foreground"
      )}
    >
      {value}
    </span>
  );
}
