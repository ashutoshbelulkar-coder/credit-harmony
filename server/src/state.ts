import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { dataPath } from "./paths.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type RefreshRecord = { userId: number; expiresAt: number };

export interface AppState {
  institutions: any[];
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
  dataQualityRows: any[];
  dataSubmitterIdByApiKey: Record<string, string>;
  alertCharts: {
    triggeredOverTime: unknown[];
    byDomain: unknown[];
    severityDistribution: unknown[];
    mttrTrend: unknown[];
  };
  dashboardChartsExtra: Record<string, unknown>;
  /** Raw `dashboard.json` for command-center agents / anomalies templates. */
  dashboardSeed: Record<string, unknown>;
  /** Static template for institution overview tab charts (until per-institution analytics exist). */
  institutionOverviewCharts: Record<string, unknown>;
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

  const auditLog: any[] = [];
  const auditNextId = 1;

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

  const prodData = readDataJson("data-products.json");
  const products = [...(prodData.configuredProducts ?? prodData.products ?? [])] as any[];
  const productNextId =
    products.reduce((m, p) => {
      const n = parseInt(String(p.id).replace(/\D/g, ""), 10);
      return Number.isFinite(n) ? Math.max(m, n) : m;
    }, 0) + 1;

  const um = readDataJson("user-management.json");
  const roles = (um.roleDefinitions as any[]).map((r: any, i: number) => ({
    id: String(i + 1),
    roleName: r.role,
    description: r.description,
    permissions: r.permissions ?? {},
    createdAt: "2026-01-01T00:00:00.000Z",
  }));
  const roleNextId = roles.length + 1;

  const alertData = readDataJson("alert-engine.json");
  const monitoringData = readDataJson("monitoring.json");
  const dashboardData = readDataJson("dashboard.json");
  const dgData = readDataJson("data-governance.json");
  const institutionDetailFile = readDataJson("institution-detail.json");
  const dataSubmitterIdByApiKey = (monitoringData.dataSubmitterIdByApiKey ?? {}) as Record<string, string>;

  return {
    institutions,
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
    apiRequests: monitoringData.apiSubmissionRequests ?? [],
    enquiries: [
      {
        id: "ENQ-1001",
        institution: "First National Bank",
        status: "Success",
        response_time_ms: 120,
        enquiry_type: "Standard",
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
        consumer_id: "C-9001",
      },
      {
        id: "ENQ-1002",
        institution: "Metro Credit Union",
        status: "Success",
        response_time_ms: 210,
        enquiry_type: "Hard",
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
        consumer_id: "C-9002",
      },
    ],
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
    dataQualityRows: dgData.validationFailureBySource ?? [],
    dataSubmitterIdByApiKey,
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
    institutionOverviewCharts: institutionDetailFile as Record<string, unknown>,
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
