import { get, post, buildQuery, ApiError } from "@/lib/api-client";
import { clientMockFallbackEnabled } from "@/lib/client-mock-fallback";

const BASE = "/v1/api-keys";

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
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) return [];
    throw err;
  }
}

export async function regenerateApiKey(id: number): Promise<ApiKeyResponse> {
  // Non-empty JSON body: some stacks reject `application/json` with an empty body (e.g. Fastify).
  return post<ApiKeyResponse>(`${BASE}/${id}/regenerate`, {});
}

export async function revokeApiKey(id: number): Promise<void> {
  return post(`${BASE}/${id}/revoke`, {});
}

export async function createApiKey(params: {
  institutionId: number;
  environment: "sandbox" | "uat" | "prod";
}): Promise<ApiKeyResponse> {
  return post<ApiKeyResponse>(BASE, {
    institutionId: params.institutionId,
    environment: params.environment,
  });
}
