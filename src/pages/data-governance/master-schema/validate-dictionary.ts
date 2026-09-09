import type {
  CanonicalAttribute,
  DictionarySnapshot,
  DomainEntry,
  EntityType,
  ValidationIssue,
} from "./types";
import { isSeedLevelDefinition, qualifierRegex, sensitivityRank } from "./msm-helpers";

const QUALIFIER_RE = qualifierRegex();

function idKey(id: string): string {
  return id.endsWith("__dup") ? id.slice(0, -5) : id;
}

function overlaps(a: string[], b: string[]): boolean {
  const set = new Set(a);
  return b.some((x) => set.has(x));
}

function bigrams(s: string): string[] {
  const n = s.replace(/\s+/g, " ").trim();
  if (n.length < 2) return n ? [n] : [];
  const out: string[] = [];
  for (let i = 0; i < n.length - 1; i++) out.push(n.slice(i, i + 2));
  return out;
}

export function stringSimilarity(a: string, b: string): number {
  const x = a.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const y = b.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!x || !y) return 0;
  if (x === y) return 1;
  const ba = bigrams(x);
  const bb = bigrams(y);
  if (!ba.length || !bb.length) return 0;
  const counts = new Map<string, number>();
  for (const g of ba) counts.set(g, (counts.get(g) ?? 0) + 1);
  let inter = 0;
  for (const g of bb) {
    const c = counts.get(g) ?? 0;
    if (c > 0) {
      inter += 1;
      counts.set(g, c - 1);
    }
  }
  return (2 * inter) / (ba.length + bb.length);
}

export function isNearDuplicate(a: CanonicalAttribute, b: CanonicalAttribute): boolean {
  if (idKey(a.attributeId) === idKey(b.attributeId) && a.attributeId !== b.attributeId) return true;
  if (a.attributeId === b.attributeId) return false;
  const pairs: [string, string][] = [
    [a.canonicalQualifier, b.canonicalQualifier],
    [a.definition, b.definition],
  ];
  for (const [x, y] of pairs) {
    if (x && y && stringSimilarity(x, y) >= 0.85) return true;
  }
  for (const syn of a.synonyms) {
    if (stringSimilarity(syn, b.canonicalQualifier) >= 0.85) return true;
    if (stringSimilarity(syn, b.definition) >= 0.85) return true;
    for (const s2 of b.synonyms) {
      if (stringSimilarity(syn, s2) >= 0.85) return true;
    }
  }
  for (const syn of b.synonyms) {
    if (stringSimilarity(syn, a.canonicalQualifier) >= 0.85) return true;
    if (stringSimilarity(syn, a.definition) >= 0.85) return true;
  }
  return false;
}

function issue(
  attributeId: string,
  code: string,
  severity: ValidationIssue["severity"],
  message: string,
  extra?: Partial<ValidationIssue>,
): ValidationIssue {
  return { attributeId, code, severity, message, ...extra };
}

const L_FIELDS: (keyof CanonicalAttribute)[] = [
  "canonicalQualifier",
  "attributeId",
  "class",
  "targetTable",
  "dataType",
  "retentionClass",
];

function appliesToRemoved(prev: string[], next: string[]): boolean {
  const n = new Set(next);
  return prev.some((x) => !n.has(x));
}

function sensitivityDowngraded(prev: CanonicalAttribute, next: CanonicalAttribute): boolean {
  return sensitivityRank(next.sensitivity) < sensitivityRank(prev.sensitivity);
}

export interface ValidateOptions {
  snapshot: Pick<DictionarySnapshot, "entityTypes" | "domains" | "attributes">;
  /** Attributes in scope (usually the open entity type). Always-rules still scan the full dictionary for V1/V2. */
  scoped?: CanonicalAttribute[];
  previousById?: Map<string, CanonicalAttribute>;
  includeGates?: boolean;
}

