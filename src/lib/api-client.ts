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

// ─── Fetch timeouts (hung proxy / dead target otherwise pend forever) ─────────

const JSON_REQUEST_TIMEOUT_MS = 45_000;
/** `fetch` can resolve after headers; `res.json()` can still stall forever without this. */
const JSON_BODY_READ_TIMEOUT_MS = 30_000;
const REFRESH_TIMEOUT_MS = 20_000;
const MULTIPART_TIMEOUT_MS = 120_000;

function isAbortOrTimeout(err: unknown): boolean {
  if (err instanceof DOMException) return err.name === "AbortError" || err.name === "TimeoutError";
  return err instanceof Error && err.name === "AbortError";
}

/**
 * `fetch` with a deadline; merges optional caller `signal` (abort cancels timer and request).
 */
async function timedFetch(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const outer = init.signal;
  const ctrl = new AbortController();
  const timer = setTimeout(() => {
    ctrl.abort(new DOMException("Request timed out", "TimeoutError"));
  }, timeoutMs);

  const onOuterAbort = () => {
    clearTimeout(timer);
    if (!ctrl.signal.aborted) ctrl.abort(outer!.reason);
  };

  if (outer) {
    if (outer.aborted) {
      clearTimeout(timer);
      throw new DOMException("Aborted", "AbortError");
    }
    outer.addEventListener("abort", onOuterAbort, { once: true });
  }

  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener("abort", onOuterAbort);
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

  let res: Response;
  try {
    res = await timedFetch(
      `${BASE_URL}/v1/auth/refresh`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      },
      REFRESH_TIMEOUT_MS
    );
  } catch (e) {
    if (isAbortOrTimeout(e)) {
      throw new ApiError(
        408,
        "ERR_TIMEOUT",
        "Auth refresh timed out — ensure the API is reachable (e.g. npm run server on port 8091)."
      );
    }
    throw e;
  }

  if (!res.ok) {
    clearTokens();
    window.dispatchEvent(new CustomEvent("auth:session-expired"));
    throw new ApiError(401, "ERR_REFRESH_FAILED", "Session expired — please sign in again");
  }

  let data: { accessToken: string; refreshToken: string };
  try {
    data = await readJsonBody<{ accessToken: string; refreshToken: string }>(res);
  } catch (e) {
    if (isAbortOrTimeout(e)) {
      throw new ApiError(408, "ERR_TIMEOUT", "Reading auth refresh response timed out.");
    }
    throw e;
  }
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
    Accept: "application/json",
  };
  /** Fastify rejects `Content-Type: application/json` with an empty body; only set when we send JSON. */
  const serializedBody = body !== undefined ? JSON.stringify(body) : undefined;
  if (serializedBody !== undefined) {
    headers["Content-Type"] = "application/json";
  }

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
  let res: Response;
  try {
    res = await timedFetch(
      url,
      {
        method,
        headers,
        body: serializedBody,
        signal,
      },
      JSON_REQUEST_TIMEOUT_MS
    );
  } catch (e) {
    if (isAbortOrTimeout(e)) {
      throw new ApiError(
        408,
        "ERR_TIMEOUT",
        `Request timed out (${path}) — is the dev API running? Try npm run server (port 8091).`,
        path
      );
    }
    throw e;
  }

  // On 401 (token expired mid-flight), refresh and retry once
  if (res.status === 401 && !anonymous && _accessToken) {
    _accessToken = null; // force refresh on retry
    try {
      const newToken = await getOrRefreshToken();
      headers["Authorization"] = `Bearer ${newToken}`;
      const retry = await timedFetch(
        url,
        {
          method,
          headers,
          body: serializedBody,
          signal,
        },
        JSON_REQUEST_TIMEOUT_MS
      );
      return parseResponse<T>(retry, path);
    } catch {
      clearTokens();
      window.dispatchEvent(new CustomEvent("auth:session-expired"));
      throw new ApiError(401, "ERR_SESSION_EXPIRED", "Session expired — please sign in again", path);
    }
  }

  return parseResponse<T>(res, path);
}

