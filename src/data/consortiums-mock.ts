import data from "./consortiums.json";
import cbsCatalogData from "./cbs-member-catalog.json";
import type { ConsortiumStatus } from "@/lib/consortium-ui";

export type { ConsortiumStatus } from "@/lib/consortium-ui";
export {
  consortiumStatusStyles,
  consortiumListLabel,
  consortiumListLabelStyles,
} from "@/lib/consortium-ui";
export type ConsortiumDataVisibility = "full" | "masked_pii" | "derived";

export interface ConsortiumDataPolicy {
  dataVisibility: ConsortiumDataVisibility;
}

export interface Consortium {
  id: string;
  name: string;
  membersCount: number;
  dataVolume: string;
  status: ConsortiumStatus;
  description?: string;
  dataPolicy: ConsortiumDataPolicy;
}

export interface ConsortiumMember {
  institutionId: string;
  institutionName: string;
  /** Registration number (member id); mirrors API `registrationNumber`. */
  registrationNumber?: string;
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

export const consortiums = data.consortiums as Consortium[];
export const consortiumMembersByConsortiumId = data.membersByConsortiumId as Record<string, ConsortiumMember[]>;

export type CbsMemberCatalogEntryMock = {
  id: string;
  memberId: string;
  displayName?: string;
  createdAt?: string;
};

export type ConsortiumCbsMemberMock = {
  id: string;
  catalogId: string;
  memberId: string;
  displayName?: string;
  createdAt: string;
};

export function getCbsMemberCatalog(): CbsMemberCatalogEntryMock[] {
  return cbsCatalogData as CbsMemberCatalogEntryMock[];
}

export const consortiumCbsMembersByConsortiumId = (data as { cbsMembersByConsortiumId?: Record<string, ConsortiumCbsMemberMock[]> })
  .cbsMembersByConsortiumId ?? {};

/** Spring seed `consortiums.id` (1,2,…) vs mock keys (`CONS_001`, …) for embedded fallback when the URL uses numeric ids. */
const CONSORTIUM_NUMERIC_ID_TO_MOCK_KEY: Record<string, string> = {
  "1": "CONS_001",
  "2": "CONS_002",
  "3": "CONS_003",
};

function resolveConsortiumMockKey(consortiumId: string): string {
  return CONSORTIUM_NUMERIC_ID_TO_MOCK_KEY[consortiumId] ?? consortiumId;
}
export const consortiumContributionById = data.contributionByConsortiumId as Record<string, ConsortiumDataContributionRow[]>;
export const consortiumContributionSummaryById = data.contributionSummaryByConsortiumId as Record<string, ConsortiumDataSummary>;

export function getConsortiumById(id: string): Consortium | undefined {
  return consortiums.find((c) => c.id === id);
}

export function getConsortiumMembers(consortiumId: string): ConsortiumMember[] {
  return consortiumMembersByConsortiumId[resolveConsortiumMockKey(consortiumId)] ?? [];
}

export function getConsortiumCbsMembers(consortiumId: string): ConsortiumCbsMemberMock[] {
  return consortiumCbsMembersByConsortiumId[resolveConsortiumMockKey(consortiumId)] ?? [];
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
