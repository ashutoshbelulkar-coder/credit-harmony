import type {
  InquiryFormData,
  InquiryHistoryRow,
  PropertyMatch,
  PropertyReport,
  PropertySearchSuggestion,
  SearchSources,
} from "./types";
import { createReportEnhancements } from "./report-enhancement-data";

export const DEFAULT_SEARCH_SOURCES: SearchSources = {
  memberSubmittedData: true,
  cersai: true,
  ownershipRecords: true,
  valuationRecords: true,
  legalRecords: true,
};

export const SCENARIO_1_FORM: InquiryFormData = {
  borrower: {
    borrowerType: "Individual",
    borrowerName: "Rahul Sharma",
    pan: "ABCDE1234F",
    dateOfBirth: "1985-03-15",
    mobileNumber: "9876543210",
    email: "rahul.sharma@email.com",
    coBorrowerName: "Priya Sharma",
    coBorrowerPan: "FGHIJ5678K",
  },
  property: {
    propertyType: "Residential Apartment",
    surveyNumber: "SN-2847/Pune",
    ctsNumber: "CTS-4521",
    khataNumber: "KH-89234",
    plotNumber: "PL-1204",
    flatNumber: "1204",
    floorNumber: "12",
    buildingName: "Panchshil Towers",
    towerName: "Tower B",
    projectName: "Panchshil Towers",
    addressLine1: "Flat 1204, Tower B, Panchshil Towers",
    addressLine2: "Kharadi",
    locality: "Kharadi",
    landmark: "Near EON IT Park",
    city: "Pune",
    district: "Pune",
    state: "Maharashtra",
    pincode: "411014",
  },
  registration: {
    registrationNumber: "REG/MH/2019/452187",
    saleDeedNumber: "SD-2019-78432",
    registrarOffice: "Sub-Registrar Office, Kharadi, Pune",
  },
  searchSources: { ...DEFAULT_SEARCH_SOURCES },
};

export const SCENARIO_2_FORM: InquiryFormData = {
  borrower: {
    borrowerType: "Individual",
    borrowerName: "Amit Kulkarni",
    pan: "LMNOP9012Q",
    dateOfBirth: "1978-11-22",
    mobileNumber: "9123456789",
    email: "amit.kulkarni@email.com",
  },
  property: {
    propertyType: "Residential Apartment",
    surveyNumber: "SN-1923/Pune",
    ctsNumber: "CTS-3102",
    khataNumber: "KH-45102",
    plotNumber: "PL-503",
    flatNumber: "503",
    floorNumber: "5",
    buildingName: "Riverdale Heights",
    towerName: "Tower A",
    projectName: "Riverdale Heights",
    addressLine1: "Flat 503, Riverdale Heights",
    addressLine2: "Kharadi",
    locality: "Kharadi",
    landmark: "Near Phoenix Mall",
    city: "Pune",
    district: "Pune",
    state: "Maharashtra",
    pincode: "411014",
  },
  registration: {
    registrationNumber: "REG/MH/2017/328901",
    saleDeedNumber: "SD-2017-56210",
    registrarOffice: "Sub-Registrar Office, Kharadi, Pune",
  },
  searchSources: { ...DEFAULT_SEARCH_SOURCES },
};

