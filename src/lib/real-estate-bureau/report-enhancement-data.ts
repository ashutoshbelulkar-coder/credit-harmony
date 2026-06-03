import type { PropertyReportEnhancements } from "./types";

/** Enterprise bureau intelligence payload (mock) aligned to CERSAI Service I/II samples. */
export function createReportEnhancements(
  borrowerName: string,
  address: string
): PropertyReportEnhancements {
  const coBorrower = borrowerName === "Rahul Sharma" ? "Priya Sharma" : "Co-Borrower";
  const coPan = borrowerName === "Rahul Sharma" ? "BCDEF5678G" : "COBRW1234X";

  return {
    bureauSummary: {
      currentExposure: "₹85 Lakhs",
      historicalExposure: "₹1.75 Cr",
      activeCharges: 1,
      historicalCharges: 2,
      riskBandLabel: "Medium Risk",
    },
    cersaiVerification: {
      status: "MATCH FOUND",
      securityInterests: 2,
      activeCharges: 1,
      releasedCharges: 1,
      latestRegistration: "18-Mar-2024",
      verificationConfidence: 100,
    },
    securityInterestDetails: [
      {
        securityInterestId: "400789456123",
        creationDate: "18-Mar-2024",
        typeOfCharge: "First Charge",
        financingType: "Sole Financing",
        status: "Active",
        registrationTimestamp: "18-Mar-2024 14:22",
        chargePosition: 1,
      },
      {
        securityInterestId: "400789456089",
        creationDate: "12-Aug-2020",
        typeOfCharge: "First Charge",
        financingType: "Sole Financing",
        status: "Released",
        registrationTimestamp: "12-Aug-2020 11:05",
        chargePosition: 1,
      },
    ],
    securedCreditors: [
      {
        institutionName: "HDFC Bank Ltd",
        institutionType: "Bank",
        branch: "Kharadi Branch",
        officeName: "Pune Regional Office",
        city: "Pune",
        state: "Maharashtra",
        chargeRank: 1,
      },
    ],
    borrowerSecurityMapping: [
      {
        borrowerName,
        role: "Primary Borrower",
        ownershipFlag: "Owner",
        ownershipPercent: 60,
        pan: "ABCDE1234F",
      },
      {
        borrowerName: coBorrower,
        role: "Co-Borrower",
        ownershipFlag: "Owner",
        ownershipPercent: 40,
        pan: coPan,
      },
    ],
    cersaiAsset: {
      assetId: "200050987654",
      assetCategory: "Immovable",
      assetType: "Residential Property",
      assetSubType: "Apartment",
      assetDescription: address,
    },
    securityInterestHistory: [
      {
        year: "2020",
        title: "Mortgage Registered",
        institution: "ICICI Bank",
        amount: "₹45 Lakhs",
        status: "Released",
      },
      {
        year: "2024",
        title: "Mortgage Registered",
        institution: "HDFC Bank",
        amount: "₹85 Lakhs",
        status: "Active",
      },
    ],
    encumbranceAnalysis: {
      knownMortgages: 3,
      activeCharges: 1,
      releasedCharges: 2,
      currentExposure: "₹85 Lakhs",
      historicalExposure: "₹1.75 Cr",
      chargeConcentration: "Single active lender (HDFC Bank)",
    },
    chargeHierarchy: {
      firstCharge: "HDFC Bank",
      secondCharge: "None",
      pariPassu: "No",
    },
    cersaiMemberReconciliation: {
      memberOutstanding: "₹78.2 Lakhs",
      cersaiSecuredAmount: "₹85 Lakhs",
      variance: "₹6.8 Lakhs",
      status: "Within Tolerance",
    },
    ownershipConsistency: {
      memberData: [
        { name: borrowerName, detail: "60%" },
        { name: coBorrower, detail: "40%" },
      ],
      cersaiData: [
        { name: borrowerName, detail: "Borrower" },
        { name: coBorrower, detail: "Co-Borrower" },
      ],
      result: "MATCHED",
    },
    advancedBureauInsights: [
      { tone: "positive", text: "Active Charge Exists" },
      { tone: "positive", text: "Property Verified" },
      { tone: "positive", text: "Borrower Verified" },
      { tone: "warning", text: "Multiple Historical Charges" },
      { tone: "warning", text: "Exposure Increased By 42%" },
      { tone: "positive", text: "Ownership Structure Consistent" },
      { tone: "positive", text: "No Duplicate Property Detected" },
    ],
    propertyGraph: {
      nodes: [
        { id: "property", label: "Property" },
        { id: "owner", label: borrowerName },
        { id: "mortgage", label: "HDFC Mortgage" },
        { id: "si", label: "Security Interest" },
      ],
      edges: [
        { from: "property", to: "owner" },
        { from: "owner", to: "mortgage" },
        { from: "mortgage", to: "si" },
      ],
    },
    rawCersaiPayload: {
      service: "CERSAI_SERVICE_II",
      securityInterestId: "400789456123",
      assetId: "200050987654",
      registrationTimestamp: "2024-03-18T14:22:00+05:30",
      typeOfCharge: "First Charge",
      financingType: "Sole Financing",
      securityInterestStatus: "Active",
      securedAmount: 8500000,
      currency: "INR",
      securedCreditor: {
        institutionName: "HDFC Bank Ltd",
        institutionType: "Bank",
        branch: "Kharadi Branch",
        office: "Pune Regional Office",
      },
      borrowers: [
        { name: borrowerName, role: "Primary Borrower", pan: "ABCDE1234F" },
        { name: coBorrower, role: "Co-Borrower", pan: coPan },
      ],
      asset: {
        assetId: "200050987654",
        category: "Immovable",
        type: "Residential Property",
        subType: "Apartment",
        description: address,
      },
      matchingEngine: {
        matchConfidence: 100,
        propertyBureauId: "PROP-BUREAU-2847",
        duplicateFlag: false,
      },
    },
    dataSourceContribution: [
      { source: "Member Submitted Data", percent: 45 },
      { source: "CERSAI", percent: 35 },
      { source: "Property Graph", percent: 10 },
      { source: "Valuation Data", percent: 5 },
      { source: "Ownership Registry", percent: 5 },
    ],
  };
}
