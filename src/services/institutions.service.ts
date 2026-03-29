/**
 * Institution service — normalised API calls for the institutions domain.
 * Falls back to mock data when `clientMockFallbackEnabled` (dev + VITE_USE_MOCK_FALLBACK) and backend unreachable.
 */
import { get, post, postMultipart, patch, del, buildQuery, ApiError } from "@/lib/api-client";
import { clientMockFallbackEnabled } from "@/lib/client-mock-fallback";
import { institutions as mockInstitutions, getInstitutionById as mockGetById } from "@/data/institutions-mock";
import tabsData from "@/data/institution-tabs.json";

const BASE = "/v1/institutions";

// ─── Response Types ──────────────────────────────────────────────────────────

/** Compliance doc metadata on institution payloads (no binary; use GET .../documents/:id for content). */
export interface InstitutionComplianceDoc {
  id?: string;
  name: string;
  status: string;
  fileName?: string;
  mimeType?: string;
  uploadedAt?: string;
}

export interface InstitutionDocumentPayload {
  name: string;
  fileName: string;
  mimeType: string;
  dataBase64: string;
}

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
  complianceDocs?: InstitutionComplianceDoc[];
}

export interface InstitutionOverviewChartsPayload {
  submissionVolumeData: { day: string; volume: number }[];
  successVsRejectedData: { name: string; value: number }[];
  rejectionReasonsData: { reason: string; count: number }[];
  processingTimeData: { day: string; avgMs: number }[];
  enquiryVolumeData: { day: string; volume: number }[];
  successVsFailedData: { name: string; value: number }[];
  responseTimeData: { day: string; latency: number }[];
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
    complianceDocs: m.complianceDocs,
  };
}

// ─── API Calls ────────────────────────────────────────────────────────────────

export type FetchInstitutionsOptions = { allowMockFallback?: boolean };

