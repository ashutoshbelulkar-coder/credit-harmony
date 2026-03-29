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

  it("GET /api/v1/health returns ok without auth", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { status?: string };
    expect(body.status).toBe("ok");
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

  it("POST /api/v1/institutions appears in list and approvals (institution flow)", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/institutions",
      headers: authHeaders(accessToken),
      payload: {
        name: "Vitest New Member Bank",
        tradingName: "VNMB",
        institutionType: "Commercial Bank",
        institutionLifecycleStatus: "pending",
        registrationNumber: "VT-REG-001",
        jurisdiction: "Kenya",
        licenseNumber: "LIC-VT-1",
        contactEmail: "ops@vnm.test",
        isDataSubmitter: true,
        isSubscriber: false,
      },
    });
    expect(createRes.statusCode).toBe(200);
    const created = createRes.json() as { id: number; institutionLifecycleStatus: string };
    expect(created.id).toBeGreaterThan(0);
    expect(created.institutionLifecycleStatus).toBe("pending");

    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/institutions?page=0&size=200",
      headers: authHeaders(accessToken),
    });
    expect(listRes.statusCode).toBe(200);
    const listBody = listRes.json() as { content: { id: number; name: string }[] };
    const row = listBody.content.find((x) => x.id === created.id);
    expect(row).toBeTruthy();
    expect(row?.name).toBe("Vitest New Member Bank");

    const apprRes = await app.inject({
      method: "GET",
      url: "/api/v1/approvals?type=institution&page=0&size=100",
      headers: authHeaders(accessToken),
    });
    expect(apprRes.statusCode).toBe(200);
    const apprBody = apprRes.json() as { content: { metadata: { institutionId?: string } }[] };
    const ap = apprBody.content.find((x) => x.metadata?.institutionId === String(created.id));
    expect(ap).toBeTruthy();
  });

  it("GET /api/v1/monitoring/enquiries?institutionId=1 returns product fields for usage breakdown", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/monitoring/enquiries?institutionId=1&page=0&size=100",
      headers: authHeaders(accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      content: { productId?: string; productName?: string; alternateDataUsed?: number }[];
    };
    const withProduct = body.content.filter((x) => x.productId);
    expect(withProduct.length).toBeGreaterThan(0);
    expect(withProduct[0].productId).toMatch(/^PRD_/);
    expect(typeof withProduct[0].alternateDataUsed).toBe("number");
  });

  it("GET /api/v1/monitoring/enquiries returns many seeded rows and status=Failed filters", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const all = await app.inject({
      method: "GET",
      url: "/api/v1/monitoring/enquiries?page=0&size=500",
      headers: authHeaders(accessToken),
    });
    expect(all.statusCode).toBe(200);
    const bodyAll = all.json() as { totalElements: number };
    expect(bodyAll.totalElements).toBeGreaterThan(100);
    const failedOnly = await app.inject({
      method: "GET",
      url: "/api/v1/monitoring/enquiries?status=Failed&page=0&size=500",
      headers: authHeaders(accessToken),
    });
    expect(failedOnly.statusCode).toBe(200);
    const fb = failedOnly.json() as { content: { status: string }[]; totalElements: number };
    expect(fb.totalElements).toBeGreaterThan(0);
    expect(fb.content.every((r) => r.status === "Failed")).toBe(true);
  });

  it("GET /api/v1/institutions/:id/monitoring/enquiries matches monitoring/enquiries?institutionId", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const r1 = await app.inject({
      method: "GET",
      url: "/api/v1/monitoring/enquiries?institutionId=1&page=0&size=100",
      headers: authHeaders(accessToken),
    });
    const r2 = await app.inject({
      method: "GET",
      url: "/api/v1/institutions/1/monitoring/enquiries?page=0&size=100",
      headers: authHeaders(accessToken),
    });
    expect(r2.statusCode).toBe(200);
    expect(r1.json()).toEqual(r2.json());
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

  it("POST /api/v1/users/invitations persists Invited user with displayName", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const h = { ...authHeaders(accessToken), "content-type": "application/json" };
    const email = `invite-${Date.now()}@hcb.com`;
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/users/invitations",
      headers: h,
      payload: { email, role: "Viewer", displayName: "Invited Colleague" },
    });
    expect(res.statusCode).toBe(200);
    const created = res.json() as { id: number; displayName: string; userAccountStatus: string; email: string };
    expect(created.displayName).toBe("Invited Colleague");
    expect(created.userAccountStatus).toBe("Invited");
    expect(created.email).toBe(email);
    const list = await app.inject({
      method: "GET",
      url: "/api/v1/users?page=0&size=500",
      headers: authHeaders(accessToken),
    });
    const users = (list.json() as { content: { id: number }[] }).content;
    expect(users.some((u) => u.id === created.id)).toBe(true);
  });

  it("POST /api/v1/users/invitations returns 409 for duplicate email", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const h = { ...authHeaders(accessToken), "content-type": "application/json" };
    const dup = await app.inject({
      method: "POST",
      url: "/api/v1/users/invitations",
      headers: h,
      payload: { email: "admin@hcb.com", role: "Viewer", displayName: "Dup" },
    });
    expect(dup.statusCode).toBe(409);
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

  it("GET /api/v1/audit-logs returns seeded rows and filters by actionType", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const all = await app.inject({
      method: "GET",
      url: "/api/v1/audit-logs?page=0&size=200",
      headers: authHeaders(accessToken),
    });
    expect(all.statusCode).toBe(200);
    const body = all.json() as { totalElements: number; content: { actionType: string; ipAddressHash?: string }[] };
    expect(body.totalElements).toBeGreaterThan(8);
    const loginOnly = await app.inject({
      method: "GET",
      url: "/api/v1/audit-logs?actionType=LOGIN&page=0&size=100",
      headers: authHeaders(accessToken),
    });
    const loginBody = loginOnly.json() as { content: { actionType: string }[] };
    expect(loginBody.content.length).toBeGreaterThan(0);
    expect(loginBody.content.every((r) => r.actionType === "LOGIN")).toBe(true);
  });

  it("GET /api/v1/audit-logs filters by entityType and entityId", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/audit-logs?entityType=USER&entityId=3&page=0&size=10",
      headers: authHeaders(accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { content: unknown[]; totalElements: number };
    expect(Array.isArray(body.content)).toBe(true);
    expect(body.totalElements).toBeGreaterThan(0);
  });

  it("GET /api/v1/audit-logs filters GOVERNANCE and date range", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/audit-logs?entityType=GOVERNANCE&from=2026-03-01&to=2026-03-31&page=0&size=50",
      headers: authHeaders(accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { content: { entityType: string }[]; totalElements: number };
    expect(body.totalElements).toBeGreaterThan(0);
    expect(body.content.every((r) => r.entityType === "GOVERNANCE")).toBe(true);
  });

  it("PATCH /api/v1/institutions/:id appends INSTITUTION_UPDATE audit row", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const h = { ...authHeaders(accessToken), "content-type": "application/json" };
    const before = await app.inject({
      method: "GET",
      url: "/api/v1/audit-logs?actionType=INSTITUTION_UPDATE&page=0&size=500",
      headers: authHeaders(accessToken),
    });
    const n0 = (before.json() as { totalElements: number }).totalElements;
    const patch = await app.inject({
      method: "PATCH",
      url: "/api/v1/institutions/1",
      headers: h,
      payload: { tradingName: `audit-${Date.now()}` },
    });
    expect(patch.statusCode).toBe(200);
    const after = await app.inject({
      method: "GET",
      url: "/api/v1/audit-logs?actionType=INSTITUTION_UPDATE&page=0&size=5",
      headers: authHeaders(accessToken),
    });
    const body = after.json() as { totalElements: number; content: { actionType: string }[] };
    expect(body.totalElements).toBeGreaterThan(n0);
    expect(body.content[0]?.actionType).toBe("INSTITUTION_UPDATE");
  });

  it("POST /api/v1/alert-rules creates pending rule + approval; approve enables; PATCH/DELETE work", async () => {
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
    const created = create.json() as { id: string; status: string };
    expect(created.status).toBe("Pending approval");
    const { id } = created;
    const appr = await app.inject({
      method: "GET",
      url: "/api/v1/approvals?type=alert_rule&page=0&size=50",
      headers: authHeaders(accessToken),
    });
    expect(appr.statusCode).toBe(200);
    const apprBody = appr.json() as { content: { id: string; metadata: { alertRuleId?: string } }[] };
    const ap = apprBody.content.find((x) => x.metadata?.alertRuleId === id);
    expect(ap).toBeTruthy();
    const approveRes = await app.inject({
      method: "POST",
      url: `/api/v1/approvals/${ap!.id}/approve`,
      headers: authHeaders(accessToken),
    });
    expect(approveRes.statusCode).toBe(204);
    const listAfter = await app.inject({
      method: "GET",
      url: "/api/v1/alert-rules",
      headers: authHeaders(accessToken),
    });
    const rules = listAfter.json() as { id: string; status: string }[];
    const row = rules.find((r) => r.id === id);
    expect(row?.status).toBe("Enabled");
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

  it("POST /api/v1/alert-rules rejects empty name", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/alert-rules",
      headers: { ...authHeaders(accessToken), "content-type": "application/json" },
      payload: { name: "   ", domain: "Batch", condition: "x" },
    });
    expect(res.statusCode).toBe(400);
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

  it("POST /api/v1/products with approval_pending persists product and enqueues approval", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/products",
      headers: authHeaders(accessToken),
      payload: {
        name: "Integration Test Product",
        description: "Created by api.integration.test",
        status: "approval_pending",
        packetIds: ["PKT_BCF"],
        packetConfigs: [],
        enquiryConfig: { scope: "SELF", impactType: "LOW", mode: "LIVE" },
      },
    });
    expect(createRes.statusCode).toBe(200);
    const created = createRes.json() as { id: string };
    expect(created.id).toMatch(/^PRD_/);

    const apprRes = await app.inject({
      method: "GET",
      url: "/api/v1/approvals?type=product&page=0&size=100",
      headers: authHeaders(accessToken),
    });
    expect(apprRes.statusCode).toBe(200);
    const page = apprRes.json() as {
      content: { type: string; metadata: { productId?: string } }[];
    };
    const hit = page.content.find((x) => x.metadata?.productId === created.id);
    expect(hit).toBeTruthy();
    expect(hit?.type).toBe("product");

    const detail = await app.inject({
      method: "GET",
      url: `/api/v1/products/${created.id}`,
      headers: authHeaders(accessToken),
    });
    expect(detail.statusCode).toBe(200);
    const prod = detail.json() as { packetIds: string[] };
    expect(prod.packetIds).toEqual(["PKT_BCF"]);
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

  it("POST /api/v1/consortiums with approval_pending enqueues approval and members", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/consortiums",
      headers: authHeaders(accessToken),
      payload: {
        name: "Integration Test Consortium",
        type: "Closed",
        purpose: "Risk sharing",
        governanceModel: "Majority vote",
        description: "Vitest create",
        status: "approval_pending",
        members: [{ institutionId: 1, role: "Contributor" }],
      },
    });
    expect(createRes.statusCode).toBe(200);
    const created = createRes.json() as { id: string; status: string; membersCount: number };
    expect(created.id).toMatch(/^CONS_/);
    expect(created.status).toBe("approval_pending");
    expect(created.membersCount).toBeGreaterThanOrEqual(1);

    const apprRes = await app.inject({
      method: "GET",
      url: "/api/v1/approvals?type=consortium&page=0&size=100",
      headers: authHeaders(accessToken),
    });
    expect(apprRes.statusCode).toBe(200);
    const page = apprRes.json() as {
      content: { type: string; metadata: { consortiumId?: string } }[];
    };
    const hit = page.content.find((x) => x.metadata?.consortiumId === created.id);
    expect(hit).toBeTruthy();
    expect(hit?.type).toBe("consortium");
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
    const body = res.json() as { roleName: string; permissions: Record<string, Record<string, boolean>> }[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    const superAdmin = body.find((r) => r.roleName === "Super Admin");
    expect(superAdmin).toBeDefined();
    expect(superAdmin?.permissions?.dashboard?.View).toBe(true);
  });

  it("POST /api/v1/roles persists section permission matrix", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const permissions = { dashboard: { View: true, Create: false, Edit: false, Delete: false, Export: false } };
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/roles",
      headers: { ...authHeaders(accessToken), "content-type": "application/json" },
      payload: { roleName: "Integration Test Role", description: "tmp", permissions },
    });
    expect(res.statusCode).toBe(200);
    const row = res.json() as { id: string; roleName: string; permissions: Record<string, unknown> };
    expect(row.roleName).toBe("Integration Test Role");
    expect(row.permissions.dashboard).toBeDefined();

    const list = await app.inject({
      method: "GET",
      url: "/api/v1/roles",
      headers: authHeaders(accessToken),
    });
    const roles = list.json() as { id: string; roleName: string }[];
    expect(roles.some((r) => r.roleName === "Integration Test Role")).toBe(true);
  });

  it("POST /api/v1/roles returns 409 for duplicate roleName", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const headers = { ...authHeaders(accessToken), "content-type": "application/json" };
    const payload = { roleName: "Dup Role X", permissions: {} };
    const first = await app.inject({ method: "POST", url: "/api/v1/roles", headers, payload });
    expect(first.statusCode).toBe(200);
    const second = await app.inject({ method: "POST", url: "/api/v1/roles", headers, payload });
    expect(second.statusCode).toBe(409);
  });

  it("PATCH /api/v1/roles/:id updates role", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/roles",
      headers: { ...authHeaders(accessToken), "content-type": "application/json" },
      payload: { roleName: "Patch Me Role", permissions: {} },
    });
    const { id } = created.json() as { id: string };
    const patch = await app.inject({
      method: "PATCH",
      url: `/api/v1/roles/${id}`,
      headers: { ...authHeaders(accessToken), "content-type": "application/json" },
      payload: { roleName: "Patch Me Role Renamed", description: "d2" },
    });
    expect(patch.statusCode).toBe(200);
    expect((patch.json() as { roleName: string }).roleName).toBe("Patch Me Role Renamed");
  });

  it("DELETE /api/v1/roles/:id removes role", async () => {
    const { accessToken } = await loginAsAdmin(app);
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/roles",
      headers: { ...authHeaders(accessToken), "content-type": "application/json" },
      payload: { roleName: "Delete Me Role", permissions: {} },
    });
    const { id } = created.json() as { id: string };
    const del = await app.inject({
      method: "DELETE",
      url: `/api/v1/roles/${id}`,
      headers: authHeaders(accessToken),
    });
    expect(del.statusCode).toBe(204);
    const list = await app.inject({
      method: "GET",
      url: "/api/v1/roles",
      headers: authHeaders(accessToken),
    });
    const roles = list.json() as { id: string }[];
    expect(roles.some((r) => r.id === id)).toBe(false);
  });
});
