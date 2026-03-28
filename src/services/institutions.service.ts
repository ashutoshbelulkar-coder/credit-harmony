/**
 * Institution service — normalised API calls for the institutions domain.
 * Falls back to mock data when VITE_USE_MOCK_FALLBACK=true and backend unreachable.
 */
import { get, post, patch, del, buildQuery, ApiError } from "@/lib/api-client";
import { institutions as mockInstitutions, getInstitutionById as mockGetById } from "@/data/institutions-mock";

const BASE = "/v1/institutions";
const USE_MOCK = import.meta.env.VITE_USE_MOCK_FALLBACK === "true";

// ─── Response Types ──────────────────────────────────────────────────────────

export interface InstitutionResponse {
  id: number;
  name: string;
  tradingName?: string;
  institutionType: string;
  institutionLifecycleStatus: string;
  registrationNumber: string;
  jurisdiction: string;
  licenseType?: string;
  licenseNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
  onboardedAt?: string;
  isDataSubmitter: boolean;
  isSubscriber: boolean;
  billingModel?: string;
  creditBalance?: number;
  dataQualityScore?: number;
  matchAccuracyScore?: number;
  slaHealthPercent?: number;
  apisEnabledCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface InstitutionListParams {
  search?: string;
  status?: string;
  type?: string;
  role?: "dataSubmitter" | "subscriber";
  page?: number;
  size?: number;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

// ─── Normalise mock → API shape ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseMockInstitution(m: any): InstitutionResponse {
  return {
    id: parseInt(m.id.replace(/\D/g, ""), 10) || 0,
    name: m.name,
    tradingName: m.tradingName,
    institutionType: m.type,
    institutionLifecycleStatus: m.status,
    registrationNumber: m.registrationNumber ?? "",
    jurisdiction: m.jurisdiction ?? "",
    licenseType: m.licenseType,
    licenseNumber: m.licenseNumber,
    contactEmail: m.contactEmail,
    contactPhone: m.contactPhone,
    onboardedAt: m.onboardedDate,
    isDataSubmitter: m.isDataSubmitter,
    isSubscriber: m.isSubscriber,
    billingModel: m.billingModel,
    creditBalance: m.creditBalance,
    dataQualityScore: m.dataQuality,
    matchAccuracyScore: m.matchAccuracy,
    slaHealthPercent: m.slaHealth,
    apisEnabledCount: m.apisEnabled ?? 0,
    createdAt: m.lastUpdated ?? "",
    updatedAt: m.lastUpdated ?? "",
  };
}

// ─── API Calls ────────────────────────────────────────────────────────────────

export async function fetchInstitutions(
  params?: InstitutionListParams
): Promise<PagedResponse<InstitutionResponse>> {
  try {
    return await get<PagedResponse<InstitutionResponse>>(`${BASE}${buildQuery(params ?? {})}`);
  } catch (err) {
    if (USE_MOCK && isNetworkOrServerError(err)) {
      let list = mockInstitutions.map(normaliseMockInstitution);
      if (params?.search) {
        const q = params.search.toLowerCase();
        list = list.filter((i) => i.name.toLowerCase().includes(q));
      }
      if (params?.status && params.status !== "all") {
        list = list.filter((i) => i.institutionLifecycleStatus === params.status);
      }
      if (params?.role === "dataSubmitter") list = list.filter((i) => i.isDataSubmitter);
      if (params?.role === "subscriber") list = list.filter((i) => i.isSubscriber);
      const page = params?.page ?? 0;
      const size = params?.size ?? 20;
      return {
        content: list.slice(page * size, (page + 1) * size),
        totalElements: list.length,
        totalPages: Math.max(1, Math.ceil(list.length / size)),
        page,
        size,
      };
    }
    throw err;
  }
}

export async function fetchInstitutionById(id: string | number): Promise<InstitutionResponse> {
  try {
    return await get<InstitutionResponse>(`${BASE}/${id}`);
  } catch (err) {
    if (USE_MOCK && isNetworkOrServerError(err)) {
      const m = mockGetById(String(id));
      if (!m) throw new ApiError(404, "ERR_NOT_FOUND", `Institution ${id} not found`);
      return normaliseMockInstitution(m);
    }
    throw err;
  }
}

export async function createInstitution(data: Partial<InstitutionResponse>): Promise<InstitutionResponse> {
  return post<InstitutionResponse>(BASE, data);
}

export async function updateInstitution(id: string | number, data: Partial<InstitutionResponse>): Promise<InstitutionResponse> {
  return patch<InstitutionResponse>(`${BASE}/${id}`, data);
}

export async function suspendInstitution(id: string | number): Promise<void> {
  return post(`${BASE}/${id}/suspend`);
}

export async function reactivateInstitution(id: string | number): Promise<void> {
  return post(`${BASE}/${id}/reactivate`);
}

export async function deleteInstitution(id: string | number): Promise<void> {
  return del(`${BASE}/${id}`);
}

// ─── Institution Sub-resource Types ──────────────────────────────────────────

export interface ConsortiumMembershipRow {
  membershipId: number;
  consortiumId: number;
  consortiumName: string;
  consortiumType: string;
  consortiumStatus: string;
  memberRole: string;
  consortiumMemberStatus: string;
  joinedAt: string;
}

export interface ProductSubscriptionRow {
  subscriptionId: number;
  productId: number;
  productName: string;
  productStatus: string;
  pricingModel: string;
  subscribedAt: string;
  subscriptionStatus: string;
}

export interface BillingSummary {
  billingModel: string;
  creditBalance: number;
  activeSubscriptions: number;
  apiCalls30d: number;
}

export interface MonitoringSummary {
  totalRequests: number;
  successfulRequests: number;
  avgLatencyMs: number;
  successRatePct: number;
  totalBatches: number;
  activeBatches: number;
  totalRecords: number;
}

// ─── Institution Sub-resource API Calls ──────────────────────────────────────

export async function fetchConsortiumMemberships(id: string | number): Promise<ConsortiumMembershipRow[]> {
  return get<ConsortiumMembershipRow[]>(`${BASE}/${id}/consortium-memberships`);
}

export async function fetchProductSubscriptions(id: string | number): Promise<ProductSubscriptionRow[]> {
  return get<ProductSubscriptionRow[]>(`${BASE}/${id}/product-subscriptions`);
}

export async function fetchBillingSummary(id: string | number): Promise<BillingSummary> {
  return get<BillingSummary>(`${BASE}/${id}/billing-summary`);
}

export async function fetchMonitoringSummary(id: string | number): Promise<MonitoringSummary> {
  return get<MonitoringSummary>(`${BASE}/${id}/monitoring-summary`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isNetworkOrServerError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true; // network error
  return err.isServerError;
}
