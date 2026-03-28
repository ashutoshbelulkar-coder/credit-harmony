import { get, post, patch, del, buildQuery, ApiError } from "@/lib/api-client";
import { clientMockFallbackEnabled } from "@/lib/client-mock-fallback";
import type { PagedResponse } from "./institutions.service";

const BASE = "/v1/consortiums";

export interface ConsortiumResponse {
  id: string;
  name: string;
  type: string;
  status: string;
  membersCount: number;
  dataVolume?: string;
  description?: string;
  purpose?: string;
  governanceModel?: string;
  createdAt?: string;
}

export interface ConsortiumMember {
  id: string;
  institutionId: string;
  institutionName: string;
  role: string;
  joinedAt: string;
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

export async function fetchConsortiumMembers(id: string): Promise<ConsortiumMember[]> {
  try {
    return await get<ConsortiumMember[]>(`${BASE}/${id}/members`);
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) {
      const { consortiumMembersByConsortiumId } = await import("@/data/consortiums-mock");
      return ((consortiumMembersByConsortiumId as Record<string, unknown[]>)[id] ?? []) as ConsortiumMember[];
    }
    throw err;
  }
}

export async function createConsortium(data: Partial<ConsortiumResponse>): Promise<ConsortiumResponse> {
  return post<ConsortiumResponse>(BASE, data);
}

export async function updateConsortium(id: string, data: Partial<ConsortiumResponse>): Promise<ConsortiumResponse> {
  return patch<ConsortiumResponse>(`${BASE}/${id}`, data);
}

export async function deleteConsortium(id: string): Promise<void> {
  return del(`${BASE}/${id}`);
}
