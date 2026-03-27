import data from "./institution-extensions.json";

export type ConsortiumMembershipRole = "Contributor" | "Consumer";

export interface ConsortiumMembershipRow {
  consortiumId: string;
  consortiumName: string;
  role: ConsortiumMembershipRole;
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
