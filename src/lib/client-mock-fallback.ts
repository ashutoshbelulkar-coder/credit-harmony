/**
 * Static JSON mock fallback for when the backend API is unreachable.
 *
 * Enabled when `VITE_USE_MOCK_FALLBACK === "true"`, OR by default in any build
 * where the Spring backend is not deployed (e.g. Lovable preview / published
 * site). Set `VITE_USE_MOCK_FALLBACK=false` to force real-API-only mode.
 */
export const clientMockFallbackEnabled =
  import.meta.env.VITE_USE_MOCK_FALLBACK !== "false";
