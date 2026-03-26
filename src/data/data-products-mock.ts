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

export type ProductCatalogPacketGroup =
  | "Financial Data"
  | "Business Data"
  | "Behavioral Data"
  | "Consortium Data"
  | "Fraud Signals"
  | "Synthetic / Test";

export interface ProductCatalogPacketOption {
  id: string;
  label: string;
  description: string;
  category: ProductCatalogPacketGroup;
  fields: string[];
  /** snake_case key used in preview JSON output */
  previewKey: string;
}

export const productCatalogPacketOptions: ProductCatalogPacketOption[] = [
  {
    id: "PKT_BCF",
    label: "Banking Cashflow Summary",
    description: "Bank statement analysis: credits, debits, balances, salary detection and EMI outflow.",
    category: "Financial Data",
    previewKey: "banking_cashflow",
    fields: [
      "avg_monthly_balance",
      "total_credits_6m",
      "total_debits_6m",
      "cash_deposit_ratio",
      "income_stability_score",
      "salary_detected",
      "emi_outflow",
      "bounce_instances",
      "closing_balance_trend",
    ],
  },
  {
    id: "PKT_GST",
    label: "GST Business Profile",
    description: "GST filing behaviour, turnover trends, compliance score and customer concentration.",
    category: "Business Data",
    previewKey: "gst_business_profile",
    fields: [
      "annual_turnover",
      "gst_filing_regular",
      "gst_return_type",
      "sales_trend",
      "top_customers_concentration",
      "input_output_ratio",
      "gst_compliance_score",
    ],
  },
  {
    id: "PKT_BLK",
    label: "Business Linkages",
    description: "Entity network mapping: related firms, shared directors and group-level risk exposure.",
    category: "Business Data",
    previewKey: "business_linkages",
    fields: [
      "related_entities_count",
      "shared_directors",
      "high_risk_associations",
      "group_exposure",
      "network_risk_score",
    ],
  },
  {
    id: "PKT_TBS",
    label: "Telecom Behavioral Score",
    description: "Mobile usage patterns: recharge consistency, device stability and geo-mobility signals.",
    category: "Behavioral Data",
    previewKey: "telecom_behavioral_score",
    fields: [
      "mobile_recharge_consistency",
      "avg_monthly_recharge",
      "data_usage_pattern",
      "device_stability",
      "sim_age_months",
      "geo_stability_score",
    ],
  },
  {
    id: "PKT_EMP",
    label: "Employment Insights",
    description: "Employment type, employer identity, tenure and income variability signals.",
    category: "Behavioral Data",
    previewKey: "employment_insights",
    fields: [
      "employment_type",
      "employer_name",
      "tenure_months",
      "salary_estimate",
      "income_variability",
      "employment_stability_score",
    ],
  },
  {
    id: "PKT_DSP",
    label: "Digital Spend Profile",
    description: "UPI/card spend patterns across e-commerce, food, subscriptions and discretionary categories.",
    category: "Behavioral Data",
    previewKey: "digital_spend_profile",
    fields: [
      "ecommerce_spend",
      "food_delivery_spend",
      "subscription_services_count",
      "luxury_spend_ratio",
      "spend_volatility",
      "discretionary_income_score",
    ],
  },
  {
    id: "PKT_CON",
    label: "Consortium Exposure",
    description: "Cross-lender liability: active facilities, DPD history, overleveraging and enquiry velocity.",
    category: "Consortium Data",
    previewKey: "consortium_exposure",
    fields: [
      "total_exposure",
      "active_lenders",
      "dpd_instances",
      "overleveraged_flag",
      "recent_enquiries",
      "exposure_growth_trend",
    ],
  },
  {
    id: "PKT_FRD",
    label: "Fraud Risk Signals",
    description: "Device fingerprint, identity consistency, velocity checks and blacklist screening.",
    category: "Fraud Signals",
    previewKey: "fraud_risk_signals",
    fields: [
      "device_mismatch_flag",
      "identity_inconsistency",
      "velocity_checks_failed",
      "blacklist_match",
      "fraud_risk_score",
    ],
  },
  {
    id: "PKT_SYN",
    label: "Synthetic Profile",
    description: "Parameterised test profiles for simulation: risk score, income band and scenario tags.",
    category: "Synthetic / Test",
    previewKey: "synthetic_profile",
    fields: [
      "risk_score",
      "income_band",
      "profile_type",
      "scenario_tag",
    ],
  },
];

