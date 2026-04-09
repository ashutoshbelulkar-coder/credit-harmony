import { get, post, put, buildQuery, ApiError } from "@/lib/api-client";
import { clientMockFallbackEnabled } from "@/lib/client-mock-fallback";
import { masterSchemasSeed } from "@/data/master-schemas-mock";
import { enqueueLocalApprovalItem } from "@/services/approvals.service";
import type { PagedResponse } from "@/services/institutions.service";
import type {
  MasterSchema,
  MasterSchemaListItem,
  MasterSchemaStatus,
  MasterSchemaField,
  MasterSchemaDiffEntry,
  MasterSchemaVersionEntry,
} from "@/types/master-schema";
import type { SourceType } from "@/types/schema-mapper";

const BASE = "/v1/master-schemas";

function isNetworkOrServerError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  // In mock-fallback mode we also treat auth failures as mockable so the SPA
  // can function without a running API / refresh token during local UX work.
  return err.isServerError || err.isUnauthorized || err.isForbidden;
}

let localSchemas: MasterSchema[] = [];
let hydrated = false;

function deepClone<T>(v: T): T {
  return structuredClone(v);
}

function schemaTypeToMasterDataType(t: unknown): MasterSchemaField["dataType"] {
  // MasterSchemaDataType is a constrained UI union; map common JSON schema types.
  if (Array.isArray(t)) {
    // e.g. ["string","null"] => treat as string
    return schemaTypeToMasterDataType(t.find((x) => x !== "null"));
  }
  switch (t) {
    case "string":
      return "string";
    case "integer":
      return "integer";
    case "number":
      return "decimal";
    case "boolean":
      return "boolean";
    case "array":
      return "array";
    case "object":
      return "object";
    default:
      return "string";
  }
}

