import data from "./consortiums.json";
import type { ConsortiumStatus, ConsortiumType } from "@/lib/consortium-ui";

export type { ConsortiumStatus, ConsortiumType } from "@/lib/consortium-ui";
export {
  consortiumStatusStyles,
  consortiumTypeBadgeClass,
  consortiumListLabel,
  consortiumListLabelStyles,
} from "@/lib/consortium-ui";
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
