import { get, post, patch, buildQuery, ApiError } from "@/lib/api-client";
import { clientMockFallbackEnabled } from "@/lib/client-mock-fallback";
import { schemaRegistryEntries } from "@/data/schema-mapper-mock";
import type { PagedResponse } from "./institutions.service";
import type { SchemaRegistryEntry } from "@/types/schema-mapper";
import type { ApiFieldMapping } from "@/lib/schema-mapper-api";
import type { SourceTypeFieldRow } from "@/lib/schema-mapper-source-fields";
import type { WizardLabeledOption } from "@/lib/schema-mapper-wizard-metadata";

const BASE = "/v1/schema-mapper";

function isNetworkOrServerError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.isServerError;
}

export interface SchemaListParams {
  sourceType?: string;
  status?: string;
  page?: number;
  size?: number;
}

export interface SchemaRegistrySourceTypesResponse {
  sourceTypes: string[];
  requestId?: string;
}

export async function fetchSchemaRegistrySourceTypes(options?: {
  allowMockFallback?: boolean;
}): Promise<SchemaRegistrySourceTypesResponse> {
  const allowMockFallback = options?.allowMockFallback !== false;
  try {
    return await get<SchemaRegistrySourceTypesResponse>(`${BASE}/schemas/source-types`);
  } catch (err) {
    if (clientMockFallbackEnabled && allowMockFallback && isNetworkOrServerError(err)) {
      const set = new Set(schemaRegistryEntries.map((e) => e.sourceType));
      return { sourceTypes: [...set].sort() };
    }
    throw err;
  }
}

export interface SourceTypeFieldsResponse {
  sourceType: string;
  fields: SourceTypeFieldRow[];
  requestId?: string;
}

export interface SchemaMapperWizardMetadataResponse {
  sourceTypeOptions: WizardLabeledOption[];
  dataCategoryOptions: WizardLabeledOption[];
  requestId?: string;
}

export async function fetchWizardMetadata(options?: {
  allowMockFallback?: boolean;
}): Promise<SchemaMapperWizardMetadataResponse> {
  const allowMockFallback = options?.allowMockFallback !== false;
  try {
    return await get<SchemaMapperWizardMetadataResponse>(`${BASE}/wizard-metadata`);
  } catch (err) {
    if (clientMockFallbackEnabled && allowMockFallback && isNetworkOrServerError(err)) {
      const { wizardMetadataFromSeed } = await import("@/data/schema-mapper-mock");
      return {
        sourceTypeOptions: wizardMetadataFromSeed.sourceTypeOptions,
        dataCategoryOptions: wizardMetadataFromSeed.dataCategoryOptions,
      };
    }
    throw err;
  }
}

export async function fetchSourceTypeFields(
  sourceType: string,
  options?: { allowMockFallback?: boolean }
): Promise<SourceTypeFieldsResponse> {
  const allowMockFallback = options?.allowMockFallback !== false;
  const st = String(sourceType ?? "").trim();
  if (!st) return { sourceType: "", fields: [] };
  try {
    return await get<SourceTypeFieldsResponse>(
      `${BASE}/schemas/source-type-fields${buildQuery({ sourceType: st })}`
    );
  } catch (err) {
    if (clientMockFallbackEnabled && allowMockFallback && isNetworkOrServerError(err)) {
      const { sourceTypeFieldsFromMockCatalog } = await import("@/lib/schema-mapper-source-fields");
      return { sourceType: st, fields: sourceTypeFieldsFromMockCatalog(st) };
    }
    throw err;
  }
}

export async function fetchSchemaRegistryPage(
  params?: SchemaListParams,
  options?: { allowMockFallback?: boolean }
): Promise<PagedResponse<SchemaRegistryEntry> & { requestId?: string }> {
  const allowMockFallback = options?.allowMockFallback !== false;
  try {
    return await get(`${BASE}/schemas${buildQuery(params ?? {})}`);
  } catch (err) {
    if (clientMockFallbackEnabled && allowMockFallback && isNetworkOrServerError(err)) {
      let list = [...schemaRegistryEntries];
      if (params?.sourceType && params.sourceType !== "all") {
        list = list.filter((e) => e.sourceType === params.sourceType);
      }
      if (params?.status && params.status !== "all") {
        list = list.filter((e) => e.status === params.status);
      }
      const page = params?.page ?? 0;
      const size = params?.size ?? 200;
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

export interface IngestBody {
  sourceName: string;
  sourceType: string;
  dataCategory?: string;
  versionNumber?: string;
  effectiveDate?: string;
  institutionId?: string;
  institutionScope?: string[];
  inlineSchema?: unknown;
  parsedFields?: unknown[];
  fieldStats?: unknown;
  contentType?: string;
}

export interface IngestResponse {
  rawDataId: string;
  schemaVersionId: string;
  schemaRegistryId: string;
  duplicate: boolean;
  parsedFields?: unknown[];
  fieldStats?: unknown;
  requestId?: string;
}

export async function ingestSchema(body: IngestBody): Promise<IngestResponse> {
  return post(`${BASE}/ingest`, body);
}

export interface CreateMappingResponse {
  mappingId: string;
  jobId: string;
  status: string;
  requestId?: string;
}

export async function createMappingJob(body: {
  schemaVersionId: string;
  canonicalVersionId?: string;
}): Promise<CreateMappingResponse> {
  return post(`${BASE}/mappings`, body);
}

export interface SchemaMappingRecord {
  _id: string;
  status: string;
  schemaVersionId: string;
  schemaRegistryId: string;
  canonicalVersionId?: string;
  fieldMappings: ApiFieldMapping[];
  derivedFields?: unknown[];
  approvalRefId?: string | null;
  jobId?: string;
  createdAt?: string;
  updatedAt?: string;
  requestId?: string;
}

export async function fetchMapping(id: string): Promise<SchemaMappingRecord> {
  return get(`${BASE}/mappings/${id}`);
}

export async function patchMapping(
  id: string,
  body: { fieldMappings?: ApiFieldMapping[]; derivedFields?: unknown[] }
): Promise<SchemaMappingRecord> {
  return patch(`${BASE}/mappings/${id}`, body);
}

export async function submitMappingApproval(id: string): Promise<{ approvalId: string; requestId?: string }> {
  return post(`${BASE}/mappings/${id}/submit-approval`, {});
}

export async function fetchSchemaMapperMetrics(): Promise<Record<string, number>> {
  return get(`${BASE}/metrics`);
}
