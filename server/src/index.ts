import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { createInitialState, pushAudit } from "./state.js";
import type { JwtUser } from "./types.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "hcb-dev-secret-change-in-production";
const PORT = Number(process.env.PORT ?? 8091);

declare module "fastify" {
  interface FastifyRequest {
    user?: JwtUser;
  }
}

function err(reply: any, code: number, error: string, message: string) {
  return reply.code(code).send({ error, message });
}

function signAccess(user: JwtUser) {
  return jwt.sign({ sub: user.id, email: user.email, roles: user.roles }, JWT_SECRET, { expiresIn: "15m" });
}

function toPublicUser(u: any) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    roles: u.roles,
    institutionId: u.institutionId ?? null,
    institutionName: u.institutionName ?? null,
  };
}

function authPreHandler(req: any, reply: any) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return err(reply, 401, "ERR_UNAUTHORIZED", "Authentication required");
  try {
    const p = jwt.verify(h.slice(7), JWT_SECRET) as JwtUser & { sub: number };
    req.user = { id: p.sub, email: p.email, roles: p.roles };
  } catch {
    return err(reply, 401, "ERR_UNAUTHORIZED", "Invalid or expired token");
  }
}

function pageSlice<T>(arr: T[], page = 0, size = 20) {
  const p = Math.max(0, Number(page) || 0);
  const s = Math.min(200, Math.max(1, Number(size) || 20));
  const slice = arr.slice(p * s, (p + 1) * s);
  return {
    content: slice,
    totalElements: arr.length,
    totalPages: Math.max(1, Math.ceil(arr.length / s)),
    page: p,
    size: s,
  };
}

function normaliseApiRequest(m: any) {
  return {
    requestId: m.request_id,
    apiKey: m.api_key,
    endpoint: m.endpoint,
    status: m.status,
    responseTimeMs: m.response_time_ms,
    records: m.records,
    errorCode: m.error_code,
    timestamp: m.timestamp,
  };
}

function normaliseEnquiry(m: any) {
  return {
    enquiryId: m.id ?? m.enquiry_id,
    institution: m.institution ?? "",
    status: m.status ?? "Success",
    responseTimeMs: m.response_time_ms ?? 0,
    enquiryType: m.enquiry_type ?? "Standard",
    timestamp: m.timestamp ?? "",
    consumerId: m.consumer_id,
  };
}

function normaliseBatch(m: any) {
  return {
    batchId: m.batch_id,
    fileName: m.file_name,
    status: m.status,
    totalRecords: m.total_records,
    successRecords: m.success,
    failedRecords: m.failed,
    successRate: m.success_rate,
    durationSeconds: m.duration_seconds,
    uploadedAt: m.uploaded,
    uploadedBy: m.uploaded_by,
    institutionId: m.institution_id,
  };
}

function institutionNameById(state: ReturnType<typeof createInitialState>, id: string | number): string {
  const sid = String(id);
  const inst = state.institutions.find((i: { id: number }) => String(i.id) === sid);
  return inst?.name ?? `Member ${sid}`;
}

function buildDashboardCommandCenter(state: ReturnType<typeof createInitialState>) {
  const seed = state.dashboardSeed ?? {};
  const institutions = (seed.institutions ?? []) as string[];

  const agents = ((seed.pipelineAgentDefinitions ?? []) as any[]).map((def: any, i: number) => ({
    id: def.id,
    name: def.name,
    type: def.type ?? "orchestrator",
    status: i === 0 ? "active" : "idle",
    task: def.task ?? "",
    latencyMs: 48 + i * 15,
    accuracyPct: 98.1 - i * 0.4,
  }));

  const batches = (state.batchJobs ?? []).slice(0, 12).map((job: any) => {
    const st = String(job.status ?? "Queued");
    const status =
      st === "Completed" ? "completed" : st === "Processing" ? "processing" : st === "Failed" ? "error" : "queued";
    const fn = String(job.file_name ?? "batch.csv");
    const format = fn.toLowerCase().endsWith(".json") ? "JSON" : fn.toLowerCase().endsWith(".csv") ? "CSV" : "TUDF";
    let progress = 0;
    if (st === "Completed") progress = 100;
    else if (Number(job.total_records) > 0)
      progress = Math.min(100, Math.round((Number(job.success) / Number(job.total_records)) * 100));
    const quality =
      st === "Queued" && Number(job.total_records) <= 0 ? null : Number(Number(job.success_rate).toFixed(1));
    const priority = st === "Failed" ? "critical" : st === "Queued" ? "low" : "normal";
    return {
      id: String(job.batch_id),
      member: institutionNameById(state, job.institution_id),
      format,
      records: Number(job.total_records ?? 0),
      progress,
      quality,
      status,
      time: String(job.uploaded ?? ""),
      priority,
    };
  });

  const anomalies = ((seed.anomalies ?? []) as any[]).map((a: any) => {
    const desc =
      a.description ??
      (typeof a.descriptionTemplate === "string"
        ? a.descriptionTemplate.replace(
            "{institution}",
            institutions[a.institutionIndex ?? 0] ?? "Member institution"
          )
        : "");
    return {
      id: String(a.id),
      severity: "warning",
      title: String(a.title ?? ""),
      description: desc,
      time: String(a.time ?? ""),
      detectedBy: String(a.detectedBy ?? "Alert Engine"),
      ctaLabel: String(a.ctaLabel ?? "Review"),
      href: String(a.href ?? "/monitoring/alert-engine"),
    };
  });

  const memberQuality = (state.institutions ?? []).slice(0, 8).map((inst: any) => ({
    member: String(inst.name ?? ""),
    period: "30d",
    qualityScore: Number(inst.dataQualityScore ?? inst.matchAccuracyScore ?? 92),
    recordCount: 8000 + Number(inst.id ?? 0) * 400,
    anomalyFlag: Number(inst.slaHealthPercent ?? 100) < 97,
  }));

  return {
    pendingApprovals: state.approvals.filter((a: any) => a.status === "pending").length,
    activeAlerts: state.alertIncidents.filter((a: any) => a.status === "Active").length,
    pendingOnboarding: state.institutions.filter((i: any) => i.institutionLifecycleStatus === "pending").length,
    activeInstitutions: state.institutions.filter((i: any) => i.institutionLifecycleStatus === "active").length,
    recentErrors1h: 3,
    agents,
    batches,
    anomalies,
    memberQuality,
  };
}