/** Exact mock payloads per packet ID used in the preview panel. */
export const packetMockData: Record<string, Record<string, unknown>> = {
  PKT_BCF: {
    avg_monthly_balance: 45200,
    total_credits_6m: 720000,
    total_debits_6m: 690000,
    cash_deposit_ratio: 0.18,
    income_stability_score: 78,
    salary_detected: true,
    emi_outflow: 15000,
    bounce_instances: 1,
    closing_balance_trend: "STABLE",
  },
  PKT_GST: {
    annual_turnover: 4800000,
    gst_filing_regular: true,
    gst_return_type: "GSTR3B",
    sales_trend: "GROWING",
    top_customers_concentration: 0.42,
    input_output_ratio: 0.65,
    gst_compliance_score: 82,
  },
  PKT_BLK: {
    related_entities_count: 6,
    shared_directors: 2,
    high_risk_associations: 1,
    group_exposure: 3200000,
    network_risk_score: 68,
  },
  PKT_TBS: {
    mobile_recharge_consistency: 0.92,
    avg_monthly_recharge: 349,
    data_usage_pattern: "HIGH",
    device_stability: "STABLE",
    sim_age_months: 48,
    geo_stability_score: 85,
  },
  PKT_EMP: {
    employment_type: "Salaried",
    employer_name: "Infosys Ltd",
    tenure_months: 36,
    salary_estimate: 85000,
    income_variability: "LOW",
    employment_stability_score: 88,
  },
  PKT_DSP: {
    ecommerce_spend: 120000,
    food_delivery_spend: 24000,
    subscription_services_count: 5,
    luxury_spend_ratio: 0.22,
    spend_volatility: "MEDIUM",
    discretionary_income_score: 74,
  },
  PKT_CON: {
    total_exposure: 950000,
    active_lenders: 4,
    dpd_instances: 2,
    overleveraged_flag: true,
    recent_enquiries: 6,
    exposure_growth_trend: "INCREASING",
  },
  PKT_FRD: {
    device_mismatch_flag: false,
    identity_inconsistency: true,
    velocity_checks_failed: 2,
    blacklist_match: false,
    fraud_risk_score: 71,
  },
  PKT_SYN: {
    risk_score: 680,
    income_band: "MEDIUM",
    profile_type: "THIN_FILE",
    scenario_tag: "NEW_TO_CREDIT",
  },
};

export function catalogLabelForPacketId(packetId: string): string | undefined {
  return productCatalogPacketOptions.find((o) => o.id === packetId)?.label;
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
  // Extended catalog packets
  { id: "PKT_BCF", name: "Banking Cashflow Summary", category: "Banking", source: "Partner API", visibility: "Platform", status: "active" },
  { id: "PKT_GST", name: "GST Business Profile", category: "GST", source: "GSTN", visibility: "Platform", status: "active" },
  { id: "PKT_BLK", name: "Business Linkages", category: "Bureau", source: "Internal", visibility: "Platform", status: "active" },
  { id: "PKT_TBS", name: "Telecom Behavioral Score", category: "Telecom", source: "Telecom", visibility: "Internal", status: "active" },
  { id: "PKT_EMP", name: "Employment Insights", category: "Banking", source: "Partner API", visibility: "Platform", status: "active" },
  { id: "PKT_DSP", name: "Digital Spend Profile", category: "Banking", source: "Partner API", visibility: "Platform", status: "active" },
  { id: "PKT_CON", name: "Consortium Exposure", category: "Consortium", source: "Consortium", visibility: "Consortium", status: "active" },
  { id: "PKT_FRD", name: "Fraud Risk Signals", category: "Bureau", source: "Internal", visibility: "Internal", status: "active" },
  { id: "PKT_SYN", name: "Synthetic Profile", category: "Bureau", source: "Internal", visibility: "Internal", status: "draft" },
];

