import { get, post, buildQuery, ApiError } from "@/lib/api-client";
import { approvalQueueItems as mockItems } from "@/data/approval-queue-mock";

const BASE = "/v1/approvals";
const USE_MOCK = import.meta.env.VITE_USE_MOCK_FALLBACK === "true";

import type { PagedResponse } from "./institutions.service";

export interface ApprovalResponse {
  id: string;
  type: string;
  name: string;
  description: string;
  submittedBy: string;
  submittedAt: string;
  status: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  metadata: Record<string, string>;
}

export interface ApprovalListParams {
  type?: string;
  status?: string;
  page?: number;
  size?: number;
}

function isNetworkOrServerError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.isServerError;
}

export async function fetchApprovals(params?: ApprovalListParams): Promise<PagedResponse<ApprovalResponse>> {
  try {
    return await get<PagedResponse<ApprovalResponse>>(`${BASE}${buildQuery(params ?? {})}`);
  } catch (err) {
    if (USE_MOCK && isNetworkOrServerError(err)) {
      let list = [...mockItems] as ApprovalResponse[];
      if (params?.type && params.type !== "all") list = list.filter((i) => i.type === params.type);
      if (params?.status && params.status !== "all") list = list.filter((i) => i.status === params.status);
      const page = params?.page ?? 0;
      const size = params?.size ?? 20;
      return { content: list.slice(page * size, (page + 1) * size), totalElements: list.length, totalPages: Math.max(1, Math.ceil(list.length / size)), page, size };
    }
    throw err;
  }
}

export async function approveItem(id: string, comment?: string): Promise<void> {
  return post(`${BASE}/${id}/approve`, { comment });
}

export async function rejectItem(id: string, reason: string): Promise<void> {
  return post(`${BASE}/${id}/reject`, { reason });
}

export async function requestChanges(id: string, comment: string): Promise<void> {
  return post(`${BASE}/${id}/request-changes`, { comment });
}
