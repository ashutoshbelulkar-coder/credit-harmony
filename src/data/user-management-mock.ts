import data from "./user-management.json";

export type UserRole = "Super Admin" | "Bureau Admin" | "Analyst" | "Viewer" | "API User";
export type UserStatus = "Active" | "Invited" | "Suspended" | "Deactivated";

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
  role: UserRole;
  description: string;
  userCount: number;
  color: string;
  permissions: Record<string, boolean>;
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

export const permissions = data.permissions as string[];
export const roleDefinitions = data.roleDefinitions as RoleDefinition[];
export const mockUsers = data.users as ManagedUser[];
export const mockActivity = data.activityLog as ActivityEntry[];
export const institutionOptions = data.institutionOptions as string[];
