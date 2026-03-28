import { get, post, patch, del, ApiError } from "@/lib/api-client";
import { roleDefinitions as mockRoles } from "@/data/user-management-mock";

const BASE = "/v1/roles";
const USE_MOCK = import.meta.env.VITE_USE_MOCK_FALLBACK === "true";

export interface RoleResponse {
  id: string;
  roleName: string;
  description?: string;
  permissions: Record<string, Record<string, boolean>>;
  createdAt?: string;
}

export interface CreateRoleRequest {
  roleName: string;
  description?: string;
  permissions: Record<string, Record<string, boolean>>;
}

function isNetworkOrServerError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.isServerError;
}

export async function fetchRoles(): Promise<RoleResponse[]> {
  try {
    return await get<RoleResponse[]>(BASE);
  } catch (err) {
    if (USE_MOCK && isNetworkOrServerError(err)) {
      return mockRoles.map((r) => ({
        id: r.id,
        roleName: r.name,
        description: r.description,
        permissions: r.permissions ?? {},
      }));
    }
    throw err;
  }
}

export async function createRole(data: CreateRoleRequest): Promise<RoleResponse> {
  return post<RoleResponse>(BASE, data);
}

export async function updateRole(id: string, data: Partial<CreateRoleRequest>): Promise<RoleResponse> {
  return patch<RoleResponse>(`${BASE}/${id}`, data);
}

export async function deleteRole(id: string): Promise<void> {
  return del(`${BASE}/${id}`);
}
