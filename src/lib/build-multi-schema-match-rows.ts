import type { WizardLabeledOption } from "@/lib/schema-mapper-wizard-metadata";
import type { ParsedSourceField, SchemaRegistryEntry, SimilarSchemaEntry, SourceType } from "@/types/schema-mapper";
import { getRawIngestedFieldKeysForSourceType } from "@/data/schema-mapper-mock";

export function pathsFromParsedFields(fields: ParsedSourceField[]): string[] {
  const out: string[] = [];
  const walk = (f: ParsedSourceField) => {
    const p = String(f.path ?? f.name ?? "").trim();
    if (p) out.push(p);
    f.children?.forEach(walk);
  };
  fields.forEach(walk);
  return out;
}

function similarityPercent(incomingPaths: string[], refPaths: string[]): number {
  const inc = new Set(incomingPaths.filter(Boolean));
  const ref = new Set(refPaths.filter(Boolean));
  if (inc.size === 0 && ref.size === 0) return 0;
  let shared = 0;
  for (const p of inc) {
    if (ref.has(p)) shared += 1;
  }
  const denom = inc.size + ref.size - shared;
  return denom > 0 ? Math.round((shared / denom) * 100) : 0;
}

function labelForDataCategory(value: string, dataCategoryOptions: WizardLabeledOption[]): string {
  const v = value.trim();
  const hit = dataCategoryOptions.find((o) => o.value === v);
  return hit?.label ?? v;
}

/**
 * One row per wizard source type; data-category column lists distinct categories
 * from registry rows for that type. Similarity uses reference field paths per type.
 */
export function buildMultiSchemaMatchRows(params: {
  sourceTypeOptions: WizardLabeledOption[];
  dataCategoryOptions: WizardLabeledOption[];
  registryEntries: SchemaRegistryEntry[];
  incomingPaths: string[];
  referencePathsBySourceType: Partial<Record<SourceType, string[]>>;
  preferredSourceType?: SourceType;
}): SimilarSchemaEntry[] {
  const {
    sourceTypeOptions,
    dataCategoryOptions,
    registryEntries,
    incomingPaths,
    referencePathsBySourceType,
    preferredSourceType,
  } = params;

  const rows: SimilarSchemaEntry[] = [];

  for (const opt of sourceTypeOptions) {
    const st = String(opt.value ?? "").trim() as SourceType;
    if (!st) continue;

    const forType = registryEntries.filter((e) => e.sourceType === st);
    const rawCats = new Set<string>();
    for (const e of forType) {
      const dc = e.dataCategory?.trim();
      if (dc) rawCats.add(dc);
    }
    const dataCategories = [...rawCats].sort().map((c) => labelForDataCategory(c, dataCategoryOptions));

    const refPaths =
      referencePathsBySourceType[st]?.length ?
        referencePathsBySourceType[st]!
      : getRawIngestedFieldKeysForSourceType(st);

    const refSet = new Set(refPaths.filter(Boolean));
    const sharedFieldsCount = incomingPaths.filter((p) => refSet.has(p)).length;
    const similarity = similarityPercent(incomingPaths, refPaths);

    const schemaId = forType[0]?.id ?? `synthetic-${st}`;

    rows.push({
      schemaId,
      label: String(opt.label ?? opt.value).trim() || st,
      sourceType: st,
      dataCategories,
      similarityPercent: similarity,
      sharedFieldsCount,
      recommended: false,
    });
  }

  if (rows.length === 0) return rows;

  let bestIdx = 0;
  let bestScore = -1;
  rows.forEach((r, i) => {
    let score = r.similarityPercent;
    if (preferredSourceType && r.sourceType === preferredSourceType) score += 0.001;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  });
  return rows.map((r, i) => ({ ...r, recommended: i === bestIdx }));
}
