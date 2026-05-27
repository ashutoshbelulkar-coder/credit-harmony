/**
 * Master Path Catalog — union of all master-schema trees + the canonical
 * master record model. Powers the Tree Path Picker (Source/Target/CrossField
 * path fields) and validation that path strings resolve to a real catalog
 * entry.
 *
 * Strategy:
 *  - Hydrate from `master-record-model.json` (always present).
 *  - Merge in nested `tree` from every master schema (when supplied by the
 *    new datasource onboarding flow).
 *  - Synthesise tree nodes from legacy flat `fields[]` for older schemas so
 *    that the picker still surfaces them as leaves.
 *  - Memoise client-side; `staleTime: 60_000`.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { QK } from "@/lib/query-keys";
import { fetchMasterSchemasPage, fetchMasterSchema } from "@/services/master-schema.service";
import masterRecordModel from "@/data/master-record-model.json";
import type { TreePathNode, SchemaDataType, NodeType } from "@/types/datasource-onboarding";

interface CatalogEntry {
  fullPath: string;
  key: string;
  nodeType: NodeType;
  dataType: SchemaDataType;
  isArray: boolean;
  isLeaf: boolean;
  sourceSchemaId?: string;
  sourceSchemaName?: string;
}

const STATIC_TREE: TreePathNode[] = (masterRecordModel as { tree: TreePathNode[] }).tree ?? [];

function flatten(tree: TreePathNode[], sourceId?: string, sourceName?: string): CatalogEntry[] {
  const out: CatalogEntry[] = [];
  const visit = (n: TreePathNode) => {
    out.push({
      fullPath: n.fullPath,
      key: n.key,
      nodeType: n.nodeType,
      dataType: n.dataType,
      isArray: n.isArray,
      isLeaf: n.isLeaf,
      sourceSchemaId: sourceId,
      sourceSchemaName: sourceName,
    });
    for (const c of n.children ?? []) visit(c);
  };
  for (const root of tree ?? []) visit(root);
  return out;
}

/** Best-effort tree synthesis for legacy schemas that only expose `fields[]`. */
function legacyFieldsToTree(
  fields: { name: string; dataType: string; description?: string }[] | undefined,
  schemaName: string,
): TreePathNode[] {
  if (!fields?.length) return [];
  const root: TreePathNode = {
    key: schemaName,
    fullPath: schemaName,
    isArray: false,
    isLeaf: false,
    nodeType: "OBJECT",
    dataType: "OBJECT",
    children: fields.map((f) => ({
      key: f.name,
      fullPath: `${schemaName}.${f.name}`,
      isArray: false,
      isLeaf: true,
      nodeType: "FIELD" as NodeType,
      dataType: legacyDataType(f.dataType),
      children: [] as TreePathNode[],
    })),
  };
  return [root];
}

function legacyDataType(t: string): SchemaDataType {
  switch (String(t).toLowerCase()) {
    case "number":
    case "integer":
    case "decimal":
      return "NUMBER";
    case "boolean":
      return "BOOLEAN";
    case "date":
      return "DATE";
    case "object":
      return "OBJECT";
    case "array":
      return "ARRAY";
    default:
      return "STRING";
  }
}

export interface MasterPathCatalog {
  /** All catalog entries (leaves + containers) across master schemas + canonical tree. */
  entries: CatalogEntry[];
  /** Tree form for the picker — first root is the canonical model, then each schema. */
  trees: TreePathNode[];
  /** Quick lookup: `fullPath` → entry. */
  byPath: Map<string, CatalogEntry>;
  /** All leaf paths suitable for FieldPath/Source/Target/CrossField pickers. */
  leafPaths: string[];
  isLoading: boolean;
  isError: boolean;
}

export function useMasterPathCatalog(): MasterPathCatalog {
  const { data: list, isLoading: listLoading, isError: listError } = useQuery({
    queryKey: [...QK.masterPathCatalog.all(), "schemas"] as const,
    queryFn: () => fetchMasterSchemasPage({ page: 0, size: 200 }, { allowMockFallback: true }),
    staleTime: 60_000,
  });

  const ids = useMemo(
    () => (list?.content ?? []).map((s) => s.id),
    [list?.content],
  );

  const { data: schemaDetails, isLoading: detailsLoading, isError: detailsError } = useQuery({
    queryKey: [...QK.masterPathCatalog.all(), "details", ids] as const,
    queryFn: async () => Promise.all(ids.map((id) => fetchMasterSchema(id))),
    enabled: ids.length > 0,
    staleTime: 60_000,
  });

  return useMemo<MasterPathCatalog>(() => {
    const trees: TreePathNode[] = [...STATIC_TREE];
    const entries: CatalogEntry[] = flatten(STATIC_TREE);

    for (const schema of schemaDetails ?? []) {
      const schemaWithTree = schema as typeof schema & { tree?: TreePathNode[] };
      if (schemaWithTree.tree?.length) {
        trees.push(...schemaWithTree.tree);
        entries.push(...flatten(schemaWithTree.tree, schema.id, schema.name));
      } else {
        const synth = legacyFieldsToTree(schema.fields, schema.name);
        if (synth.length) {
          trees.push(...synth);
          entries.push(...flatten(synth, schema.id, schema.name));
        }
      }
    }

    // Deduplicate on `fullPath` (first occurrence wins; canonical model first).
    const seen = new Set<string>();
    const deduped: CatalogEntry[] = [];
    for (const e of entries) {
      if (seen.has(e.fullPath)) continue;
      seen.add(e.fullPath);
      deduped.push(e);
    }
    const byPath = new Map(deduped.map((e) => [e.fullPath, e]));
    const leafPaths = deduped.filter((e) => e.isLeaf).map((e) => e.fullPath);

    return {
      entries: deduped,
      trees,
      byPath,
      leafPaths,
      isLoading: listLoading || detailsLoading,
      isError: listError || detailsError,
    };
  }, [schemaDetails, listLoading, detailsLoading, listError, detailsError]);
}

/** Convenience: synchronous check that a path resolves in the catalog. */
export function isCatalogPath(catalog: MasterPathCatalog, path: string): boolean {
  if (!path) return false;
  return catalog.byPath.has(path);
}