export const configuredProducts: ConfiguredProduct[] = [
  {
    id: "PRD_001",
    name: "SME Credit Decision Pack",
    packetIds: ["PKT_BCF", "PKT_CON", "PKT_GST"],
    description: "Core SME decisioning combining cashflow analysis, consortium exposure and GST compliance.",
    status: "active",
    pricingModel: "per_hit",
    price: 50,
    lastUpdated: "2026-03-20T10:00:00.000Z",
    enquiryConfig: { impactType: "LOW", scope: "CONSORTIUM", mode: "LIVE" },
    packetConfigs: [
      { packetId: "PKT_BCF", selectedFields: ["avg_monthly_balance", "income_stability_score", "salary_detected", "emi_outflow"] },
      { packetId: "PKT_CON", selectedFields: ["total_exposure", "active_lenders", "dpd_instances", "overleveraged_flag"] },
      { packetId: "PKT_GST", selectedFields: ["annual_turnover", "gst_filing_regular", "gst_compliance_score"] },
    ],
  },
  {
    id: "PRD_002",
    name: "Retail Thin-File Pack",
    packetIds: ["PKT_TBS", "PKT_DSP", "PKT_SYN"],
    description: "Thin-file retail decisioning using telecom, digital spend and synthetic profile signals.",
    status: "draft",
    pricingModel: "subscription",
    price: 12000,
    lastUpdated: "2026-03-18T14:30:00.000Z",
    enquiryConfig: { impactType: "LOW", scope: "SELF", mode: "LIVE" },
    packetConfigs: [
      { packetId: "PKT_TBS", selectedFields: ["mobile_recharge_consistency", "sim_age_months", "geo_stability_score"] },
      { packetId: "PKT_DSP", selectedFields: ["ecommerce_spend", "discretionary_income_score", "spend_volatility"] },
      { packetId: "PKT_SYN", selectedFields: ["risk_score", "income_band", "profile_type", "scenario_tag"] },
    ],
  },
  {
    id: "PRD_003",
    name: "MSME Fraud Shield",
    packetIds: ["PKT_FRD", "PKT_BLK", "PKT_CON"],
    description: "Fraud detection and network risk screening for MSME loan origination.",
    status: "active",
    pricingModel: "per_hit",
    price: 35,
    lastUpdated: "2026-03-15T08:20:00.000Z",
    enquiryConfig: { impactType: "LOW", scope: "NETWORK", mode: "LIVE" },
    packetConfigs: [
      { packetId: "PKT_FRD", selectedFields: ["device_mismatch_flag", "identity_inconsistency", "velocity_checks_failed", "fraud_risk_score"] },
      { packetId: "PKT_BLK", selectedFields: ["related_entities_count", "high_risk_associations", "network_risk_score"] },
      { packetId: "PKT_CON", selectedFields: ["total_exposure", "recent_enquiries", "overleveraged_flag"] },
    ],
  },
  {
    id: "PRD_004",
    name: "Salaried Consumer Score",
    packetIds: ["PKT_EMP", "PKT_BCF", "PKT_DSP"],
    description: "Income verification and spend behaviour assessment for salaried consumer lending.",
    status: "active",
    pricingModel: "per_hit",
    price: 40,
    lastUpdated: "2026-03-12T11:45:00.000Z",
    enquiryConfig: { impactType: "HIGH", scope: "SELF", mode: "LIVE" },
    packetConfigs: [
      { packetId: "PKT_EMP", selectedFields: ["employment_type", "employer_name", "tenure_months", "salary_estimate", "employment_stability_score"] },
      { packetId: "PKT_BCF", selectedFields: ["avg_monthly_balance", "salary_detected", "emi_outflow", "bounce_instances"] },
      { packetId: "PKT_DSP", selectedFields: ["ecommerce_spend", "luxury_spend_ratio", "discretionary_income_score"] },
    ],
  },
  {
    id: "PRD_005",
    name: "Trade Finance KYB Pack",
    packetIds: ["PKT_GST", "PKT_BLK", "PKT_CON"],
    description: "Know Your Business verification using GST profile, entity linkages and consortium exposure.",
    status: "active",
    pricingModel: "subscription",
    price: 18000,
    lastUpdated: "2026-03-10T09:00:00.000Z",
    enquiryConfig: { impactType: "LOW", scope: "VERTICAL", mode: "LIVE" },
    packetConfigs: [
      { packetId: "PKT_GST", selectedFields: ["annual_turnover", "gst_filing_regular", "gst_return_type", "sales_trend", "gst_compliance_score"] },
      { packetId: "PKT_BLK", selectedFields: ["related_entities_count", "shared_directors", "group_exposure", "network_risk_score"] },
      { packetId: "PKT_CON", selectedFields: ["total_exposure", "active_lenders", "dpd_instances", "exposure_growth_trend"] },
    ],
  },
  {
    id: "PRD_006",
    name: "Gig Worker Credit Profile",
    packetIds: ["PKT_TBS", "PKT_DSP", "PKT_BCF"],
    description: "Alternative credit assessment for gig economy workers using behavioural and cashflow signals.",
    status: "active",
    pricingModel: "per_hit",
    price: 45,
    lastUpdated: "2026-03-08T16:00:00.000Z",
    enquiryConfig: { impactType: "LOW", scope: "SELF", mode: "LIVE" },
    packetConfigs: [
      { packetId: "PKT_TBS", selectedFields: ["mobile_recharge_consistency", "avg_monthly_recharge", "sim_age_months", "geo_stability_score"] },
      { packetId: "PKT_DSP", selectedFields: ["ecommerce_spend", "food_delivery_spend", "spend_volatility", "discretionary_income_score"] },
      { packetId: "PKT_BCF", selectedFields: ["avg_monthly_balance", "total_credits_6m", "income_stability_score", "closing_balance_trend"] },
    ],
  },
  {
    id: "PRD_007",
    name: "Consortium Exposure Monitor",
    packetIds: ["PKT_CON", "PKT_FRD"],
    description: "Ongoing monitoring of cross-lender liabilities and fraud risk signals for portfolio accounts.",
    status: "active",
    pricingModel: "subscription",
    price: 8500,
    lastUpdated: "2026-03-05T13:30:00.000Z",
    enquiryConfig: { impactType: "LOW", scope: "CONSORTIUM", mode: "LIVE" },
    packetConfigs: [
      { packetId: "PKT_CON", selectedFields: ["total_exposure", "active_lenders", "dpd_instances", "overleveraged_flag", "recent_enquiries", "exposure_growth_trend"] },
      { packetId: "PKT_FRD", selectedFields: ["blacklist_match", "velocity_checks_failed", "fraud_risk_score"] },
    ],
  },
  {
    id: "PRD_008",
    name: "New-to-Credit Onboarding Pack",
    packetIds: ["PKT_SYN", "PKT_TBS", "PKT_EMP"],
    description: "Synthetic and alternative data assessment for applicants with no prior credit history.",
    status: "draft",
    pricingModel: "per_hit",
    price: 30,
    lastUpdated: "2026-03-02T10:10:00.000Z",
    enquiryConfig: { impactType: "LOW", scope: "SELF", mode: "SYNTHETIC" },
    packetConfigs: [
      { packetId: "PKT_SYN", selectedFields: ["risk_score", "income_band", "profile_type", "scenario_tag"] },
      { packetId: "PKT_TBS", selectedFields: ["sim_age_months", "mobile_recharge_consistency", "geo_stability_score"] },
      { packetId: "PKT_EMP", selectedFields: ["employment_type", "tenure_months", "income_variability"] },
    ],
  },
  {
    id: "PRD_009",
    name: "Large Corporate Risk Suite",
    packetIds: ["PKT_BCF", "PKT_GST", "PKT_BLK", "PKT_CON", "PKT_FRD"],
    description: "Comprehensive risk assessment bundle for large corporate and mid-market borrowers.",
    status: "active",
    pricingModel: "subscription",
    price: 45000,
    lastUpdated: "2026-02-28T09:00:00.000Z",
    enquiryConfig: { impactType: "HIGH", scope: "CONSORTIUM", mode: "LIVE" },
    packetConfigs: [
      { packetId: "PKT_BCF", selectedFields: ["avg_monthly_balance", "total_credits_6m", "income_stability_score", "emi_outflow", "closing_balance_trend"] },
      { packetId: "PKT_GST", selectedFields: ["annual_turnover", "sales_trend", "input_output_ratio", "gst_compliance_score"] },
      { packetId: "PKT_BLK", selectedFields: ["related_entities_count", "shared_directors", "high_risk_associations", "group_exposure", "network_risk_score"] },
      { packetId: "PKT_CON", selectedFields: ["total_exposure", "active_lenders", "dpd_instances", "overleveraged_flag"] },
      { packetId: "PKT_FRD", selectedFields: ["identity_inconsistency", "blacklist_match", "fraud_risk_score"] },
    ],
  },
  {
    id: "PRD_010",
    name: "Microfinance Borrower Score",
    packetIds: ["PKT_TBS", "PKT_BCF", "PKT_SYN"],
    description: "Lightweight scoring product for microfinance and self-help group lending.",
    status: "active",
    pricingModel: "per_hit",
    price: 18,
    lastUpdated: "2026-02-25T07:45:00.000Z",
    enquiryConfig: { impactType: "LOW", scope: "SELF", mode: "LIVE" },
    packetConfigs: [
      { packetId: "PKT_TBS", selectedFields: ["mobile_recharge_consistency", "avg_monthly_recharge", "sim_age_months"] },
      { packetId: "PKT_BCF", selectedFields: ["avg_monthly_balance", "cash_deposit_ratio", "bounce_instances"] },
      { packetId: "PKT_SYN", selectedFields: ["risk_score", "income_band", "scenario_tag"] },
    ],
  },
  {
    id: "PRD_011",
    name: "Digital Lending Quick Score",
    packetIds: ["PKT_DSP", "PKT_TBS", "PKT_FRD"],
    description: "Real-time scoring for instant digital loan approvals using spend and telecom behaviour.",
    status: "active",
    pricingModel: "per_hit",
    price: 22,
    lastUpdated: "2026-02-20T12:00:00.000Z",
    enquiryConfig: { impactType: "LOW", scope: "SELF", mode: "LIVE" },
    packetConfigs: [
      { packetId: "PKT_DSP", selectedFields: ["ecommerce_spend", "subscription_services_count", "spend_volatility", "discretionary_income_score"] },
      { packetId: "PKT_TBS", selectedFields: ["data_usage_pattern", "device_stability", "geo_stability_score"] },
      { packetId: "PKT_FRD", selectedFields: ["device_mismatch_flag", "velocity_checks_failed", "fraud_risk_score"] },
    ],
  },
  {
    id: "PRD_012",
    name: "Agri-Business Credit Pack",
    packetIds: ["PKT_GST", "PKT_BCF", "PKT_CON"],
    description: "Seasonal cashflow and compliance assessment for agricultural businesses and traders.",
    status: "draft",
    pricingModel: "per_hit",
    price: 38,
    lastUpdated: "2026-02-15T15:20:00.000Z",
    enquiryConfig: { impactType: "LOW", scope: "VERTICAL", mode: "LIVE" },
    packetConfigs: [
      { packetId: "PKT_GST", selectedFields: ["annual_turnover", "gst_filing_regular", "sales_trend", "top_customers_concentration"] },
      { packetId: "PKT_BCF", selectedFields: ["avg_monthly_balance", "cash_deposit_ratio", "closing_balance_trend", "bounce_instances"] },
      { packetId: "PKT_CON", selectedFields: ["total_exposure", "active_lenders", "dpd_instances"] },
    ],
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

export function resolvePayloadPacketName(displayOrCanonical: string): string {
  const opt = productCatalogPacketOptions.find((o) => o.label === displayOrCanonical);
  if (opt) {
    const p = dataPackets.find((x) => x.id === opt.id);
    return p?.name ?? displayOrCanonical;
  }
  return displayOrCanonical;
}

/**
 * Builds the enriched preview JSON for the product form.
 * For each selected packet, filters mock payload to only the configured fields
 * (or returns the full payload if no fields have been configured yet).
 */
export function buildProductPreviewJson(
  productName: string,
  orderedPacketIds: string[],
  packetConfigs: PacketConfig[],
  enquiryConfig: EnquiryConfig
): object {
  const configMap = new Map(packetConfigs.map((c) => [c.packetId, c.selectedFields]));
  const data: Record<string, Record<string, unknown>> = {};

  for (const pid of orderedPacketIds) {
    const opt = productCatalogPacketOptions.find((o) => o.id === pid);
    if (!opt) continue;
    const fullPayload = packetMockData[pid] ?? {};
    const selectedFields = configMap.get(pid);
    const filtered: Record<string, unknown> =
      selectedFields && selectedFields.length > 0
        ? Object.fromEntries(
            Object.entries(fullPayload).filter(([k]) => selectedFields.includes(k))
          )
        : { ...fullPayload };
    data[opt.previewKey] = filtered;
  }

  return {
    product: productName || "—",
    enquiry: {
      impact: enquiryConfig.impactType,
      scope: enquiryConfig.scope,
      mode: enquiryConfig.mode,
    },
    data,
  };
}

/**
 * Backward-compatible mock payload lookup used by EnquirySimulationPage.
 * Tries to match by canonical packet name against the new catalog options first,
 * then falls back to legacy hardcoded values.
 */
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

/** Enquiry / UI grouping: Bureau | Banking | Consortium */
export function enquirySectionKeyForPacket(packet: DataPacket): "bureau" | "banking" | "consortium" {
  if (packet.category === "Consortium") return "consortium";
  if (packet.category === "Bureau") return "bureau";
  return "banking";
}
