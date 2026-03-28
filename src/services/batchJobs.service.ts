import { get, post, buildQuery, ApiError } from "@/lib/api-client";
import { clientMockFallbackEnabled } from "@/lib/client-mock-fallback";
import { batchJobs as mockBatchJobs, batchDetails as mockBatchDetails, batchKpis as mockBatchKpis } from "@/data/monitoring-mock";

const BASE = "/v1/batch-jobs";

import type { PagedResponse } from "./institutions.service";

export interface BatchJobResponse {
  batchId: string;
  fileName: string;
  status: string;
  totalRecords: number;
  successRecords: number;
  failedRecords: number;
  successRate: number;
  durationSeconds: number;
  uploadedAt: string;
  uploadedBy: string;
  institutionId?: string;
}

export interface BatchJobParams {
  status?: string;
  institutionId?: string;
  timePeriod?: string;
  page?: number;
  size?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseMockBatchJob(m: any): BatchJobResponse {
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

function isNetworkOrServerError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.isServerError;
}

export async function fetchBatchJobs(params?: BatchJobParams): Promise<PagedResponse<BatchJobResponse>> {
  try {
    return await get<PagedResponse<BatchJobResponse>>(`${BASE}${buildQuery(params ?? {})}`);
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) {
      const list = mockBatchJobs.map(normaliseMockBatchJob);
      const page = params?.page ?? 0;
      const size = params?.size ?? 20;
      return { content: list, totalElements: list.length, totalPages: Math.max(1, Math.ceil(list.length / size)), page, size };
    }
    throw err;
  }
}

export async function fetchBatchJobById(id: string): Promise<BatchJobResponse> {
  try {
    return await get<BatchJobResponse>(`${BASE}/${id}`);
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) {
      const m = mockBatchJobs.find((j) => j.batch_id === id);
      if (!m) throw new ApiError(404, "ERR_NOT_FOUND", `Batch ${id} not found`);
      return normaliseMockBatchJob(m);
    }
    throw err;
  }
}

export async function fetchBatchDetail(id: string) {
  try {
    return await get(`${BASE}/${id}/detail`);
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) {
      return mockBatchDetails[id] ?? null;
    }
    throw err;
  }
}

export async function fetchBatchKpis() {
  try {
    return await get(`${BASE}/kpis`);
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) return mockBatchKpis;
    throw err;
  }
}

export async function retryBatchJob(id: string): Promise<void> {
  return post(`${BASE}/${id}/retry`);
}

export async function cancelBatchJob(id: string): Promise<void> {
  return post(`${BASE}/${id}/cancel`);
}
