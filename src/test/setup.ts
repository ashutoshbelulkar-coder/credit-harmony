import "@testing-library/jest-dom";

// ─── Media Query Stub ─────────────────────────────────────────────────────────
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// ─── ResizeObserver Stub ──────────────────────────────────────────────────────
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// ─── import.meta.env defaults for tests ──────────────────────────────────────
// Service files read these at module load time.
if (!import.meta.env.VITE_API_BASE_URL) {
  Object.assign(import.meta.env, {
    VITE_API_BASE_URL: "/api",
    VITE_USE_MOCK_FALLBACK: "true",
    VITE_MOCK_DELAY_MS: "0",
  });
}

// ─── Seed a fake access token so API client skips /auth/refresh ───────────────
// Without this, tests fail because `getOrRefreshToken()` throws a 401 (no token)
// before the mock-fallback condition is checked. With a fake token set, the first
// fetch attempt reaches the (unavailable) backend, fails with a network error,
// and the service mock-fallback activates.
import { setAccessToken } from "@/lib/api-client";
setAccessToken("test-fake-token-for-vitest");
