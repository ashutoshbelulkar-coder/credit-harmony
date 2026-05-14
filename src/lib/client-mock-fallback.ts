/**
 * Static JSON mock fallback in services is **dev-only**. Production builds always
 * surface API errors so the UI shows real backend data (or error/retry states).
 */
export const clientMockFallbackEnabled =
  import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_FALLBACK === "true";
