import { get, post, buildQuery, ApiError } from "@/lib/api-client";
import { clientMockFallbackEnabled } from "@/lib/client-mock-fallback";
import type { DataPolicy } from "@/types/data-policy";

const BASE = "/v1/data-policy";

function isNetworkOrServerError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.isServerError;
}

function isMissingEndpoint(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  return err.status === 404 || err.status === 405 || err.status === 501;
}

export async function fetchDataPolicy(params: {
  institutionId: string;
  productId: string;
}): Promise<DataPolicy> {
  try {
    return await get<DataPolicy>(`${BASE}${buildQuery(params)}`);
  } catch (err) {
    // Data Policy is mock-first in this portal; if the canonical API doesn't yet expose it,
    // fall back to the deterministic client mock so the UI remains usable.
    if (isMissingEndpoint(err) || (clientMockFallbackEnabled && isNetworkOrServerError(err))) {
      const { buildMockDataPolicy } = await import("@/data/data-policy-mock");
      return buildMockDataPolicy(params);
    }
    throw err;
  }
}

export async function saveDataPolicy(body: DataPolicy): Promise<DataPolicy> {
  try {
    return await post<DataPolicy>(BASE, body);
  } catch (err) {
    if (isMissingEndpoint(err) || (clientMockFallbackEnabled && isNetworkOrServerError(err))) {
      // In fallback mode, just echo the payload with a fresh updatedAt.
      return { ...body, updatedAt: new Date().toISOString() };
    }
    throw err;
  }
}

