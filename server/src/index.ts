import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createInitialState, pushAudit } from "./state.js";
import type { JwtUser } from "./types.js";
import { isWithinDateRange } from "../../src/lib/calc/dateFilter.ts";

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

/**
 * Fastify 5 route preHandler receives `(request, reply, done)`.
 * On success we must call `done()` (or return a Promise); returning nothing leaves the hook chain stuck
 * and the client never receives a response — only the error paths worked because `reply.send()` returns a Thenable.
 */
function authPreHandler(req: any, reply: any, done: (err?: Error) => void) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) {
    return err(reply, 401, "ERR_UNAUTHORIZED", "Authentication required");
  }
  try {
    const p = jwt.verify(h.slice(7), JWT_SECRET) as JwtUser & { sub: number };
    req.user = { id: p.sub, email: p.email, roles: p.roles };
  } catch {
    return err(reply, 401, "ERR_UNAUTHORIZED", "Invalid or expired token");
  }
  done();
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
  const altRaw = m.alternate_data_used ?? m.alternateDataUsed ?? 0;
  const altNum = Number(altRaw);
  const pid = m.product_id ?? m.productId;
  return {
    enquiryId: String(m.id ?? m.enquiry_id ?? ""),
    institution: m.institution ?? "",
    status: m.status ?? "Success",
    responseTimeMs: m.response_time_ms ?? 0,
    enquiryType: m.enquiry_type ?? "Standard",
    timestamp: m.timestamp ?? "",
    consumerId: m.consumer_id,
    productId: pid != null && String(pid).length > 0 ? String(pid) : undefined,
    productName: m.product ?? m.product_name ?? m.productName,
    alternateDataUsed: Number.isFinite(altNum) ? Math.max(0, Math.floor(altNum)) : 0,
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

export type HcbServer = { app: ReturnType<typeof Fastify>; state: ReturnType<typeof createInitialState> };

/** Build Fastify app + in-memory state without listening (for integration tests). */
export async function buildServer(options?: { logger?: boolean }): Promise<HcbServer> {
  const state = createInitialState();
  const app = Fastify({ logger: options?.logger ?? true });
  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  /** Liveness for load balancers and E2E / CI (no auth). */
  app.get("/api/v1/health", async () => ({ status: "ok", service: "hcb-fastify-dev" }));

  function filterEnquiriesByInstitutionId(raw: any[], institutionIdParam: string) {
    const idNorm = String(institutionIdParam).replace(/\D/g, "");
    const inst = state.institutions.find((i) => String(i.id).replace(/\D/g, "") === idNorm);
    return raw.filter((e: any) => {
      const eid = e.institution_id;
      if (eid != null && String(eid).replace(/\D/g, "") === idNorm) return true;
      if (inst && e.institution === inst.name) return true;
      return false;
    });
  }

  function monitoringEnquiriesPaged(q: Record<string, string | undefined>) {
    let raw = [...state.enquiries];
    if (q.status) raw = raw.filter((e: { status?: string }) => String(e.status ?? "") === String(q.status));
    const dateFrom = q.dateFrom?.trim() ?? "";
    const dateTo = q.dateTo?.trim() ?? "";
    if (dateFrom || dateTo) {
      raw = raw.filter((e: { timestamp?: string }) =>
        isWithinDateRange(String(e.timestamp ?? ""), dateFrom, dateTo)
      );
    }
    if (q.institutionId) raw = filterEnquiriesByInstitutionId(raw, q.institutionId);
    return pageSlice(raw.map(normaliseEnquiry), Number(q.page), Number(q.size));
  }

  function consortiumMembersForApi(consortiumId: string) {
    return state.consortiumMembers
      .filter((m) => m.consortiumId === consortiumId)
      .map((m) => {
        const inst = state.institutions.find((i: { id: number }) => i.id === m.institutionId);
        return {
          id: m.id,
          institutionId: String(m.institutionId),
          institutionName: inst?.name ?? `Institution ${m.institutionId}`,
          role: m.role,
          joinedAt: m.joinedAt,
        };
      });
  }

  function replaceConsortiumMembers(
    consortiumId: string,
    bodyMembers: { institutionId: string | number; role?: string }[] | undefined
  ) {
    if (!Array.isArray(bodyMembers)) return;
    state.consortiumMembers = state.consortiumMembers.filter((m) => m.consortiumId !== consortiumId);
    for (const raw of bodyMembers) {
      const iid = Number(raw.institutionId);
      if (!Number.isFinite(iid)) continue;
      const inst = state.institutions.find((i: { id: number; isDeleted?: boolean }) => i.id === iid && !i.isDeleted);
      if (!inst) continue;
      state.consortiumMembers.push({
        id: randomUUID(),
        consortiumId,
        institutionId: iid,
        role: String(raw.role ?? "Consumer"),
        joinedAt: new Date().toISOString(),
      });
    }
    const c = state.consortiums.find((x: any) => String(x.id) === consortiumId);
    if (c) {
      c.membersCount = state.consortiumMembers.filter((m) => m.consortiumId === consortiumId).length;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function toProductSubscriptionRow(institutionId: number, s: any) {
    const inst = state.institutions.find((i: any) => i.id === institutionId);
    const overrides =
      inst?.memberRateOverrides && typeof inst.memberRateOverrides === "object"
        ? (inst.memberRateOverrides as Record<string, number>)
        : {};
    const p = state.products.find((x: any) => String(x.id) === String(s.productId));
    if (!p) return null;
    const pid = String(p.id);
    const base = Number(p.price ?? 0);
    return {
      subscriptionId: s.subscriptionId,
      productId: pid,
      productName: p.name,
      productStatus: p.status ?? "active",
      pricingModel: p.pricingModel ?? "per_hit",
      subscribedAt: s.subscribedAt,
      subscriptionStatus: s.subscriptionStatus,
      ratePerCall: overrides[pid] !== undefined && Number.isFinite(overrides[pid]) ? overrides[pid] : base,
    };
  }

  // ─── Auth (anonymous) ─────────────────────────────────────────────────────
  app.post("/api/v1/auth/login", async (req, reply) => {
    const body = req.body as { email?: string; password?: string };
    if (!body?.email || !body?.password) return err(reply, 400, "ERR_VALIDATION", "Email and password required");
    const u = state.users.find((x) => x.email.toLowerCase() === body.email!.toLowerCase());
    if (!u || !bcrypt.compareSync(body.password!, u.passwordHash)) {
      pushAudit(state, {
        userEmail: body.email!,
        actionType: "LOGIN",
        entityType: "AUTH",
        entityId: "login",
        description: "Failed login — invalid credentials",
        auditOutcome: "FAILURE",
      });
      return err(reply, 401, "ERR_AUTH_FAILED", "Invalid email or password");
    }
    if (u.userAccountStatus !== "Active") {
      pushAudit(state, {
        userEmail: u.email,
        actionType: "LOGIN",
        entityType: "AUTH",
        entityId: String(u.id),
        description: "Failed login — account not active",
        auditOutcome: "FAILURE",
      });
      return err(reply, 403, "ERR_ACCOUNT_SUSPENDED", "Account not active");
    }
    const user = toPublicUser(u);
    const accessToken = signAccess({ id: user.id, email: user.email, roles: user.roles });
    const refreshToken = randomUUID();
    state.refreshTokens.set(refreshToken, { userId: u.id, expiresAt: Date.now() + 7 * 24 * 3600 * 1000 });
    pushAudit(state, {
      userEmail: u.email,
      actionType: "LOGIN",
      entityType: "AUTH",
      entityId: String(u.id),
      description: "Successful login",
    });
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
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "LOGOUT",
      entityType: "AUTH",
      entityId: String(req.user!.id),
      description: "User logged out",
    });
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
      consentConfig: {
        policy: "explicit",
        expiryDays: 90,
        scopeCreditReport: true,
        scopeAlternateData: false,
        captureMode: "api-header",
      },
      consentFailureMetrics: JSON.parse(JSON.stringify(state.consentFailureMetricsTemplate)),
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
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "INSTITUTION_UPDATE",
      entityType: "INSTITUTION",
      entityId: String(id),
      description: `Updated institution ${inst.name}`,
    });
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
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "INSTITUTION_REACTIVATE",
      entityType: "INSTITUTION",
      entityId: String(id),
      description: `Reactivated institution ${inst.name}`,
    });
    return reply.code(204).send();
  });

  app.delete("/api/v1/institutions/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const inst = state.institutions.find((i) => i.id === id && !i.isDeleted);
    if (!inst) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    const name = inst.name;
    inst.isDeleted = true;
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "INSTITUTION_DELETE",
      entityType: "INSTITUTION",
      entityId: String(id),
      description: `Soft-deleted institution ${name}`,
    });
    return reply.code(204).send();
  });

  app.get("/api/v1/institutions/:id/consortium-memberships", { preHandler: authPreHandler }, async (req) => {
    const id = Number((req.params as { id: string }).id);
    const list = state.institutionConsortiumMemberships.filter((m: any) => m.institutionId === id);
    return list.map((m: any) => {
      const c = state.consortiums.find((x: any) => String(x.id) === String(m.consortiumId));
      return {
        membershipId: m.membershipId,
        consortiumId: m.consortiumId,
        consortiumName: c?.name ?? "Unknown consortium",
        consortiumType: c?.type ?? "",
        consortiumStatus: c?.status ?? "",
        memberRole: m.memberRole,
        consortiumMemberStatus: m.consortiumMemberStatus,
        joinedAt: m.joinedAt,
      };
    });
  });

  app.post("/api/v1/institutions/:id/consortium-memberships", { preHandler: authPreHandler }, async (req, reply) => {
    const institutionId = Number((req.params as { id: string }).id);
    const inst = state.institutions.find((i: { id: number; isDeleted?: boolean }) => i.id === institutionId && !i.isDeleted);
    if (!inst) return err(reply, 404, "ERR_NOT_FOUND", "Institution not found");
    const body = (req.body ?? {}) as {
      consortiumId?: string;
      memberRole?: string;
      consortiumMemberStatus?: string;
    };
    const consortiumId = String(body.consortiumId ?? "").trim();
    if (!consortiumId) return err(reply, 400, "ERR_VALIDATION", "consortiumId is required");
    const c = state.consortiums.find((x: any) => String(x.id) === consortiumId);
    if (!c) return err(reply, 404, "ERR_NOT_FOUND", "Consortium not found");
    if (String(c.status).toLowerCase() !== "active") {
      return err(reply, 400, "ERR_VALIDATION", "Consortium is not active");
    }
    const dup = state.institutionConsortiumMemberships.find(
      (m: any) => m.institutionId === institutionId && String(m.consortiumId) === consortiumId
    );
    if (dup) return err(reply, 409, "ERR_CONFLICT", "Institution is already a member of this consortium");
    const membershipId = state.institutionConsortiumMembershipNextId++;
    const row = {
      membershipId,
      institutionId,
      consortiumId,
      memberRole: String(body.memberRole ?? "Consumer"),
      consortiumMemberStatus: String(body.consortiumMemberStatus ?? "pending"),
      joinedAt: new Date().toISOString(),
    };
    state.institutionConsortiumMemberships.push(row);
    inst.updatedAt = new Date().toISOString().slice(0, 10);
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "INSTITUTION_CONSORTIUM_JOIN",
      entityType: "INSTITUTION",
      entityId: String(institutionId),
      description: `Added consortium membership ${consortiumId} (${c.name})`,
    });
    return {
      membershipId: row.membershipId,
      consortiumId: row.consortiumId,
      consortiumName: c.name,
      consortiumType: c.type,
      consortiumStatus: c.status,
      memberRole: row.memberRole,
      consortiumMemberStatus: row.consortiumMemberStatus,
      joinedAt: row.joinedAt,
    };
  });

  app.delete("/api/v1/institutions/:id/consortium-memberships/:membershipId", { preHandler: authPreHandler }, async (req, reply) => {
    const institutionId = Number((req.params as { id: string }).id);
    const membershipId = Number((req.params as { membershipId: string }).membershipId);
    const idx = state.institutionConsortiumMemberships.findIndex(
      (m: any) => m.institutionId === institutionId && m.membershipId === membershipId
    );
    if (idx === -1) return err(reply, 404, "ERR_NOT_FOUND", "Membership not found");
    state.institutionConsortiumMemberships.splice(idx, 1);
    const inst = state.institutions.find((i: { id: number }) => i.id === institutionId);
    if (inst) inst.updatedAt = new Date().toISOString().slice(0, 10);
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "INSTITUTION_CONSORTIUM_LEAVE",
      entityType: "INSTITUTION",
      entityId: String(institutionId),
      description: `Removed consortium membership ${membershipId}`,
    });
    return reply.code(204).send();
  });

  app.get("/api/v1/institutions/:id/product-subscriptions", { preHandler: authPreHandler }, async (req) => {
    const id = Number((req.params as { id: string }).id);
    const subs = state.institutionProductSubscriptions.filter((s: any) => s.institutionId === id);
    return subs.map((s: any) => toProductSubscriptionRow(id, s)).filter(Boolean);
  });

  app.post("/api/v1/institutions/:id/product-subscriptions", { preHandler: authPreHandler }, async (req, reply) => {
    const institutionId = Number((req.params as { id: string }).id);
    const inst = state.institutions.find((i: { id: number; isDeleted?: boolean }) => i.id === institutionId && !i.isDeleted);
    if (!inst) return err(reply, 404, "ERR_NOT_FOUND", "Institution not found");
    const body = (req.body ?? {}) as { productIds?: unknown };
    const raw = Array.isArray(body.productIds) ? body.productIds : [];
    const productIds = raw.map((x) => String(x)).filter((x) => x.length > 0);
    if (productIds.length === 0) return err(reply, 400, "ERR_VALIDATION", "productIds array is required");
    const created: any[] = [];
    for (const pid of productIds) {
      const p = state.products.find((x: any) => String(x.id) === pid);
      if (!p) return err(reply, 404, "ERR_NOT_FOUND", `Product not found: ${pid}`);
      const dup = state.institutionProductSubscriptions.find(
        (s: any) => s.institutionId === institutionId && String(s.productId) === pid
      );
      if (dup) continue;
      const subscriptionId = state.institutionProductSubscriptionNextId++;
      const row = {
        subscriptionId,
        institutionId,
        productId: pid,
        subscriptionStatus: "active",
        subscribedAt: new Date().toISOString(),
      };
      state.institutionProductSubscriptions.push(row);
      created.push(row);
    }
    inst.updatedAt = new Date().toISOString().slice(0, 10);
    if (created.length > 0) {
      pushAudit(state, {
        userEmail: req.user!.email,
        actionType: "INSTITUTION_PRODUCT_SUBSCRIBE",
        entityType: "INSTITUTION",
        entityId: String(institutionId),
        description: `Subscribed to product(s): ${created.map((r) => r.productId).join(", ")}`,
      });
    }
    return created.map((s) => toProductSubscriptionRow(institutionId, s)).filter(Boolean);
  });

  app.patch("/api/v1/institutions/:id/product-subscriptions/:subscriptionId", { preHandler: authPreHandler }, async (req, reply) => {
    const institutionId = Number((req.params as { id: string }).id);
    const subscriptionId = Number((req.params as { subscriptionId: string }).subscriptionId);
    const inst = state.institutions.find((i: { id: number; isDeleted?: boolean }) => i.id === institutionId && !i.isDeleted);
    if (!inst) return err(reply, 404, "ERR_NOT_FOUND", "Institution not found");
    const s = state.institutionProductSubscriptions.find(
      (x: any) => x.institutionId === institutionId && x.subscriptionId === subscriptionId
    );
    if (!s) return err(reply, 404, "ERR_NOT_FOUND", "Subscription not found");
    const body = (req.body ?? {}) as { subscriptionStatus?: string };
    const st = String(body.subscriptionStatus ?? "").toLowerCase();
    if (!["active", "suspended", "trial"].includes(st)) {
      return err(reply, 400, "ERR_VALIDATION", "subscriptionStatus must be active, suspended, or trial");
    }
    s.subscriptionStatus = st;
    inst.updatedAt = new Date().toISOString().slice(0, 10);
    const row = toProductSubscriptionRow(institutionId, s);
    if (!row) return err(reply, 500, "ERR_INTERNAL", "Product missing for subscription");
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "INSTITUTION_PRODUCT_SUBSCRIPTION_UPDATE",
      entityType: "INSTITUTION",
      entityId: String(institutionId),
      description: `Subscription ${subscriptionId} status → ${st}`,
    });
    return row;
  });

  app.get("/api/v1/institutions/:id/billing-summary", { preHandler: authPreHandler }, async (req) => {
    const id = Number((req.params as { id: string }).id);
    const inst = state.institutions.find((i) => i.id === id);
    return {
      billingModel: inst?.billingModel ?? "postpaid",
      creditBalance: inst?.creditBalance ?? 0,
      activeSubscriptions: 2,
      apiCalls30d: 1200,
      lowCreditAlertThreshold:
        inst?.lowCreditAlertThreshold !== undefined && inst?.lowCreditAlertThreshold !== null
          ? Number(inst.lowCreditAlertThreshold)
          : 5000,
    };
  });

  app.patch("/api/v1/institutions/:id/billing", { preHandler: authPreHandler }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const inst = state.institutions.find((i) => i.id === id && !i.isDeleted);
    if (!inst) return err(reply, 404, "ERR_NOT_FOUND", "Institution not found");
    const body = (req.body ?? {}) as {
      billingModel?: string;
      lowCreditAlertThreshold?: number;
      memberRateOverrides?: Record<string, number>;
    };
    if (typeof body.billingModel === "string" && body.billingModel.length > 0) {
      inst.billingModel = body.billingModel;
    }
    if (body.lowCreditAlertThreshold !== undefined && Number.isFinite(Number(body.lowCreditAlertThreshold))) {
      inst.lowCreditAlertThreshold = Math.max(0, Number(body.lowCreditAlertThreshold));
    }
    if (body.memberRateOverrides != null && typeof body.memberRateOverrides === "object") {
      if (!inst.memberRateOverrides || typeof inst.memberRateOverrides !== "object") inst.memberRateOverrides = {};
      Object.assign(inst.memberRateOverrides as Record<string, number>, body.memberRateOverrides);
    }
    inst.updatedAt = new Date().toISOString().slice(0, 10);
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "INSTITUTION_BILLING_UPDATE",
      entityType: "INSTITUTION",
      entityId: String(id),
      description: "Updated billing settings",
    });
    return {
      billingModel: inst.billingModel ?? "postpaid",
      creditBalance: inst.creditBalance ?? 0,
      lowCreditAlertThreshold: inst.lowCreditAlertThreshold ?? 5000,
      memberRateOverrides: inst.memberRateOverrides ?? {},
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defaultInstitutionApiAccess = () => ({
    dataSubmission: { enabled: true, rateLimitPerMin: 200, ipWhitelist: [] as string[] },
    enquiry: { enabled: true, rateLimitPerMin: 100, ipWhitelist: [] as string[], concurrentLimit: 50 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getInstitutionApiAccessPayload(inst: any) {
    const d = defaultInstitutionApiAccess();
    const s = inst.apiAccess && typeof inst.apiAccess === "object" ? inst.apiAccess : {};
    const ds = s.dataSubmission && typeof s.dataSubmission === "object" ? s.dataSubmission : {};
    const en = s.enquiry && typeof s.enquiry === "object" ? s.enquiry : {};
    return {
      dataSubmission: { ...d.dataSubmission, ...ds },
      enquiry: { ...d.enquiry, ...en },
    };
  }

  app.get("/api/v1/institutions/:id/api-access", { preHandler: authPreHandler }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const inst = state.institutions.find((i: { id: number; isDeleted?: boolean }) => i.id === id && !i.isDeleted);
    if (!inst) return err(reply, 404, "ERR_NOT_FOUND", "Institution not found");
    return getInstitutionApiAccessPayload(inst);
  });

  app.patch("/api/v1/institutions/:id/api-access", { preHandler: authPreHandler }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const inst = state.institutions.find((i: { id: number; isDeleted?: boolean }) => i.id === id && !i.isDeleted);
    if (!inst) return err(reply, 404, "ERR_NOT_FOUND", "Institution not found");
    const body = (req.body ?? {}) as Record<string, unknown>;
    const current = getInstitutionApiAccessPayload(inst);
    if (!inst.apiAccess || typeof inst.apiAccess !== "object") inst.apiAccess = {};
    if (body.dataSubmission && typeof body.dataSubmission === "object") {
      inst.apiAccess.dataSubmission = {
        ...current.dataSubmission,
        ...(body.dataSubmission as object),
      };
    }
    if (body.enquiry && typeof body.enquiry === "object") {
      inst.apiAccess.enquiry = {
        ...current.enquiry,
        ...(body.enquiry as object),
      };
    }
    inst.updatedAt = new Date().toISOString().slice(0, 10);
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "INSTITUTION_API_ACCESS_UPDATE",
      entityType: "INSTITUTION",
      entityId: String(id),
      description: "Updated API access (data submission / enquiry)",
    });
    return getInstitutionApiAccessPayload(inst);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defaultInstitutionConsentConfig = () => ({
    policy: "explicit",
    expiryDays: 90,
    scopeCreditReport: true,
    scopeAlternateData: false,
    captureMode: "api-header",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getInstitutionConsentPayload(inst: any) {
    const d = defaultInstitutionConsentConfig();
    const c = inst.consentConfig && typeof inst.consentConfig === "object" ? inst.consentConfig : {};
    const policyRaw = String(c.policy ?? d.policy);
    const policy = ["explicit", "deemed", "per-enquiry"].includes(policyRaw) ? policyRaw : d.policy;
    const captureRaw = String(c.captureMode ?? d.captureMode);
    const captureMode = ["api-header", "upload-artifact", "account-aggregator"].includes(captureRaw)
      ? captureRaw
      : d.captureMode;
    const expiryRaw = Math.floor(Number(c.expiryDays));
    const expiryDays = Number.isFinite(expiryRaw)
      ? Math.min(365, Math.max(1, expiryRaw))
      : d.expiryDays;
    return {
      policy,
      expiryDays,
      scopeCreditReport: c.scopeCreditReport !== false,
      scopeAlternateData: !!c.scopeAlternateData,
      captureMode,
      failureMetrics: Array.isArray(inst.consentFailureMetrics) ? inst.consentFailureMetrics : [],
    };
  }

  app.get("/api/v1/institutions/:id/consent", { preHandler: authPreHandler }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const inst = state.institutions.find((i: { id: number; isDeleted?: boolean }) => i.id === id && !i.isDeleted);
    if (!inst) return err(reply, 404, "ERR_NOT_FOUND", "Institution not found");
    return getInstitutionConsentPayload(inst);
  });

  app.patch("/api/v1/institutions/:id/consent", { preHandler: authPreHandler }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const inst = state.institutions.find((i: { id: number; isDeleted?: boolean }) => i.id === id && !i.isDeleted);
    if (!inst) return err(reply, 404, "ERR_NOT_FOUND", "Institution not found");
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (!inst.consentConfig || typeof inst.consentConfig !== "object") inst.consentConfig = {};
    if (body.policy !== undefined) {
      const p = String(body.policy);
      if (["explicit", "deemed", "per-enquiry"].includes(p)) (inst.consentConfig as Record<string, unknown>).policy = p;
    }
    if (body.expiryDays !== undefined) {
      const n = Math.floor(Number(body.expiryDays));
      if (Number.isFinite(n))
        (inst.consentConfig as Record<string, unknown>).expiryDays = Math.min(365, Math.max(1, n));
    }
    if (body.scopeCreditReport !== undefined)
      (inst.consentConfig as Record<string, unknown>).scopeCreditReport = !!body.scopeCreditReport;
    if (body.scopeAlternateData !== undefined)
      (inst.consentConfig as Record<string, unknown>).scopeAlternateData = !!body.scopeAlternateData;
    if (body.captureMode !== undefined) {
      const m = String(body.captureMode);
      if (["api-header", "upload-artifact", "account-aggregator"].includes(m))
        (inst.consentConfig as Record<string, unknown>).captureMode = m;
    }
    if (body.failureMetrics !== undefined && Array.isArray(body.failureMetrics)) {
      inst.consentFailureMetrics = (body.failureMetrics as unknown[])
        .filter((x) => x && typeof x === "object")
        .map((x) => {
          const o = x as Record<string, unknown>;
          return { day: String(o.day ?? ""), failures: Math.max(0, Math.floor(Number(o.failures)) || 0) };
        });
    }
    inst.updatedAt = new Date().toISOString().slice(0, 10);
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "INSTITUTION_CONSENT_UPDATE",
      entityType: "INSTITUTION",
      entityId: String(id),
      description: "Updated consent configuration",
    });
    return getInstitutionConsentPayload(inst);
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

  /** Same payload as GET /api/v1/monitoring/enquiries?institutionId= — scoped by path. */
  app.get("/api/v1/institutions/:id/monitoring/enquiries", { preHandler: authPreHandler }, async (req) => {
    const id = (req.params as { id: string }).id;
    const q = req.query as Record<string, string | undefined>;
    return monitoringEnquiriesPaged({ ...q, institutionId: id });
  });

  // ─── API keys ─────────────────────────────────────────────────────────────
  app.get("/api/v1/api-keys", { preHandler: authPreHandler }, async (req) => {
    const q = req.query as { institutionId?: string };
    let list = state.apiKeys;
    if (q.institutionId) list = list.filter((k) => String(k.institutionId) === q.institutionId);
    return list;
  });

  app.post("/api/v1/api-keys", { preHandler: authPreHandler }, async (req, reply) => {
    const body = (req.body ?? {}) as { institutionId?: number; environment?: string };
    const instId = Number(body.institutionId);
    if (!Number.isFinite(instId)) return err(reply, 400, "ERR_VALIDATION", "institutionId is required");
    const inst = state.institutions.find((i: { id: number; isDeleted?: boolean }) => i.id === instId && !i.isDeleted);
    if (!inst) return err(reply, 404, "ERR_NOT_FOUND", "Institution not found");
    const raw = String(body.environment ?? "sandbox").toLowerCase();
    const environment =
      raw === "prod" || raw === "production"
        ? "production"
        : raw === "uat"
          ? "uat"
          : "sandbox";
    const id = state.apiKeyNextId++;
    const row = {
      id,
      keyPrefix: `hcb_${instId}_${randomUUID().slice(0, 4)}_`,
      environment,
      status: "Active",
      institutionId: instId,
      institutionName: inst.name,
      createdAt: new Date().toISOString(),
      lastUsedAt: undefined as string | undefined,
      rateLimit: 1000,
    };
    state.apiKeys.push(row);
    return row;
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
    const productId = a.metadata?.productId;
    if (a.type === "product" && productId) {
      const p = state.products.find((x: any) => String(x.id) === String(productId));
      if (p) p.status = "active";
    }
    const consortiumIdApprove = a.metadata?.consortiumId;
    if (a.type === "consortium" && consortiumIdApprove) {
      const cons = state.consortiums.find((x: any) => String(x.id) === String(consortiumIdApprove));
      if (cons) cons.status = "active";
    }
    const alertRuleIdApprove = a.metadata?.alertRuleId;
    if (a.type === "alert_rule" && alertRuleIdApprove) {
      const ar = state.alertRules.find((x: any) => String(x.id) === String(alertRuleIdApprove));
      if (ar) ar.status = "Enabled";
    }
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "APPROVAL_APPROVE",
      entityType: "APPROVAL",
      entityId: id,
      description: `Approved ${a.type} — ${a.name ?? id}`,
    });
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
    const productId = a.metadata?.productId;
    if (a.type === "product" && productId) {
      const p = state.products.find((x: any) => String(x.id) === String(productId));
      if (p) p.status = "draft";
    }
    const consortiumIdReject = a.metadata?.consortiumId;
    if (a.type === "consortium" && consortiumIdReject) {
      const cons = state.consortiums.find((x: any) => String(x.id) === String(consortiumIdReject));
      if (cons) cons.status = "pending";
    }
    const alertRuleIdReject = a.metadata?.alertRuleId;
    if (a.type === "alert_rule" && alertRuleIdReject) {
      const ar = state.alertRules.find((x: any) => String(x.id) === String(alertRuleIdReject));
      if (ar) ar.status = "Disabled";
    }
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "APPROVAL_REJECT",
      entityType: "APPROVAL",
      entityId: id,
      description: `Rejected ${a.type} — ${a.name ?? id}`,
    });
    return reply.code(204).send();
  });

  app.post("/api/v1/approvals/:id/request-changes", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const a = findApproval(id);
    if (!a) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    a.status = "changes_requested";
    a.reviewedBy = req.user!.email;
    a.reviewedAt = new Date().toISOString();
    const productId = a.metadata?.productId;
    if (a.type === "product" && productId) {
      const p = state.products.find((x: any) => String(x.id) === String(productId));
      if (p) p.status = "draft";
    }
    const consortiumIdChanges = a.metadata?.consortiumId;
    if (a.type === "consortium" && consortiumIdChanges) {
      const cons = state.consortiums.find((x: any) => String(x.id) === String(consortiumIdChanges));
      if (cons) cons.status = "pending";
    }
    const alertRuleIdChanges = a.metadata?.alertRuleId;
    if (a.type === "alert_rule" && alertRuleIdChanges) {
      const ar = state.alertRules.find((x: any) => String(x.id) === String(alertRuleIdChanges));
      if (ar) ar.status = "Disabled";
    }
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "APPROVAL_REQUEST_CHANGES",
      entityType: "APPROVAL",
      entityId: id,
      description: `Requested changes on ${a.type} — ${a.name ?? id}`,
    });
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

  app.post("/api/v1/users/invitations", { preHandler: authPreHandler }, async (req, reply) => {
    const b = req.body as {
      email?: string;
      role?: string;
      institutionId?: number;
      displayName?: string;
      givenName?: string;
      familyName?: string;
    };
    const email = String(b.email ?? "").trim().toLowerCase();
    if (!email) return err(reply, 400, "ERR_VALIDATION", "email is required");
    if (state.users.some((u: { email: string }) => u.email.toLowerCase() === email)) {
      return err(reply, 409, "ERR_DUPLICATE", "A user with this email already exists");
    }
    const displayName = String(b.displayName ?? "").trim() || email.split("@")[0];
    const id = state.userNextId++;
    const row = {
      id,
      email,
      passwordHash: bcrypt.hashSync(randomUUID(), 10),
      displayName,
      givenName: String(b.givenName ?? "").trim(),
      familyName: String(b.familyName ?? "").trim(),
      userAccountStatus: "Invited",
      mfaEnabled: false,
      institutionId: b.institutionId,
      institutionName: undefined,
      roles: [b.role ?? "Viewer"],
      createdAt: new Date().toISOString(),
      lastLoginAt: undefined,
    };
    state.users.push(row);
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "USER_INVITE",
      entityType: "USER",
      entityId: String(id),
      description: `Invited ${email} (${displayName}) as ${row.roles[0]}`,
    });
    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      givenName: row.givenName,
      familyName: row.familyName,
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
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "USER_SUSPEND",
      entityType: "USER",
      entityId: String(id),
      description: `Suspended user ${u.email}`,
    });
    return reply.code(204).send();
  });

  app.post("/api/v1/users/:id/activate", { preHandler: authPreHandler }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const u = state.users.find((x) => x.id === id);
    if (!u) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    u.userAccountStatus = "Active";
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "USER_ACTIVATE",
      entityType: "USER",
      entityId: String(id),
      description: `Activated user ${u.email}`,
    });
    return reply.code(204).send();
  });

  app.patch("/api/v1/users/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const u = state.users.find((x) => x.id === id);
    if (!u) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    const body = (req.body ?? {}) as {
      displayName?: string;
      roles?: string[];
      institutionId?: number | null;
      givenName?: string;
      familyName?: string;
    };
    if (typeof body.displayName === "string") u.displayName = body.displayName;
    if (typeof body.givenName === "string") u.givenName = body.givenName;
    if (typeof body.familyName === "string") u.familyName = body.familyName;
    if (Array.isArray(body.roles) && body.roles.length > 0) u.roles = body.roles;
    if (body.institutionId !== undefined) {
      u.institutionId = body.institutionId === null ? undefined : body.institutionId;
      if (u.institutionId != null) {
        const inst = state.institutions.find((i: { id: number }) => i.id === u.institutionId);
        u.institutionName = inst?.name;
      } else u.institutionName = undefined;
    }
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "USER_UPDATE",
      entityType: "USER",
      entityId: String(id),
      description: `Updated user ${u.email}`,
    });
    return {
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
    };
  });

  app.post("/api/v1/users/:id/deactivate", { preHandler: authPreHandler }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const u = state.users.find((x) => x.id === id);
    if (!u) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    u.userAccountStatus = "Deactivated";
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "USER_DEACTIVATE",
      entityType: "USER",
      entityId: String(id),
      description: `Deactivated user ${u.email}`,
    });
    return reply.code(204).send();
  });

  // ─── Roles ─────────────────────────────────────────────────────────────────
  app.get("/api/v1/roles", { preHandler: authPreHandler }, async () => state.roles);

  app.post("/api/v1/roles", { preHandler: authPreHandler }, async (req, reply) => {
    const b = req.body as { roleName?: string; description?: string; permissions?: object };
    const name = typeof b.roleName === "string" ? b.roleName.trim() : "";
    if (!name) return err(reply, 400, "ERR_VALIDATION", "roleName is required");
    const dup = state.roles.some((x) => String(x.roleName).toLowerCase() === name.toLowerCase());
    if (dup) return err(reply, 409, "ERR_DUPLICATE", "A role with this name already exists");
    const id = String(state.roleNextId++);
    const row = {
      id,
      roleName: name,
      description: b.description,
      permissions: (b.permissions && typeof b.permissions === "object" ? b.permissions : {}) as Record<string, unknown>,
      createdAt: new Date().toISOString(),
    };
    state.roles.push(row);
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "ROLE_CREATE",
      entityType: "ROLE",
      entityId: id,
      description: `Created role ${name}`,
    });
    return row;
  });

  app.patch("/api/v1/roles/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const r = state.roles.find((x) => x.id === id);
    if (!r) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    const b = req.body as { roleName?: string; description?: string; permissions?: object };
    if (typeof b.roleName === "string") {
      const nextName = b.roleName.trim();
      if (!nextName) return err(reply, 400, "ERR_VALIDATION", "roleName cannot be empty");
      const dup = state.roles.some(
        (x) => x.id !== id && String(x.roleName).toLowerCase() === nextName.toLowerCase(),
      );
      if (dup) return err(reply, 409, "ERR_DUPLICATE", "A role with this name already exists");
      r.roleName = nextName;
    }
    if (typeof b.description === "string") r.description = b.description;
    if (b.permissions !== undefined && b.permissions !== null && typeof b.permissions === "object") {
      r.permissions = b.permissions as Record<string, unknown>;
    }
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "ROLE_UPDATE",
      entityType: "ROLE",
      entityId: id,
      description: `Updated role ${r.roleName}`,
    });
    return r;
  });

  app.delete("/api/v1/roles/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const i = state.roles.findIndex((x) => x.id === id);
    if (i === -1) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    const removed = state.roles[i];
    state.roles.splice(i, 1);
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "ROLE_DELETE",
      entityType: "ROLE",
      entityId: id,
      description: `Deleted role ${removed?.roleName ?? id}`,
    });
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
      ipAddressHash: a.ipAddressHash ?? a.ipAddress,
    }));
    if (q.entityType) list = list.filter((a) => a.entityType === q.entityType);
    if (q.entityId) list = list.filter((a) => a.entityId === q.entityId);
    if (q.userId) list = list.filter((a) => a.entityType === "USER" && String(a.entityId) === String(q.userId));
    if (q.actionType) list = list.filter((a) => a.actionType === q.actionType);
    if (q.from) {
      const fromMs = new Date(q.from).getTime();
      if (!Number.isNaN(fromMs)) list = list.filter((a) => new Date(a.occurredAt).getTime() >= fromMs);
    }
    if (q.to) {
      const toMs = new Date(q.to).getTime();
      if (!Number.isNaN(toMs)) list = list.filter((a) => new Date(a.occurredAt).getTime() <= toMs);
    }
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
    return monitoringEnquiriesPaged(req.query as Record<string, string | undefined>);
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

  app.post("/api/v1/batch-jobs/:id/retry", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const job = state.batchJobs.find((b: any) => b.batch_id === id);
    if (!job) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    job.status = "Queued";
    job.success = 0;
    job.failed = 0;
    if (Number(job.total_records) > 0) job.success_rate = 0;
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "BATCH_RETRY",
      entityType: "BATCH_JOB",
      entityId: id,
      description: `Batch ${id} queued for retry`,
    });
    return reply.code(204).send();
  });
  app.post("/api/v1/batch-jobs/:id/cancel", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const job = state.batchJobs.find((b: any) => b.batch_id === id);
    if (!job) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    job.status = "Cancelled";
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "BATCH_CANCEL",
      entityType: "BATCH_JOB",
      entityId: id,
      description: `Batch ${id} cancelled`,
    });
    return reply.code(204).send();
  });

  // ─── Alerts / SLA ─────────────────────────────────────────────────────────
  app.get("/api/v1/alert-rules", { preHandler: authPreHandler }, async () =>
    state.alertRules.map((r: any) => ({
      id: r.id,
      name: r.name,
      domain: r.domain,
      condition: r.condition,
      severity: r.severity,
      status:
        r.status === "Disabled"
          ? "Disabled"
          : r.status === "Pending approval"
            ? "Pending approval"
            : "Enabled",
      lastTriggered: r.lastTriggered,
    }))
  );

  app.post("/api/v1/alert-rules", { preHandler: authPreHandler }, async (req, reply) => {
    const b = req.body as Record<string, unknown>;
    const name = String(b.name ?? "").trim();
    if (!name) return err(reply, 400, "ERR_VALIDATION", "name is required");
    const id = `rule-${randomUUID().slice(0, 8)}`;
    const domain = String(b.domain ?? "Submission API").trim() || "Submission API";
    const condition = String(b.condition ?? "");
    const severity = String(b.severity ?? "Warning");
    const row: Record<string, unknown> = {
      id,
      name,
      domain,
      condition,
      severity,
      status: "Pending approval",
      lastTriggered: b.lastTriggered ?? null,
    };
    state.alertRules.push(row);
    const now = new Date().toISOString();
    state.approvals.unshift({
      id: `ap-ar-${id}-${randomUUID().slice(0, 8)}`,
      type: "alert_rule",
      name,
      description: condition ? `${domain} · ${condition}` : `New alert rule — ${domain}`,
      submittedBy: req.user!.email,
      submittedAt: now,
      status: "pending",
      metadata: { alertRuleId: id },
    });
    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "ALERT_RULE_CREATE",
      entityType: "ALERT_RULE",
      entityId: id,
      description: `Alert rule submitted for approval: ${name}`,
    });
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
    if (r.status === "Pending approval") {
      return err(reply, 400, "ERR_INVALID_STATE", "Rule must be approved in the queue before it can be enabled");
    }
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

  app.get("/api/v1/consortiums/:id/members", { preHandler: authPreHandler }, async (req) => {
    const id = (req.params as { id: string }).id;
    return consortiumMembersForApi(id);
  });

  app.post("/api/v1/consortiums", { preHandler: authPreHandler }, async (req, reply) => {
    const b = req.body as Record<string, unknown> & {
      members?: { institutionId: string | number; role?: string }[];
    };
    const name = String(b.name ?? "").trim();
    if (!name) return err(reply, 400, "ERR_VALIDATION", "name is required");
    const id = `CONS_${String(state.consortiumNextId++).padStart(3, "0")}`;
    const { members, ...rest } = b;
    const status =
      b.status != null && String(b.status).length > 0 ? String(b.status) : "approval_pending";
    const row: Record<string, unknown> = { id, ...rest, membersCount: 0, status };
    state.consortiums.push(row);
    replaceConsortiumMembers(id, members);
    const c = state.consortiums.find((x: any) => x.id === id);
    if (c) c.membersCount = state.consortiumMembers.filter((m) => m.consortiumId === id).length;

    const needsApproval = status === "approval_pending" || status === "pending";
    if (needsApproval) {
      const now = new Date().toISOString();
      const mc = (c?.membersCount as number) ?? 0;
      const typeLabel = rest.type != null ? String(rest.type) : "Consortium";
      state.approvals.unshift({
        id: `ap-cons-${id}-${randomUUID().slice(0, 8)}`,
        type: "consortium",
        name,
        description:
          (rest.description != null && String(rest.description).trim()) ||
          `New consortium — ${typeLabel} · ${mc} member(s)`,
        submittedBy: req.user!.email,
        submittedAt: now,
        status: "pending",
        metadata: { consortiumId: id },
      });
    }

    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "CONSORTIUM_CREATE",
      entityType: "CONSORTIUM",
      entityId: id,
      description: `Created consortium ${name}`,
    });

    return c ?? row;
  });

  app.patch("/api/v1/consortiums/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const c = state.consortiums.find((x: any) => x.id === id);
    if (!c) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    const body = (req.body ?? {}) as Record<string, unknown> & {
      members?: { institutionId: string | number; role?: string }[];
    };
    const { members, ...patchRest } = body;
    Object.assign(c, patchRest);
    if (members !== undefined) replaceConsortiumMembers(id, members);
    c.membersCount = state.consortiumMembers.filter((m) => m.consortiumId === id).length;
    return c;
  });

  app.delete("/api/v1/consortiums/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const i = state.consortiums.findIndex((x: any) => x.id === id);
    if (i === -1) return err(reply, 404, "ERR_NOT_FOUND", "Not found");
    state.consortiums.splice(i, 1);
    state.consortiumMembers = state.consortiumMembers.filter((m) => m.consortiumId !== id);
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
      packetIds: p.packetIds,
      packetConfigs: p.packetConfigs,
      enquiryConfig: p.enquiryConfig,
      pricingModel: p.pricingModel,
    };
  });

  app.post("/api/v1/products", { preHandler: authPreHandler }, async (req, reply) => {
    const b = req.body as Record<string, unknown>;
    const name = String(b.name ?? "").trim();
    if (!name) return err(reply, 400, "ERR_VALIDATION", "name is required");
    const id = `PRD_${String(state.productNextId++).padStart(3, "0")}`;
    const rawStatus = String(b.status ?? "draft");
    const status = rawStatus || "draft";
    const now = new Date().toISOString();
    const packetIds = Array.isArray(b.packetIds) ? b.packetIds.map((x) => String(x)) : [];
    const row: Record<string, unknown> = {
      id,
      name,
      description: b.description != null ? String(b.description) : "",
      status,
      lastUpdated: now,
      price: typeof b.price === "number" ? b.price : undefined,
      pricingModel: b.pricingModel != null ? String(b.pricingModel) : undefined,
      category: b.category != null ? String(b.category) : undefined,
      packetIds,
      packetConfigs: Array.isArray(b.packetConfigs) ? b.packetConfigs : [],
      enquiryConfig: b.enquiryConfig != null && typeof b.enquiryConfig === "object" ? b.enquiryConfig : undefined,
    };
    state.products.push(row);

    const needsApproval = status === "approval_pending" || status === "pending";
    if (needsApproval) {
      const packetSummary =
        packetIds.length > 0 ? `${packetIds.length} packet(s)` : "catalogue submission";
      const apId = `ap-prd-${id}-${randomUUID().slice(0, 8)}`;
      state.approvals.unshift({
        id: apId,
        type: "product",
        name,
        description:
          String(row.description ?? "").trim() ||
          `New data product — ${packetSummary}`,
        submittedBy: req.user!.email,
        submittedAt: now,
        status: "pending",
        metadata: { productId: id },
      });
    }

    pushAudit(state, {
      userEmail: req.user!.email,
      actionType: "PRODUCT_CREATE",
      entityType: "PRODUCT",
      entityId: id,
      description: `Created product ${name}`,
    });

    return {
      id: row.id,
      name: row.name,
      type: (row.category as string) ?? "product",
      status: row.status,
      description: row.description,
      price: row.price,
      currency: "KES",
      lastUpdated: row.lastUpdated,
    };
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

  return { app, state };
}

async function listen() {
  const { app } = await buildServer({ logger: true });
  await app.listen({ port: PORT, host: "127.0.0.1" });
  console.log(`HCB API listening on http://localhost:${PORT}`);
}

const isCliEntry =
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCliEntry) {
  listen().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
