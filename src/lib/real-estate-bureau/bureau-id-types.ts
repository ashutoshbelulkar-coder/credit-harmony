/** Identity document types commonly used across Indian credit bureaus (CIBIL, Experian, Equifax, CRIF). */
export const BUREAU_ID_TYPES = [
  { value: "PAN", label: "PAN — Permanent Account Number", placeholder: "ABCDE1234F" },
  { value: "AADHAAR", label: "Aadhaar (UID)", placeholder: "12-digit Aadhaar number" },
  { value: "PASSPORT", label: "Passport", placeholder: "e.g. A1234567" },
  { value: "VOTER_ID", label: "Voter ID (EPIC)", placeholder: "e.g. ABC1234567" },
  { value: "DRIVING_LICENSE", label: "Driving Licence", placeholder: "e.g. MH-12-20190001234" },
  { value: "RATION_CARD", label: "Ration Card", placeholder: "Ration card number" },
  { value: "NREGA", label: "NREGA Job Card", placeholder: "Job card number" },
  { value: "CKYC", label: "CKYC ID", placeholder: "14-digit CKYC identifier" },
  { value: "NPR", label: "NPR — National Population Register", placeholder: "NPR ID" },
  { value: "GSTIN", label: "GSTIN (entity)", placeholder: "15-character GSTIN" },
  { value: "CIN", label: "CIN (company)", placeholder: "e.g. U74999MH2010PTC123456" },
  { value: "UDYAM", label: "Udyam Registration", placeholder: "Udyam registration number" },
  { value: "TAN", label: "TAN — Tax Deduction Account", placeholder: "10-character TAN" },
] as const;

export type BureauIdType = (typeof BUREAU_ID_TYPES)[number]["value"];

export function bureauIdPlaceholder(type: string): string {
  return BUREAU_ID_TYPES.find((t) => t.value === type)?.placeholder ?? "Enter ID number";
}

export function bureauIdLabel(type: string): string {
  return BUREAU_ID_TYPES.find((t) => t.value === type)?.label ?? type;
}

/** Normalise ID value for storage (PAN uppercased; others trimmed). */
export function formatBureauIdValue(type: string, value: string): string {
  const trimmed = value.trim();
  if (type === "PAN") return trimmed.toUpperCase();
  return trimmed;
}
