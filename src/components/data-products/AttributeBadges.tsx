import { cn } from "@/lib/utils";
import { badgeTextClasses } from "@/lib/typography";
import type { AttributeMode, OutputPort } from "@/data/product-management-types";
import type { AttributeDataType, AttributeSensitivity } from "@/data/attribute-dictionary";

export const ATTRIBUTE_MODE_LABEL: Record<AttributeMode, string> = {
  SNAPSHOT: "Snapshot",
  TRENDED: "Trended",
};

const TYPE_LABEL: Record<AttributeDataType, string> = {
  string: "STR",
  long: "LONG",
  decimal: "DEC",
  boolean: "BOOL",
  date: "DATE",
  timestamp: "TS",
  json: "JSON",
  enum: "ENUM",
};

export function AttributeModeBadge({ mode }: { mode: AttributeMode }) {
  if (mode !== "TRENDED") return null;
  return (
    <span
      className={cn(
        "px-1.5 py-0 rounded-full text-[10px] leading-[14px] font-medium normal-case",
        "bg-primary/15 text-primary"
      )}
    >
      Trended
    </span>
  );
}

export function AttributeTypeChip({ type }: { type: AttributeDataType | string }) {
  const label = TYPE_LABEL[type as AttributeDataType] ?? String(type).toUpperCase();
  return (
    <span
      className={cn(
        "px-1.5 py-0 rounded-full font-mono",
        badgeTextClasses,
        "bg-muted text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}

export function AttributeSensitivityChip({
  sensitivity,
  specialCategory,
  optIn,
}: {
  sensitivity: AttributeSensitivity | string;
  specialCategory?: boolean;
  optIn?: boolean;
}) {
  const isHigh = sensitivity === "Sensitive-PII" || specialCategory;
  const isPii = sensitivity === "PII";
  const label = specialCategory
    ? "Special category"
    : sensitivity === "Sensitive-PII"
      ? optIn
        ? "Sensitive-PII · opt-in"
        : "Sensitive-PII"
      : sensitivity === "PII"
        ? "PII"
        : "Standard";
  return (
    <span
      className={cn(
        "px-1.5 py-0 rounded-full",
        badgeTextClasses,
        isHigh
          ? "bg-destructive/15 text-destructive"
          : isPii
            ? "ring-1 ring-destructive/40 text-destructive"
            : "bg-muted text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}

export function PopulatedByChip({ source }: { source: string }) {
  return (
    <span
      className={cn(
        "px-1.5 py-0 rounded-full",
        badgeTextClasses,
        "bg-primary/10 text-primary"
      )}
    >
      {source}
    </span>
  );
}

export function DerivedGlyph() {
  return (
    <span
      className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-secondary/15 text-[10px] font-semibold text-secondary"
      title="Derived feature"
    >
      ƒ
    </span>
  );
}

export function SystemChip() {
  return (
    <span className={cn("px-1.5 py-0 rounded-full", badgeTextClasses, "bg-muted text-muted-foreground")}>
      system
    </span>
  );
}

export function StatusReasonChip({
  status,
  supersededBy,
}: {
  status: "pending" | "deprecated";
  supersededBy?: string;
}) {
  const text =
    status === "pending"
      ? "Pending approval — not yet servable"
      : supersededBy
        ? `Deprecated — superseded by ${supersededBy}`
        : "Deprecated";
  return (
    <span
      className={cn(
        "px-1.5 py-0 rounded-full",
        badgeTextClasses,
        status === "pending" ? "bg-muted text-muted-foreground" : "bg-warning/15 text-warning"
      )}
    >
      {text}
    </span>
  );
}

export function ScopeTag({ tag }: { tag: "Ind" | "Co" }) {
  return (
    <span
      className={cn(
        "px-1 py-0 rounded",
        badgeTextClasses,
        "bg-muted text-muted-foreground"
      )}
    >
      {tag}
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
