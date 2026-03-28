import data from "./data-products.json";
import type { SourceType } from "@/types/schema-mapper";
import { getRawIngestedFieldKeysForSourceType } from "@/data/schema-mapper-mock";

export type DataPacketCategory = "Bureau" | "Banking" | "GST" | "Telecom" | "Consortium";
export type DataPacketStatus = "active" | "deprecated" | "draft";
export type ProductLifecycleStatus = "draft" | "active" | "approval_pending";

/** Map API / server product status strings onto catalogue lifecycle values. */
export function productStatusFromApi(apiStatus: string): ProductLifecycleStatus {
  if (apiStatus === "active") return "active";
  if (apiStatus === "draft") return "draft";
  return "approval_pending";
}
export type ProductPricingModel = "per_hit" | "subscription";
export type ProductCatalogPacketGroup =
  | "Financial Data"
  | "Business Data"
  | "Behavioral Data"
  | "Consortium Data"
  | "Fraud Signals"
  | "Synthetic / Test";

export interface DataPacket {
  id: string;
  name: string;
  category: DataPacketCategory;
  source: string;
  visibility: "Internal" | "Consortium" | "Platform";
  status: DataPacketStatus;
}

export interface PacketConfig {
  packetId: string;
  selectedFields: string[];
  /** Computed / transformed fields (extensible). */
  selectedDerivedFields?: string[];
}

export type EnquiryDataType = "LATEST" | "TRENDED";

export interface EnquiryConfig {
  impactType: "LOW" | "HIGH";
  scope: "SELF" | "NETWORK" | "CONSORTIUM" | "VERTICAL";
  mode: "LIVE" | "SYNTHETIC";
  /** Latest snapshot vs trended time series for enquiry responses. */
  dataType: EnquiryDataType;
}

export interface ConfiguredProduct {
  id: string;
  name: string;
  packetIds: string[];
  description: string;
  status: ProductLifecycleStatus;
  pricingModel: ProductPricingModel;
  price: number;
  lastUpdated: string;
  packetConfigs?: PacketConfig[];
  enquiryConfig?: EnquiryConfig;
}

export interface ProductCatalogPacketOption {
  id: string;
  label: string;
  description: string;
  category: ProductCatalogPacketGroup;
  /** Schema Mapper Source Type — drives raw field catalogue. */
  sourceType: SourceType;
  fields: string[];
  previewKey: string;
}

/** Placeholder derived fields per packet (future pipeline hooks). */
export const derivedFieldTemplatesByPacketId: Record<string, string[]> = {
  PKT_BCF: ["weighted_cashflow_score", "emi_burden_ratio", "income_stability_index"],
  PKT_GST: ["turnover_momentum_index", "compliance_risk_tier"],
  PKT_BLK: ["network_risk_rollup", "related_party_exposure_score"],
  PKT_TBS: ["telco_credit_proxy", "mobility_stability_index"],
  PKT_EMP: ["employment_verification_confidence", "income_band_estimate"],
  PKT_DSP: ["discretionary_spend_ratio", "digital_credit_appetite_score"],
  PKT_CON: ["cross_lender_stress_flag", "exposure_velocity_90d"],
  PKT_FRD: ["fraud_probability_model", "identity_consistency_score"],
  PKT_SYN: ["synthetic_profile_version", "scenario_calibration_id"],
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  telecom: "Telecom",
  utility: "Utility",
  bank: "Bank",
  gst: "GST",
  custom: "Custom",
};

/** Union of catalog packet fields and Schema Mapper raw keys for the packet's source type. */
export function getAllRawFieldKeysForPacketOption(opt: ProductCatalogPacketOption): string[] {
  const fromMapper = getRawIngestedFieldKeysForSourceType(opt.sourceType);
  const set = new Set<string>([...fromMapper, ...opt.fields]);
  return [...set].sort((a, b) => a.localeCompare(b));
}

export const DEFAULT_ENQUIRY_CONFIG: EnquiryConfig = {
  impactType: "LOW",
  scope: "SELF",
  mode: "LIVE",
  dataType: "LATEST",
};

export function normalizeEnquiryConfig(partial?: Partial<EnquiryConfig> | null): EnquiryConfig {
  return { ...DEFAULT_ENQUIRY_CONFIG, ...partial };
}

export const productCatalogPacketOptions = data.productCatalogPacketOptions as ProductCatalogPacketOption[];
export const packetMockData = data.packetMockData as Record<string, Record<string, unknown>>;
export const dataPackets = data.dataPackets as DataPacket[];
export const configuredProducts = data.configuredProducts as ConfiguredProduct[];

