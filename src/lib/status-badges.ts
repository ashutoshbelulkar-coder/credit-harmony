import { cn } from "@/lib/utils";

/** Lowercase snake_case for matching Spring DB values and legacy mock Title Case. */
export function normalizeStatusKey(status: string): string {
  return status.trim().toLowerCase().replace(/\s+/g, "_");
}

const BADGE_SHELL = "border-0 border-transparent shadow-none";

// ─── Data Submission API (api_requests.api_request_status) ─────────────────

const API_REQUEST_BADGE: Record<string, string> = {
  success: "bg-success/20 text-success hover:bg-success/30",
  failed: "bg-destructive/20 text-destructive hover:bg-destructive/30",
  partial: "bg-warning/20 text-warning hover:bg-warning/30",
  rate_limited: "bg-warning/20 text-warning hover:bg-warning/30",
  authentication_failed: "bg-destructive/20 text-destructive hover:bg-destructive/30",
};

const API_REQUEST_LABEL: Record<string, string> = {
  success: "Success",
  failed: "Failed",
  partial: "Partial",
  rate_limited: "Rate Limited",
  authentication_failed: "Authentication Failed",
};

export function apiRequestStatusBadgeClass(status: string): string {
  const key = normalizeStatusKey(status);
  return cn(BADGE_SHELL, API_REQUEST_BADGE[key] ?? "bg-muted/70 text-muted-foreground hover:bg-muted");
}

export function apiRequestStatusLabel(status: string): string {
  const key = normalizeStatusKey(status);
  return API_REQUEST_LABEL[key] ?? status;
}

/** Text colour in detail drawers (no pill). */
export function apiRequestStatusTextClass(status: string): string {
  const key = normalizeStatusKey(status);
  if (key === "success") return "text-success font-medium";
  if (key === "failed" || key === "authentication_failed") return "text-destructive font-medium";
  if (key === "partial" || key === "rate_limited") return "text-warning font-medium";
  return "text-foreground font-medium";
}

export function apiRequestIsFailedForRetry(status: string): boolean {
  return normalizeStatusKey(status) === "failed";
}

export function apiRequestShowsValidationFailures(status: string): boolean {
  const n = normalizeStatusKey(status);
  return n === "failed" || n === "partial" || n === "authentication_failed";
}

// ─── Enquiry API (enquiries.enquiry_status) ──────────────────────────────────

const ENQUIRY_BADGE: Record<string, string> = {
  success: "bg-success/20 text-success hover:bg-success/30",
  failed: "bg-destructive/20 text-destructive hover:bg-destructive/30",
  rate_limited: "bg-warning/20 text-warning hover:bg-warning/30",
  consent_missing: "bg-warning/20 text-warning hover:bg-warning/30",
  subject_not_found: "bg-muted/80 text-muted-foreground hover:bg-muted",
};

const ENQUIRY_LABEL: Record<string, string> = {
  success: "Success",
  failed: "Failed",
  rate_limited: "Rate Limited",
  consent_missing: "Consent missing",
  subject_not_found: "Subject not found",
};

export function enquiryStatusBadgeClass(status: string): string {
  const key = normalizeStatusKey(status);
  return cn(BADGE_SHELL, ENQUIRY_BADGE[key] ?? "bg-muted/70 text-muted-foreground hover:bg-muted");
}

export function enquiryStatusLabel(status: string): string {
  const key = normalizeStatusKey(status);
  return ENQUIRY_LABEL[key] ?? status;
}

export function enquiryStatusTextClass(status: string): string {
  const key = normalizeStatusKey(status);
  if (key === "success") return "text-success font-medium";
  if (key === "failed") return "text-destructive font-medium";
  if (key === "rate_limited" || key === "consent_missing") return "text-warning font-medium";
  if (key === "subject_not_found") return "text-muted-foreground font-medium";
  return "text-foreground font-medium";
}

// ─── Reports (reports.report_status) ─────────────────────────────────────────

const REPORT_BADGE: Record<string, string> = {
  queued: "bg-warning/15 text-warning hover:bg-warning/25",
  processing: "bg-primary/20 text-primary hover:bg-primary/30",
  completed: "bg-success/20 text-success hover:bg-success/30",
  failed: "bg-destructive/20 text-destructive hover:bg-destructive/30",
};