function deriveFieldsFromRawJson(rawJson: unknown): MasterSchemaField[] {
  const root = rawJson as Record<string, unknown> | null;
  if (!root || typeof root !== "object") return [];
  const definitions = (root as any).definitions as Record<string, any> | undefined;
  if (!definitions || typeof definitions !== "object") return [];

  const out: MasterSchemaField[] = [];
  for (const [defName, def] of Object.entries(definitions)) {
    const props = def?.properties as Record<string, any> | undefined;
    if (!props || typeof props !== "object") continue;
    const requiredList = Array.isArray(def?.required) ? (def.required as unknown[]) : [];
    const requiredSet = new Set(requiredList.map((x) => String(x)));

    for (const [propName, propSchema] of Object.entries(props)) {
      const fieldKey = `${defName}.${propName}`;
      out.push({
        name: fieldKey,
        dataType: schemaTypeToMasterDataType(propSchema?.type),
        required: requiredSet.has(propName),
        masking: "none",
        description: String(propSchema?.description ?? ""),
      });
    }
  }

  // Stable sort for consistent UX/diffs.
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

function ensureHydrated() {
  if (hydrated) return;
  localSchemas = masterSchemasSeed.map((s) => {
    const base = deepClone(s);

    // If rawJson contains a richer schema (e.g. Telco sample with many definitions),
    // derive fields for the Fields tab so the UI reflects the schema content.
    const derived = deriveFieldsFromRawJson(base.rawJson);
    if (derived.length > (base.fields?.length ?? 0)) {
      base.fields = derived;
    }

    // Seed versions if empty: create an immutable v0 snapshot and current snapshot.
    if (!Array.isArray(base.versions) || base.versions.length === 0) {
      const v0: MasterSchema = {
        ...deepClone(base),
        version: "v0.1",
        status: "draft",
        updatedAt: base.createdAt,
        updatedBy: base.createdBy,
        versions: [],
      };
      const v0Entry: MasterSchemaVersionEntry = {
        id: `${base.id}-ver-v0.1`,
        version: "v0.1",
        createdAt: base.createdAt,
        createdBy: base.createdBy,
        status: "draft",
        changesSummary: "Initial draft seeded from catalogue",
        diff: [],
        schemaSnapshot: v0,
      };
      const curEntry: MasterSchemaVersionEntry = {
        id: `${base.id}-ver-${base.version}`,
        version: base.version,
        createdAt: base.updatedAt ?? base.createdAt,
        createdBy: base.updatedBy ?? base.createdBy,
        status: base.status,
        changesSummary: "Current version",
        diff: [],
        schemaSnapshot: { ...deepClone(base), versions: [] },
      };
      base.versions = [curEntry, v0Entry];
    }
    return base;
  });
  hydrated = true;
}

export interface MasterSchemaListParams {
  sourceType?: SourceType | "all";
  status?: MasterSchemaStatus | "all";
  search?: string;
  page?: number;
  size?: number;
}

export interface MasterSchemaSourceTypesResponse {
  sourceTypes: SourceType[];
}

export async function fetchMasterSchemaSourceTypes(options?: {
  allowMockFallback?: boolean;
}): Promise<MasterSchemaSourceTypesResponse> {
  const allowMockFallback = options?.allowMockFallback !== false;
  try {
    return await get<MasterSchemaSourceTypesResponse>(`${BASE}/source-types`);
  } catch (err) {
    if (clientMockFallbackEnabled && allowMockFallback && isNetworkOrServerError(err)) {
      ensureHydrated();
      const set = new Set(localSchemas.map((s) => s.sourceType));
      return { sourceTypes: [...set].sort() as SourceType[] };
    }
    throw err;
  }
}

function toListItem(s: MasterSchema): MasterSchemaListItem {
  return {
    id: s.id,
    sourceType: s.sourceType,
    name: s.name,
    version: s.version,
    fieldCount: s.fields?.length ?? 0,
    status: s.status,
    updatedAt: s.updatedAt,
  };
}

export async function fetchMasterSchemasPage(
  params?: MasterSchemaListParams,
  options?: { allowMockFallback?: boolean }
): Promise<PagedResponse<MasterSchemaListItem> & { requestId?: string }> {
  const allowMockFallback = options?.allowMockFallback !== false;
  try {
    return await get(`${BASE}${buildQuery(params ?? {})}`);
  } catch (err) {
    if (clientMockFallbackEnabled && allowMockFallback && isNetworkOrServerError(err)) {
      ensureHydrated();
      let list = localSchemas.map(toListItem);

      const q = String(params?.search ?? "").trim().toLowerCase();
      if (q) list = list.filter((s) => s.name.toLowerCase().includes(q));
      if (params?.sourceType && params.sourceType !== "all") {
        list = list.filter((s) => s.sourceType === params.sourceType);
      }
      if (params?.status && params.status !== "all") {
        list = list.filter((s) => s.status === params.status);
      }
      const page = params?.page ?? 0;
      const size = params?.size ?? 20;
      return {
        content: list.slice(page * size, (page + 1) * size),
        totalElements: list.length,
        totalPages: Math.max(1, Math.ceil(list.length / size)),
        page,
        size,
      };
    }
    throw err;
  }
}

export async function fetchMasterSchema(id: string): Promise<MasterSchema> {
  try {
    return await get(`${BASE}/${encodeURIComponent(id)}`);
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) {
      ensureHydrated();
      const found = localSchemas.find((s) => s.id === id);
      if (!found) throw err;
      return deepClone(found);
    }
    throw err;
  }
}

function nextMinorVersion(current: string): string {
  const m = String(current ?? "").match(/^v(\d+)\.(\d+)$/);
  if (!m) return "v1.0";
  const major = Number(m[1] ?? 1);
  const minor = Number(m[2] ?? 0) + 1;
  return `v${major}.${minor}`;
}

function diffFields(oldFields: MasterSchemaField[], newFields: MasterSchemaField[]): MasterSchemaDiffEntry[] {
  const oldMap = new Map(oldFields.map((f) => [f.name, f]));
  const newMap = new Map(newFields.map((f) => [f.name, f]));
  const diffs: MasterSchemaDiffEntry[] = [];

  for (const [name, nf] of newMap) {
    const of = oldMap.get(name);
    if (!of) {
      diffs.push({ fieldName: name, changeType: "added", oldValue: null, newValue: `${nf.dataType}` });
      continue;
    }
    const changed =
      of.dataType !== nf.dataType ||
      of.required !== nf.required ||
      of.masking !== nf.masking ||
      of.description !== nf.description;
    if (changed) {
      diffs.push({
        fieldName: name,
        changeType: "modified",
        oldValue: `${of.dataType}${of.required ? " (required)" : ""}`,
        newValue: `${nf.dataType}${nf.required ? " (required)" : ""}`,
      });
    }
  }
  for (const [name, of] of oldMap) {
    if (!newMap.has(name)) {
      diffs.push({ fieldName: name, changeType: "removed", oldValue: `${of.dataType}`, newValue: null });
    }
  }
  return diffs;
}

