import { get, buildQuery, ApiError } from "@/lib/api-client";
import {
  apiSubmissionRequests as mockRequests,
  apiSubmissionKpis as mockKpis,
  enquiryLogEntries as mockEnquiries,
  apiCallVolume30Days,
  latencyTrendData,
  successVsFailureData,
  topRejectionReasonsData,
} from "@/data/monitoring-mock";

const BASE = "/v1/monitoring";
const USE_MOCK = import.meta.env.VITE_USE_MOCK_FALLBACK === "true";

import type { PagedResponse } from "./institutions.service";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiRequestRecord {
  requestId: string;
  apiKey: string;
  endpoint: string;
  status: string;
  responseTimeMs: number;
  records: number;
  errorCode: string | null;
  timestamp: string;
  institutionId?: string;
}

export interface MonitoringKpis {
  totalCallsToday: number;
  successRatePercent: number;
  p95LatencyMs: number;
  avgProcessingTimeMs: number;
  rejectionRatePercent: number;
  activeApiKeys: number;
}

export interface EnquiryRecord {
  enquiryId: string;
  institution: string;
  status: string;
  responseTimeMs: number;
  enquiryType: string;
  timestamp: string;
  consumerId?: string;
}

export interface MonitoringCharts {
  apiCallVolume30Days: { day: string; volume: number }[];
  latencyTrendData: { day: string; p95: number; p99: number }[];
  successVsFailureData: { name: string; value: number }[];
  topRejectionReasonsData: { reason: string; count: number }[];
}

export interface ApiRequestListParams {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  institutionId?: string;
  apiKey?: string;
  page?: number;
  size?: number;
}

// ─── Normalisers ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseMockRequest(m: any): ApiRequestRecord {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseMockEnquiry(m: any): EnquiryRecord {
  return {
    enquiryId: m.id ?? m.enquiry_id ?? "",
    institution: m.institution ?? "",
    status: m.status ?? "Success",
    responseTimeMs: m.response_time_ms ?? 0,
    enquiryType: m.enquiry_type ?? "Standard",
    timestamp: m.timestamp ?? "",
    consumerId: m.consumer_id,
  };
}

function isNetworkOrServerError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.isServerError;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function fetchApiRequests(params?: ApiRequestListParams): Promise<PagedResponse<ApiRequestRecord>> {
  try {
    return await get<PagedResponse<ApiRequestRecord>>(`${BASE}/api-requests${buildQuery(params ?? {})}`);
  } catch (err) {
    if (USE_MOCK && isNetworkOrServerError(err)) {
      const list = mockRequests.map(normaliseMockRequest);
      const page = params?.page ?? 0;
      const size = params?.size ?? 20;
      return { content: list.slice(page * size, (page + 1) * size), totalElements: list.length, totalPages: Math.max(1, Math.ceil(list.length / size)), page, size };
    }
    throw err;
  }
}

export async function fetchMonitoringKpis(): Promise<MonitoringKpis> {
  try {
    return await get<MonitoringKpis>(`${BASE}/kpis`);
  } catch (err) {
    if (USE_MOCK && isNetworkOrServerError(err)) {
      return mockKpis as MonitoringKpis;
    }
    throw err;
  }
}

export async function fetchEnquiries(params?: ApiRequestListParams): Promise<PagedResponse<EnquiryRecord>> {
  try {
    return await get<PagedResponse<EnquiryRecord>>(`${BASE}/enquiries${buildQuery(params ?? {})}`);
  } catch (err) {
    if (USE_MOCK && isNetworkOrServerError(err)) {
      const list = (mockEnquiries ?? []).map(normaliseMockEnquiry);
      const page = params?.page ?? 0;
      const size = params?.size ?? 20;
      return { content: list.slice(page * size, (page + 1) * size), totalElements: list.length, totalPages: Math.max(1, Math.ceil(list.length / size)), page, size };
    }
    throw err;
  }
}

export async function fetchMonitoringCharts(): Promise<MonitoringCharts> {
  try {
    return await get<MonitoringCharts>(`${BASE}/charts`);
  } catch (err) {
    if (USE_MOCK && isNetworkOrServerError(err)) {
      return { apiCallVolume30Days, latencyTrendData, successVsFailureData, topRejectionReasonsData };
    }
    throw err;
  }
}