const REPORT_LABEL: Record<string, string> = {
  queued: "Queued",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export function reportStatusBadgeClass(status: string): string {
  const key = normalizeStatusKey(status);
  return cn(BADGE_SHELL, REPORT_BADGE[key] ?? "bg-muted/70 text-muted-foreground hover:bg-muted");
}

export function reportStatusLabel(status: string): string {
  const key = normalizeStatusKey(status);
  return REPORT_LABEL[key] ?? status;
}

export function reportStatusesEqual(a: string, b: string): boolean {
  return normalizeStatusKey(a) === normalizeStatusKey(b);
}

/** Select `value` must match DB / `lower(?)` filter on Spring (`api_requests.api_request_status`). */
export const API_REQUEST_STATUS_FILTER_OPTIONS = [
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "partial", label: "Partial" },
  { value: "rate_limited", label: "Rate Limited" },
  { value: "authentication_failed", label: "Authentication Failed" },
] as const;

/** Select `value` matches `enquiries.enquiry_status` for monitoring filter param. */
export const ENQUIRY_STATUS_FILTER_OPTIONS = [
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "rate_limited", label: "Rate Limited" },
  { value: "consent_missing", label: "Consent missing" },
  { value: "subject_not_found", label: "Subject not found" },
] as const;

// ─── Institution lifecycle (institutions.institution_lifecycle_status / API string) ─

/** Normalise UI/API variants: "Pending Approval", "pending-approval" → pending_approval. */
export function institutionLifecycleStatusKey(status: string): string {
  return status.trim().toLowerCase().replace(/[\s_-]+/g, "_");
}

const INSTITUTION_LIFECYCLE_BADGE: Record<string, string> = {
  active: "bg-success/15 text-success hover:bg-success/25",
  pending: "bg-warning/15 text-warning hover:bg-warning/25",
  pending_approval: "bg-warning/15 text-warning hover:bg-warning/25",
  suspended: "bg-destructive/15 text-destructive hover:bg-destructive/25",
  draft: "bg-muted text-muted-foreground hover:bg-muted",
  inactive: "bg-muted text-muted-foreground hover:bg-muted",
};

const INSTITUTION_LIFECYCLE_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Pending",
  pending_approval: "Pending approval",
  suspended: "Suspended",
  draft: "Draft",
  inactive: "Inactive",
};

function institutionLifecycleBucket(status: string): string {
  const k = institutionLifecycleStatusKey(status);
  if (k === "pending_approval" || k === "pendingapproval") return "pending_approval";
  if (k.startsWith("pending")) return "pending";
  return k;
}

export function institutionLifecycleStatusBadgeClass(status: string): string {
  const bucket = institutionLifecycleBucket(status);
  const cls =
    INSTITUTION_LIFECYCLE_BADGE[bucket] ??
    (bucket.includes("pending") ? INSTITUTION_LIFECYCLE_BADGE.pending : undefined);
  return cn(BADGE_SHELL, cls ?? "bg-muted/70 text-muted-foreground hover:bg-muted");
}

export function institutionLifecycleStatusLabel(status: string): string {
  const bucket = institutionLifecycleBucket(status);
  return INSTITUTION_LIFECYCLE_LABEL[bucket] ?? status;
}

// ─── User account (user_management user_account_status) ─────────────────────

const USER_ACCOUNT_BADGE: Record<string, string> = {
  active: "bg-success/15 text-success hover:bg-success/25",
  invited: "bg-info/15 text-info hover:bg-info/25",
  suspended: "bg-destructive/15 text-destructive hover:bg-destructive/25",
  inactive: "bg-muted text-muted-foreground hover:bg-muted",
  disabled: "bg-muted text-muted-foreground hover:bg-muted",
};

const USER_ACCOUNT_LABEL: Record<string, string> = {
  active: "Active",
  invited: "Invited",
  suspended: "Suspended",
  inactive: "Inactive",
  disabled: "Disabled",
};

export function userAccountStatusBadgeClass(status: string): string {
  const key = normalizeStatusKey(status);
  return cn(BADGE_SHELL, USER_ACCOUNT_BADGE[key] ?? "bg-muted/70 text-muted-foreground hover:bg-muted");
}

export function userAccountStatusLabel(status: string): string {
  const key = normalizeStatusKey(status);
  return USER_ACCOUNT_LABEL[key] ?? status;
}
