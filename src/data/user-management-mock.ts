import data from "./user-management.json";
import {
  permissionSections,
  permissionActions,
  type PermissionAction,
} from "@/lib/nav-config";

export type UserRole = "Super Admin" | "Bureau Admin" | "Analyst" | "Viewer" | "API User";
export type UserStatus = "Active" | "Invited" | "Suspended" | "Deactivated";

export type SectionPermissionMatrix = Record<string, Partial<Record<PermissionAction, boolean>>>;

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institution: string;
  status: UserStatus;
  mfaEnabled: boolean;
  lastActive: string;
  createdAt: string;
  avatar?: string;
  apiKeys?: { id: string; name: string; lastUsed: string; status: "Active" | "Revoked" }[];
}

export interface RoleDefinition {
  role: UserRole | string;
  description: string;
  userCount: number;
  color: string;
  /** Legacy flat permissions from JSON (unused in UI). */
  permissions: Record<string, boolean>;
  /** Section × action matrix aligned with sidebar (nav-config). */
  sectionPermissions: SectionPermissionMatrix;
}

export interface ActivityEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  ipAddress: string;
  status: "Success" | "Failed";
  timestamp: string;
}

export function createEmptySectionMatrix(): SectionPermissionMatrix {
  const m: SectionPermissionMatrix = {};
  for (const s of permissionSections) {
    m[s.id] = {};
    for (const a of permissionActions) {
      m[s.id][a] = false;
    }
  }
  return m;
}

function cloneMatrix(src: SectionPermissionMatrix): SectionPermissionMatrix {
  return JSON.parse(JSON.stringify(src)) as SectionPermissionMatrix;
}

function allActions(on: boolean): Partial<Record<PermissionAction, boolean>> {
  return Object.fromEntries(permissionActions.map((a) => [a, on])) as Partial<
    Record<PermissionAction, boolean>
  >;
}

const ALL_TRUE_MATRIX: SectionPermissionMatrix = (() => {
  const m = createEmptySectionMatrix();
  for (const s of permissionSections) {
    m[s.id] = allActions(true) as Record<PermissionAction, boolean>;
  }
  return m;
})();

const builtInRoleSectionMatrices: Record<string, SectionPermissionMatrix> = {
  "Super Admin": ALL_TRUE_MATRIX,
  "Bureau Admin": (() => {
    const m = cloneMatrix(ALL_TRUE_MATRIX);
    m["user-management"] = { View: true, Create: false, Edit: false, Delete: false, Export: true };
    return m;
  })(),
  Analyst: mergePartialMatrix({
    dashboard: { View: true, Create: false, Edit: false, Delete: false, Export: true },
    members: { View: true, Create: false, Edit: false, Delete: false, Export: true },
    "data-products": { View: true, Create: false, Edit: false, Delete: false, Export: true },
    agents: { View: true, Create: true, Edit: false, Delete: false, Export: true },
    "data-governance": { View: true, Create: false, Edit: false, Delete: false, Export: true },
    monitoring: { View: true, Create: false, Edit: false, Delete: false, Export: true },
    reporting: { View: true, Create: true, Edit: false, Delete: false, Export: true },
    "audit-logs": { View: true, Create: false, Edit: false, Delete: false, Export: true },
    "approval-queue": { View: true, Create: false, Edit: false, Delete: false, Export: false },
    "user-management": { View: false, Create: false, Edit: false, Delete: false, Export: false },
  }),
  Viewer: mergePartialMatrix({
    dashboard: { View: true, Create: false, Edit: false, Delete: false, Export: false },
    members: { View: true, Create: false, Edit: false, Delete: false, Export: false },
  }),
  "API User": mergePartialMatrix({
    agents: { View: true, Create: false, Edit: false, Delete: false, Export: true },
    monitoring: { View: true, Create: false, Edit: false, Delete: false, Export: false },
    reporting: { View: false, Create: false, Edit: false, Delete: false, Export: true },
    "audit-logs": { View: true, Create: false, Edit: false, Delete: false, Export: false },
    "data-products": { View: true, Create: false, Edit: false, Delete: false, Export: false },
  }),
};

function mergePartialMatrix(partial: SectionPermissionMatrix): SectionPermissionMatrix {
  const base = createEmptySectionMatrix();
  for (const [sid, actions] of Object.entries(partial)) {
    base[sid] = { ...base[sid], ...actions };
  }
  return base;
}

export function normalizeRoleDefinition(raw: {
  role: string;
  description: string;
  userCount: number;
  color: string;
  permissions: Record<string, boolean>;
  sectionPermissions?: SectionPermissionMatrix;
}): RoleDefinition {
  const sectionPermissions =
    raw.sectionPermissions ??
    builtInRoleSectionMatrices[raw.role] ??
    createEmptySectionMatrix();
  return {
    role: raw.role,
    description: raw.description,
    userCount: raw.userCount,
    color: raw.color,
    permissions: raw.permissions,
    sectionPermissions,
  };
}

const rawRoles = data.roleDefinitions as Array<{
  role: string;
  description: string;
  userCount: number;
  color: string;
  permissions: Record<string, boolean>;
}>;

export const permissions = data.permissions as string[];
export const roleDefinitions = rawRoles.map((r) => normalizeRoleDefinition(r));
export const mockUsers = data.users as ManagedUser[];
export const mockActivity = data.activityLog as ActivityEntry[];
export const institutionOptions = data.institutionOptions as string[];

export const sectionPermissionSlotCount = permissionSections.length * permissionActions.length;

export function countEnabledSectionPermissions(m: SectionPermissionMatrix): number {
  let n = 0;
  for (const s of permissionSections) {
    for (const a of permissionActions) {
      if (m[s.id]?.[a]) n += 1;
    }
  }
  return n;
}
