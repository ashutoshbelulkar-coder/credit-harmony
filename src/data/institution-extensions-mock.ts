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

const membershipsByInstitution: Record<string, ConsortiumMembershipRow[]> = {
  "1": [
    {
      consortiumId: "CONS_001",
      consortiumName: "SME Lending Consortium",
      role: "Contributor",
      status: "active",
      joinedDate: "2025-11-03",
    },
    {
      consortiumId: "CONS_002",
      consortiumName: "Retail Credit Alliance",
      role: "Consumer",
      status: "active",
      joinedDate: "2025-08-12",
    },
  ],
  "2": [
    {
      consortiumId: "CONS_001",
      consortiumName: "SME Lending Consortium",
      role: "Consumer",
      status: "active",
      joinedDate: "2025-11-18",
    },
  ],
  "4": [
    {
      consortiumId: "CONS_001",
      consortiumName: "SME Lending Consortium",
      role: "Contributor",
      status: "active",
      joinedDate: "2026-01-07",
    },
  ],
  "7": [
    {
      consortiumId: "CONS_002",
      consortiumName: "Retail Credit Alliance",
      role: "Contributor",
      status: "active",
      joinedDate: "2025-10-01",
    },
  ],
  "8": [
    {
      consortiumId: "CONS_002",
      consortiumName: "Retail Credit Alliance",
      role: "Contributor",
      status: "active",
      joinedDate: "2025-12-15",
    },
  ],
  "3": [
    {
      consortiumId: "CONS_003",
      consortiumName: "Trade Finance Network",
      role: "Consumer",
      status: "pending",
      joinedDate: "2026-02-20",
    },
  ],
};

const subscriptionsByInstitution: Record<string, ProductSubscriptionRow[]> = {
  "1": [
    {
      productId: "PRD_001",
      productName: "SME Credit Decision Pack",
      plan: "Enterprise",
      usage: "12,400 enquiries / mo",
      status: "active",
    },
    {
      productId: "PRD_002",
      productName: "Retail Thin-File Pack",
      plan: "Growth",
      usage: "3,200 enquiries / mo",
      status: "active",
    },
  ],
  "3": [
    {
      productId: "PRD_002",
      productName: "Retail Thin-File Pack",
      plan: "Starter",
      usage: "890 enquiries / mo",
      status: "trial",
    },
  ],
  "7": [
    {
      productId: "PRD_001",
      productName: "SME Credit Decision Pack",
      plan: "Standard",
      usage: "5,100 enquiries / mo",
      status: "active",
    },
  ],
};

export function getConsortiumMemberships(institutionId: string): ConsortiumMembershipRow[] {
  return membershipsByInstitution[institutionId] ?? [];
}

export function getProductSubscriptions(institutionId: string): ProductSubscriptionRow[] {
  return subscriptionsByInstitution[institutionId] ?? [];
}
