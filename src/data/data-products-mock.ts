import data from "./data-products.json";
import type { SourceType } from "@/types/schema-mapper";
import { dictionaryPacketLabel } from "@/data/attribute-dictionary";

export type DataPacketCategory = "Bureau" | "Banking" | "GST" | "Telecom" | "Consortium";
export type DataPacketStatus = "active" | "deprecated" | "draft";
export type ProductLifecycleStatus = "draft" | "active" | "approval_pending" | "unknown";

/** Map API / server product status strings onto catalogue lifecycle values. */
export function productStatusFromApi(apiStatus: string): ProductLifecycleStatus {
  if (apiStatus === "active") return "active";
  if (apiStatus === "draft") return "draft";
  // Server treats `pending` like approval_pending for queue eligibility
  if (apiStatus === "pending" || apiStatus === "approval_pending") return "approval_pending";
  return "unknown";
}
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
  /** Institution IDs (from institutions.json) that submit data into this packet. */
  dataSubmitterInstitutionIds?: string[];
}

export interface PacketConfig {
  packetId: string;
  selectedFields: string[];
  /** Subset of `selectedFields` that is selected but disabled. */
  disabledFields?: string[];
  /** Computed / transformed fields (extensible). */
  selectedDerivedFields?: string[];
}

/** Request-time retrieval mode — not a product-level either/or. */
export type EnquiryDataScope = "LATEST" | "TRENDED" | "RETRO";

export type FootprintVisibility = "NETWORK" | "VERTICAL";

/** Soft or Hard impact policy — independently enabled on a product. */
export interface EnquiryImpactOption {
  enabled: boolean;
  storeFootprint: boolean;
  footprintVisibility: FootprintVisibility | null;
}

export interface EnquiryConfig {
  scope: "SELF" | "NETWORK" | "CONSORTIUM" | "VERTICAL";
  soft: EnquiryImpactOption;
  hard: EnquiryImpactOption;
}

/** @deprecated Visibility is NETWORK vs VERTICAL only; no per-vertical sub-select. */
export const FOOTPRINT_VERTICALS = [
  "Retail",
  "Insurance",
  "BNPL",
  "Commercial Lending",
  "Consumer Digital",
] as const;

const IMPACT_OFF: EnquiryImpactOption = {
  enabled: false,
  storeFootprint: false,
  footprintVisibility: null,
};

export function normalizeImpactOption(
  partial?: Partial<EnquiryImpactOption> | null
): EnquiryImpactOption {
  if (!partial?.enabled) return { ...IMPACT_OFF };
  if (!partial.storeFootprint) {
    return { enabled: true, storeFootprint: false, footprintVisibility: null };
  }
  const footprintVisibility: FootprintVisibility =
    partial.footprintVisibility === "VERTICAL" || partial.footprintVisibility === "NETWORK"
      ? partial.footprintVisibility
      : "NETWORK";
  return { enabled: true, storeFootprint: true, footprintVisibility };
}

export function formatImpactOption(opt: EnquiryImpactOption, label: string): string {
  if (!opt.enabled) return `${label}: Off`;
  if (!opt.storeFootprint) return `${label}: On · no footprint`;
  const vis =
    opt.footprintVisibility === "VERTICAL"
      ? "Vertical participants"
      : "All network participants";
  return `${label}: On · footprint · ${vis}`;
}

/** Preferred enquiry type for preview when both Soft and Hard are allowed. */
export function preferredEnquiryType(config: EnquiryConfig): "SOFT" | "HARD" {
  if (config.hard.enabled) return "HARD";
  if (config.soft.enabled) return "SOFT";
  return "SOFT";
}

export function footprintCreatedForType(
  config: EnquiryConfig,
  enquiryType: "SOFT" | "HARD"
): boolean {
  const opt = enquiryType === "HARD" ? config.hard : config.soft;
  return opt.enabled && opt.storeFootprint;
}

export interface ConfiguredProduct {
  id: string;
  name: string;
  packetIds: string[];
  description: string;
  status: ProductLifecycleStatus;
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
  /** Backend-sourced derived field names for this catalogue packet (Configure → Derived tab). */
  derivedFields: string[];
  previewKey: string;
}

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  telecom: "Telecom",
  utility: "Utility",
  bank: "Bank",
  gst: "GST",
  custom: "Custom",
};

