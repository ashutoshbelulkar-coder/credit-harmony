import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { dataPath } from "./paths.js";
import { buildApiSubmissionRequests } from "../../src/lib/generateApiSubmissionRequests.ts";
import { buildEnquiryStateRows } from "../../src/lib/generateEnquiryStateRows.ts";
import { sectionMatrixForRoleName } from "../../src/data/user-management-mock.ts";
import { buildAuditLogSeed } from "./auditSeed.js";
import { createSchemaMapperSlice } from "./schemaMapper.js";
import type { IngestionDriftAlert } from "./ingestionDriftAlerts.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type RefreshRecord = { userId: number; expiresAt: number };

export interface AppState {
  institutions: any[];
  /** Allowed values for institution registration/edits; seeded from `institutions.json` `institutionTypes`. */
  institutionTypes: string[];
  /**
   * Register-member wizard: required compliance uploads from `institutions.json` `requiredComplianceDocuments`.
   * `null` means the SPA skips the documents step entirely.
   */
  requiredComplianceDocuments: unknown[] | null;
  institutionNextId: number;
  users: any[];
  userNextId: number;
  approvals: any[];
  reports: any[];
  auditLog: any[];
  auditNextId: number;
  apiKeys: any[];
  apiKeyNextId: number;
  consortiums: any[];
  consortiumNextId: number;
  products: any[];
  productNextId: number;
  /** Product-level data masking/unmasking policies (dev API; in-memory). */
  dataPolicies: any[];
  dataPolicyNextId: number;
  roles: any[];
  roleNextId: number;
  refreshTokens: Map<string, RefreshRecord>;
  alertRules: any[];
  alertIncidents: any[];
  slaConfigs: any[];
  slaBreachHistory: any[];
  batchJobs: any[];
  batchDetails: Record<string, any>;
  batchKpis: any;
  monitoringKpis: any;
  monitoringCharts: any;
  apiRequests: any[];
  enquiries: any[];
  dashboardActivity: any[];
  governanceKpis: any;
  /** Schema & mapping drift alerts (Data Ingestion Agent); UI: Data Quality Monitoring. */
  ingestionDriftAlerts: IngestionDriftAlert[];
  dataQualityRows: any[];
  dataSubmitterIdByApiKey: Record<string, string>;
  /** Per-institution consortium memberships (dev API; in-memory). */
  institutionConsortiumMemberships: any[];
  institutionConsortiumMembershipNextId: number;
  /** Per-institution product subscriptions (dev API; in-memory). */
  institutionProductSubscriptions: any[];
  institutionProductSubscriptionNextId: number;
  alertCharts: {
    triggeredOverTime: unknown[];
    byDomain: unknown[];
    severityDistribution: unknown[];
    mttrTrend: unknown[];
  };
  dashboardChartsExtra: Record<string, unknown>;
  /** Raw `dashboard.json` for command-center agents / anomalies templates. */
  dashboardSeed: Record<string, unknown>;
  /** Consortium member rows (persisted in dev API; replaces stub GET /consortiums/:id/members). */
  consortiumMembers: {
    id: string;
    consortiumId: string;
    institutionId: number;
    joinedAt: string;
  }[];
  /** Template series for new institutions' consent failure chart (from `institution-tabs.json`). */
  consentFailureMetricsTemplate: { day: string; failures: number }[];
  /** Schema Mapper Agent — in-memory document store (NoSQL-shaped). */
  schemaMapper: ReturnType<typeof createSchemaMapperSlice>;
}

function readDataJson(name: string) {
  return JSON.parse(readFileSync(dataPath(name), "utf8"));
}

function toInstitutionRecord(row: any) {
  const id = parseInt(String(row.id).replace(/\D/g, ""), 10) || Number(row.id);
  return {
    id,
    name: row.name,
    tradingName: row.tradingName,
    institutionType: row.type,
    institutionLifecycleStatus: row.status,
    registrationNumber: row.registrationNumber ?? "",
    jurisdiction: row.jurisdiction ?? "",
    licenseType: row.licenseType ?? "",
    licenseNumber: row.licenseNumber ?? "",
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    onboardedAt: row.onboardedDate ? String(row.onboardedDate) : undefined,
    isDataSubmitter: !!row.isDataSubmitter,
    isSubscriber: !!row.isSubscriber,
    billingModel: row.billingModel,
    creditBalance: row.creditBalance ?? undefined,
    dataQualityScore: row.dataQuality,
    matchAccuracyScore: row.matchAccuracy,
    slaHealthPercent: row.slaHealth,
    apisEnabledCount: row.apisEnabled ?? 0,
    createdAt: row.lastUpdated ?? new Date().toISOString().slice(0, 10),
    updatedAt: row.lastUpdated ?? new Date().toISOString().slice(0, 10),
    complianceDocs: row.complianceDocs,
    isDeleted: false,
  };
}