export const dataPacketCategoryStyles: Record<DataPacketCategory, string> = {
  Bureau: "bg-primary/15 text-primary",
  Banking: "bg-secondary/15 text-secondary-foreground",
  GST: "bg-warning/15 text-warning",
  Telecom: "bg-muted text-foreground",
  Consortium: "bg-success/15 text-success",
};

export const dataPacketStatusStyles: Record<DataPacketStatus, string> = {
  active: "bg-success/15 text-success",
  deprecated: "bg-muted text-muted-foreground",
  draft: "bg-warning/15 text-warning",
};

export const productPricingLabel: Record<ProductPricingModel, string> = {
  per_hit: "Per hit",
  subscription: "Subscription",
};

export function getDataPacketById(id: string): DataPacket | undefined {
  return dataPackets.find((p) => p.id === id);
}

export function getPacketsByIds(ids: string[]): DataPacket[] {
  const map = new Map(dataPackets.map((p) => [p.id, p]));
  return ids.map((id) => map.get(id)).filter((p): p is DataPacket => p != null);
}

export function getProductById(id: string): ConfiguredProduct | undefined {
  return configuredProducts.find((p) => p.id === id);
}

export function getInitialProductsCatalogState(): ConfiguredProduct[] {
  return structuredClone(configuredProducts).map((p) => ({
    ...p,
    enquiryConfig: normalizeEnquiryConfig(p.enquiryConfig),
  }));
}

export function catalogLabelForPacketId(packetId: string): string | undefined {
  return productCatalogPacketOptions.find((o) => o.id === packetId)?.label;
}

export function resolvePayloadPacketName(displayOrCanonical: string): string {
  const opt = productCatalogPacketOptions.find((o) => o.label === displayOrCanonical);
  if (opt) {
    const p = dataPackets.find((x) => x.id === opt.id);
    return p?.name ?? displayOrCanonical;
  }
  return displayOrCanonical;
}

export function buildProductPreviewJson(
  productName: string,
  orderedPacketIds: string[],
  packetConfigs: PacketConfig[],
  enquiryConfig: EnquiryConfig
): object {
  const configMap = new Map(packetConfigs.map((c) => [c.packetId, c]));
  const resultData: Record<string, Record<string, unknown>> = {};
  const ec = normalizeEnquiryConfig(enquiryConfig);

  for (const pid of orderedPacketIds) {
    const opt = productCatalogPacketOptions.find((o) => o.id === pid);
    if (!opt) continue;
    const fullPayload = packetMockData[pid] ?? {};
    const cfg = configMap.get(pid);
    const selectedFields = cfg?.selectedFields;
    const filtered: Record<string, unknown> =
      selectedFields && selectedFields.length > 0
        ? Object.fromEntries(Object.entries(fullPayload).filter(([k]) => selectedFields.includes(k)))
        : { ...fullPayload };

    const derivedSel = cfg?.selectedDerivedFields?.filter(Boolean) ?? [];
    if (derivedSel.length > 0) {
      filtered.__derived = Object.fromEntries(
        derivedSel.map((d) => [d, `[computed:${d}]`])
      );
    }

    resultData[opt.previewKey] = filtered;
  }

  return {
    product: productName || "—",
    enquiry: {
      impact: ec.impactType,
      scope: ec.scope,
      mode: ec.mode,
      dataType: ec.dataType,
    },
    data: resultData,
  };
}

export function getMockPayloadForPacket(packetName: string): Record<string, unknown> {
  const opt = productCatalogPacketOptions.find((o) => o.label === packetName);
  if (opt && packetMockData[opt.id]) return packetMockData[opt.id];
  switch (packetName) {
    case "Bureau Score": return { score: 742, scoreBand: "A", modelVersion: "v3.2", asOf: "2026-03-25" };
    case "Consortium Exposure":
    case "PKT_CON": return packetMockData.PKT_CON;
    case "Account Aggregation":
    case "Banking Summary": return { accounts: 4, avgBalance: 210000, currency: "INR" };
    case "GST Turnover Summary":
    case "GST Summary": return { fyTurnover: 45000000, filingsVerified: 12, riskFlag: false };
    case "Telco Delinquency Signals": return { prepaidTenureMonths: 36, dunningEvents: 0, segment: "stable" };
    default: return { note: "mock sector data", packet: packetName };
  }
}

export function enquirySectionKeyForPacket(packet: DataPacket): "bureau" | "banking" | "consortium" {
  if (packet.category === "Consortium") return "consortium";
  if (packet.category === "Bureau") return "bureau";
  return "banking";
}
