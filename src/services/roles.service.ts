import { get, post, patch, del, ApiError } from "@/lib/api-client";
import { clientMockFallbackEnabled } from "@/lib/client-mock-fallback";
import { roleDefinitions as mockRoles } from "@/data/user-management-mock";

const BASE = "/v1/roles";

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

function normalizeRoleRow(raw: Record<string, unknown>): RoleResponse {
  const roleName = String(raw.roleName ?? raw.name ?? raw.role ?? "").trim();
  const id = raw.id != null && raw.id !== "" ? String(raw.id) : "";
  const description =
    raw.description === undefined || raw.description === null
      ? undefined
      : String(raw.description);
  const perms = raw.permissions;
  const permissions =
    perms && typeof perms === "object" && !Array.isArray(perms)
      ? (perms as RoleResponse["permissions"])
      : {};
  return { id, roleName, description, permissions };
}

function isNetworkOrServerError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.isServerError;
}

export async function fetchRoles(): Promise<RoleResponse[]> {
  try {
    const rows = await get<unknown>(BASE);
    if (!Array.isArray(rows)) {
      throw new ApiError(500, "ERR_ROLE_LIST_SHAPE", "Expected an array from GET /v1/roles", BASE);
    }
    return rows.map((row) => normalizeRoleRow(row as Record<string, unknown>));
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) {
      return mockRoles.map((r, i) => ({
        id: `local-${i + 1}`,
        roleName: String(r.role),
        description: r.description,
        permissions: r.sectionPermissions as Record<string, Record<string, boolean>>,
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