export async function fetchInstitutions(
  params?: InstitutionListParams,
  options?: FetchInstitutionsOptions
): Promise<PagedResponse<InstitutionResponse>> {
  const allowMockFallback = options?.allowMockFallback !== false;
  try {
    return await get<PagedResponse<InstitutionResponse>>(`${BASE}${buildQuery(params ?? {})}`);
  } catch (err) {
    if (allowMockFallback && clientMockFallbackEnabled && isNetworkOrServerError(err)) {
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

export async function fetchInstitutionOverviewCharts(id: string | number): Promise<InstitutionOverviewChartsPayload> {
  return get<InstitutionOverviewChartsPayload>(`${BASE}/${id}/overview-charts`);
}

export async function uploadInstitutionDocument(
  institutionId: string | number,
  documentName: string,
  file: File
): Promise<{ complianceDocs: InstitutionComplianceDoc[] }> {
  const fd = new FormData();
  fd.append("documentName", documentName);
  fd.append("file", file);
  return postMultipart<{ complianceDocs: InstitutionComplianceDoc[] }>(`${BASE}/${institutionId}/documents`, fd);
}

export async function fetchInstitutionDocument(
  institutionId: string | number,
  documentId: string,
  signal?: AbortSignal
): Promise<InstitutionDocumentPayload> {
  return get<InstitutionDocumentPayload>(
    `${BASE}/${institutionId}/documents/${encodeURIComponent(documentId)}`,
    signal
  );
}

export async function fetchInstitutionById(id: string | number): Promise<InstitutionResponse> {
  try {
    return await get<InstitutionResponse>(`${BASE}/${id}`);
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) {
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
  consortiumId: string | number;
  consortiumName: string;
  consortiumType: string;
  consortiumStatus: string;
  memberRole: string;
  consortiumMemberStatus: string;
  joinedAt: string;
}

export interface CreateConsortiumMembershipBody {
  consortiumId: string;
  memberRole: string;
  consortiumMemberStatus?: string;
}

export interface ProductSubscriptionRow {
  subscriptionId: number;
  /** Catalogue id (e.g. PRD_001) when returned by API */
  productId: string | number;
  productName: string;
  productStatus: string;
  pricingModel: string;
  subscribedAt: string;
  subscriptionStatus: string;
  /** Effective rate after member-specific overrides */
  ratePerCall?: number;
}

export interface BillingSummary {
  billingModel: string;
  creditBalance: number;
  activeSubscriptions: number;
  apiCalls30d: number;
  lowCreditAlertThreshold?: number;
}

export interface InstitutionBillingPatchBody {
  billingModel?: string;
  lowCreditAlertThreshold?: number;
  memberRateOverrides?: Record<string, number>;
}

export interface InstitutionBillingPatchResult {
  billingModel: string;
  creditBalance: number;
  lowCreditAlertThreshold: number;
  memberRateOverrides: Record<string, number>;
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

export interface InstitutionApiAccessSection {
  enabled: boolean;
  rateLimitPerMin: number;
  ipWhitelist: string[];
}

export interface InstitutionEnquiryApiAccess extends InstitutionApiAccessSection {
  concurrentLimit: number;
}

export interface InstitutionApiAccessPayload {
  dataSubmission: InstitutionApiAccessSection;
  enquiry: InstitutionEnquiryApiAccess;
}

export type InstitutionApiAccessPatch = Partial<{
  dataSubmission: Partial<InstitutionApiAccessSection>;
  enquiry: Partial<InstitutionEnquiryApiAccess>;
}>;

export type InstitutionConsentPolicy = "explicit" | "deemed" | "per-enquiry";
export type InstitutionConsentCaptureMode = "api-header" | "upload-artifact" | "account-aggregator";

export interface InstitutionConsentFailurePoint {
  day: string;
  failures: number;
}

export interface InstitutionConsentPayload {
  policy: InstitutionConsentPolicy;
  expiryDays: number;
  scopeCreditReport: boolean;
  scopeAlternateData: boolean;
  captureMode: InstitutionConsentCaptureMode;
  failureMetrics: InstitutionConsentFailurePoint[];
}

export type InstitutionConsentPatch = Partial<{
  policy: InstitutionConsentPolicy;
  expiryDays: number;
  scopeCreditReport: boolean;
  scopeAlternateData: boolean;
  captureMode: InstitutionConsentCaptureMode;
  failureMetrics: InstitutionConsentFailurePoint[];
}>;

export function defaultInstitutionApiAccessPayload(): InstitutionApiAccessPayload {
  return {
    dataSubmission: { enabled: true, rateLimitPerMin: 200, ipWhitelist: [] },
    enquiry: { enabled: true, rateLimitPerMin: 100, ipWhitelist: [], concurrentLimit: 50 },
  };
}

// ─── Institution Sub-resource API Calls ──────────────────────────────────────

export async function fetchConsortiumMemberships(id: string | number): Promise<ConsortiumMembershipRow[]> {
  return get<ConsortiumMembershipRow[]>(`${BASE}/${id}/consortium-memberships`);
}

export async function createConsortiumMembership(
  institutionId: string | number,
  body: CreateConsortiumMembershipBody
): Promise<ConsortiumMembershipRow> {
  return post<ConsortiumMembershipRow>(`${BASE}/${institutionId}/consortium-memberships`, body);
}

export async function deleteConsortiumMembership(institutionId: string | number, membershipId: number): Promise<void> {
  return del(`${BASE}/${institutionId}/consortium-memberships/${membershipId}`);
}

export async function fetchProductSubscriptions(id: string | number): Promise<ProductSubscriptionRow[]> {
  return get<ProductSubscriptionRow[]>(`${BASE}/${id}/product-subscriptions`);
}

export interface AddProductSubscriptionsBody {
  productIds: string[];
}

export async function addProductSubscriptions(
  institutionId: string | number,
  body: AddProductSubscriptionsBody
): Promise<ProductSubscriptionRow[]> {
  return post<ProductSubscriptionRow[]>(`${BASE}/${institutionId}/product-subscriptions`, body);
}

export async function patchProductSubscription(
  institutionId: string | number,
  subscriptionId: number,
  body: { subscriptionStatus: string }
): Promise<ProductSubscriptionRow> {
  return patch<ProductSubscriptionRow>(
    `${BASE}/${institutionId}/product-subscriptions/${subscriptionId}`,
    body
  );
}

export async function fetchBillingSummary(id: string | number): Promise<BillingSummary> {
  return get<BillingSummary>(`${BASE}/${id}/billing-summary`);
}

export async function patchInstitutionBilling(
  id: string | number,
  body: InstitutionBillingPatchBody
): Promise<InstitutionBillingPatchResult> {
  return patch<InstitutionBillingPatchResult>(`${BASE}/${id}/billing`, body);
}

export async function fetchMonitoringSummary(id: string | number): Promise<MonitoringSummary> {
  return get<MonitoringSummary>(`${BASE}/${id}/monitoring-summary`);
}

export async function fetchInstitutionApiAccess(id: string | number): Promise<InstitutionApiAccessPayload> {
  try {
    return await get<InstitutionApiAccessPayload>(`${BASE}/${id}/api-access`);
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) {
      return defaultInstitutionApiAccessPayload();
    }
    throw err;
  }
}

export async function patchInstitutionApiAccess(
  id: string | number,
  body: InstitutionApiAccessPatch
): Promise<InstitutionApiAccessPayload> {
  return patch<InstitutionApiAccessPayload>(`${BASE}/${id}/api-access`, body);
}

export function defaultInstitutionConsentPayload(): InstitutionConsentPayload {
  const metrics = (tabsData.consent?.consentFailureData ?? []) as InstitutionConsentFailurePoint[];
  return {
    policy: "explicit",
    expiryDays: 90,
    scopeCreditReport: true,
    scopeAlternateData: false,
    captureMode: "api-header",
    failureMetrics: metrics.map((p) => ({ ...p })),
  };
}

export async function fetchInstitutionConsent(id: string | number): Promise<InstitutionConsentPayload> {
  try {
    return await get<InstitutionConsentPayload>(`${BASE}/${id}/consent`);
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) {
      return defaultInstitutionConsentPayload();
    }
    throw err;
  }
}

export async function patchInstitutionConsent(
  id: string | number,
  body: InstitutionConsentPatch
): Promise<InstitutionConsentPayload> {
  return patch<InstitutionConsentPayload>(`${BASE}/${id}/consent`, body);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isNetworkOrServerError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true; // network error
  return err.isServerError;
}
