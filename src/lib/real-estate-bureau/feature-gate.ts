/**
 * Real Estate Bureau — static feature gate (demo POC).
 * Only approved email local-parts see navigation and may access routes.
 */

import { useAuth } from "@/contexts/AuthContext";

export const ALLOWED_REB_USERS = [
  "realestate.admin",
  "realestate.demo",
  "crif.property",
] as const;

export type AllowedRebUser = (typeof ALLOWED_REB_USERS)[number];

/** Demo credentials for Real Estate Bureau POC — documented in README.md (not shown on login UI). */
export const REB_DEMO_ACCOUNTS = [
  { username: "realestate.demo", email: "realestate.demo@crif.com", password: "Demo@123", label: "Demo User" },
  { username: "realestate.admin", email: "realestate.admin@crif.com", password: "Admin@123", label: "Admin User" },
  { username: "crif.property", email: "crif.property@crif.com", password: "Admin@123", label: "Property Analyst" },
] as const;

export function getEmailLocalPart(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.indexOf("@");
  return at >= 0 ? trimmed.slice(0, at) : trimmed;
}

export function hasRealEstateBureauAccess(email: string | undefined | null): boolean {
  if (!email) return false;
  const local = getEmailLocalPart(email);
  return (ALLOWED_REB_USERS as readonly string[]).includes(local);
}

export function useRealEstateBureauAccess(): boolean {
  const { user } = useAuth();
  return hasRealEstateBureauAccess(user?.email);
}

/** REB demo users see only Real Estate Bureau + Reporting in the sidebar. */
export function hasRebLimitedNavigation(email: string | undefined | null): boolean {
  return hasRealEstateBureauAccess(email);
}

export function useRebLimitedNavigation(): boolean {
  const { user } = useAuth();
  return hasRebLimitedNavigation(user?.email);
}

export function getPostLoginPath(email: string | undefined | null): string {
  return hasRebLimitedNavigation(email) ? "/real-estate-bureau" : "/";
}

export function isPathAllowedForRebLimitedUser(pathname: string): boolean {
  return (
    pathname.startsWith("/real-estate-bureau") || pathname.startsWith("/reporting")
  );
}
