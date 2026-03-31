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
