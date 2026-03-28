import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  setAccessToken,
  getAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearTokens,
  ApiError,
  buildQuery,
} from "@/lib/api-client";

describe("Token storage", () => {
  afterEach(() => clearTokens());

  it("stores and retrieves the access token from memory", () => {
    setAccessToken("test-access-token");
    expect(getAccessToken()).toBe("test-access-token");
  });

  it("clearing tokens removes access token from memory", () => {
    setAccessToken("abc");
    clearTokens();
    expect(getAccessToken()).toBeNull();
  });

  it("stores refresh token in sessionStorage", () => {
    setRefreshToken("refresh-abc");
    expect(getRefreshToken()).toBe("refresh-abc");
  });

  it("clearing tokens removes refresh token from sessionStorage", () => {
    setRefreshToken("refresh-abc");
    clearTokens();
    expect(getRefreshToken()).toBeNull();
  });

  it("setRefreshToken(null) removes the key", () => {
    setRefreshToken("some-token");
    setRefreshToken(null);
    expect(getRefreshToken()).toBeNull();
  });
});

describe("ApiError", () => {
  it("is instance of Error", () => {
    const err = new ApiError(404, "ERR_NOT_FOUND", "Not found");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it(".isUnauthorized is true for 401", () => {
    const err = new ApiError(401, "ERR_UNAUTH", "Unauthorized");
    expect(err.isUnauthorized).toBe(true);
    expect(err.isForbidden).toBe(false);
  });

  it(".isForbidden is true for 403", () => {
    const err = new ApiError(403, "ERR_FORBIDDEN", "Forbidden");
    expect(err.isForbidden).toBe(true);
  });

  it(".isNotFound is true for 404", () => {
    const err = new ApiError(404, "ERR_NOT_FOUND", "Not found");
    expect(err.isNotFound).toBe(true);
  });

  it(".isServerError is true for 5xx", () => {
    const err = new ApiError(500, "ERR_SERVER", "Internal error");
    expect(err.isServerError).toBe(true);
  });

  it(".isServerError is false for 4xx", () => {
    const err = new ApiError(400, "ERR_BAD_REQUEST", "Bad request");
    expect(err.isServerError).toBe(false);
  });

  it("carries the original status code", () => {
    const err = new ApiError(422, "ERR_VALIDATION", "Validation failed");
    expect(err.status).toBe(422);
    expect(err.code).toBe("ERR_VALIDATION");
  });
});

describe("buildQuery", () => {
  it("builds a query string from params", () => {
    const qs = buildQuery({ status: "active", page: 0 });
    expect(qs).toBe("?status=active&page=0");
  });

  it("omits null, undefined, and empty-string values", () => {
    const qs = buildQuery({ status: "active", search: "", page: undefined, type: null });
    expect(qs).toBe("?status=active");
  });

  it("returns empty string when all params are empty", () => {
    const qs = buildQuery({ status: "", page: undefined });
    expect(qs).toBe("");
  });

  it("encodes special characters in keys and values", () => {
    const qs = buildQuery({ name: "ACME Corp & Co" });
    expect(qs).toContain("ACME%20Corp");
  });

  it("includes boolean false (it's not empty)", () => {
    const qs = buildQuery({ active: false });
    expect(qs).toBe("?active=false");
  });

  it("includes 0 (zero is not empty)", () => {
    const qs = buildQuery({ page: 0 });
    expect(qs).toBe("?page=0");
  });
});

describe("Token not persisted to localStorage", () => {
  it("access token is never stored in localStorage", () => {
    const spy = vi.spyOn(window.localStorage, "setItem");
    setAccessToken("secret-access-token");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
