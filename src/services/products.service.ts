import { get, post, patch, del, buildQuery, ApiError } from "@/lib/api-client";
import { clientMockFallbackEnabled } from "@/lib/client-mock-fallback";
import type { ProductCatalogPacketOption } from "@/data/data-products-mock";
import type { PagedResponse } from "./institutions.service";

const BASE = "/v1/products";

export interface ProductResponse {
  id: string;
  /** Business code (e.g. PRD_001); list/detail from Spring include this for display and catalogue merge. */
  productCode?: string;
  name: string;
  type: string;
  status: string;
  description?: string;
  price?: number;
  currency?: string;
  lastUpdated?: string;
  /** Present when product was created or updated via the catalogue API (Fastify dev API). */
  packetIds?: string[];
  packetConfigs?: unknown[];
  enquiryConfig?: Record<string, unknown>;
  pricingModel?: string;
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

export interface ProductPacketCatalogResponse {
  options: ProductCatalogPacketOption[];
}

/** Same shape as `src/data/data-products.json` → `productCatalogPacketOptions` (Schema Mapper `sourceType`, `category`, `derivedFields`, … per packet). */
export async function fetchProductPacketCatalog(): Promise<ProductPacketCatalogResponse> {
  try {
    return await get<ProductPacketCatalogResponse>(`${BASE}/packet-catalog`);
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) {
      const { productCatalogPacketOptions } = await import("@/data/data-products-mock");
      return { options: productCatalogPacketOptions };
    }
    throw err;
  }
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
