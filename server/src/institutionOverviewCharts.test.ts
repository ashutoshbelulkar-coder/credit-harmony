import { describe, it, expect } from "vitest";
import type { AppState } from "./state.js";
import {
  buildInstitutionOverviewCharts,
  filterApiRequestsForSubmitter,
  filterEnquiriesForInstitution,
} from "./institutionOverviewCharts.js";

const fixedNow = new Date("2026-03-29T12:00:00.000Z");

function minimalState(over: Partial<AppState> = {}): AppState {
  return {
    institutions: [],
    institutionNextId: 1,
    users: [],
    userNextId: 1,
    approvals: [],
    reports: [],
    auditLog: [],
    auditNextId: 1,
    apiKeys: [],
    apiKeyNextId: 1,
    consortiums: [],
    consortiumNextId: 1,
    products: [],
    productNextId: 1,
    roles: [],
    roleNextId: 1,
    refreshTokens: new Map(),
    alertRules: [],
    alertIncidents: [],
    slaConfigs: [],
    slaBreachHistory: [],
    batchJobs: [],
    batchDetails: {},
    batchKpis: {},
    monitoringKpis: {},
    monitoringCharts: {},
    apiRequests: [],
    enquiries: [],
    dashboardActivity: [],
    governanceKpis: {},
    ingestionDriftAlerts: [],
    dataQualityRows: [],
    dataSubmitterIdByApiKey: {},
    institutionConsortiumMemberships: [],
    institutionConsortiumMembershipNextId: 1,
    institutionProductSubscriptions: [],
    institutionProductSubscriptionNextId: 1,
    alertCharts: { triggeredOverTime: [], byDomain: [], severityDistribution: [], mttrTrend: [] },
    dashboardChartsExtra: {},
    dashboardSeed: {},
    consortiumMembers: [],
    consentFailureMetricsTemplate: [],
    ...over,
  } as AppState;
}

describe("institutionOverviewCharts", () => {
  it("filterApiRequestsForSubmitter returns no rows when institution has no mapped API keys", () => {
    const state = minimalState({
      dataSubmitterIdByApiKey: { "sk_live_***7x2k": "1" },
      apiRequests: [
        {
          request_id: "R1",
          api_key: "sk_live_***7x2k",
          status: "Success",
          records: 100,
          response_time_ms: 50,
          error_code: null,
          timestamp: "2026-03-20 10:00:00",
        },
      ],
    });
    expect(filterApiRequestsForSubmitter(state, 999)).toEqual([]);
    expect(filterApiRequestsForSubmitter(state, 1).length).toBe(1);
  });

  it("buildInstitutionOverviewCharts ignores submission rows outside the 30d window", () => {
    const state = minimalState({
      institutions: [{ id: 1, name: "Bank" }],
      dataSubmitterIdByApiKey: { k1: "1" },
      apiRequests: [
        {
          request_id: "old",
          api_key: "k1",
          status: "Success",
          records: 9999,
          response_time_ms: 10,
          error_code: null,
          timestamp: "2025-01-01 10:00:00",
        },
        {
          request_id: "new",
          api_key: "k1",
          status: "Success",
          records: 50,
          response_time_ms: 100,
          error_code: null,
          timestamp: "2026-03-25 10:00:00",
        },
      ],
      enquiries: [],
    });
    const charts = buildInstitutionOverviewCharts(state, 1, fixedNow);
    expect(charts.submissionVolumeData.length).toBe(1);
    expect(charts.submissionVolumeData[0].volume).toBe(50);
    expect(charts.successVsRejectedData).toEqual([
      { name: "Success", value: 50 },
      { name: "Rejected", value: 0 },
    ]);
  });

  it("buildInstitutionOverviewCharts returns empty submission series for unmapped institution", () => {
    const state = minimalState({
      institutions: [{ id: 42, name: "New Co" }],
      dataSubmitterIdByApiKey: { k1: "1" },
      apiRequests: [
        {
          request_id: "x",
          api_key: "k1",
          status: "Success",
          records: 100,
          response_time_ms: 10,
          error_code: null,
          timestamp: "2026-03-25 10:00:00",
        },
      ],
      enquiries: [],
    });
    const charts = buildInstitutionOverviewCharts(state, 42, fixedNow);
    expect(charts.submissionVolumeData).toEqual([]);
    expect(charts.successVsRejectedData).toEqual([]);
    expect(charts.rejectionReasonsData).toEqual([]);
    expect(charts.processingTimeData).toEqual([]);
  });

  it("filterEnquiriesForInstitution matches institution_id and institution name", () => {
    const state = minimalState({
      institutions: [{ id: 3, name: "Subscriber Bank" }],
      enquiries: [
        { institution_id: 3, institution: "", timestamp: "2026-03-26 12:00:00", status: "Success", response_time_ms: 80 },
        { institution_id: 99, institution: "Subscriber Bank", timestamp: "2026-03-26 13:00:00", status: "Failed", response_time_ms: 90 },
        { institution_id: 5, institution: "Other", timestamp: "2026-03-26 14:00:00", status: "Success", response_time_ms: 10 },
      ],
    });
    const rows = filterEnquiriesForInstitution(state.institutions, state.enquiries, 3);
    expect(rows.length).toBe(2);
  });

  it("buildInstitutionOverviewCharts aggregates enquiries for subscriber member", () => {
    const state = minimalState({
      institutions: [{ id: 3, name: "Sub" }],
      apiRequests: [],
      enquiries: [
        {
          institution_id: 3,
          institution: "Sub",
          timestamp: "2026-03-28 10:00:00",
          status: "Success",
          response_time_ms: 100,
        },
        {
          institution_id: 3,
          institution: "Sub",
          timestamp: "2026-03-28 11:00:00",
          status: "Failed",
          response_time_ms: 200,
        },
      ],
    });
    const charts = buildInstitutionOverviewCharts(state, 3, fixedNow);
    expect(charts.enquiryVolumeData.length).toBeGreaterThanOrEqual(1);
    expect(charts.successVsFailedData).toEqual([
      { name: "Success", value: 1 },
      { name: "Failed", value: 1 },
    ]);
    expect(charts.responseTimeData.length).toBeGreaterThanOrEqual(1);
  });
});
