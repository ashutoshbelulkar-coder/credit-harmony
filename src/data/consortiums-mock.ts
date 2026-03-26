export type ConsortiumStatus = "active" | "pending" | "inactive";
export type ConsortiumType = "Closed" | "Open" | "Hybrid";

export type ConsortiumDataVisibility = "full" | "masked_pii" | "derived";

export interface ConsortiumDataPolicy {
  shareLoanData: boolean;
  shareRepaymentHistory: boolean;
  allowAggregation: boolean;
  dataVisibility: ConsortiumDataVisibility;
}

export interface Consortium {
  id: string;
  name: string;
  type: ConsortiumType;
  membersCount: number;
  dataVolume: string;
  status: ConsortiumStatus;
  description?: string;
  purpose: string;
  governanceModel: string;
  dataPolicy: ConsortiumDataPolicy;
}

export interface ConsortiumMember {
  institutionId: string;
  institutionName: string;
  role: "Contributor" | "Consumer";
  joinedDate: string;
  status: "active" | "pending";
}

export interface ConsortiumDataContributionRow {
  memberName: string;
  recordsContributed: string;
  lastSync: string;
}

export interface ConsortiumDataSummary {
  totalRecordsShared: string;
  lastUpdated: string;
  dataTypes: string[];
}

export const consortiumPurposes = [
  "Risk sharing",
  "Pricing alignment",
  "Portfolio monitoring",
  "Regulatory reporting",
] as const;

export const consortiumGovernanceModels = [
  "Centralized",
  "Federated",
  "Hybrid Board",
] as const;

const defaultPolicy: ConsortiumDataPolicy = {
  shareLoanData: true,
  shareRepaymentHistory: true,
  allowAggregation: true,
  dataVisibility: "full",
};

export const consortiums: Consortium[] = [
  {
    id: "CONS_001",
    name: "SME Lending Consortium",
    type: "Closed",
    membersCount: 12,
    dataVolume: "4.2M records / mo",
    status: "active",
    description: "Closed consortium for SME exposure and shared performance data.",
    purpose: "Risk sharing",
    governanceModel: "Federated",
    dataPolicy: { ...defaultPolicy },
  },
  {
    id: "CONS_002",
    name: "Retail Credit Alliance",
    type: "Open",
    membersCount: 28,
    dataVolume: "12.8M records / mo",
    status: "active",
    description: "Open membership retail bureau-aligned data sharing.",
    purpose: "Portfolio monitoring",
    governanceModel: "Centralized",
    dataPolicy: { ...defaultPolicy, allowAggregation: false },
  },
  {
    id: "CONS_003",
    name: "Trade Finance Network",
    type: "Hybrid",
    membersCount: 8,
    dataVolume: "890K records / mo",
    status: "pending",
    description: "Hybrid governance model for trade and LC-related exposure.",
    purpose: "Regulatory reporting",
    governanceModel: "Hybrid Board",
    dataPolicy: {
      shareLoanData: true,
      shareRepaymentHistory: false,
      allowAggregation: true,
      dataVisibility: "masked_pii",
    },
  },
];

/** Members linked to a consortium id for detail tabs */
export const consortiumMembersByConsortiumId: Record<string, ConsortiumMember[]> = {
  CONS_001: [
    { institutionId: "1", institutionName: "First National Bank", role: "Contributor", joinedDate: "2025-11-03", status: "active" },
    { institutionId: "2", institutionName: "Metro Credit Union", role: "Consumer", joinedDate: "2025-11-18", status: "active" },
    { institutionId: "4", institutionName: "Southern Trust Bank", role: "Contributor", joinedDate: "2026-01-07", status: "active" },
  ],
  CONS_002: [
    { institutionId: "1", institutionName: "First National Bank", role: "Consumer", joinedDate: "2025-08-12", status: "active" },
    { institutionId: "7", institutionName: "Alpine Microfinance", role: "Contributor", joinedDate: "2025-10-01", status: "active" },
    { institutionId: "8", institutionName: "Urban Commercial Bank", role: "Contributor", joinedDate: "2025-12-15", status: "active" },
  ],
  CONS_003: [
    { institutionId: "3", institutionName: "Pacific Finance Corp", role: "Consumer", joinedDate: "2026-02-20", status: "pending" },
  ],
};

export const consortiumContributionById: Record<string, ConsortiumDataContributionRow[]> = {
  CONS_001: [
    { memberName: "First National Bank", recordsContributed: "1.1M", lastSync: "2026-03-24 08:12 UTC" },
    { memberName: "Southern Trust Bank", recordsContributed: "620K", lastSync: "2026-03-24 07:45 UTC" },
  ],
  CONS_002: [
    { memberName: "Alpine Microfinance", recordsContributed: "2.4M", lastSync: "2026-03-24 09:01 UTC" },
    { memberName: "Urban Commercial Bank", recordsContributed: "3.8M", lastSync: "2026-03-24 08:55 UTC" },
  ],
  CONS_003: [],
};

export const consortiumContributionSummaryById: Record<string, ConsortiumDataSummary> = {
  CONS_001: {
    totalRecordsShared: "1.72M",
    lastUpdated: "2026-03-24 09:01 UTC",
    dataTypes: ["Loan performance", "Exposure", "Repayment history"],
  },
  CONS_002: {
    totalRecordsShared: "6.2M",
    lastUpdated: "2026-03-24 09:01 UTC",
    dataTypes: ["Bureau attributes", "Account aggregation", "GST signals"],
  },
  CONS_003: {
    totalRecordsShared: "—",
    lastUpdated: "—",
    dataTypes: [],
  },
};

export const consortiumStatusStyles: Record<ConsortiumStatus, string> = {
  active: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  inactive: "bg-muted text-muted-foreground",
};

/** Soft pills — same pattern as `consortiumListLabelStyles` (filled chip, no outline). */
export const consortiumTypeBadgeClass: Record<ConsortiumType, string> = {
  Closed: "bg-primary/15 text-primary",
  Open: "bg-secondary/15 text-secondary-foreground",
  Hybrid: "bg-muted text-muted-foreground",
};

/** List UI: Active vs Draft (pending + inactive render as Draft). */
export function consortiumListLabel(status: ConsortiumStatus): "Active" | "Draft" {
  return status === "active" ? "Active" : "Draft";
}

export function consortiumListLabelStyles(label: "Active" | "Draft"): string {
  return label === "Active"
    ? "bg-success/15 text-success"
    : "bg-warning/15 text-warning";
}

export function getConsortiumById(id: string): Consortium | undefined {
  return consortiums.find((c) => c.id === id);
}

export function getConsortiumMembers(consortiumId: string): ConsortiumMember[] {
  return consortiumMembersByConsortiumId[consortiumId] ?? [];
}

export function getConsortiumContribution(consortiumId: string): ConsortiumDataContributionRow[] {
  return consortiumContributionById[consortiumId] ?? [];
}

export function getConsortiumContributionSummary(consortiumId: string): ConsortiumDataSummary | undefined {
  return consortiumContributionSummaryById[consortiumId];
}

/** Deep snapshot for catalog mock initialization */
export function getInitialConsortiumCatalogState() {
  return {
    consortiums: structuredClone(consortiums) as Consortium[],
    membersByConsortiumId: structuredClone(
      consortiumMembersByConsortiumId
    ) as Record<string, ConsortiumMember[]>,
    contributionByConsortiumId: structuredClone(
      consortiumContributionById
    ) as Record<string, ConsortiumDataContributionRow[]>,
    contributionSummaryByConsortiumId: structuredClone(
      consortiumContributionSummaryById
    ) as Record<string, ConsortiumDataSummary>,
  };
}
