/**
 * Centralised HTTP client for all backend API communication.
 *
 * Security principles:
 *  - Access token stored in module memory only — never persisted to localStorage.
 *  - Refresh token stored in sessionStorage (per-tab, cleared on tab close).
 *  - A single refresh call is shared across all concurrent 401 failures (queue pattern).
 *  - All errors are wrapped in ApiError — no raw Error objects escape this module.
 *  - Headers are never mutated; a new Headers object is created per request.
 */

// ─── Token Storage ──────────────────────────────────────────────────────────

const REFRESH_TOKEN_KEY = "hcb_refresh_token";

/** In-memory access token. Never written to any persistent storage. */
let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setRefreshToken(token: string | null): void {
  if (token) {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens(): void {
  _accessToken = null;
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ─── Error Types ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly path?: string
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNotFound() {
    return this.status === 404;
  }
  get isServerError() {
    return this.status >= 500;
  }
}

// ─── Refresh Queue ────────────────────────────────────────────────────────────

/**
 * Promise-queue pattern: while a refresh is in flight, all concurrent
 * 401 responses wait on the same promise instead of firing their own refresh.
 */
let _refreshPromise: Promise<string> | null = null;

async function performTokenRefresh(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new ApiError(401, "ERR_NO_REFRESH_TOKEN", "No refresh token available");
  }

  const res = await fetch(`${BASE_URL}/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearTokens();
    window.dispatchEvent(new CustomEvent("auth:session-expired"));
    throw new ApiError(401, "ERR_REFRESH_FAILED", "Session expired — please sign in again");
  }

  const data = await res.json() as { accessToken: string; refreshToken: string };
  setAccessToken(data.accessToken);
  setRefreshToken(data.refreshToken);
  return data.accessToken;
}

async function getOrRefreshToken(): Promise<string> {
  if (_accessToken) return _accessToken;
  if (!_refreshPromise) {
    _refreshPromise = performTokenRefresh().finally(() => {
      _refreshPromise = null;
    });
  }
  return _refreshPromise;
}

// ─── Base URL ─────────────────────────────────────────────────────────────────

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";

// ─── Core Fetch ──────────────────────────────────────────────────────────────

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Do not attach Authorization header (used for /auth/login, /auth/refresh). */
  anonymous?: boolean;
  signal?: AbortSignal;
}

async function coreFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, anonymous = false, signal } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (!anonymous) {
    try {
      const token = await getOrRefreshToken();
      headers["Authorization"] = `Bearer ${token}`;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(401, "ERR_AUTH", "Authentication failed");
    }
  }

  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  // On 401 (token expired mid-flight), refresh and retry once
  if (res.status === 401 && !anonymous && _accessToken) {
    _accessToken = null; // force refresh on retry
    try {
      const newToken = await getOrRefreshToken();
      headers["Authorization"] = `Bearer ${newToken}`;
      const retry = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      });
      return parseResponse<T>(retry, path);
    } catch {
      clearTokens();
      window.dispatchEvent(new CustomEvent("auth:session-expired"));
      throw new ApiError(401, "ERR_SESSION_EXPIRED", "Session expired — please sign in again", path);
    }
  }

  return parseResponse<T>(res, path);
}

async function parseResponse<T>(res: Response, path: string): Promise<T> {
  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  let code = `ERR_HTTP_${res.status}`;
  let message = res.statusText || `Request failed with status ${res.status}`;

  try {
    const err = await res.json() as { error?: string; message?: string };
    if (err.error) code = err.error;
    if (err.message) message = err.message;
  } catch {
    // response body is not JSON — use statusText
  }

  throw new ApiError(res.status, code, message, path);
}

// ─── Public Typed Helpers ────────────────────────────────────────────────────

export function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  return coreFetch<T>(path, { method: "GET", signal });
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return coreFetch<T>(path, { method: "POST", body });
}

export function postAnon<T>(path: string, body?: unknown): Promise<T> {
  return coreFetch<T>(path, { method: "POST", body, anonymous: true });
}

export function put<T>(path: string, body?: unknown): Promise<T> {
  return coreFetch<T>(path, { method: "PUT", body });
}

export function patch<T>(path: string, body?: unknown): Promise<T> {
  return coreFetch<T>(path, { method: "PATCH", body });
}

export function del<T = void>(path: string): Promise<T> {
  return coreFetch<T>(path, { method: "DELETE" });
}

// ─── Query String Builder ────────────────────────────────────────────────────

/**
 * Build a URL query string from a params object, omitting null/undefined/empty values.
 * Returns an empty string if there are no non-empty params.
 *
 * @example buildQuery({ status: "active", page: 0, search: "" }) → "?status=active&page=0"
 */
export function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== null && v !== undefined && v !== ""
  );
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
}
