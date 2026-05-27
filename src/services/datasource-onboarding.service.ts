/**
 * Datasource Onboarding service — mock-fallback first.
 *
 * Mirrors the shape of master-schema.service.ts (`allowMockFallback` option,
 * `clientMockFallbackEnabled` gating, paged responses) so all React Query
 * hooks remain interchangeable. No localStorage persistence — list/detail
 * mutations hydrate from `datasource-onboarding.json` and remain in-memory
 * for the session.
 */
import { get, post, patch, put, buildQuery, ApiError } from "@/lib/api-client";
import { clientMockFallbackEnabled } from "@/lib/client-mock-fallback";
import { enqueueLocalApprovalItem } from "@/services/approvals.service";
import type { PagedResponse } from "@/services/institutions.service";
import datasourceSeed from "@/data/datasource-onboarding.json";
import type {
  Datasource,
  DatasourceDataLayout,
  DatasourceListItem,
  DatasourceStatus,
  ProfileReviewAction,
  ProfileReviewStatus,
  ReviewComment,
  SchemaNode,
  SourceMappingType,
} from "@/types/datasource-onboarding";
import type { SourceType } from "@/types/schema-mapper";

const BASE = "/v1/datasources";

function isNetworkOrServerError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.isServerError || err.isUnauthorized || err.isForbidden;
}

function deepClone<T>(v: T): T {
  return structuredClone(v);
}

function countLeaves(nodes: SchemaNode[] | undefined): number {
  let n = 0;
  const visit = (node: SchemaNode) => {
    if (node.nodeType === "FIELD") {
      n += 1;
      return;
    }
    for (const child of node.children ?? []) visit(child);
  };
  for (const root of nodes ?? []) visit(root);
  return n;
}

let localDatasources: Datasource[] = [];
let hydrated = false;

function ensureHydrated() {
  if (hydrated) return;
  const seed = (datasourceSeed as { datasources?: Datasource[] }).datasources ?? [];
  localDatasources = seed.map((d) => {
    const x = deepClone(d) as Datasource;
    if (!x.dataLayout) x.dataLayout = "STRUCTURED";
    if (!x.dataSubmitterInstitutionId) x.dataSubmitterInstitutionId = "1";
    return x;
  });
  hydrated = true;
}

function toListItem(d: Datasource): DatasourceListItem {
  return {
    id: d.id,
    name: d.name,
    sourceType: d.sourceType,
    domainSourceType: d.domainSourceType,
    customDataSourceTypeName: d.customDataSourceTypeName,
    status: d.status,
    dataLayout: d.dataLayout,
    dataSubmitterInstitutionId: d.dataSubmitterInstitutionId,
    profileReviewStatus: d.profileReviewStatus,
    fieldCount: countLeaves(d.nodes),
    updatedAt: d.updatedAt,
    updatedBy: d.updatedBy,
  };
}

// ─── List / Detail ──────────────────────────────────────────────────────────

export interface DatasourceListParams {
  sourceType?: SourceMappingType | "all";
  domainSourceType?: SourceType | "all";
  profileReviewStatus?: ProfileReviewStatus | "all";
  status?: DatasourceStatus | "all";
  search?: string;
  page?: number;
  size?: number;
}