function buildReport(
  reportId: string,
  inquiryId: string,
  borrowerName: string,
  address: string,
  propertyId: string,
  riskScore: number,
  riskLevel: "Low" | "Medium" | "High"
): PropertyReport {
  return {
    reportId,
    inquiryId,
    inquiryDate: new Date().toISOString().slice(0, 10),
    inquiryUser: "realestate.demo@crif.com",
    searchParameters: `${borrowerName} | ${address}`,
    sourcesUsed: [
      "Member Submitted Data",
      "CERSAI",
      "Ownership Records",
      "Valuation Records",
      "Legal Records",
    ],
    riskScore,
    riskLevel,
    propertyValue: "₹1.32 Cr",
    totalExposure: "₹85 Lakhs",
    activeMortgages: 1,
    historicalMortgages: 2,
    ownershipChanges: 1,
    documentCompleteness: 92,
    propertyId,
    propertyType: "Residential",
    propertySubtype: "Apartment",
    address,
    surveyNumber: "SN-2847/Pune",
    registrationNumber: "REG/MH/2019/452187",
    area: "1,450 sq.ft. (Carpet)",
    ownership: [
      { ownerName: borrowerName, ownershipPercent: 60, pan: "ABCDE1234F", role: "Primary Owner" },
      { ownerName: "Priya Sharma", ownershipPercent: 40, pan: "FGHIJ5678K", role: "Co-Owner" },
    ],
    activeMortgageList: [
      {
        lender: "HDFC Bank Ltd.",
        loanAmount: "₹85.0 L",
        outstanding: "₹78.2 L",
        chargeType: "First Charge",
        status: "Active",
        registrationDate: "2024-03-18",
      },
    ],
    historicalMortgageList: [
      {
        lender: "ICICI Bank Ltd.",
        loanAmount: "₹45.0 L",
        outstanding: "₹0",
        chargeType: "Registered Mortgage",
        status: "Released",
        registrationDate: "2020-08-12",
      },
      {
        lender: "State Bank of India",
        loanAmount: "₹30.0 L",
        outstanding: "₹0",
        chargeType: "Registered Mortgage",
        status: "Closed",
        registrationDate: "2015-08-20",
      },
    ],
    cersaiFindings: [
      {
        securityInterestId: "400789456123",
        chargeHolder: "HDFC Bank Ltd.",
        chargeType: "First Charge",
        securedAmount: "₹85 Lakhs",
        registrationDate: "18-Mar-2024",
        currentStatus: "Active",
      },
      {
        securityInterestId: "400789456089",
        chargeHolder: "ICICI Bank Ltd.",
        chargeType: "First Charge",
        securedAmount: "₹45 Lakhs",
        registrationDate: "12-Aug-2020",
        currentStatus: "Released",
      },
    ],
    timeline: [
      { year: "2019", title: "Property Purchased", description: "Sale deed registered at Sub-Registrar Kharadi" },
      { year: "2021", title: "Mortgage Created", description: "HDFC Bank equitable mortgage registered with CERSAI" },
      { year: "2023", title: "Top-up Loan", description: "ICICI Bank additional charge registered" },
      { year: "2024", title: "Valuation Updated", description: "Member valuation: ₹1.42 Cr (CRIF certified)" },
      { year: "2025", title: "Charge Modified", description: "HDFC charge modification filed — outstanding revised" },
    ],
    documentChecklist: [
      { label: "Sale Deed", status: "complete" },
      { label: "Encumbrance Certificate", status: "complete" },
      { label: "Khata Certificate", status: "complete" },
      { label: "Occupancy Certificate", status: "partial" },
      { label: "Building Plan Approval", status: "complete" },
      { label: "Property Tax Receipt", status: "complete" },
      { label: "Society NOC", status: "missing" },
    ],
    valuationTrend: [
      { year: "2019", value: 85 },
      { year: "2020", value: 88 },
      { year: "2021", value: 95 },
      { year: "2022", value: 108 },
      { year: "2023", value: 125 },
      { year: "2024", value: 138 },
      { year: "2025", value: 142 },
    ],
    riskInsights: [
      {
        title: "Multiple Active Charges",
        description: "Two active mortgage charges registered with CERSAI totalling ₹98.5 L exposure against property value of ₹1.42 Cr.",
        severity: "medium",
      },
      {
        title: "Ownership Change History",
        description: "Ownership transferred in 2019 with co-owner addition in 2020. No disputes flagged in legal records.",
        severity: "low",
      },
      {
        title: "Exposure Growth",
        description: "Total secured exposure increased 38% since 2021 due to top-up loan. LTV currently at 69%.",
        severity: "medium",
      },
      {
        title: "Document Gap — Society NOC",
        description: "Society NOC not available in member records. May affect transferability assessment.",
        severity: "high",
      },
    ],
    recommendation: riskLevel,
    recommendationText:
      riskLevel === "Medium"
        ? "Property presents moderate risk due to historical charge activity and exposure growth. CERSAI match verified with reconciled member data within tolerance. Recommended for underwriting with standard encumbrance review."
        : riskLevel === "Low"
          ? "Property profile indicates low risk with clean ownership chain and adequate documentation."
          : "Property presents elevated risk. Recommend senior credit committee review before proceeding.",
    enhancements: createReportEnhancements(borrowerName, address),
  };
}

export const REPORT_SCENARIO_1 = buildReport(
  "REB-RPT-2026-001",
  "REB-INQ-2026-001",
  "Rahul Sharma",
  "Flat 1204, Tower B, Panchshil Towers, Kharadi, Pune 411014",
  "PROP-MH-PUN-2847",
  86,
  "Medium"
);