export async function createMasterSchema(body: {
  name: string;
  sourceType: SourceType;
  description: string;
  fields: MasterSchemaField[];
  rawJson?: unknown;
}): Promise<MasterSchema> {
  try {
    return await post(`${BASE}`, body);
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) {
      ensureHydrated();
      const now = new Date().toISOString();
      const id = `msm-local-${Date.now()}`;
      const schema: MasterSchema = {
        id,
        name: body.name,
        sourceType: body.sourceType,
        description: body.description,
        version: "v1.0",
        status: "draft",
        fields: body.fields ?? [],
        createdBy: "You",
        updatedBy: "You",
        createdAt: now,
        updatedAt: now,
        rawJson:
          body.rawJson ??
          ({
            title: body.name,
            type: "object",
            properties: Object.fromEntries(
              (body.fields ?? []).map((f) => [f.name, { type: f.dataType }])
            ),
          } as const),
        versions: [],
        impact: { apis: [], products: [], institutions: [] },
      };
      const v: MasterSchemaVersionEntry = {
        id: `${id}-ver-v1.0`,
        version: "v1.0",
        createdAt: now,
        createdBy: "You",
        status: "draft",
        changesSummary: "Initial draft created in portal (local)",
        diff: [],
        schemaSnapshot: { ...deepClone(schema), versions: [] },
      };
      schema.versions = [v];
      localSchemas = [schema, ...localSchemas];
      return deepClone(schema);
    }
    throw err;
  }
}

export async function updateMasterSchema(
  id: string,
  body: Partial<Pick<MasterSchema, "name" | "description" | "fields" | "rawJson">>
): Promise<MasterSchema> {
  try {
    return await put(`${BASE}/${encodeURIComponent(id)}`, body);
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) {
      ensureHydrated();
      const idx = localSchemas.findIndex((s) => s.id === id);
      if (idx < 0) throw err;
      const prev = localSchemas[idx];
      const now = new Date().toISOString();
      const newVersion = nextMinorVersion(prev.version);
      const updated: MasterSchema = {
        ...deepClone(prev),
        name: body.name ?? prev.name,
        description: body.description ?? prev.description,
        fields: body.fields ?? prev.fields,
        rawJson: body.rawJson ?? prev.rawJson,
        version: newVersion,
        updatedAt: now,
        updatedBy: "You",
        status: prev.status === "active" ? "pending" : prev.status,
      };

      const diff = diffFields(prev.fields ?? [], updated.fields ?? []);
      const versionEntry: MasterSchemaVersionEntry = {
        id: `${id}-ver-${newVersion}`,
        version: newVersion,
        createdAt: now,
        createdBy: "You",
        status: updated.status,
        changesSummary: diff.length ? `${diff.length} change(s) applied` : "Metadata updated",
        diff,
        schemaSnapshot: { ...deepClone(updated), versions: [] },
      };

      updated.versions = [versionEntry, ...(prev.versions ?? [])];
      localSchemas = localSchemas.map((s) => (s.id === id ? updated : s));
      return deepClone(updated);
    }
    throw err;
  }
}

export async function submitMasterSchemaForApproval(id: string): Promise<{ approvalId: string }> {
  try {
    return await post(`${BASE}/${encodeURIComponent(id)}/submit-for-approval`, {});
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) {
      ensureHydrated();
      const schema = localSchemas.find((s) => s.id === id);
      if (!schema) throw err;
      const now = new Date().toISOString();

      // Ensure status is pending locally.
      const pending = { ...schema, status: "pending" as const, updatedAt: now, updatedBy: "You" };
      localSchemas = localSchemas.map((s) => (s.id === id ? pending : s));

      const latestVersion = pending.versions?.[0]?.version ?? pending.version;
      const latestDiff = pending.versions?.[0]?.diff ?? [];

      const approvalId = `appr-msm-${Date.now()}`;
      enqueueLocalApprovalItem({
        id: approvalId,
        type: "schema_master",
        name: pending.name,
        description: `Master schema submission (${latestVersion})`,
        submittedBy: "You",
        submittedAt: now,
        status: "pending",
        metadata: {
          schemaId: pending.id,
          version: latestVersion,
          diff: JSON.stringify(latestDiff),
          schema: JSON.stringify({ ...pending, versions: undefined }),
        },
      });

      return { approvalId };
    }
    throw err;
  }
}

