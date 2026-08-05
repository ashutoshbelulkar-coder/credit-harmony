/** Seeded option lists for the Access Request sheet (demo). */
export const ACCESS_INSTITUTIONS = [
  { id: "inst_hdfc", name: "HDFC Bank" },
  { id: "inst_icici", name: "ICICI Bank" },
  { id: "inst_sbi", name: "State Bank of India" },
  { id: "inst_axis", name: "Axis Bank" },
  { id: "inst_bajaj", name: "Bajaj Finance" },
  { id: "inst_phonepe", name: "PhonePe Credit" },
  { id: "inst_flipkart", name: "Flipkart Finance" },
] as const;

export const ACCESS_BUSINESS_DOMAINS = [
  "Retail Lending",
  "SME Lending",
  "Credit Cards",
  "Collections",
  "Fraud & Risk",
  "BNPL",
] as const;

export const ACCESS_APPLICATIONS = [
  "Origination Gateway",
  "Underwriting Workbench",
  "Collections Console",
  "Customer 360",
  "Batch Scoring Pipeline",
] as const;

export const ACCESS_PURPOSES = [
  "loan_application",
  "credit_card",
  "kyc_verification",
  "account_review",
  "collection",
  "soft_enquiry",
] as const;

export const ACCESS_PURPOSE_LABELS: Record<(typeof ACCESS_PURPOSES)[number], string> = {
  loan_application: "Loan application",
  credit_card: "Credit card underwriting",
  kyc_verification: "KYC verification",
  account_review: "Account review",
  collection: "Collections",
  soft_enquiry: "Soft enquiry / pre-qualification",
};
