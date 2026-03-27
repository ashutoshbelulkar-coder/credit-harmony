import data from "./data-products.json";

export type DataPacketCategory = "Bureau" | "Banking" | "GST" | "Telecom" | "Consortium";
export type DataPacketStatus = "active" | "deprecated" | "draft";
export type ProductLifecycleStatus = "draft" | "active" | "approval_pending";
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
}

export interface EnquiryConfig {
  impactType: "LOW" | "HIGH";
  scope: "SELF" | "NETWORK" | "CONSORTIUM" | "VERTICAL";
  mode: "LIVE" | "SYNTHETIC";
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
  fields: string[];
  previewKey: string;
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
  return structuredClone(configuredProducts);
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
  const configMap = new Map(packetConfigs.map((c) => [c.packetId, c.selectedFields]));
  const resultData: Record<string, Record<string, unknown>> = {};

  for (const pid of orderedPacketIds) {
    const opt = productCatalogPacketOptions.find((o) => o.id === pid);
    if (!opt) continue;
    const fullPayload = packetMockData[pid] ?? {};
    const selectedFields = configMap.get(pid);
    const filtered: Record<string, unknown> =
      selectedFields && selectedFields.length > 0
        ? Object.fromEntries(Object.entries(fullPayload).filter(([k]) => selectedFields.includes(k)))
        : { ...fullPayload };
    resultData[opt.previewKey] = filtered;
  }

  return {
    product: productName || "—",
    enquiry: { impact: enquiryConfig.impactType, scope: enquiryConfig.scope, mode: enquiryConfig.mode },
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
