import type { LLMFieldIntelligenceRow, MasterSchemaField } from "@/types/schema-mapper";

export interface ApiFieldMapping {
  sourcePath: string;
  sourceFieldId?: string;
  canonicalPath: string | null;
  canonicalFieldId?: string | null;
  matchType?: string;
  confidence?: number | null;
  reviewStatus?: string;
  llmRationale?: string;
  /** Operator override: source field carries personally identifiable information. */
  containsPii?: boolean;
}

function walkMaster(
  nodes: MasterSchemaField[],
  acc: { id: string; path: string; dataType: string }[] = []
) {
  for (const n of nodes) {
    acc.push({ id: n.id, path: n.path, dataType: n.dataType });
    if (n.children?.length) walkMaster(n.children, acc);
  }
  return acc;
}

export function flattenMasterForApi(tree: MasterSchemaField[]) {
  return walkMaster(tree);
}

export function fieldMappingsToLlmRows(mappings: ApiFieldMapping[]): LLMFieldIntelligenceRow[] {
  return mappings.map((fm, i) => {
    const short =
      fm.sourcePath.includes(".") && !fm.sourcePath.startsWith("accounts")
        ? fm.sourcePath.split(".").pop()!
        : fm.sourcePath;
    return {
      id: `lli-${fm.sourceFieldId ?? i}-${fm.sourcePath}`,
      sourceFieldId: fm.sourceFieldId ?? `sf-${i}`,
      sourceField: short,
      sourceFieldType: "string",
      llmMeaning: fm.llmRationale ?? "—",
      canonicalMatch: fm.canonicalPath,
      canonicalMatchId: fm.canonicalFieldId ?? null,
      similarFieldsAcrossSystem: [],
      confidence: fm.confidence != null ? Math.round(Number(fm.confidence) * 100) : 0,
      pii: Boolean(fm.containsPii),
      action: fm.canonicalPath ? undefined : ("create_new" as const),
    };
  });
}

export function llmRowsToFieldMappings(
  rows: LLMFieldIntelligenceRow[],
  masterTree: MasterSchemaField[],
  previous: ApiFieldMapping[]
): ApiFieldMapping[] {
  const flat = flattenMasterForApi(masterTree);
  const idToPath = new Map(flat.map((f) => [f.id, f.path]));
  return rows.map((r, i) => {
    const prev = previous.find((p) => p.sourceFieldId === r.sourceFieldId) ?? previous[i];
    const sourcePath = prev?.sourcePath ?? r.sourceField;
    let canonicalPath: string | null = r.canonicalMatch;
    let canonicalFieldId: string | null = r.canonicalMatchId;
    if (r.canonicalMatchId) {
      canonicalPath = idToPath.get(r.canonicalMatchId) ?? r.canonicalMatch;
      canonicalFieldId = r.canonicalMatchId;
    }
    return {
      sourcePath,
      sourceFieldId: r.sourceFieldId,
      canonicalPath,
      canonicalFieldId,
      matchType: prev?.matchType ?? "semantic",
      confidence: r.confidence > 0 ? r.confidence / 100 : null,
      reviewStatus: prev?.reviewStatus ?? "pending",
      llmRationale: prev?.llmRationale ?? r.llmMeaning,
      containsPii: r.pii,
    };
  });
}
