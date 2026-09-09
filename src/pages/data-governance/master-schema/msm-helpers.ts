import {
  Activity,
  Braces,
  Key,
  Link,
  Lock,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type {
  AttrStatus,
  CanonicalAttribute,
  ClassName,
  DataType,
  EntityKind,
  EntityType,
  Sensitivity,
  TargetTable,
} from "./types";
import { EMPTY_RULES } from "./types";

export const STATUS_LABELS: Record<AttrStatus, string> = {
  proposed: "Proposed",
  pending: "Pending",
  active: "Active",
  deprecated: "Deprecated",
  rejected: "Rejected",
};

export const STATUS_STYLES: Record<AttrStatus, string> = {
  proposed: "bg-info/15 text-info",
  pending: "bg-warning/15 text-warning",
  active: "bg-success/15 text-success",
  deprecated: "bg-muted text-muted-foreground opacity-80",
  rejected: "bg-destructive/15 text-destructive",
};

export const SENSITIVITY_STYLES: Record<Sensitivity, string> = {
  Standard: "bg-muted text-muted-foreground",
  PII: "bg-info/15 text-info",
  "Sensitive-PII": "bg-warning/15 text-warning",
};

export const SENSITIVITY_DOT: Record<Sensitivity, string> = {
  Standard: "bg-muted-foreground/40",
  PII: "bg-info",
  "Sensitive-PII": "bg-warning",
};

export const CLASS_ICONS: Record<ClassName, LucideIcon> = {
  Business: Braces,
  Identifier: Key,
  Edge: Link,
  Feature: Sparkles,
  Observation: Activity,
  Reserved: Lock,
  Payload: Braces,
};

export const KIND_BADGE_LABELS: Record<EntityKind, string> = {
  subject: "Subject",
  asset: "Asset",
  event: "Event",
  feature: "Feature",
  system: "System",
};

export function formatDateEnIn(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso || "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function qualifierRegex(): RegExp {
  return /^_?[a-z][a-z0-9_]*$/;
}

export function entityCodeRegex(): RegExp {
  return /^[a-z][a-z0-9_]*$/;
}

export function isSeedLevelDefinition(definition: string): boolean {
  const t = definition.trim();
  if (!t) return false;
  if (/\[[A-Za-z0-9]+\]\s*$/.test(t)) return true;
  return t.split(/\s+/).filter(Boolean).length <= 4;
}

export function deriveAttributePrefix(
  targetTable: TargetTable,
  className: ClassName,
  existingId?: string,
): string {
  if (existingId?.startsWith("document.")) return "document";
  if (existingId?.startsWith("docsubj.")) return "docsubj";
  if (className === "Reserved") return "reserved";
  if (className === "Feature") return "feature";
  if (className === "Observation") return "observation";
  if (className === "Edge") return "relationships";
  switch (targetTable) {
    case "entity_master":
      return "subject";
    case "entity_assets":
      return "assets";
    case "entity_events":
      return "events";
    case "entity_relationships":
      return "relationships";
    case "feature_store":
      return "feature";
    case "all":
      return "reserved";
    default:
      return "subject";
  }
}

export function composeAttributeId(prefix: string, qualifier: string): string {
  if (!qualifier) return "";
  return `${prefix}.${qualifier}`;
}

export function appliesToVocabulary(targetTable: TargetTable, entityTypes: EntityType[]): string[] {
  if (targetTable === "all") return ["all rows"];
  const kindByTable: Partial<Record<TargetTable, EntityKind>> = {
    entity_master: "subject",
    entity_assets: "asset",
    entity_events: "event",
    feature_store: "feature",
  };
  const kind = kindByTable[targetTable];
  if (!kind) return entityTypes.map((e) => e.entityType);
  return entityTypes.filter((e) => e.kind === kind).map((e) => e.entityType);
}

export function firstAppliesToHref(attr: CanonicalAttribute, entityTypes: EntityType[]): string {
  const codes = attr.appliesTo.filter((c) => c !== "all rows");
  const first = codes[0] ?? entityTypes.find((e) => e.kind === "subject")?.entityType ?? attr.appliesTo[0];
  return `/data-governance/master-schema/${encodeURIComponent(first ?? "person")}?attribute=${encodeURIComponent(attr.attributeId)}`;
}

export function suggestNormalization(dataType: DataType): string {
  switch (dataType) {
    case "date":
      return "ISO-8601 date (YYYY-MM-DD)";
    case "timestamp":
      return "ISO-8601 datetime / epoch millis";
    case "decimal":
      return "numeric; strip symbols; 2dp";
    case "long":
      return "integer";
    case "boolean":
      return "true/false";
    default:
      return "trim";
  }
}

export function emptyAttribute(partial: Partial<CanonicalAttribute> & Pick<CanonicalAttribute, "targetTable">): CanonicalAttribute {
  const className = partial.class ?? "Business";
  const qualifier = partial.canonicalQualifier ?? "";
  const prefix = deriveAttributePrefix(partial.targetTable, className, partial.attributeId);
  return {
    attributeId: partial.attributeId ?? composeAttributeId(prefix, qualifier),
    canonicalQualifier: qualifier,
    class: className,
    targetTable: partial.targetTable,
    columnFamily: "d",
    appliesTo: partial.appliesTo ?? [],
    attributeGroup: partial.attributeGroup ?? null,
    dataType: partial.dataType ?? "string",
    sensitivity: partial.sensitivity ?? "Standard",
    governance: partial.governance ?? {
      legalBasisRequired: false,
      specialCategory: false,
      tokenize: false,
    },
    normalizationRule: partial.normalizationRule ?? suggestNormalization(partial.dataType ?? "string"),
    allowedValues: partial.allowedValues ?? null,
    definition: partial.definition ?? "",
    synonyms: partial.synonyms ?? [],
    status: partial.status ?? "pending",
    retentionClass: partial.retentionClass ?? "standard",
    displayName: partial.displayName ?? "New attribute",
    version: partial.version ?? 1,
    createdAt: partial.createdAt ?? nowIso(),
    updatedAt: partial.updatedAt ?? nowIso(),
    approvedBy: partial.approvedBy ?? null,
    supersededBy: partial.supersededBy ?? null,
    rules: partial.rules ?? { ...EMPTY_RULES, validation: [], businessValidations: [], crossField: [], transformations: [], enrichment: [] },
  };
}

export function cloneAttribute(attr: CanonicalAttribute): CanonicalAttribute {
  return structuredClone(attr);
}

export function overflowChips(values: string[], max: number): { shown: string[]; extra: number } {
  if (values.length <= max) return { shown: values, extra: 0 };
  return { shown: values.slice(0, max), extra: values.length - max };
}

export function bumpDictVersion(current: string): string {
  const m = /^v(\d+)$/i.exec((current ?? "").trim());
  if (!m) return "v14";
  return `v${Number(m[1]) + 1}`;
}

export function isReservedAttribute(attr: CanonicalAttribute): boolean {
  return attr.class === "Reserved" || attr.appliesTo.includes("all rows");
}

export function attributesForEntityType(attributes: CanonicalAttribute[], entityType: string): CanonicalAttribute[] {
  return attributes.filter((a) => a.appliesTo.includes(entityType) || (a.class === "Reserved" && a.appliesTo.includes("all rows")));
}

export function sensitivityRank(s: Sensitivity): number {
  if (s === "Sensitive-PII") return 2;
  if (s === "PII") return 1;
  return 0;
}

export function isLockedStatus(status: AttrStatus): boolean {
  return status === "active" || status === "deprecated";
}