export const REPORT_MATCH_1 = buildReport(
  "REB-RPT-2026-002-A",
  "REB-INQ-NEW",
  "Amit Kulkarni",
  "Flat 503, Riverdale Heights, Kharadi, Pune 411014",
  "PROP-MH-PUN-503-A",
  72,
  "Medium"
);

export const REPORT_MATCH_2 = buildReport(
  "REB-RPT-2026-002-B",
  "REB-INQ-NEW",
  "Amit Kulkarni",
  "Flat 503, Riverdale Heights Phase 2, Kharadi, Pune 411014",
  "PROP-MH-PUN-503-B",
  68,
  "Medium"
);

export const REPORT_MATCH_3 = buildReport(
  "REB-RPT-2026-002-C",
  "REB-INQ-NEW",
  "Amit Kulkarni",
  "Flat 503, Riverdale Residency, Wagholi, Pune 412207",
  "PROP-MH-PUN-503-C",
  55,
  "Low"
);

export const PROPERTY_MATCHES: PropertyMatch[] = [
  {
    matchId: "match-1",
    propertyAddress: "Flat 503, Riverdale Heights, Kharadi, Pune 411014",
    propertyType: "Residential Apartment",
    confidenceScore: 98,
    activeMortgageCount: 2,
    latestValuation: "₹1.18 Cr",
    ownershipCount: 2,
    reportId: REPORT_MATCH_1.reportId,
  },
  {
    matchId: "match-2",
    propertyAddress: "Flat 503, Riverdale Heights Phase 2, Kharadi, Pune 411014",
    propertyType: "Residential Apartment",
    confidenceScore: 93,
    activeMortgageCount: 1,
    latestValuation: "₹95.0 L",
    ownershipCount: 1,
    reportId: REPORT_MATCH_2.reportId,
  },
  {
    matchId: "match-3",
    propertyAddress: "Flat 503, Riverdale Residency, Wagholi, Pune 412207",
    propertyType: "Residential Apartment",
    confidenceScore: 88,
    activeMortgageCount: 0,
    latestValuation: "₹72.5 L",
    ownershipCount: 1,
    reportId: REPORT_MATCH_3.reportId,
  },
];

export const REPORTS_BY_ID: Record<string, PropertyReport> = {
  [REPORT_SCENARIO_1.reportId]: REPORT_SCENARIO_1,
  [REPORT_MATCH_1.reportId]: REPORT_MATCH_1,
  [REPORT_MATCH_2.reportId]: REPORT_MATCH_2,
  [REPORT_MATCH_3.reportId]: REPORT_MATCH_3,
};

export const INITIAL_INQUIRY_HISTORY: InquiryHistoryRow[] = [
  {
    inquiryId: "REB-INQ-2026-001",
    borrowerName: "Rahul Sharma",
    propertySummary: "Panchshil Towers, Kharadi, Pune",
    inquiryDate: "2026-02-28",
    matchStatus: "Single Match",
    reportStatus: "Ready",
    createdBy: "realestate.demo",
    scenario: "single_match",
    reportId: REPORT_SCENARIO_1.reportId,
  },
  {
    inquiryId: "REB-INQ-2026-002",
    borrowerName: "Amit Kulkarni",
    propertySummary: "Riverdale Heights, Kharadi, Pune",
    inquiryDate: "2026-02-25",
    matchStatus: "Multiple Matches",
    reportStatus: "Ready",
    createdBy: "realestate.admin",
    scenario: "multiple_match",
    reportId: REPORT_MATCH_1.reportId,
  },
  {
    inquiryId: "REB-INQ-2026-003",
    borrowerName: "Priya Mehta",
    propertySummary: "Godrej River Greens, Manjari, Pune",
    inquiryDate: "2026-02-22",
    matchStatus: "Single Match",
    reportStatus: "Ready",
    createdBy: "crif.property",
    scenario: "single_match",
    reportId: REPORT_SCENARIO_1.reportId,
  },
  {
    inquiryId: "REB-INQ-2026-004",
    borrowerName: "Sunita Rathore",
    propertySummary: "Prestige Lakeside Habitat, Bengaluru",
    inquiryDate: "2026-02-18",
    matchStatus: "Single Match",
    reportStatus: "Ready",
    createdBy: "realestate.demo",
    scenario: "single_match",
    reportId: REPORT_SCENARIO_1.reportId,
  },
  {
    inquiryId: "REB-INQ-2026-005",
    borrowerName: "Neha Verma",
    propertySummary: "DLF Phase 5, Gurgaon",
    inquiryDate: "2026-02-14",
    matchStatus: "No Match",
    reportStatus: "Failed",
    createdBy: "realestate.admin",
    errorType: "no_property",
  },
  {
    inquiryId: "REB-INQ-2026-006",
    borrowerName: "Arjun Nair",
    propertySummary: "Lodha Park, Mumbai",
    inquiryDate: "2026-02-10",
    matchStatus: "Single Match",
    reportStatus: "Partial",
    createdBy: "crif.property",
    errorType: "partial_data",
    reportId: REPORT_SCENARIO_1.reportId,
  },
  {
    inquiryId: "REB-INQ-2026-007",
    borrowerName: "Vikram Desai",
    propertySummary: "Sobha Dream Acres, Bengaluru",
    inquiryDate: "2026-02-05",
    matchStatus: "Single Match",
    reportStatus: "Failed",
    createdBy: "realestate.demo",
    errorType: "timeout",
  },
  {
    inquiryId: "REB-INQ-2026-008",
    borrowerName: "Kavita Joshi",
    propertySummary: "Brigade Cornerstone, Bengaluru",
    inquiryDate: "2026-01-28",
    matchStatus: "Single Match",
    reportStatus: "Failed",
    createdBy: "realestate.admin",
    errorType: "no_cersai",
  },
];

