import { get, post, patch, del, buildQuery, ApiError } from "@/lib/api-client";
import { mockUsers } from "@/data/user-management-mock";

const BASE = "/v1/users";
const USE_MOCK = import.meta.env.VITE_USE_MOCK_FALLBACK === "true";

export interface UserResponse {
  id: number;
  email: string;
  displayName: string;
  givenName?: string;
  familyName?: string;
  userAccountStatus: string;
  mfaEnabled: boolean;
  institutionId?: number;
  institutionName?: string;
  roles: string[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserListParams {
  search?: string;
  status?: string;
  role?: string;
  institutionId?: string | number;
  page?: number;
  size?: number;
}

import type { PagedResponse } from "./institutions.service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseMockUser(m: any): UserResponse {
  return {
    id: parseInt(m.id.replace(/\D/g, ""), 10) || 0,
    email: m.email,
    displayName: m.name,
    userAccountStatus: m.status ?? "Active",
    mfaEnabled: m.mfaEnabled ?? false,
    institutionName: m.institution,
    roles: [m.role],
    createdAt: m.joinedDate ?? "",
    lastLoginAt: m.lastActive,
  };
}

function isNetworkOrServerError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.isServerError;
}

export async function fetchUsers(params?: UserListParams): Promise<PagedResponse<UserResponse>> {
  try {
    return await get<PagedResponse<UserResponse>>(`${BASE}${buildQuery(params ?? {})}`);
  } catch (err) {
    if (USE_MOCK && isNetworkOrServerError(err)) {
      let list = mockUsers.map(normaliseMockUser);
      if (params?.search) {
        const q = params.search.toLowerCase();
        list = list.filter((u) => u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
      }
      if (params?.status && params.status !== "All") list = list.filter((u) => u.userAccountStatus === params.status);
      if (params?.role && params.role !== "All") list = list.filter((u) => u.roles.includes(params.role!));
      const page = params?.page ?? 0;
      const size = params?.size ?? 10;
      return { content: list.slice(page * size, (page + 1) * size), totalElements: list.length, totalPages: Math.max(1, Math.ceil(list.length / size)), page, size };
    }
    throw err;
  }
}

export async function fetchUserById(id: string | number): Promise<UserResponse> {
  return get<UserResponse>(`${BASE}/${id}`);
}

export async function updateUser(id: string | number, data: Partial<UserResponse>): Promise<UserResponse> {
  return patch<UserResponse>(`${BASE}/${id}`, data);
}

export async function suspendUser(id: string | number): Promise<void> {
  return post(`${BASE}/${id}/suspend`);
}

export async function activateUser(id: string | number): Promise<void> {
  return post(`${BASE}/${id}/activate`);
}

export async function deleteUser(id: string | number): Promise<void> {
  return del(`${BASE}/${id}`);
}

export async function inviteUser(data: { email: string; role: string; institutionId?: number }): Promise<UserResponse> {
  return post<UserResponse>(`${BASE}/invitations`, data);
}
