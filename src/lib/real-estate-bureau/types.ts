export type InquiryStatus = "Completed" | "Processing" | "Failed" | "Partial";
export type MatchStatus = "Single Match" | "Multiple Matches" | "No Match" | "Pending";
export type ReportStatus = "Ready" | "Pending" | "Failed" | "Partial";
export type RiskLevel = "Low" | "Medium" | "High";
export type RebErrorType =
  | "no_property"
  | "no_cersai"
  | "timeout"
  | "partial_data"
  | "system_error";

export type InquiryScenario = "single_match" | "multiple_match";

export type InquirySearchType =
  | "borrower_property"
  | "property_only"
  | "registration"
  | "mortgage";

export type SearchCompletenessLevel = "Low" | "Medium" | "High";

export interface CoBorrowerEntry {
  id: string;
  name: string;
  pan: string;
  mobile: string;
  relationship: string;
}

export interface PropertySearchSuggestion {
  id: string;
  label: string;
  subtitle: string;
  projectName: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  buildingName?: string;
  flatNumber?: string;
  towerName?: string;
  surveyNumber?: string;
}

export interface SearchSources {
  memberSubmittedData: boolean;
  cersai: boolean;
  ownershipRecords: boolean;
  valuationRecords: boolean;
  legalRecords: boolean;
}

export interface BorrowerDetails {
  borrowerType: string;
  borrowerName: string;
  pan: string;
  dateOfBirth: string;
  mobileNumber: string;
  email: string;
  coBorrowerName?: string;
  coBorrowerPan?: string;
  coBorrowers?: CoBorrowerEntry[];
}

export interface PropertyDetails {
  propertyType: string;
  surveyNumber: string;
  ctsNumber: string;
  khataNumber: string;
  plotNumber: string;
  flatNumber: string;
  floorNumber: string;
  buildingName: string;
  towerName: string;
  projectName: string;
  addressLine1: string;
  addressLine2: string;
  locality: string;
  landmark: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
}

export interface RegistrationDetails {
  registrationNumber: string;
  saleDeedNumber: string;
  registrarOffice: string;
}

export interface InquiryFormData {
  borrower: BorrowerDetails;
  property: PropertyDetails;
  registration: RegistrationDetails;
  searchSources: SearchSources;
}

export interface InquiryHistoryRow {
  inquiryId: string;
  borrowerName: string;
  propertySummary: string;
  inquiryDate: string;
  matchStatus: MatchStatus;
  reportStatus: ReportStatus;
  createdBy: string;
  scenario?: InquiryScenario;
  reportId?: string;
  errorType?: RebErrorType;
}

export interface PropertyMatch {
  matchId: string;
  propertyAddress: string;
  propertyType: string;
  confidenceScore: number;
  activeMortgageCount: number;
  latestValuation: string;
  ownershipCount: number;
  reportId: string;
}

export interface OwnershipRecord {
  ownerName: string;
  ownershipPercent: number;
  pan: string;
  role: string;
}

export interface MortgageRecord {
  lender: string;
  loanAmount: string;
  outstanding: string;
  chargeType: string;
  status: string;
  registrationDate?: string;
}

export interface CersaiFinding {
  securityInterestId: string;
  chargeHolder: string;
  chargeType: string;
  securedAmount: string;
  registrationDate: string;
  currentStatus: string;
}

export interface TimelineEvent {
  year: string;
  title: string;
  description: string;
}

export interface DocumentCheckItem {
  label: string;
  status: "complete" | "partial" | "missing";
}

export interface ValuationPoint {
  year: string;
  value: number;
}

export interface RiskInsight {
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
}

export interface PropertyReport {
  reportId: string;
  inquiryId: string;
  inquiryDate: string;
  inquiryUser: string;
  searchParameters: string;
  sourcesUsed: string[];
  riskScore: number;
  riskLevel: RiskLevel;
  propertyValue: string;
  totalExposure: string;
  activeMortgages: number;
  historicalMortgages: number;
  ownershipChanges: number;
  documentCompleteness: number;
  propertyId: string;
  propertyType: string;
  propertySubtype: string;
  address: string;
  surveyNumber: string;
  registrationNumber: string;
  area: string;
  ownership: OwnershipRecord[];
  activeMortgageList: MortgageRecord[];
  historicalMortgageList: MortgageRecord[];
  cersaiFindings: CersaiFinding[];
  timeline: TimelineEvent[];
  documentChecklist: DocumentCheckItem[];
  valuationTrend: ValuationPoint[];
  riskInsights: RiskInsight[];
  recommendation: RiskLevel;
  recommendationText: string;
}

export interface PendingInquiry {
  inquiryId: string;
  formData: InquiryFormData;
  scenario: InquiryScenario;
  createdAt: string;
  createdBy: string;
}