export function createInitialState(): AppState {
  const instData = readDataJson("institutions.json");
  const institutions = (instData.institutions as any[]).map(toInstitutionRecord);
  const institutionNextId = institutions.reduce((m, r) => Math.max(m, r.id), 0) + 1;
  const rawTypes = (instData as { institutionTypes?: unknown }).institutionTypes;
  const institutionTypes = Array.isArray(rawTypes)
    ? (rawTypes as string[]).map((t) => String(t).trim()).filter(Boolean)
    : [];

  const rawReqDocs = (instData as { requiredComplianceDocuments?: unknown }).requiredComplianceDocuments;
  let requiredComplianceDocuments: unknown[] | null = null;
  if (rawReqDocs === null) {
    requiredComplianceDocuments = null;
  } else if (Array.isArray(rawReqDocs)) {
    requiredComplianceDocuments = rawReqDocs.length > 0 ? [...rawReqDocs] : null;
  }

  const tabsSeed = readDataJson("institution-tabs.json");
  const consentFailureMetricsTemplate = JSON.parse(
    JSON.stringify((tabsSeed.consent?.consentFailureData as { day: string; failures: number }[]) ?? [])
  ) as { day: string; failures: number }[];
  const defaultConsentConfig = () => ({
    policy: "explicit",
    expiryDays: 90,
    scopeCreditReport: true,
    scopeAlternateData: false,
    captureMode: "api-header",
  });
  for (const inst of institutions) {
    const base = defaultConsentConfig();
    if (!inst.consentConfig || typeof inst.consentConfig !== "object") {
      inst.consentConfig = { ...base };
    } else {
      inst.consentConfig = { ...base, ...inst.consentConfig };
    }
    if (!Array.isArray(inst.consentFailureMetrics) || inst.consentFailureMetrics.length === 0) {
      inst.consentFailureMetrics = JSON.parse(JSON.stringify(consentFailureMetricsTemplate));
    }
  }

  const approvalData = readDataJson("approval-queue.json");
  const approvals = [...approvalData.approvalQueueItems];

  const reportingData = readDataJson("reporting.json");
  const reports = (reportingData.reports as any[]).map((r: any) => ({
    id: r.reportId ?? `rep-${Math.random().toString(36).slice(2, 9)}`,
    type: r.reportType ?? "custom",
    name: r.reportType ?? "Report",
    status: r.status ?? "Completed",
    dateFrom: "2026-01-01",
    dateTo: "2026-01-31",
    requestedBy: r.createdBy ?? "system",
    requestedAt: new Date().toISOString(),
    completedAt: r.status === "Completed" ? new Date().toISOString() : undefined,
    fileUrl: r.status === "Completed" ? "https://example.com/report.pdf" : undefined,
  }));

  const defaultHash = bcrypt.hashSync("Admin@1234", 10);
  const users = [
    {
      id: 1,
      email: "admin@hcb.com",
      passwordHash: defaultHash,
      displayName: "Super Admin",
      givenName: "Super",
      familyName: "Admin",
      userAccountStatus: "Active",
      mfaEnabled: false,
      institutionId: undefined,
      institutionName: undefined,
      roles: ["Super Admin"],
      createdAt: "2026-01-01T00:00:00.000Z",
      lastLoginAt: undefined,
    },
    {
      id: 2,
      email: "super-admin@hcb.com",
      passwordHash: defaultHash,
      displayName: "Super Admin Alt",
      givenName: "Super",
      familyName: "Admin",
      userAccountStatus: "Active",
      mfaEnabled: false,
      institutionId: undefined,
      institutionName: undefined,
      roles: ["Super Admin"],
      createdAt: "2026-01-01T00:00:00.000Z",
      lastLoginAt: undefined,
    },
    {
      id: 3,
      email: "viewer@hcb.com",
      passwordHash: defaultHash,
      displayName: "Viewer User",
      givenName: "View",
      familyName: "User",
      userAccountStatus: "Active",
      mfaEnabled: false,
      institutionId: undefined,
      institutionName: undefined,
      roles: ["Viewer"],
      createdAt: "2026-01-01T00:00:00.000Z",
      lastLoginAt: undefined,
    },
  ];
  const userNextId = 4;

  const apiKeys: any[] = [];
  let apiKeyNextId = 1;
  for (const inst of institutions.slice(0, 3)) {
    apiKeys.push({
      id: apiKeyNextId++,
      keyPrefix: `hcb_${inst.id}_`,
      environment: "production",
      status: "Active",
      institutionId: inst.id,
      institutionName: inst.name,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      rateLimit: 1000,
    });
  }

  const consData = readDataJson("consortiums.json");
  const consortiums = [...(consData.consortiums ?? [])] as any[];
  const consortiumNextId = consortiums.length + 1;

  const membersByConsortiumId = (consData.membersByConsortiumId ?? {}) as Record<
    string,
    { institutionId?: string; institutionName?: string; joinedDate?: string; status?: string }[]
  >;
  const consortiumMembers: AppState["consortiumMembers"] = [];
  for (const [cid, mlist] of Object.entries(membersByConsortiumId)) {
    for (const m of mlist ?? []) {
      const parsedId = parseInt(String(m.institutionId ?? "").replace(/\D/g, ""), 10);
      const byId = Number.isFinite(parsedId) ? institutions.find((i) => i.id === parsedId) : undefined;
      const byName = m.institutionName
        ? institutions.find((i) => i.name === m.institutionName)
        : undefined;
      const inst = byId ?? byName;
      if (!inst) continue;
      consortiumMembers.push({
        id: randomUUID(),
        consortiumId: cid,
        institutionId: inst.id,
        joinedAt: m.joinedDate ? `${m.joinedDate}T00:00:00.000Z` : new Date().toISOString(),
      });
    }
  }

  let institutionConsortiumMembershipNextId = 1;
  const institutionConsortiumMemberships: any[] = [];
  const seedConsortia = consortiums.slice(0, 2);
  for (const inst of institutions) {
    for (const c of seedConsortia) {
      institutionConsortiumMemberships.push({
        membershipId: institutionConsortiumMembershipNextId++,
        institutionId: inst.id,
        consortiumId: String(c.id),
        memberRole: "member",
        consortiumMemberStatus: "active",
        joinedAt: "2026-01-01T00:00:00.000Z",
      });
    }
  }

  const prodData = readDataJson("data-products.json");
  const products = [...(prodData.configuredProducts ?? prodData.products ?? [])] as any[];
  const productNextId =
    products.reduce((m, p) => {
      const n = parseInt(String(p.id).replace(/\D/g, ""), 10);
      return Number.isFinite(n) ? Math.max(m, n) : m;
    }, 0) + 1;

  // ── Seed product-level data policies (masked fields) ─────────────────────
  const nowIso = new Date().toISOString();
  const seedMaskedFields = [
    { fieldName: "PAN", dataType: "string", sensitivityTag: "HIGH" },
    { fieldName: "NationalId", dataType: "string", sensitivityTag: "HIGH" },
    { fieldName: "DateOfBirth", dataType: "date", sensitivityTag: "HIGH" },
    { fieldName: "Phone", dataType: "string", sensitivityTag: "MEDIUM" },
    { fieldName: "Email", dataType: "string", sensitivityTag: "MEDIUM" },
    { fieldName: "Name", dataType: "string", sensitivityTag: "HIGH" },
    { fieldName: "AddressLine1", dataType: "string", sensitivityTag: "MEDIUM" },
  ];
  const dataPolicies = products.map((p: any, idx: number) => ({
    id: `dp_seed_${idx + 1}`,
    institutionId: "HCB",
    productId: String(p.id),
    fields: seedMaskedFields.map((f) => ({
      fieldName: f.fieldName,
      isMasked: true,
      isUnmasked: false,
      unmaskType: null,
      dataType: f.dataType,
      sensitivityTag: f.sensitivityTag,
    })),
    updatedBy: "system",
    updatedAt: nowIso,
  }));
  const dataPolicyNextId = dataPolicies.length + 1;

  let institutionProductSubscriptionNextId = 1;
  const institutionProductSubscriptions: any[] = [];
  const seedSubProducts = products.slice(0, 2);
  for (const inst of institutions) {
    for (const p of seedSubProducts) {
      institutionProductSubscriptions.push({
        subscriptionId: institutionProductSubscriptionNextId++,
        institutionId: inst.id,
        productId: String(p.id),
        subscriptionStatus: "active",
        subscribedAt: "2026-01-15T00:00:00.000Z",
      });
    }
  }

  const um = readDataJson("user-management.json");
  const roles = (um.roleDefinitions as any[]).map((r: any, i: number) => ({
    id: String(i + 1),
    roleName: r.role,
    description: r.description,
    permissions: sectionMatrixForRoleName(String(r.role)) as Record<string, Record<string, boolean>>,
    createdAt: "2026-01-01T00:00:00.000Z",
  }));
  const roleNextId = roles.length + 1;

  const { auditLog, auditNextId } = buildAuditLogSeed(
    um,
    users.map((u: { id: number; email: string }) => ({ id: u.id, email: u.email })),
  );

  const alertData = readDataJson("alert-engine.json");
  const monitoringData = readDataJson("monitoring.json");
  const dashboardData = readDataJson("dashboard.json");
  const dgData = readDataJson("data-governance.json");
  const dataSubmitterIdByApiKey = (monitoringData.dataSubmitterIdByApiKey ?? {}) as Record<string, string>;
  const subscriberIdByApiKey = (monitoringData.subscriberIdByApiKey ?? {}) as Record<string, string>;

  const enquiryLogEntries = (monitoringData.enquiryLogEntries ?? []) as Record<string, unknown>[];
  const enquiries = buildEnquiryStateRows({
    seed: enquiryLogEntries,
    institutions: institutions as { id: number; name: string; isSubscriber?: boolean }[],
    subscriberIdByApiKey,
  }) as any[];

  return {
    institutions,
    institutionTypes,
    requiredComplianceDocuments,
    institutionNextId,
    users,
    userNextId,
    approvals,
    reports,
    auditLog,
    auditNextId,
    apiKeys,
    apiKeyNextId,
    consortiums,
    consortiumNextId,
    products,
    productNextId,
    dataPolicies,
    dataPolicyNextId,
    roles,
    roleNextId,
    refreshTokens: new Map(),
    alertRules: alertData.alertRules ?? [],
    alertIncidents: alertData.activeAlerts ?? [],
    slaConfigs: alertData.slaConfigs ?? [],
    slaBreachHistory: alertData.slaBreachHistory ?? [],
    batchJobs: monitoringData.batchJobs ?? [],
    batchDetails: {} as Record<string, any>,
    batchKpis: monitoringData.batchKpis ?? { active: 0, queued: 0, failed24h: 0 },
    monitoringKpis: monitoringData.apiSubmissionKpis ?? {
      totalCallsToday: 0,
      successRatePercent: 99,
      p95LatencyMs: 120,
      avgProcessingTimeMs: 80,
      rejectionRatePercent: 1,
      activeApiKeys: 12,
    },
    monitoringCharts: {
      apiCallVolume30Days: monitoringData.apiCallVolume30Days ?? [],
      latencyTrendData: monitoringData.latencyTrendData ?? [],
      successVsFailureData: monitoringData.successVsFailureData ?? [],
      topRejectionReasonsData: monitoringData.topRejectionReasonsData ?? [],
    },
    apiRequests: buildApiSubmissionRequests((monitoringData.apiSubmissionRequests ?? []) as Record<string, unknown>[]),
    enquiries,
    dashboardActivity: (dashboardData.recentActivity as any[]).map((a: any, i: number) => {
      const names = dashboardData.institutions as string[];
      const inst = names[a.institutionIndex ?? 0] ?? "System";
      return {
        id: i + 1,
        actionType: "VIEW",
        entityType: "SYSTEM",
        entityId: String(i),
        description: a.action ?? "",
        auditOutcome: a.status === "success" ? "success" : a.status === "warning" ? "failure" : "info",
        occurredAt: new Date().toISOString(),
        userName: inst,
        userEmail: "ops@hcb.com",
      };
    }),
    governanceKpis: dgData.governanceKpis ?? dgData,
    ingestionDriftAlerts: JSON.parse(JSON.stringify(dgData.driftAlerts ?? [])) as IngestionDriftAlert[],
    dataQualityRows: dgData.validationFailureBySource ?? [],
    dataSubmitterIdByApiKey,
    institutionConsortiumMemberships,
    institutionConsortiumMembershipNextId,
    institutionProductSubscriptions,
    institutionProductSubscriptionNextId,
    alertCharts: {
      triggeredOverTime: alertData.alertsTriggeredOverTime ?? [],
      byDomain: alertData.alertsByDomain ?? [],
      severityDistribution: alertData.severityDistribution ?? [],
      mttrTrend: alertData.mttrTrendData ?? [],
    },
    dashboardChartsExtra: {
      apiUsageTrend: monitoringData.apiCallVolume30Days ?? [],
      mappingAccuracy: dgData.mappingAccuracyTrend30 ?? [],
      matchConfidence: dgData.matchConfidenceDistribution ?? [],
      slaLatency: monitoringData.latencyTrendData ?? [],
      rejectionOverride: [
        { week: "W1", rejected: 118, overridden: 11 },
        { week: "W2", rejected: 102, overridden: 9 },
        { week: "W3", rejected: 96, overridden: 14 },
        { week: "W4", rejected: 88, overridden: 8 },
        { week: "W5", rejected: 81, overridden: 7 },
        { week: "W6", rejected: 74, overridden: 6 },
      ],
    },
    dashboardSeed: dashboardData as Record<string, unknown>,
    consortiumMembers,
    consentFailureMetricsTemplate,
    schemaMapper: createSchemaMapperSlice(),
  };
}

export function pushAudit(state: AppState, entry: Omit<any, "id" | "occurredAt"> & Partial<any>) {
  const row = {
    id: state.auditNextId++,
    occurredAt: new Date().toISOString(),
    auditOutcome: "SUCCESS",
    ...entry,
  };
  state.auditLog.unshift(row);
  return row;
}
