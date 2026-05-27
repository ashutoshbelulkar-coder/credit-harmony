/**
 * Demo-only UI affordances (password reset / SSO placeholders, etc.).
 * Production builds default to false unless explicitly enabled.
 */
export function showDemoAccountRecoveryUi(): boolean {
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_SHOW_DEMO_AUTH_UI === "true";
  }
  return import.meta.env.VITE_SHOW_DEMO_AUTH_UI !== "false";
}

/** Agents landing “request access” style toast — demo only unless flagged. */
export function showDemoAgentsRequestUi(): boolean {
  return showDemoAccountRecoveryUi();
}

/**
 * Datasource Onboarding migration — gate the new 3-step POC wizard and the
 * tree-based Master Data Model editor. Default ON (the migration is live);
 * setting `VITE_USE_DATASOURCE_ONBOARDING_FLOW=false` provides a 1-line
 * rollback to the legacy 4-step Schema Mapper wizard during stabilisation.
 */
export function useDatasourceOnboardingFlow(): boolean {
  return import.meta.env.VITE_USE_DATASOURCE_ONBOARDING_FLOW !== "false";
}
