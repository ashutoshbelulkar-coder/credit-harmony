import data from "./institutions.json";

export type InstitutionStatus = "active" | "pending" | "suspended" | "draft";
export type BillingModel = "prepaid" | "postpaid" | "hybrid";

export interface Institution {
  id: string;
  name: string;
  tradingName?: string;
  type: string;
  status: InstitutionStatus;
  apisEnabled: number;
  slaHealth: number;
  lastUpdated: string;
  registrationNumber?: string;
  jurisdiction?: string;
  licenseType?: string;
  licenseNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
  onboardedDate?: string | null;
  dataQuality?: number;
  matchAccuracy?: number;
  complianceDocs?: { name: string; status: "verified" | "pending" }[];
  isDataSubmitter: boolean;
  isSubscriber: boolean;
  billingModel?: BillingModel;
  creditBalance?: number | null;
}

export const institutions = data.institutions as Institution[];
export const institutionTypes = data.institutionTypes as string[];

export const statusStyles: Record<InstitutionStatus, string> = {
  active: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  suspended: "bg-danger-subtle text-danger",
  draft: "bg-muted text-muted-foreground",
};

export function getInstitutionById(id: string): Institution | undefined {
  return institutions.find((inst) => inst.id === id);
}