async function readJsonBody<T>(res: Response): Promise<T> {
  let tid: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    tid = setTimeout(
      () => reject(new DOMException("Response body read timed out", "TimeoutError")),
      JSON_BODY_READ_TIMEOUT_MS
    );
  });
  try {
    return await Promise.race([res.json() as Promise<T>, timeout]);
  } finally {
    if (tid !== undefined) clearTimeout(tid);
  }
}

/** Read full body as text with the same timeout budget as JSON reads (handles 200 No Content / empty Spring bodies). */
async function readResponseTextWithTimeout(res: Response, path: string): Promise<string> {
  let tid: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    tid = setTimeout(
      () => reject(new DOMException("Response body read timed out", "TimeoutError")),
      JSON_BODY_READ_TIMEOUT_MS
    );
  });
  try {
    return await Promise.race([res.text(), timeout]);
  } finally {
    if (tid !== undefined) clearTimeout(tid);
  }
}

async function parseResponse<T>(res: Response, path: string): Promise<T> {
  if (res.ok) {
    if (res.status === 204 || res.status === 205) return undefined as T;
    try {
      const text = await readResponseTextWithTimeout(res, path);
      const trimmed = text.trim();
      if (trimmed === "") return undefined as T;
      try {
        return JSON.parse(trimmed) as T;
      } catch {
        throw new ApiError(
          502,
          "ERR_INVALID_JSON",
          `Invalid JSON in success response (${path})`,
          path
        );
      }
    } catch (e) {
      if (isAbortOrTimeout(e)) {
        throw new ApiError(
          408,
          "ERR_TIMEOUT",
          `Reading response body timed out (${path}) — the API may be stalled or the proxy misconfigured.`,
          path
        );
      }
      throw e;
    }
  }

  let code = `ERR_HTTP_${res.status}`;
  let message = res.statusText || `Request failed with status ${res.status}`;

  try {
    const err = await readJsonBody<{ error?: string; message?: string }>(res);
    if (err.error) code = err.error;
    if (err.message) message = err.message;
  } catch (e) {
    if (isAbortOrTimeout(e)) {
      throw new ApiError(
        408,
        "ERR_TIMEOUT",
        `Reading error response timed out (${path})`,
        path
      );
    }
    // response body is not JSON or other parse issue — use statusText
  }

  throw new ApiError(res.status, code, message, path);
}

async function fetchMultipart<T>(
  path: string,
  options: { method?: string; body: FormData; anonymous?: boolean; signal?: AbortSignal }
): Promise<T> {
  const { method = "POST", body, anonymous = false, signal } = options;
  const headers: Record<string, string> = { Accept: "application/json" };

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
  let res: Response;
  try {
    res = await timedFetch(url, { method, headers, body, signal }, MULTIPART_TIMEOUT_MS);
  } catch (e) {
    if (isAbortOrTimeout(e)) {
      throw new ApiError(
        408,
        "ERR_TIMEOUT",
        `Upload timed out (${path}) — check your connection and API availability.`,
        path
      );
    }
    throw e;
  }

  if (res.status === 401 && !anonymous) {
    _accessToken = null;
    try {
      const newToken = await getOrRefreshToken();
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await timedFetch(url, { method, headers, body, signal }, MULTIPART_TIMEOUT_MS);
      return parseResponse<T>(res, path);
    } catch {
      clearTokens();
      window.dispatchEvent(new CustomEvent("auth:session-expired"));
      throw new ApiError(401, "ERR_SESSION_EXPIRED", "Session expired — please sign in again", path);
    }
  }

  return parseResponse<T>(res, path);
}

// ─── Public Typed Helpers ────────────────────────────────────────────────────

export function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  return coreFetch<T>(path, { method: "GET", signal });
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return coreFetch<T>(path, { method: "POST", body });
}

/** POST `multipart/form-data` — do not set Content-Type; boundary is added by the browser. */
export function postMultipart<T>(path: string, formData: FormData, signal?: AbortSignal): Promise<T> {
  return fetchMultipart<T>(path, { body: formData, signal });
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
