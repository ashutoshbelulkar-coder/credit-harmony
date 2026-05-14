import { get, post, patch, del, buildQuery, ApiError } from "@/lib/api-client";
import { clientMockFallbackEnabled } from "@/lib/client-mock-fallback";
import type { PagedResponse } from "./institutions.service";

const BASE = "/v1/consortiums";

export interface ConsortiumResponse {
  id: string;
  name: string;
  status: string;
  membersCount: number;
  dataVolume?: string;
  description?: string;
  /**
   * Consortium-level visibility policy stored on consortiums.data_visibility.
   * Present in Spring API responses; may be absent in legacy/mock fixtures.
   */
  dataVisibility?: "full" | "masked_pii" | "derived" | string;
  createdAt?: string;
}

export interface ConsortiumMember {
  id: string;
  institutionId: string;
  institutionName: string;
  /** Same value as the institution registration number (member id in bureau terms). */
  registrationNumber?: string;
  joinedAt: string;
}

/** Master CBS member row (backend catalog). */
export interface CbsMemberCatalogEntry {
  id: string;
  memberId: string;
  displayName?: string;
  createdAt?: string;
}

/** CBS members linked to a consortium (resolved from catalog). */
export interface ConsortiumCbsMember {
  id: string;
  catalogId: string;
  memberId: string;
  displayName?: string;
  createdAt?: string;
}

export interface ConsortiumListParams {
  search?: string;
  status?: string;
  page?: number;
  size?: number;
}

function isNetworkOrServerError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.isServerError;
}

function isMissingEndpoint(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  return err.status === 404 || err.status === 405 || err.status === 501;
}

/**
 * CBS links on consortium: same embedded fallback when API is unavailable.
 */
function shouldFallbackCbsCatalog(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  if (err.status === 401 || err.status === 403) return true;
  if (isMissingEndpoint(err)) return true;
  if (clientMockFallbackEnabled && err.isServerError) return true;
  return false;
}

export async function fetchConsortiums(params?: ConsortiumListParams): Promise<PagedResponse<ConsortiumResponse>> {
  try {
    return await get<PagedResponse<ConsortiumResponse>>(`${BASE}${buildQuery(params ?? {})}`);
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) {
      const { consortiums: mockList } = await import("@/data/consortiums-mock");
      let list = [...mockList] as ConsortiumResponse[];
      if (params?.search) {
        const q = params.search.toLowerCase();
        list = list.filter((c) => c.name.toLowerCase().includes(q));
      }
      if (params?.status && params.status !== "all") list = list.filter((c) => c.status === params.status);
      const page = params?.page ?? 0;
      const size = params?.size ?? 20;
      return { content: list.slice(page * size, (page + 1) * size), totalElements: list.length, totalPages: Math.max(1, Math.ceil(list.length / size)), page, size };
    }
    throw err;
  }
}

export async function fetchConsortiumById(id: string): Promise<ConsortiumResponse> {
  try {
    return await get<ConsortiumResponse>(`${BASE}/${id}`);
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) {
      const { consortiums: mockList } = await import("@/data/consortiums-mock");
      const found = mockList.find((c) => c.id === id);
      if (!found) throw new ApiError(404, "ERR_NOT_FOUND", `Consortium ${id} not found`);
      return found as ConsortiumResponse;
    }
    throw err;
  }
}

/** Mock rows use `joinedDate`; API uses ISO `joinedAt`. */
function mapMockConsortiumMembersToApi(
  rows: import("@/data/consortiums-mock").ConsortiumMember[]
): ConsortiumMember[] {
  return rows.map((m, i) => ({
    id: `mock-${m.institutionId}-${i}`,
    institutionId: m.institutionId,
    institutionName: m.institutionName,
    registrationNumber: m.registrationNumber,
    joinedAt: m.joinedDate.includes("T") ? m.joinedDate : `${m.joinedDate}T00:00:00.000Z`,
  }));
}

function normalizeConsortiumCbsMemberRow(raw: unknown): ConsortiumCbsMember {
  const r = raw as Record<string, unknown>;
  const id = String(r.id ?? "");
  const catalogId = String(r.catalogId ?? r.catalogid ?? "");
  const memberId = String(r.memberId ?? r.memberid ?? "");
  const displayName =
    typeof r.displayName === "string"
      ? r.displayName
      : typeof r.displayname === "string"
        ? r.displayname
        : undefined;
  const createdAt =
    typeof r.createdAt === "string"
      ? r.createdAt
      : typeof r.createdat === "string"
        ? r.createdat
        : undefined;
  return { id, catalogId, memberId, displayName, createdAt };
}

export async function fetchConsortiumMembers(id: string): Promise<ConsortiumMember[]> {
  try {
    return await get<ConsortiumMember[]>(`${BASE}/${id}/members`);
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) {
      const { getConsortiumMembers } = await import("@/data/consortiums-mock");
      return mapMockConsortiumMembersToApi(getConsortiumMembers(id));
    }
    throw err;
  }
}

export async function fetchConsortiumCbsMembers(id: string): Promise<ConsortiumCbsMember[]> {
  try {
    const rows = await get<unknown[]>(`${BASE}/${id}/cbs-members`);
    if (!Array.isArray(rows)) return [];
    return rows.map(normalizeConsortiumCbsMemberRow);
  } catch (err) {
    if (shouldFallbackCbsCatalog(err)) {
      const { getConsortiumCbsMembers } = await import("@/data/consortiums-mock");
      return getConsortiumCbsMembers(id) as ConsortiumCbsMember[];
    }
    throw err;
  }
}

const CATALOG_BASE = "/v1/cbs-member-catalog";

export async function fetchCbsMemberCatalog(): Promise<CbsMemberCatalogEntry[]> {
  try {
    return await get<CbsMemberCatalogEntry[]>(CATALOG_BASE);
  } catch {
    const { getCbsMemberCatalog } = await import("@/data/consortiums-mock");
    return getCbsMemberCatalog();
  }
}

/** Create/update body: consortium fields plus optional members and `dataPolicy: { dataVisibility }` (dev API persists these; legacy share/aggregation flags are ignored). */
export type ConsortiumWritePayload = Partial<ConsortiumResponse> & {
  members?: { institutionId: string | number }[];
  /** CBS catalog row ids; replace-all when sent on PATCH. */
  cbsMembers?: { catalogId: string | number }[];
  dataPolicy?: Record<string, unknown>;
};

export async function createConsortium(data: ConsortiumWritePayload): Promise<ConsortiumResponse> {
  return post<ConsortiumResponse>(BASE, data);
}

export async function updateConsortium(id: string, data: ConsortiumWritePayload): Promise<ConsortiumResponse> {
  return patch<ConsortiumResponse>(`${BASE}/${id}`, data);
}

export async function deleteConsortium(id: string): Promise<void> {
  return del(`${BASE}/${id}`);
}
