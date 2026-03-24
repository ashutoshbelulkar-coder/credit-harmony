export type DataPacketCategory = "Bureau" | "Banking" | "GST" | "Telecom" | "Consortium";
export type DataPacketStatus = "active" | "deprecated" | "draft";

export interface DataPacket {
  id: string;
  name: string;
  category: DataPacketCategory;
  source: string;
  visibility: "Internal" | "Consortium" | "Platform";
  status: DataPacketStatus;
}

export type ProductLifecycleStatus = "draft" | "active";
export type ProductPricingModel = "per_hit" | "subscription";

export interface ConfiguredProduct {
  id: string;
  name: string;
  packetIds: string[];
  description: string;
  status: ProductLifecycleStatus;
  pricingModel: ProductPricingModel;
  price: number;
  lastUpdated: string;
}

/** Four selectable packets in Product Configurator (labels vs underlying PKT ids). */
export const productCatalogPacketOptions: { id: string; label: string }[] = [
  { id: "PKT_001", label: "Bureau Score" },
  { id: "PKT_003", label: "Banking Summary" },
  { id: "PKT_004", label: "GST Summary" },
  { id: "PKT_002", label: "Consortium Exposure" },
];

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

export const dataPackets: DataPacket[] = [
  {
    id: "PKT_001",
    name: "Bureau Score",
    category: "Bureau",
    source: "Internal",
    visibility: "Platform",
    status: "active",
  },
  {
    id: "PKT_002",
    name: "Consortium Exposure",
    category: "Consortium",
    source: "Consortium",
    visibility: "Consortium",
    status: "active",
  },
  {
    id: "PKT_003",
    name: "Account Aggregation",
    category: "Banking",
    source: "Partner API",
    visibility: "Platform",
    status: "active",
  },
  {
    id: "PKT_004",
    name: "GST Turnover Summary",
    category: "GST",
    source: "GSTN",
    visibility: "Platform",
    status: "active",
  },
  {
    id: "PKT_005",
    name: "Telco Delinquency Signals",
    category: "Telecom",
    source: "Telecom",
    visibility: "Internal",
    status: "draft",
  },
];

export const configuredProducts: ConfiguredProduct[] = [
  {
    id: "PRD_001",
    name: "SME Credit Decision Pack",
    packetIds: ["PKT_001", "PKT_002"],
    description: "Core SME decisioning with bureau and consortium exposure.",
    status: "active",
    pricingModel: "per_hit",
    price: 50,
    lastUpdated: "2026-03-20T10:00:00.000Z",
  },
  {
    id: "PRD_002",
    name: "Retail Thin-File Pack",
    packetIds: ["PKT_001", "PKT_004", "PKT_005"],
    description: "Thin-file retail with GST and telco augment.",
    status: "draft",
    pricingModel: "subscription",
    price: 12000,
    lastUpdated: "2026-03-18T14:30:00.000Z",
  },
];

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

/** Mock payload snippets per packet name for enquiry / preview (canonical names). */
export function getMockPayloadForPacket(packetName: string): Record<string, unknown> {
  switch (packetName) {
    case "Bureau Score":
      return { score: 742, scoreBand: "A", modelVersion: "v3.2", asOf: "2026-03-25" };
    case "Consortium Exposure":
      return { totalExposure: 12500000, facilities: 3, worstDpd: 0, consortiumId: "CONS_001" };
    case "Account Aggregation":
    case "Banking Summary":
      return { accounts: 4, avgBalance: 210000, currency: "KES" };
    case "GST Turnover Summary":
    case "GST Summary":
      return { fyTurnover: 45000000, filingsVerified: 12, riskFlag: false };
    case "Telco Delinquency Signals":
      return { prepaidTenureMonths: 36, dunningEvents: 0, segment: "stable" };
    default:
      return { note: "mock sector data", packet: packetName };
  }
}

export function buildProductPreviewJson(productName: string, orderedPacketNames: string[]): object {
  const packets: Record<string, Record<string, unknown>> = {};
  orderedPacketNames.forEach((name) => {
    const canonical = resolvePayloadPacketName(name);
    packets[name] = getMockPayloadForPacket(canonical);
  });
  return {
    product: productName,
    generatedAt: new Date().toISOString(),
    packets,
  };
}

/** Enquiry / UI grouping: Bureau | Banking | Consortium */
export function enquirySectionKeyForPacket(packet: DataPacket): "bureau" | "banking" | "consortium" {
  if (packet.category === "Consortium") return "consortium";
  if (packet.category === "Bureau") return "bureau";
  return "banking";
}
