import { get, post, buildQuery, ApiError } from "@/lib/api-client";

const BASE = "/v1/api-keys";
const USE_MOCK = import.meta.env.VITE_USE_MOCK_FALLBACK === "true";

export interface ApiKeyResponse {
  id: number;
  keyPrefix: string;
  environment: string;
  status: string;
  institutionId: number;
  institutionName?: string;
  createdAt: string;
  lastUsedAt?: string;
  rateLimit?: number;
}

function isNetworkOrServerError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.isServerError;
}

export async function fetchApiKeysByInstitution(institutionId: string | number): Promise<ApiKeyResponse[]> {
  try {
    return await get<ApiKeyResponse[]>(`${BASE}${buildQuery({ institutionId })}`);
  } catch (err) {
    if (USE_MOCK && isNetworkOrServerError(err)) return [];
    throw err;
  }
}

export async function regenerateApiKey(id: number): Promise<ApiKeyResponse> {
  return post<ApiKeyResponse>(`${BASE}/${id}/regenerate`);
}

export async function revokeApiKey(id: number): Promise<void> {
  return post(`${BASE}/${id}/revoke`);
}