export function validateDictionary(opts: ValidateOptions): ValidationIssue[] {
  const { snapshot, previousById, includeGates } = opts;
  const all = snapshot.attributes;
  const scoped = opts.scoped ?? all;
  const entityCodes = new Set(snapshot.entityTypes.map((e) => e.entityType));
  const domainByName = new Map(snapshot.domains.map((d) => [d.domainName, d]));
  const out: ValidationIssue[] = [];

  const byIdKey = new Map<string, CanonicalAttribute[]>();
  const byTableQual = new Map<string, CanonicalAttribute[]>();
  for (const a of all) {
    const k = idKey(a.attributeId);
    byIdKey.set(k, [...(byIdKey.get(k) ?? []), a]);
    const tq = `${a.targetTable}::${a.canonicalQualifier}`;
    byTableQual.set(tq, [...(byTableQual.get(tq) ?? []), a]);
  }

  const scopedIds = new Set(scoped.map((a) => a.attributeId));

  for (const attr of scoped) {
    const id = attr.attributeId || "(new)";

    const idGroup = byIdKey.get(idKey(attr.attributeId)) ?? [];
    if (idGroup.length > 1) {
      out.push(issue(id, "V1", "Error", "Duplicate attributeId across the dictionary"));
    }

    const tqGroup = byTableQual.get(`${attr.targetTable}::${attr.canonicalQualifier}`) ?? [];
    if (attr.canonicalQualifier && tqGroup.length > 1) {
      out.push(issue(id, "V2", "Error", "Duplicate (targetTable, canonicalQualifier)"));
    }

    if (attr.canonicalQualifier && !QUALIFIER_RE.test(attr.canonicalQualifier)) {
      out.push(issue(id, "V3", "Error", "Qualifier fails ^_?[a-z][a-z0-9_]*$"));
    }

    const hasUnderscore = attr.canonicalQualifier.startsWith("_");
    if (hasUnderscore && attr.class !== "Reserved") {
      out.push(issue(id, "V4", "Error", "_ prefix is only allowed when class is Reserved"));
    }
    if (attr.class === "Reserved" && attr.canonicalQualifier && !hasUnderscore) {
      out.push(issue(id, "V4", "Error", "Reserved class requires a _-prefixed qualifier"));
    }

    const edgeMismatch =
      (attr.class === "Edge" && attr.dataType !== "edge") || (attr.class !== "Edge" && attr.dataType === "edge");
    if (edgeMismatch) {
      out.push(issue(id, "V5", "Error", "class Edge ⇔ dataType edge violated"));
    }

    if (attr.class === "Feature" && attr.targetTable !== "feature_store") {
      out.push(issue(id, "V6", "Error", "class Feature requires targetTable feature_store"));
    }

    if (attr.class === "Observation" && attr.targetTable !== "entity_events") {
      out.push(issue(id, "V7", "Error", "class Observation requires targetTable entity_events"));
    }

    if (!attr.class || !attr.targetTable || !attr.dataType || !attr.sensitivity || !attr.status || !attr.canonicalQualifier || !attr.attributeId) {
      out.push(issue(id, "V8", "Error", "Missing class / targetTable / dataType / sensitivity / status / qualifier / attributeId"));
    }

    if (attr.sensitivity === "Sensitive-PII" && attr.governance?.legalBasisRequired !== true) {
      out.push(issue(id, "V9", "Error", "Sensitivity Sensitive-PII requires legalBasisRequired = true"));
    }

    if (attr.governance?.specialCategory && attr.governance?.legalBasisRequired !== true) {
      out.push(issue(id, "V10", "Error", "specialCategory requires legalBasisRequired = true"));
    }

    for (const code of attr.appliesTo ?? []) {
      if (code !== "all rows" && !entityCodes.has(code)) {
        out.push(issue(id, "V11", "Error", `appliesTo contains unknown code ${code}`));
      }
    }

    for (const rule of attr.rules?.validation ?? []) {
      if ((rule.rule === "MAX_LENGTH" || rule.rule === "MIN_LENGTH") && (rule.value == null || Number.isNaN(Number(rule.value)))) {
        out.push(issue(id, "V12", "Error", `${rule.rule} requires a value`));
      }
      if (rule.rule === "REGEX" && !rule.pattern) {
        out.push(issue(id, "V12", "Error", "REGEX requires a pattern"));
      }
    }
    if (attr.allowedValues?.kind === "enum" && (!attr.allowedValues.values || attr.allowedValues.values.length === 0)) {
      out.push(issue(id, "V12", "Error", "Enum list must be non-empty"));
    }

    for (const xf of attr.rules?.crossField ?? []) {
      const other = all.find((x) => x.attributeId === xf.attributeId);
      if (!other) {
        out.push(issue(id, "V13", "Error", `Cross-field rule references unknown attribute ${xf.attributeId}`));
        continue;
      }
      if (other.targetTable !== attr.targetTable || !overlaps(other.appliesTo, attr.appliesTo) || other.status !== "active") {
        out.push(
          issue(
            id,
            "V13",
            "Error",
            `Cross-field rule references ${xf.attributeId} with a different targetTable, no overlapping appliesTo, or status ≠ active`,
          ),
        );
      }
    }

    const prev = previousById?.get(attr.attributeId);
    if (prev && (prev.status === "active" || prev.status === "deprecated")) {
      const lockedTouched =
        L_FIELDS.some((f) => JSON.stringify(prev[f]) !== JSON.stringify(attr[f])) ||
        appliesToRemoved(prev.appliesTo, attr.appliesTo) ||
        sensitivityDowngraded(prev, attr);
      if (lockedTouched) {
        out.push(
          issue(id, "V14", "Error", "Edit attempted on a locked field of an active/deprecated attribute", {
            cta: "revision-or-replace",
          }),
        );
      }
    }

    if (attr.attributeGroup == null) {
      out.push(issue(id, "W2", "Warning", "attributeGroup is empty (ungrouped)"));
    }

    const otherTableSameQual = all.filter(
      (x) => x.attributeId !== attr.attributeId && x.canonicalQualifier === attr.canonicalQualifier && x.targetTable !== attr.targetTable,
    );
    if (attr.canonicalQualifier && otherTableSameQual.length) {
      out.push(
        issue(id, "W3", "Warning", `Also used by ${otherTableSameQual.map((x) => x.attributeId).join(", ")}`),
      );
    }

    if (attr.definition && isSeedLevelDefinition(attr.definition)) {
      out.push(issue(id, "I1", "Info", "Seed-level definition"));
    }

    if ((!attr.sources || attr.sources.length === 0) && attr.class !== "Feature" && attr.class !== "Reserved") {
      out.push(issue(id, "I2", "Info", "No source populates this attribute"));
    }

    if (includeGates) {
      if (!attr.definition?.trim()) {
        out.push(issue(id, "G1", "Error", "Activation requires a non-empty definition"));
      }
      if (attr.allowedValues?.kind === "domain") {
        const domain = domainByName.get(attr.allowedValues.domain);
        if (!domain || domain.codes.length === 0) {
          out.push(issue(id, "G2", "Error", `Domain ${attr.allowedValues.domain} has no codes loaded`));
        }
      }
    }
  }

  // Surface V1/V2 for duplicate partners that may sit outside the scoped type.
  if (opts.scoped) {
    for (const attr of all) {
      if (scopedIds.has(attr.attributeId)) continue;
      const idGroup = byIdKey.get(idKey(attr.attributeId)) ?? [];
      if (idGroup.some((x) => scopedIds.has(x.attributeId)) && idGroup.length > 1) {
        out.push(issue(attr.attributeId, "V1", "Error", "Duplicate attributeId across the dictionary"));
      }
    }
  }

  return out;
}

