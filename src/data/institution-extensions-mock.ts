import data from "./institution-extensions.json";

/** Comma-separated in stored rows; use CONSORTIUM_ROLE_OPTIONS for UI. */
export type ConsortiumMembershipRole = "Contributor" | "Consumer";

export const CONSORTIUM_ROLE_OPTIONS: ConsortiumMembershipRole[] = [
  "Consumer",
  "Contributor",
];

export interface ConsortiumMembershipRow {
  consortiumId: string;
  consortiumName: string;
  /** Comma-separated roles when multiple selected. */
  role: string;
  status: "active" | "pending" | "suspended";
  joinedDate: string;
}

export interface ProductSubscriptionRow {
  productId: string;
  productName: string;
  plan: string;
  usage: string;
  status: "active" | "trial" | "suspended";
}

const membershipsByInstitution = data.membershipsByInstitution as Record<string, ConsortiumMembershipRow[]>;
const subscriptionsByInstitution = data.subscriptionsByInstitution as Record<string, ProductSubscriptionRow[]>;

export function getConsortiumMemberships(institutionId: string): ConsortiumMembershipRow[] {
  return membershipsByInstitution[institutionId] ?? [];
}

export function getProductSubscriptions(institutionId: string): ProductSubscriptionRow[] {
  return subscriptionsByInstitution[institutionId] ?? [];
}
