import { get, post, patch, del, buildQuery, ApiError } from "@/lib/api-client";
import { clientMockFallbackEnabled } from "@/lib/client-mock-fallback";
import type { PagedResponse } from "./institutions.service";

const BASE = "/v1/products";

export interface ProductResponse {
  id: string;
  name: string;
  type: string;
  status: string;
  description?: string;
  price?: number;
  currency?: string;
  lastUpdated?: string;
}

export interface ProductListParams {
  search?: string;
  status?: string;
  type?: string;
  page?: number;
  size?: number;
}

function isNetworkOrServerError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.isServerError;
}

export async function fetchProducts(params?: ProductListParams): Promise<PagedResponse<ProductResponse>> {
  try {
    return await get<PagedResponse<ProductResponse>>(`${BASE}${buildQuery(params ?? {})}`);
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) {
      const { configuredProducts } = await import("@/data/data-products-mock");
      const list = (configuredProducts ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        type: p.category ?? "",
        status: p.lifecycleStatus ?? "active",
        description: p.description,
        lastUpdated: p.updatedAt,
      })) as ProductResponse[];
      const page = params?.page ?? 0;
      const size = params?.size ?? 20;
      return { content: list.slice(page * size, (page + 1) * size), totalElements: list.length, totalPages: Math.max(1, Math.ceil(list.length / size)), page, size };
    }
    throw err;
  }
}

export async function fetchProductById(id: string): Promise<ProductResponse> {
  return get<ProductResponse>(`${BASE}/${id}`);
}

export async function createProduct(data: Partial<ProductResponse>): Promise<ProductResponse> {
  return post<ProductResponse>(BASE, data);
}

export async function updateProduct(id: string, data: Partial<ProductResponse>): Promise<ProductResponse> {
  return patch<ProductResponse>(`${BASE}/${id}`, data);
}

export async function deleteProduct(id: string): Promise<void> {
  return del(`${BASE}/${id}`);
}
