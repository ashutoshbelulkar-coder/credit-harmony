import {
  schemaRegistryEntries,
  bankParsedFields,
  customParsedFields,
  gstParsedFields,
  telecomParsedFields,
  utilityParsedFields,
} from "@/data/schema-mapper-mock";
import type { ParsedSourceField } from "@/types/schema-mapper";

function sampleParsedFieldsForSourceType(sourceType: string): ParsedSourceField[] {
  switch (sourceType) {
    case "utility":
      return utilityParsedFields;
    case "telecom":
      return telecomParsedFields;
    case "bank":
      return bankParsedFields.length ? bankParsedFields : telecomParsedFields;
    case "gst":
      return gstParsedFields.length ? gstParsedFields : telecomParsedFields;
    case "custom":
      return customParsedFields.length ? customParsedFields : telecomParsedFields;
    default:
      return telecomParsedFields;
  }
}

export interface SourceTypeFieldRow {
  id: string;
  path: string;
  name: string;
  dataType: string;
}

export function flattenParsedSourceFields(nodes: ParsedSourceField[]): SourceTypeFieldRow[] {
  const out: SourceTypeFieldRow[] = [];
  const walk = (arr: ParsedSourceField[]) => {
    for (const n of arr ?? []) {
      const path = String(n.path ?? n.name ?? "").trim();
      const name = String(n.name ?? path).trim();
      const id = (String(n.id ?? "").trim() || path || name) as string;
      const dataType = String(n.dataType ?? "string");
      if (path) out.push({ id, path, name, dataType });
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

/** Mirrors Fastify `GET …/schemas/source-type-fields` when using `schema-mapper-mock` seed data. */
export function sourceTypeFieldsFromMockCatalog(sourceType: string): SourceTypeFieldRow[] {
  const byPath = new Map<string, SourceTypeFieldRow>();
  const raw = sampleParsedFieldsForSourceType(sourceType);
  for (const e of schemaRegistryEntries) {
    if (e.sourceType !== sourceType) continue;
    for (const f of flattenParsedSourceFields(raw)) {
      if (!byPath.has(f.path)) byPath.set(f.path, f);
    }
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}