export function activationGateIssues(
  attr: CanonicalAttribute,
  snapshot: Pick<DictionarySnapshot, "entityTypes" | "domains" | "attributes">,
): ValidationIssue[] {
  return validateDictionary({ snapshot, scoped: [attr], includeGates: true }).filter(
    (i) => i.severity === "Error" && (i.code.startsWith("G") || i.code.startsWith("V")),
  );
}

export function findNearDuplicates(candidate: CanonicalAttribute, attributes: CanonicalAttribute[]): CanonicalAttribute[] {
  return attributes.filter((a) => a.attributeId !== candidate.attributeId && isNearDuplicate(candidate, a));
}

export function completenessIssueCount(attributes: CanonicalAttribute[]): number {
  return attributes.filter((a) => a.attributeGroup == null || isSeedLevelDefinition(a.definition ?? "")).length;
}

export function coverageGapCount(attributes: CanonicalAttribute[]): number {
  return attributes.filter((a) => a.sources.length === 0 && a.class !== "Feature" && a.class !== "Reserved").length;
}

export function summarizeFieldDiff(prev: CanonicalAttribute, next: CanonicalAttribute): string {
  if (prev.status !== next.status) return `status: ${prev.status} → ${next.status}`;
  const fields: (keyof CanonicalAttribute)[] = [
    "definition",
    "synonyms",
    "attributeGroup",
    "sources",
    "normalizationRule",
    "allowedValues",
    "sensitivity",
    "displayName",
  ];
  const changed: string[] = [];
  for (const f of fields) {
    if (JSON.stringify(prev[f]) !== JSON.stringify(next[f])) {
      if (f === "synonyms") {
        const added = next.synonyms.filter((s) => !prev.synonyms.includes(s)).length;
        changed.push(added ? `synonyms (${added} added)` : "synonyms");
      } else {
        changed.push(String(f));
      }
    }
  }
  return changed.join(", ") || "updated";
}

export function knownEntityTypes(entityTypes: EntityType[]): Set<string> {
  return new Set(entityTypes.map((e) => e.entityType));
}

export function domainCodesLoaded(domain: DomainEntry | undefined): number {
  return domain?.codes.length ?? 0;
}