export const PROPERTY_SEARCH_SUGGESTIONS: PropertySearchSuggestion[] = [
  {
    id: "sug-panchshil-towers",
    label: "Panchshil Towers, Kharadi Pune",
    subtitle: "Residential · Panchshil Realty",
    projectName: "Panchshil Towers",
    locality: "Kharadi",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411014",
    buildingName: "Panchshil Towers",
    flatNumber: "1204",
    towerName: "Tower B",
    surveyNumber: "SN-2847/Pune",
  },
  {
    id: "sug-panchshil-realty",
    label: "Panchshil Realty, Kharadi Pune",
    subtitle: "Developer · Kharadi corridor",
    projectName: "Panchshil Realty",
    locality: "Kharadi",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411014",
  },
  {
    id: "sug-panchshil-wtc",
    label: "Panchshil World Trade Center",
    subtitle: "Commercial · Kharadi",
    projectName: "Panchshil World Trade Center",
    locality: "Kharadi",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411014",
  },
  {
    id: "sug-godrej-river",
    label: "Godrej River Greens, Manjari Pune",
    subtitle: "Residential · Godrej Properties",
    projectName: "Godrej River Greens",
    locality: "Manjari",
    city: "Pune",
    state: "Maharashtra",
    pincode: "412307",
  },
  {
    id: "sug-prestige-lakeside",
    label: "Prestige Lakeside Habitat, Bengaluru",
    subtitle: "Residential · Prestige Group",
    projectName: "Prestige Lakeside Habitat",
    locality: "Varthur",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560087",
  },
  {
    id: "sug-riverdale",
    label: "Riverdale Heights, Kharadi Pune",
    subtitle: "Residential · Kharadi",
    projectName: "Riverdale Heights",
    locality: "Kharadi",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411014",
    buildingName: "Riverdale Heights",
    flatNumber: "503",
    towerName: "Tower A",
  },
  {
    id: "sug-survey-kharadi",
    label: "Survey 45/2 Kharadi",
    subtitle: "Survey record · Pune district",
    projectName: "",
    locality: "Kharadi",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411014",
    surveyNumber: "Survey 45/2",
  },
];

export const PROCESSING_MESSAGES = [
  "Finding property in Property Bureau",
  "Matching property records across member submissions",
  "Checking CERSAI database",
  "Checking proprietary data sources",
  "Building ownership graph",
  "Building mortgage graph",
  "Calculating risk indicators",
  "Building comprehensive report",
] as const;

export function makeInquiryId(seq: number): string {
  const year = new Date().getFullYear();
  return `REB-INQ-${year}-${String(seq).padStart(3, "0")}`;
}

export function makeReportId(seq: number): string {
  const year = new Date().getFullYear();
  return `REB-RPT-${year}-${String(seq).padStart(3, "0")}`;
}
