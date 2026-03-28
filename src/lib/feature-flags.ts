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
