import data from "./consortiums.json";

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

export const consortiumPurposes = data.purposes as string[];
export const consortiumGovernanceModels = data.governanceModels as string[];
export const consortiums = data.consortiums as Consortium[];
export const consortiumMembersByConsortiumId = data.membersByConsortiumId as Record<string, ConsortiumMember[]>;
export const consortiumContributionById = data.contributionByConsortiumId as Record<string, ConsortiumDataContributionRow[]>;
export const consortiumContributionSummaryById = data.contributionSummaryByConsortiumId as Record<string, ConsortiumDataSummary>;

export const consortiumStatusStyles: Record<ConsortiumStatus, string> = {
  active: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  inactive: "bg-muted text-muted-foreground",
};

export const consortiumTypeBadgeClass: Record<ConsortiumType, string> = {
  Closed: "bg-primary/15 text-primary",
  Open: "bg-secondary/15 text-secondary-foreground",
  Hybrid: "bg-muted text-muted-foreground",
};

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

export function getInitialConsortiumCatalogState() {
  return {
    consortiums: structuredClone(consortiums) as Consortium[],
    membersByConsortiumId: structuredClone(consortiumMembersByConsortiumId) as Record<string, ConsortiumMember[]>,
    contributionByConsortiumId: structuredClone(consortiumContributionById) as Record<string, ConsortiumDataContributionRow[]>,
    contributionSummaryByConsortiumId: structuredClone(consortiumContributionSummaryById) as Record<string, ConsortiumDataSummary>,
  };
}