export async function fetchDatasourcesPage(
  params?: DatasourceListParams,
  options?: { allowMockFallback?: boolean },
): Promise<PagedResponse<DatasourceListItem>> {
  const allowMockFallback = options?.allowMockFallback !== false;
  try {
    return await get(`${BASE}${buildQuery(params ?? {})}`);
  } catch (err) {
    if (clientMockFallbackEnabled && allowMockFallback && isNetworkOrServerError(err)) {
      ensureHydrated();
      let list = localDatasources.map(toListItem);

      const q = String(params?.search ?? "").trim().toLowerCase();
      if (q) list = list.filter((d) => d.name.toLowerCase().includes(q));
      if (params?.sourceType && params.sourceType !== "all") {
        list = list.filter((d) => d.sourceType === params.sourceType);
      }
      if (params?.domainSourceType && params.domainSourceType !== "all") {
        list = list.filter((d) => d.domainSourceType === params.domainSourceType);
      }
      if (params?.profileReviewStatus && params.profileReviewStatus !== "all") {
        list = list.filter((d) => d.profileReviewStatus === params.profileReviewStatus);
      }
      if (params?.status && params.status !== "all") {
        list = list.filter((d) => d.status === params.status);
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

export async function fetchDatasource(
  id: string,
  options?: { allowMockFallback?: boolean },
): Promise<Datasource> {
  const allowMockFallback = options?.allowMockFallback !== false;
  try {
    return await get(`${BASE}/${encodeURIComponent(id)}`);
  } catch (err) {
    if (clientMockFallbackEnabled && allowMockFallback && isNetworkOrServerError(err)) {
      ensureHydrated();
      const found = localDatasources.find((d) => d.id === id);
      if (!found) throw err;
      return deepClone(found);
    }
    throw err;
  }
}

// ─── Create / Update ────────────────────────────────────────────────────────

export interface DatasourceCreateBody {
  name: string;
  sourceType: SourceMappingType;
  domainSourceType: SourceType;
  customDataSourceTypeName?: string;
  status?: DatasourceStatus;
  dataLayout: DatasourceDataLayout;
  dataSubmitterInstitutionId: string;
  pkPattern: string;
  nodes?: SchemaNode[];
  masterSchemaId?: string;
}

export async function createDatasource(
  body: DatasourceCreateBody,
  options?: { allowMockFallback?: boolean },
): Promise<Datasource> {
  const allowMockFallback = options?.allowMockFallback !== false;
  try {
    return await post(`${BASE}`, body);
  } catch (err) {
    if (clientMockFallbackEnabled && allowMockFallback && isNetworkOrServerError(err)) {
      ensureHydrated();
      const now = new Date().toISOString();
      const created: Datasource = {
        id: `ds-local-${Date.now()}`,
        name: body.name,
        sourceType: body.sourceType,
        domainSourceType: body.domainSourceType,
        customDataSourceTypeName:
          body.domainSourceType === "custom" ? body.customDataSourceTypeName?.trim() || undefined : undefined,
        status: body.status ?? "ACTIVE",
        dataLayout: body.dataLayout,
        dataSubmitterInstitutionId: body.dataSubmitterInstitutionId,
        pkPattern: body.pkPattern,
        profileReviewStatus: "PENDING",
        reviewComments: [],
        nodes: body.nodes ?? [],
        createdAt: now,
        updatedAt: now,
        createdBy: "You",
        updatedBy: "You",
        masterSchemaId: body.masterSchemaId,
      };
      localDatasources = [created, ...localDatasources];
      return deepClone(created);
    }
    throw err;
  }
}

export interface DatasourceUpdateBody {
  name?: string;
  sourceType?: SourceMappingType;
  domainSourceType?: SourceType;
  customDataSourceTypeName?: string;
  status?: DatasourceStatus;
  dataLayout?: DatasourceDataLayout;
  dataSubmitterInstitutionId?: string;
  pkPattern?: string;
  nodes?: SchemaNode[];
  masterSchemaId?: string;
}

export async function updateDatasource(
  id: string,
  body: DatasourceUpdateBody,
  options?: { allowMockFallback?: boolean },
): Promise<Datasource> {
  const allowMockFallback = options?.allowMockFallback !== false;
  try {
    return await patch(`${BASE}/${encodeURIComponent(id)}`, body);
  } catch (err) {
    if (clientMockFallbackEnabled && allowMockFallback && isNetworkOrServerError(err)) {
      ensureHydrated();
      const idx = localDatasources.findIndex((d) => d.id === id);
      if (idx < 0) throw err;
      const prev = localDatasources[idx];
      const updated: Datasource = {
        ...deepClone(prev),
        ...body,
        updatedAt: new Date().toISOString(),
        updatedBy: "You",
      };
      localDatasources = localDatasources.map((d) => (d.id === id ? updated : d));
      return deepClone(updated);
    }
    throw err;
  }
}

// ─── Approval / Review ──────────────────────────────────────────────────────

export async function submitDatasourceForApproval(
  id: string,
  options?: { allowMockFallback?: boolean },
): Promise<{ approvalId: string }> {
  const allowMockFallback = options?.allowMockFallback !== false;
  try {
    return await post(`${BASE}/${encodeURIComponent(id)}/submit-approval`, {});
  } catch (err) {
    if (clientMockFallbackEnabled && allowMockFallback && isNetworkOrServerError(err)) {
      ensureHydrated();
      const ds = localDatasources.find((d) => d.id === id);
      if (!ds) throw err;
      const now = new Date().toISOString();
      const updated: Datasource = {
        ...ds,
        profileReviewStatus: "PENDING",
        updatedAt: now,
        updatedBy: "You",
      };
      localDatasources = localDatasources.map((d) => (d.id === id ? updated : d));

      const approvalId = `appr-ds-${Date.now()}`;
      enqueueLocalApprovalItem({
        id: approvalId,
        type: "datasource_onboarding",
        name: ds.name,
        description: `Datasource onboarding submission (${ds.sourceType} / ${ds.domainSourceType})`,
        submittedBy: "You",
        submittedAt: now,
        status: "pending",
        metadata: {
          datasourceId: ds.id,
          sourceType: ds.sourceType,
          domainSourceType: ds.domainSourceType,
          fieldCount: String(countLeaves(ds.nodes)),
        },
      });
      return { approvalId };
    }
    throw err;
  }
}

export interface DatasourceReviewBody {
  action: ProfileReviewAction;
  comment: string;
}

export async function submitDatasourceReview(
  id: string,
  body: DatasourceReviewBody,
  options?: { allowMockFallback?: boolean },
): Promise<Datasource> {
  const allowMockFallback = options?.allowMockFallback !== false;
  try {
    return await post(`${BASE}/${encodeURIComponent(id)}/review`, body);
  } catch (err) {
    if (clientMockFallbackEnabled && allowMockFallback && isNetworkOrServerError(err)) {
      ensureHydrated();
      const ds = localDatasources.find((d) => d.id === id);
      if (!ds) throw err;
      const nextStatus: ProfileReviewStatus =
        body.action === "APPROVE"
          ? "APPROVED"
          : body.action === "REJECT"
            ? "REJECTED"
            : "CHANGES_REQUESTED";
      const now = new Date().toISOString();
      const reviewComment: ReviewComment = {
        id: `rev-${id}-${Date.now()}`,
        action: body.action,
        comment: body.comment,
        createdAt: now,
        author: "You",
      };
      const updated: Datasource = {
        ...ds,
        profileReviewStatus: nextStatus,
        reviewComments: [reviewComment, ...(ds.reviewComments ?? [])],
        updatedAt: now,
        updatedBy: "You",
      };
      localDatasources = localDatasources.map((d) => (d.id === id ? updated : d));
      return deepClone(updated);
    }
    throw err;
  }
}

// Retained for parity with master-schema.service.ts surface; not yet used.
export async function replaceDatasourceTree(
  id: string,
  nodes: SchemaNode[],
  options?: { allowMockFallback?: boolean },
): Promise<Datasource> {
  return updateDatasource(id, { nodes }, options);
}

export async function putDatasource(
  id: string,
  body: Datasource,
  options?: { allowMockFallback?: boolean },
): Promise<Datasource> {
  const allowMockFallback = options?.allowMockFallback !== false;
  try {
    return await put(`${BASE}/${encodeURIComponent(id)}`, body);
  } catch (err) {
    if (clientMockFallbackEnabled && allowMockFallback && isNetworkOrServerError(err)) {
      ensureHydrated();
      const idx = localDatasources.findIndex((d) => d.id === id);
      if (idx < 0) throw err;
      const updated: Datasource = {
        ...deepClone(body),
        updatedAt: new Date().toISOString(),
        updatedBy: "You",
      };
      localDatasources = localDatasources.map((d) => (d.id === id ? updated : d));
      return deepClone(updated);
    }
    throw err;
  }
}
