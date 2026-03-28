import { get, post, del, buildQuery, ApiError } from "@/lib/api-client";
import type { PagedResponse } from "./institutions.service";

const BASE = "/v1/reports";
const USE_MOCK = import.meta.env.VITE_USE_MOCK_FALLBACK === "true";

export interface ReportResponse {
  id: string;
  type: string;
  name: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  requestedBy: string;
  requestedAt: string;
  completedAt?: string;
  fileUrl?: string;
}

export interface ReportListParams {
  type?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
}

export interface CreateReportRequest {
  type: string;
  name: string;
  dateFrom: string;
  dateTo: string;
  parameters?: Record<string, string>;
}

function isNetworkOrServerError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.isServerError;
}

export async function fetchReports(params?: ReportListParams): Promise<PagedResponse<ReportResponse>> {
  try {
    return await get<PagedResponse<ReportResponse>>(`${BASE}${buildQuery(params ?? {})}`);
  } catch (err) {
    if (USE_MOCK && isNetworkOrServerError(err)) {
      // Import mock inline to avoid circular deps
      const { default: data } = await import("@/data/reporting.json");
      const list = (data.reports ?? []) as ReportResponse[];
      const page = params?.page ?? 0;
      const size = params?.size ?? 20;
      return { content: list.slice(page * size, (page + 1) * size), totalElements: list.length, totalPages: Math.max(1, Math.ceil(list.length / size)), page, size };
    }
    throw err;
  }
}

export async function createReport(data: CreateReportRequest): Promise<ReportResponse> {
  return post<ReportResponse>(BASE, data);
}

export async function deleteReport(id: string): Promise<void> {
  return del(`${BASE}/${id}`);
}

export async function cancelReport(id: string): Promise<void> {
  return post(`${BASE}/${id}/cancel`);
}

export async function retryReport(id: string): Promise<void> {
  return post(`${BASE}/${id}/retry`);
}