/** Catalogue raw field keys defined on this packet option. */
export function getAllRawFieldKeysForPacketOption(opt: ProductCatalogPacketOption): string[] {
  return [...opt.fields].sort((a, b) => a.localeCompare(b));
}

export const DEFAULT_ENQUIRY_CONFIG: EnquiryConfig = {
  scope: "SELF",
  soft: { enabled: true, storeFootprint: false, footprintVisibility: null },
  hard: { ...IMPACT_OFF },
};

type LegacyEnquiryPartial = Partial<EnquiryConfig> & {
  impactType?: string;
  mode?: string;
  dataType?: string;
  storeFootprint?: boolean;
  footprintVisibility?: FootprintVisibility | null;
  footprintVertical?: string | null;
  soft?: Partial<EnquiryImpactOption>;
  hard?: Partial<EnquiryImpactOption>;
};

/** Migrate legacy SOFT/HARD + flat footprint fields into soft/hard impact options. */
export function normalizeEnquiryConfig(partial?: LegacyEnquiryPartial | null): EnquiryConfig {
  const scope =
    partial?.scope === "NETWORK" ||
    partial?.scope === "CONSORTIUM" ||
    partial?.scope === "VERTICAL" ||
    partial?.scope === "SELF"
      ? partial.scope
      : DEFAULT_ENQUIRY_CONFIG.scope;

  const hasNewShape = partial?.soft != null || partial?.hard != null;

  if (hasNewShape) {
    let soft = normalizeImpactOption(partial?.soft);
    let hard = normalizeImpactOption(partial?.hard);
    if (!soft.enabled && !hard.enabled) {
      soft = { ...DEFAULT_ENQUIRY_CONFIG.soft };
    }
    return { scope, soft, hard };
  }

  // Legacy flat impactType + storeFootprint
  const rawImpact = partial?.impactType;
  let legacyImpact: "SOFT" | "HARD" = "SOFT";
  if (rawImpact === "HARD" || rawImpact === "HIGH") legacyImpact = "HARD";
  else if (rawImpact === "SOFT" || rawImpact === "LOW") legacyImpact = "SOFT";

  const storeFootprint = !!partial?.storeFootprint;
  const footprintVisibility: FootprintVisibility | null = storeFootprint
    ? partial?.footprintVisibility === "VERTICAL" || partial?.footprintVisibility === "NETWORK"
      ? partial.footprintVisibility
      : "NETWORK"
    : null;

  const activeOpt: EnquiryImpactOption = {
    enabled: true,
    storeFootprint,
    footprintVisibility,
  };

  if (legacyImpact === "HARD") {
    return { scope, soft: { ...IMPACT_OFF }, hard: activeOpt };
  }
  return { scope, soft: activeOpt, hard: { ...IMPACT_OFF } };
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
  return (
    productCatalogPacketOptions.find((o) => o.id === packetId)?.label ??
    dictionaryPacketLabel(packetId)
  );
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
    const disabledSet = new Set((cfg?.disabledFields ?? []).filter(Boolean));
    const filtered: Record<string, unknown> =
      selectedFields && selectedFields.length > 0
        ? Object.fromEntries(
            Object.entries(fullPayload).filter(
              ([k]) => selectedFields.includes(k) && !disabledSet.has(k)
            )
          )
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
      impact: preferredEnquiryType(ec),
      soft: ec.soft,
      hard: ec.hard,
      scope: ec.scope,
    },
    data: resultData,
  };
}

export function getMockPayloadForPacket(packetName: string): Record<string, unknown> {
  const opt = productCatalogPacketOptions.find((o) => o.label === packetName);
  if (opt && packetMockData[opt.id]) return packetMockData[opt.id];
  switch (packetName) {
    case "Digital Identity Stability": return { score: 742, scoreBand: "A", modelVersion: "v3.2", asOf: "2026-03-25" };
    case "Marketplace Seller Exposure":
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
