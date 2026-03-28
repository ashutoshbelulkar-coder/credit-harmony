import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "./index.js";
import { authHeaders, loginAsAdmin } from "./test-helpers.js";

/**
 * Integration tests share one in-memory server instance. Tests run sequentially
 * within this file; mutations (batch retry, approvals, etc.) affect later tests.
 */
describe.sequential("HCB Fastify API (integration)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const s = await buildServer({ logger: false });
    app = s.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /api/v1/auth/login succeeds for seeded admin", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "admin@hcb.com", password: "Admin@1234" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { accessToken?: string; refreshToken?: string };
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
  });

  it("POST /api/v1/auth/login rejects bad password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "admin@hcb.com", password: "wrong" },
    });
    expect(res.statusCode).toBe(401);
    const body = res.json() as { error?: string };
    expect(body.error).toBeTruthy();
  });

  it("POST /api/v1/auth/refresh returns new tokens", async () => {
    const { refreshToken } = await loginAsAdmin(app);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refresh_token: refreshToken },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { accessToken?: string; refreshToken?: string };
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
  });

  it("GET /api/v1/institutions requires auth", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/institutions" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /api/v1/institutions returns paged content with Bearer token", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/institutions?page=0&size=5",
      headers: authHeaders(accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { content: unknown[]; totalElements: number };
    expect(Array.isArray(body.content)).toBe(true);
    expect(body.content.length).toBeGreaterThan(0);
  });

  it("GET /api/v1/dashboard/metrics returns KPI shape", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard/metrics",
      headers: authHeaders(accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { apiVolume24h?: number; slaHealth?: number };
    expect(typeof body.apiVolume24h).toBe("number");
    expect(typeof body.slaHealth).toBe("number");
  });

  it("GET /api/v1/approvals returns pending items", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/approvals?page=0&size=20&status=pending",
      headers: authHeaders(accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { content: { id: string; status: string }[] };
    expect(body.content.some((x) => x.status === "pending")).toBe(true);
  });

  it("POST /api/v1/approvals/:id/approve returns 204", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/approvals/apq-001/approve",
      headers: authHeaders(accessToken),
    });
    expect(res.statusCode).toBe(204);
  });

  it("GET /api/v1/users returns paged users", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/users?page=0&size=20",
      headers: authHeaders(accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { content: { email: string }[] };
    expect(body.content.length).toBeGreaterThan(0);
    expect(body.content.some((u) => u.email.includes("@"))).toBe(true);
  });

  it("PATCH /api/v1/users/:id updates displayName", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/users/3",
      headers: { ...authHeaders(accessToken), "content-type": "application/json" },
      payload: { displayName: "Viewer User (test)" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { displayName: string };
    expect(body.displayName).toContain("Viewer");
  });

  it("GET /api/v1/audit-logs filters by entityType and entityId", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/audit-logs?entityType=USER&entityId=3&page=0&size=10",
      headers: authHeaders(accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { content: unknown[] };
    expect(Array.isArray(body.content)).toBe(true);
  });

  it("POST /api/v1/alert-rules creates rule; PATCH updates; DELETE removes", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const h = { ...authHeaders(accessToken), "content-type": "application/json" };
    const create = await app.inject({
      method: "POST",
      url: "/api/v1/alert-rules",
      headers: h,
      payload: {
        name: "Vitest Rule",
        domain: "Batch",
        condition: "latency > 500ms",
        severity: "Warning",
        status: "Enabled",
      },
    });
    expect(create.statusCode).toBe(200);
    const { id } = create.json() as { id: string };
    const patch = await app.inject({
      method: "PATCH",
      url: `/api/v1/alert-rules/${id}`,
      headers: h,
      payload: { name: "Vitest Rule Updated" },
    });
    expect(patch.statusCode).toBe(200);
    expect((patch.json() as { name: string }).name).toBe("Vitest Rule Updated");
    const del = await app.inject({
      method: "DELETE",
      url: `/api/v1/alert-rules/${id}`,
      headers: authHeaders(accessToken),
    });
    expect(del.statusCode).toBe(204);
  });

  it("POST /api/v1/reports creates queued report row", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/reports",
      headers: { ...authHeaders(accessToken), "content-type": "application/json" },
      payload: { type: "custom", name: "Vitest Report", dateFrom: "2026-01-01", dateTo: "2026-01-31" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { id: string; status: string };
    expect(body.id).toBeTruthy();
    expect(body.status).toBe("Queued");
  });

  it("GET /api/v1/products returns catalogue page", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/products?page=0&size=10",
      headers: authHeaders(accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { content: { id: string; name: string }[] };
    expect(body.content.length).toBeGreaterThan(0);
  });

  it("POST /api/v1/batch-jobs/:id/retry sets status to Queued", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const batchId = "BATCH-20250919-0002";
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/batch-jobs/${batchId}/retry`,
      headers: authHeaders(accessToken),
    });
    expect(res.statusCode).toBe(204);
    const detail = await app.inject({
      method: "GET",
      url: `/api/v1/batch-jobs/${batchId}`,
      headers: authHeaders(accessToken),
    });
    expect((detail.json() as { status: string }).status).toBe("Queued");
  });

  it("POST /api/v1/batch-jobs/:id/cancel sets status to Cancelled", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const batchId = "BATCH-20250919-0004";
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/batch-jobs/${batchId}/cancel`,
      headers: authHeaders(accessToken),
    });
    expect(res.statusCode).toBe(204);
    const detail = await app.inject({
      method: "GET",
      url: `/api/v1/batch-jobs/${batchId}`,
      headers: authHeaders(accessToken),
    });
    expect((detail.json() as { status: string }).status).toBe("Cancelled");
  });

  it("GET /api/v1/consortiums/CONS_001/members returns institution rows", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/consortiums/CONS_001/members",
      headers: authHeaders(accessToken),
    });
    expect(res.statusCode).toBe(200);
    const rows = res.json() as { institutionName: string; role: string }[];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].institutionName).toBeTruthy();
  });

  it("GET /api/v1/institutions/:id/consortium-memberships returns rows", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/institutions/1/consortium-memberships",
      headers: authHeaders(accessToken),
    });
    expect(res.statusCode).toBe(200);
    const rows = res.json() as { consortiumName: string }[];
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("GET /api/v1/institutions/:id/product-subscriptions returns rows", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/institutions/1/product-subscriptions",
      headers: authHeaders(accessToken),
    });
    expect(res.statusCode).toBe(200);
    const rows = res.json() as { productName: string }[];
    expect(Array.isArray(rows)).toBe(true);
  });

  it("GET /api/v1/roles returns role definitions", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/roles",
      headers: authHeaders(accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { roleName: string }[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });
});