async function main() {
  const state = createInitialState();
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  // ─── Auth (anonymous) ─────────────────────────────────────────────────────
  app.post("/api/v1/auth/login", async (req, reply) => {
    const body = req.body as { email?: string; password?: string };
    if (!body?.email || !body?.password) return err(reply, 400, "ERR_VALIDATION", "Email and password required");
    const u = state.users.find((x) => x.email.toLowerCase() === body.email!.toLowerCase());
    if (!u || !bcrypt.compareSync(body.password!, u.passwordHash)) {
      return err(reply, 401, "ERR_AUTH_FAILED", "Invalid email or password");
    }
    if (u.userAccountStatus !== "Active") return err(reply, 403, "ERR_ACCOUNT_SUSPENDED", "Account not active");
    const user = toPublicUser(u);
    const accessToken = signAccess({ id: user.id, email: user.email, roles: user.roles });
    const refreshToken = randomUUID();
    state.refreshTokens.set(refreshToken, { userId: u.id, expiresAt: Date.now() + 7 * 24 * 3600 * 1000 });
    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user,
    };
  });

  app.post("/api/v1/auth/refresh", async (req, reply) => {
    const body = req.body as { refresh_token?: string };
    const rt = body?.refresh_token;
    if (!rt) return err(reply, 401, "ERR_NO_REFRESH_TOKEN", "Refresh token required");
    const rec = state.refreshTokens.get(rt);
    if (!rec || rec.expiresAt < Date.now()) {
      state.refreshTokens.delete(rt);
      return err(reply, 401, "ERR_REFRESH_FAILED", "Invalid refresh token");
    }
    const u = state.users.find((x) => x.id === rec.userId);
    if (!u) return err(reply, 401, "ERR_REFRESH_FAILED", "User not found");
    state.refreshTokens.delete(rt);
    const user = toPublicUser(u);
    const accessToken = signAccess({ id: user.id, email: user.email, roles: user.roles });
    const refreshToken = randomUUID();
    state.refreshTokens.set(refreshToken, { userId: u.id, expiresAt: Date.now() + 7 * 24 * 3600 * 1000 });
    return { accessToken, refreshToken, expiresIn: 900, user };
  });

  app.post("/api/v1/auth/logout", { preHandler: authPreHandler }, async (req, reply) => {
    const body = req.body as { refresh_token?: string };
    if (body?.refresh_token) state.refreshTokens.delete(body.refresh_token);
    return reply.code(204).send();
  });

  // ─── Institutions ─────────────────────────────────────────────────────────
  app.get("/api/v1/institutions", { preHandler: authPreHandler }, async (req) => {
    const q = req.query as Record<string, string | undefined>;
    let list = state.institutions.filter((i) => !i.isDeleted);
    if (q.search) {
      const s = q.search.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(s));
    }
    if (q.status && q.status !== "all") list = list.filter((i) => i.institutionLifecycleStatus === q.status);
    if (q.role === "dataSubmitter") list = list.filter((i) => i.isDataSubmitter);
    if (q.role === "subscriber") list = list.filter((i) => i.isSubscriber);
    return pageSlice(list, Number(q.page), Number(q.size));
  });

  app.get("/api/v1/institutions/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const inst = state.institutions.find((i) => i.id === id && !i.isDeleted);
    if (!inst) return err(reply, 404, "ERR_NOT_FOUND", "Institution not found");
    return inst;
  });

  app.get("/api/v1/institutions/:id/overview-charts", { preHandler: authPreHandler }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const inst = state.institutions.find((i) => i.id === id && !i.isDeleted);
    if (!inst) return err(reply, 404, "ERR_NOT_FOUND", "Institution not found");
    const raw = state.institutionOverviewCharts;
    return {
      submissionVolumeData: raw.submissionVolumeData ?? [],
      successVsRejectedData: raw.successVsRejectedData ?? [],
      rejectionReasonsData: raw.rejectionReasonsData ?? [],
      processingTimeData: raw.processingTimeData ?? [],
      enquiryVolumeData: raw.enquiryVolumeData ?? [],
      successVsFailedData: raw.successVsFailedData ?? [],
      responseTimeData: raw.responseTimeData ?? [],
    };
  });

  app.post("/api/v1/institutions/:id/documents", { preHandler: authPreHandler }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const inst = state.institutions.find((i) => i.id === id && !i.isDeleted);
    if (!inst) return err(reply, 404, "ERR_NOT_FOUND", "Institution not found");

    let documentName = "Document";
    let sawFile = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const part of (req as any).parts()) {
      if (part.type === "file") {
        await part.toBuffer();
        sawFile = true;
      } else if (part.fieldname === "documentName") {
        documentName = String(part.value ?? "Document");
      }
    }
    if (!sawFile) return err(reply, 400, "ERR_VALIDATION", "File is required");

    if (!inst.complianceDocs) inst.complianceDocs = [];
    inst.complianceDocs.push({ name: documentName, status: "pending" });
    inst.updatedAt = new Date().toISOString().slice(0, 10);
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "INSTITUTION_DOCUMENT_UPLOAD",
      entityType: "INSTITUTION",
      entityId: String(id),
      description: `Uploaded compliance document: ${documentName}`,
    });
    return { complianceDocs: inst.complianceDocs };
  });

  app.post("/api/v1/institutions", { preHandler: authPreHandler }, async (req) => {
    const b = req.body as Record<string, unknown>;
    const id = state.institutionNextId++;
    const now = new Date().toISOString().slice(0, 10);
    const row = {
      id,
      name: String(b.name ?? ""),
      tradingName: String(b.tradingName ?? b.name ?? ""),
      institutionType: String(b.institutionType ?? "Unknown"),
      institutionLifecycleStatus: String(b.institutionLifecycleStatus ?? "pending"),
      registrationNumber: String(b.registrationNumber ?? ""),
      jurisdiction: String(b.jurisdiction ?? ""),
      licenseType: String(b.licenseType ?? ""),
      licenseNumber: String(b.licenseNumber ?? ""),
      contactEmail: b.contactEmail ? String(b.contactEmail) : undefined,
      contactPhone: b.contactPhone ? String(b.contactPhone) : undefined,
      onboardedAt: undefined,
      isDataSubmitter: !!b.isDataSubmitter,
      isSubscriber: !!b.isSubscriber,
      billingModel: b.billingModel as string | undefined,
      creditBalance: (b.creditBalance as number) ?? undefined,
      dataQualityScore: 0,
      matchAccuracyScore: 0,
      slaHealthPercent: 0,
      apisEnabledCount: 0,
      createdAt: now,
      updatedAt: now,
      complianceDocs: [] as { name: string; status: string }[],
      isDeleted: false,
    };
    state.institutions.push(row);
    const apId = `ap-inst-${id}-${randomUUID().slice(0, 8)}`;
    state.approvals.unshift({
      id: apId,
      type: "institution",
      name: row.name,
      description: `New institution registration: ${row.tradingName}`,
      submittedBy: req.user!.email,
      submittedAt: new Date().toISOString(),
      status: "pending",
      metadata: { institutionId: String(id) },
    });
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "INSTITUTION_CREATE",
      entityType: "INSTITUTION",
      entityId: String(id),
      description: `Created institution ${row.name}`,
    });
    return row;
  });

  app.patch("/api/v1/institutions/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const inst = state.institutions.find((i) => i.id === id && !i.isDeleted);
    if (!inst) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    Object.assign(inst, req.body, { updatedAt: new Date().toISOString().slice(0, 10) });
    return inst;
  });

  app.post("/api/v1/institutions/:id/suspend", { preHandler: authPreHandler }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const inst = state.institutions.find((i) => i.id === id && !i.isDeleted);
    if (!inst) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    inst.institutionLifecycleStatus = "suspended";
    pushAudit(state, { userEmail: req.user!.email, actionType: "INSTITUTION_SUSPEND", entityType: "INSTITUTION", entityId: String(id), description: "Suspended" });
    return reply.code(204).send();
  });

  app.post("/api/v1/institutions/:id/reactivate", { preHandler: authPreHandler }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const inst = state.institutions.find((i) => i.id === id && !i.isDeleted);
    if (!inst) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    inst.institutionLifecycleStatus = "active";
    return reply.code(204).send();
  });

  app.delete("/api/v1/institutions/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const inst = state.institutions.find((i) => i.id === id && !i.isDeleted);
    if (!inst) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    inst.isDeleted = true;
    return reply.code(204).send();
  });

  app.get("/api/v1/institutions/:id/consortium-memberships", { preHandler: authPreHandler }, async (req) => {
    const id = Number((req.params as { id: string }).id);
    return state.consortiums.slice(0, 2).map((c: any, i: number) => ({
      membershipId: i + 1,
      consortiumId: i + 1,
      consortiumName: c.name,
      consortiumType: c.type,
      consortiumStatus: c.status,
      memberRole: "member",
      consortiumMemberStatus: "active",
      joinedAt: "2026-01-01T00:00:00.000Z",
    }));
  });

  app.get("/api/v1/institutions/:id/product-subscriptions", { preHandler: authPreHandler }, async () => {
    return state.products.slice(0, 2).map((p: any, i: number) => ({
      subscriptionId: i + 1,
      productId: i + 1,
      productName: p.name,
      productStatus: p.status ?? "active",
      pricingModel: p.pricingModel ?? "per_hit",
      subscribedAt: "2026-01-15T00:00:00.000Z",
      subscriptionStatus: "active",
    }));
  });

  app.get("/api/v1/institutions/:id/billing-summary", { preHandler: authPreHandler }, async (req) => {
    const id = Number((req.params as { id: string }).id);
    const inst = state.institutions.find((i) => i.id === id);
    return {
      billingModel: inst?.billingModel ?? "postpaid",
      creditBalance: inst?.creditBalance ?? 0,
      activeSubscriptions: 2,
      apiCalls30d: 1200,
    };
  });

  app.get("/api/v1/institutions/:id/monitoring-summary", { preHandler: authPreHandler }, async () => ({
    totalRequests: 500,
    successfulRequests: 490,
    avgLatencyMs: 180,
    successRatePct: 98,
    totalBatches: 12,
    activeBatches: 1,
    totalRecords: 45000,
  }));

  // ─── API keys ─────────────────────────────────────────────────────────────
  app.get("/api/v1/api-keys", { preHandler: authPreHandler }, async (req) => {
    const q = req.query as { institutionId?: string };
    let list = state.apiKeys;
    if (q.institutionId) list = list.filter((k) => String(k.institutionId) === q.institutionId);
    return list;
  });

  app.post("/api/v1/api-keys/:id/regenerate", { preHandler: authPreHandler }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const k = state.apiKeys.find((x) => x.id === id);
    if (!k) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    k.keyPrefix = `hcb_${k.institutionId}_${randomUUID().slice(0, 4)}_`;
    k.lastUsedAt = new Date().toISOString();
    return k;
  });

  app.post("/api/v1/api-keys/:id/revoke", { preHandler: authPreHandler }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const k = state.apiKeys.find((x) => x.id === id);
    if (!k) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    k.status = "Revoked";
    return reply.code(204).send();
  });

  // ─── Approvals ────────────────────────────────────────────────────────────
  app.get("/api/v1/approvals", { preHandler: authPreHandler }, async (req) => {
    const q = req.query as Record<string, string | undefined>;
    let list = [...state.approvals];
    if (q.type && q.type !== "all") list = list.filter((a) => a.type === q.type);
    if (q.status && q.status !== "all") list = list.filter((a) => a.status === q.status);
    const mapped = list.map((a) => ({
      id: a.id,
      type: a.type,
      name: a.name,
      description: a.description,
      submittedBy: a.submittedBy,
      submittedAt: a.submittedAt,
      status: a.status,
      reviewedBy: a.reviewedBy,
      reviewedAt: a.reviewedAt,
      rejectionReason: a.rejectionReason,
      metadata: a.metadata ?? {},
    }));
    return pageSlice(mapped, Number(q.page), Number(q.size));
  });

  function findApproval(id: string) {
    return state.approvals.find((a) => a.id === id);
  }

  app.post("/api/v1/approvals/:id/approve", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const a = findApproval(id);
    if (!a) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    a.status = "approved";
    a.reviewedBy = req.user!.email;
    a.reviewedAt = new Date().toISOString();
    const instId = a.metadata?.institutionId;
    if (a.type === "institution" && instId) {
      const inst = state.institutions.find((i) => String(i.id) === instId);
      if (inst) inst.institutionLifecycleStatus = "active";
    }
    return reply.code(204).send();
  });

  app.post("/api/v1/approvals/:id/reject", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const a = findApproval(id);
    if (!a) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    a.status = "rejected";
    a.reviewedBy = req.user!.email;
    a.reviewedAt = new Date().toISOString();
    a.rejectionReason = (req.body as { reason?: string })?.reason;
    return reply.code(204).send();
  });

  app.post("/api/v1/approvals/:id/request-changes", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const a = findApproval(id);
    if (!a) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    a.status = "changes_requested";
    a.reviewedBy = req.user!.email;
    a.reviewedAt = new Date().toISOString();
    return reply.code(204).send();
  });

  // ─── Users ────────────────────────────────────────────────────────────────
  app.get("/api/v1/users", { preHandler: authPreHandler }, async (req) => {
    const q = req.query as Record<string, string | undefined>;
    let list = state.users.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      givenName: u.givenName,
      familyName: u.familyName,
      userAccountStatus: u.userAccountStatus,
      mfaEnabled: u.mfaEnabled,
      institutionId: u.institutionId,
      institutionName: u.institutionName,
      roles: u.roles,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    }));
    if (q.institutionId) list = list.filter((u) => String(u.institutionId ?? "") === q.institutionId);
    return pageSlice(list, Number(q.page), Number(q.size));
  });

  app.post("/api/v1/users/invitations", { preHandler: authPreHandler }, async (req) => {
    const b = req.body as { email?: string; role?: string; institutionId?: number };
    const id = state.userNextId++;
    const row = {
      id,
      email: b.email!,
      passwordHash: bcrypt.hashSync(randomUUID(), 10),
      displayName: b.email!.split("@")[0],
      givenName: "",
      familyName: "",
      userAccountStatus: "Invited",
      mfaEnabled: false,
      institutionId: b.institutionId,
      institutionName: undefined,
      roles: [b.role ?? "Viewer"],
      createdAt: new Date().toISOString(),
      lastLoginAt: undefined,
    };
    state.users.push(row);
    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      userAccountStatus: row.userAccountStatus,
      mfaEnabled: row.mfaEnabled,
      institutionId: row.institutionId,
      institutionName: row.institutionName,
      roles: row.roles,
      createdAt: row.createdAt,
      lastLoginAt: row.lastLoginAt,
    };
  });

  app.post("/api/v1/users/:id/suspend", { preHandler: authPreHandler }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const u = state.users.find((x) => x.id === id);
    if (!u) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    u.userAccountStatus = "Suspended";
    return reply.code(204).send();
  });

  app.post("/api/v1/users/:id/activate", { preHandler: authPreHandler }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const u = state.users.find((x) => x.id === id);
    if (!u) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    u.userAccountStatus = "Active";
    return reply.code(204).send();
  });

  // ─── Roles ─────────────────────────────────────────────────────────────────
  app.get("/api/v1/roles", { preHandler: authPreHandler }, async () => state.roles);

  app.post("/api/v1/roles", { preHandler: authPreHandler }, async (req) => {
    const b = req.body as { roleName: string; description?: string; permissions?: object };
    const id = String(state.roleNextId++);
    const row = { id, roleName: b.roleName, description: b.description, permissions: b.permissions ?? {}, createdAt: new Date().toISOString() };
    state.roles.push(row);
    return row;
  });

  app.patch("/api/v1/roles/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const r = state.roles.find((x) => x.id === id);
    if (!r) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    Object.assign(r, req.body);
    return r;
  });

  app.delete("/api/v1/roles/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const i = state.roles.findIndex((x) => x.id === id);
    if (i === -1) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    state.roles.splice(i, 1);
    return reply.code(204).send();
  });

  // ─── Audit logs ──────────────────────────────────────────────────────────
  app.get("/api/v1/audit-logs", { preHandler: authPreHandler }, async (req) => {
    const q = req.query as Record<string, string | undefined>;
    let list = state.auditLog.map((a) => ({
      id: a.id,
      userEmail: a.userEmail,
      actionType: a.actionType,
      entityType: a.entityType,
      entityId: a.entityId,
      description: a.description,
      auditOutcome: a.auditOutcome ?? "SUCCESS",
      occurredAt: a.occurredAt,
    }));
    if (q.entityType) list = list.filter((a) => a.entityType === q.entityType);
    if (q.entityId) list = list.filter((a) => a.entityId === q.entityId);
    return pageSlice(list, Number(q.page), Number(q.size));
  });

  // ─── Monitoring ────────────────────────────────────────────────────────────
  app.get("/api/v1/monitoring/api-requests", { preHandler: authPreHandler }, async (req) => {
    const q = req.query as Record<string, string | undefined>;
    let raw = [...state.apiRequests];
    if (q.status) raw = raw.filter((r) => r.status === q.status);
    if (q.institutionId) {
      raw = raw.filter((r) => {
        const key = r.api_key as string;
        const sub = (state.dataSubmitterIdByApiKey[key] ?? "").replace(/\D/g, "");
        return sub === String(q.institutionId).replace(/\D/g, "");
      });
    }
    const norm = raw.map(normaliseApiRequest);
    return pageSlice(norm, Number(q.page), Number(q.size));
  });

  app.get("/api/v1/monitoring/kpis", { preHandler: authPreHandler }, async () => state.monitoringKpis);

  app.get("/api/v1/monitoring/enquiries", { preHandler: authPreHandler }, async (req) => {
    const q = req.query as Record<string, string | undefined>;
    let raw = [...state.enquiries];
    if (q.institutionId) {
      const inst = state.institutions.find((i) => String(i.id) === q.institutionId);
      if (inst) raw = raw.filter((e) => e.institution === inst.name);
    }
    const norm = raw.map(normaliseEnquiry);
    return pageSlice(norm, Number(q.page), Number(q.size));
  });

  app.get("/api/v1/monitoring/charts", { preHandler: authPreHandler }, async () => state.monitoringCharts);

  // ─── Batch jobs ───────────────────────────────────────────────────────────
  app.get("/api/v1/batch-jobs", { preHandler: authPreHandler }, async (req) => {
    const q = req.query as Record<string, string | undefined>;
    let raw = [...state.batchJobs];
    if (q.institutionId) raw = raw.filter((b) => String(b.institution_id) === String(q.institutionId));
    const norm = raw.map(normaliseBatch);
    return pageSlice(norm, Number(q.page), Number(q.size));
  });

  app.get("/api/v1/batch-jobs/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const m = state.batchJobs.find((b) => b.batch_id === id);
    if (!m) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    return normaliseBatch(m);
  });

  app.get("/api/v1/batch-jobs/:id/detail", { preHandler: authPreHandler }, async (req) => {
    const id = (req.params as { id: string }).id;
    return state.batchDetails[id] ?? { batchId: id, stages: [] };
  });

  app.get("/api/v1/batch-jobs/kpis", { preHandler: authPreHandler }, async () => state.batchKpis);

  app.post("/api/v1/batch-jobs/:id/retry", { preHandler: authPreHandler }, async (req, reply) => reply.code(204).send());
  app.post("/api/v1/batch-jobs/:id/cancel", { preHandler: authPreHandler }, async (req, reply) => reply.code(204).send());

  // ─── Alerts / SLA ─────────────────────────────────────────────────────────
  app.get("/api/v1/alert-rules", { preHandler: authPreHandler }, async () =>
    state.alertRules.map((r: any) => ({
      id: r.id,
      name: r.name,
      domain: r.domain,
      condition: r.condition,
      severity: r.severity,
      status: r.status === "Disabled" ? "Disabled" : "Enabled",
      lastTriggered: r.lastTriggered,
    }))
  );

  app.post("/api/v1/alert-rules", { preHandler: authPreHandler }, async (req) => {
    const b = req.body as Record<string, unknown>;
    const id = `rule-${randomUUID().slice(0, 8)}`;
    const row = { id, ...b, status: b.status ?? "Enabled" };
    state.alertRules.push(row);
    return row;
  });

  app.patch("/api/v1/alert-rules/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const r = state.alertRules.find((x: any) => x.id === id);
    if (!r) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    Object.assign(r, req.body);
    return r;
  });

  app.delete("/api/v1/alert-rules/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const i = state.alertRules.findIndex((x: any) => x.id === id);
    if (i === -1) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    state.alertRules.splice(i, 1);
    return reply.code(204).send();
  });

  app.post("/api/v1/alert-rules/:id/activate", { preHandler: authPreHandler }, async (req, reply) => {
    const r = state.alertRules.find((x: any) => x.id === (req.params as { id: string }).id);
    if (!r) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    r.status = "Enabled";
    return reply.code(204).send();
  });

  app.post("/api/v1/alert-rules/:id/deactivate", { preHandler: authPreHandler }, async (req, reply) => {
    const r = state.alertRules.find((x: any) => x.id === (req.params as { id: string }).id);
    if (!r) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    r.status = "Disabled";
    return reply.code(204).send();
  });

  app.get("/api/v1/alert-incidents", { preHandler: authPreHandler }, async (req) => {
    const q = req.query as Record<string, string | undefined>;
    let list = state.alertIncidents.map((a: any) => ({
      alertId: a.alert_id,
      domain: a.domain,
      metric: a.metric,
      currentValue: a.current_value,
      threshold: a.threshold,
      severity: a.severity,
      triggeredAt: a.triggered_at,
      status: a.status,
    }));
    if (q.status) list = list.filter((a) => a.status === q.status);
    return pageSlice(list, Number(q.page), Number(q.size));
  });

  app.get("/api/v1/alert-incidents/charts", { preHandler: authPreHandler }, async () => state.alertCharts);

  app.get("/api/v1/alert-incidents/breach-history", { preHandler: authPreHandler }, async () =>
    (state.slaBreachHistory as any[]).map((b, i) => ({
      id: String(i + 1),
      slaType: b.slaType ?? b.domain ?? "API",
      metric: b.metric ?? "",
      threshold: b.threshold ?? "",
      breachValue: b.breachValue ?? b.actual ?? "",
      duration: b.duration ?? "",
      detectedAt: b.detectedAt ?? b.detected_at ?? "",
      resolvedAt: b.resolvedAt ?? null,
      status: b.status ?? "Resolved",
      severity: b.severity ?? "Warning",
      institutionId: b.institutionId,
    }))
  );

  app.post("/api/v1/alert-incidents/:id/acknowledge", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const a = state.alertIncidents.find((x: any) => x.alert_id === id);
    if (!a) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    a.status = "Acknowledged";
    return reply.code(204).send();
  });

  app.post("/api/v1/alert-incidents/:id/resolve", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const a = state.alertIncidents.find((x: any) => x.alert_id === id);
    if (!a) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    a.status = "Resolved";
    return reply.code(204).send();
  });

  app.get("/api/v1/sla-configs", { preHandler: authPreHandler }, async () => state.slaConfigs);

  app.patch("/api/v1/sla-configs/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const c = state.slaConfigs.find((x: any) => x.id === id);
    if (!c) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    Object.assign(c, req.body);
    return c;
  });

  // ─── Reports ────────────────────────────────────────────────────────────────
  app.get("/api/v1/reports", { preHandler: authPreHandler }, async (req) => {
    const q = req.query as Record<string, string | undefined>;
    let list = [...state.reports];
    if (q.status) list = list.filter((r) => r.status === q.status);
    if (q.type) list = list.filter((r) => r.type === q.type);
    return pageSlice(list, Number(q.page), Number(q.size));
  });

  app.post("/api/v1/reports", { preHandler: authPreHandler }, async (req) => {
    const b = req.body as { type?: string; name?: string; dateFrom?: string; dateTo?: string };
    const id = `HCB-REP-${Date.now()}`;
    const row = {
      id,
      type: b.type ?? "custom",
      name: b.name ?? "Report",
      status: "Queued",
      dateFrom: b.dateFrom ?? "",
      dateTo: b.dateTo ?? "",
      requestedBy: req.user!.email,
      requestedAt: new Date().toISOString(),
    };
    state.reports.unshift(row);
    setTimeout(() => {
      row.status = "Completed";
      row.completedAt = new Date().toISOString();
      row.fileUrl = "https://example.com/out.pdf";
    }, 2000);
    return row;
  });

  app.delete("/api/v1/reports/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const i = state.reports.findIndex((r) => r.id === id);
    if (i === -1) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    state.reports.splice(i, 1);
    return reply.code(204).send();
  });

  app.post("/api/v1/reports/:id/cancel", { preHandler: authPreHandler }, async (req, reply) => {
    const r = state.reports.find((x) => x.id === (req.params as { id: string }).id);
    if (!r) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    r.status = "Failed";
    return reply.code(204).send();
  });

  app.post("/api/v1/reports/:id/retry", { preHandler: authPreHandler }, async (req, reply) => {
    const r = state.reports.find((x) => x.id === (req.params as { id: string }).id);
    if (!r) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    r.status = "Queued";
    return reply.code(204).send();
  });

  // ─── Dashboard ────────────────────────────────────────────────────────────
  app.get("/api/v1/dashboard/metrics", { preHandler: authPreHandler }, async () => {
    const extra = state.dashboardChartsExtra as Record<string, unknown>;
    const trend = (extra.apiUsageTrend as { volume?: number }[]) ?? [];
    const summed = trend.reduce((s, p) => s + Number(p.volume ?? 0), 0);
    const mk = state.monitoringKpis as { successRatePercent?: number; rejectionRatePercent?: number } | undefined;
    const errorRate = mk?.rejectionRatePercent ?? 1.2;
    const slaHealth = mk?.successRatePercent ?? 99.2;
    return {
      apiVolume24h: summed > 0 ? summed : 284920,
      apiVolumeChange: "+2.3%",
      errorRate,
      errorRateChange: "-0.1%",
      slaHealth,
      slaHealthChange: "+0.2%",
      dataQualityScore: 97.4,
      dataQualityChange: "+0.3%",
    };
  });

  app.get("/api/v1/dashboard/charts", { preHandler: authPreHandler }, async () => {
    const extra = state.dashboardChartsExtra as Record<string, unknown>;
    const errPct = Number((state.monitoringKpis as { rejectionRatePercent?: number })?.rejectionRatePercent ?? 1.2);
    const rawTrend = (extra.apiUsageTrend as { day?: string; volume?: number; errors?: number }[]) ?? [];
    const apiUsageTrend = rawTrend.map((p) => ({
      day: String(p.day ?? ""),
      volume: Number(p.volume ?? 0),
      errors: typeof p.errors === "number" ? p.errors : errPct,
    }));
    return {
      successFailure: { success: 98.2, failure: 1.8 },
      apiUsageTrend,
      mappingAccuracy: (extra.mappingAccuracy as unknown[]) ?? [],
      matchConfidence: (extra.matchConfidence as unknown[]) ?? [],
      slaLatency: (extra.slaLatency as unknown[]) ?? [],
      rejectionOverride: (extra.rejectionOverride as unknown[]) ?? [],
      topInstitutions: (state.institutions.slice(0, 5) as any[]).map((i) => ({
        name: i.name,
        enquiryCount: 1000 + i.id * 100,
        quality: i.dataQualityScore ?? 90,
        sla: (i.slaHealthPercent ?? 99) / 100,
      })),
    };
  });

  app.get("/api/v1/dashboard/activity", { preHandler: authPreHandler }, async () => state.dashboardActivity);

  app.get("/api/v1/dashboard/command-center", { preHandler: authPreHandler }, async () => buildDashboardCommandCenter(state));

  // ─── Consortiums ─────────────────────────────────────────────────────────
  app.get("/api/v1/consortiums", { preHandler: authPreHandler }, async (req) => {
    const q = req.query as Record<string, string | undefined>;
    let list = state.consortiums.map((c: any) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      status: c.status,
      membersCount: c.membersCount,
      dataVolume: c.dataVolume,
      description: c.description,
      purpose: c.purpose,
      governanceModel: c.governanceModel,
      createdAt: c.createdAt ?? "2026-01-01",
    }));
    if (q.search) {
      const s = q.search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(s));
    }
    return pageSlice(list, Number(q.page), Number(q.size));
  });

  app.get("/api/v1/consortiums/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const c = state.consortiums.find((x: any) => x.id === id);
    if (!c) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      status: c.status,
      membersCount: c.membersCount,
      dataVolume: c.dataVolume,
      description: c.description,
      purpose: c.purpose,
      governanceModel: c.governanceModel,
      createdAt: "2026-01-01",
    };
  });

  app.get("/api/v1/consortiums/:id/members", { preHandler: authPreHandler }, async () => [
    { id: "m1", institutionId: "1", institutionName: "First National Bank", role: "lead", joinedAt: "2026-01-01" },
  ]);

  app.post("/api/v1/consortiums", { preHandler: authPreHandler }, async (req) => {
    const b = req.body as Record<string, unknown>;
    const id = `CONS_${String(state.consortiumNextId++).padStart(3, "0")}`;
    const row = { id, ...b, membersCount: 0, status: "active" };
    state.consortiums.push(row);
    return row;
  });

  app.patch("/api/v1/consortiums/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const c = state.consortiums.find((x: any) => x.id === id);
    if (!c) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    Object.assign(c, req.body);
    return c;
  });

  app.delete("/api/v1/consortiums/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const i = state.consortiums.findIndex((x: any) => x.id === id);
    if (i === -1) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    state.consortiums.splice(i, 1);
    return reply.code(204).send();
  });

  // ─── Products ──────────────────────────────────────────────────────────────
  app.get("/api/v1/products", { preHandler: authPreHandler }, async (req) => {
    const q = req.query as Record<string, string | undefined>;
    let list = state.products.map((p: any) => ({
      id: p.id,
      name: p.name,
      type: p.category ?? "product",
      status: p.status ?? "active",
      description: p.description,
      price: p.price,
      currency: "KES",
      lastUpdated: p.lastUpdated,
    }));
    if (q.search) {
      const s = q.search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(s));
    }
    return pageSlice(list, Number(q.page), Number(q.size));
  });

  app.get("/api/v1/products/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const p = state.products.find((x: any) => x.id === id);
    if (!p) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    return {
      id: p.id,
      name: p.name,
      type: p.category ?? "product",
      status: p.status,
      description: p.description,
      price: p.price,
      currency: "KES",
      lastUpdated: p.lastUpdated,
    };
  });

  app.post("/api/v1/products", { preHandler: authPreHandler }, async (req) => {
    const b = req.body as Record<string, unknown>;
    const id = `PRD_${String(state.productNextId++).padStart(3, "0")}`;
    const row = { id, ...b, status: b.status ?? "draft", lastUpdated: new Date().toISOString() };
    state.products.push(row);
    return row;
  });

  app.patch("/api/v1/products/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const p = state.products.find((x: any) => x.id === id);
    if (!p) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    Object.assign(p, req.body, { lastUpdated: new Date().toISOString() });
    return p;
  });

  app.delete("/api/v1/products/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const i = state.products.findIndex((x: any) => x.id === id);
    if (i === -1) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    state.products.splice(i, 1);
    return reply.code(204).send();
  });

  await app.listen({ port: PORT, host: "127.0.0.1" });
  console.log(`HCB API listening on http://localhost:${PORT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
