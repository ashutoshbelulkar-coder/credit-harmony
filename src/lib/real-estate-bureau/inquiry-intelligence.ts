import type {
  InquiryFormData,
  InquirySearchType,
  PropertyDetails,
  PropertySearchSuggestion,
  RegistrationDetails,
  SearchCompletenessLevel,
} from "./types";
import { DEFAULT_SEARCH_SOURCES } from "./mock-data";

export interface SmartInquiryInput {
  searchType: InquirySearchType;
  borrowerName: string;
  mobile: string;
  pan: string;
  dob: string;
  email: string;
  propertyQuery: string;
  selectedSuggestion: PropertySearchSuggestion | null;
  property: Partial<PropertyDetails>;
  registration: Partial<RegistrationDetails>;
}

export interface IdentificationSignal {
  label: string;
  present: boolean;
  required?: boolean;
}

export interface IdentificationStrength {
  percent: number;
  signals: IdentificationSignal[];
  available: string[];
  missing: string[];
}

export function filterPropertySuggestions(
  query: string,
  suggestions: PropertySearchSuggestion[]
): PropertySearchSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return suggestions.slice(0, 6);
  return suggestions
    .filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.subtitle.toLowerCase().includes(q) ||
        s.projectName.toLowerCase().includes(q) ||
        s.locality.toLowerCase().includes(q) ||
        (s.surveyNumber?.toLowerCase().includes(q) ?? false)
    )
    .slice(0, 6);
}

export const REQUIRED_PROPERTY_DETAIL_FIELDS: {
  key: keyof PropertyDetails;
  label: string;
}[] = [
  { key: "flatNumber", label: "Flat / Unit" },
  { key: "towerName", label: "Tower / Wing" },
  { key: "projectName", label: "Project / Building" },
  { key: "locality", label: "Locality" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "pincode", label: "Pincode" },
];

export function getMissingPropertyDetailFields(
  property: Partial<PropertyDetails>
): string[] {
  const missing: string[] = [];
  for (const { key, label } of REQUIRED_PROPERTY_DETAIL_FIELDS) {
    const raw =
      key === "state" ? property.state ?? "Maharashtra" : property[key];
    if (!String(raw ?? "").trim()) missing.push(label);
  }
  const pin = property.pincode?.trim() ?? "";
  if (pin && !/^\d{6}$/.test(pin)) {
    missing.push("Pincode (6 digits)");
  }
  return missing;
}

export function isPropertyDetailsComplete(property: Partial<PropertyDetails>): boolean {
  return getMissingPropertyDetailFields(property).length === 0;
}

export function computeSearchCompleteness(
  input: SmartInquiryInput
): SearchCompletenessLevel {
  const hasBorrower = Boolean(input.borrowerName.trim());
  const hasMobile = Boolean(input.mobile.trim());
  const hasPan = Boolean(input.pan.trim());
  const hasProperty =
    Boolean(input.selectedSuggestion) ||
    Boolean(input.propertyQuery.trim()) ||
    Boolean(input.property.projectName?.trim());

  const hasSurvey = Boolean(
    input.property.surveyNumber?.trim() || input.selectedSuggestion?.surveyNumber
  );
  const hasRegistration = Boolean(input.registration.registrationNumber?.trim());

  if (input.searchType === "property_only") {
    if (hasProperty && (hasSurvey || input.selectedSuggestion)) return "High";
    if (hasProperty) return "Medium";
    return "Low";
  }

  let score = 0;
  if (hasBorrower) score += 1;
  if (hasMobile) score += 1;
  if (hasProperty) score += 2;
  if (hasPan) score += 1;
  if (hasSurvey) score += 2;
  if (hasRegistration) score += 1;

  if (score >= 6) return "High";
  if (score >= 3) return "Medium";
  return "Low";
}

export function computeIdentificationStrength(
  input: SmartInquiryInput
): IdentificationStrength {
  const signals: IdentificationSignal[] = [
    {
      label: "Borrower Name",
      present: Boolean(input.borrowerName.trim()),
      required: input.searchType === "borrower_property",
    },
    {
      label: "Mobile",
      present: Boolean(input.mobile.trim()),
      required: input.searchType === "borrower_property",
    },
    { label: "PAN", present: Boolean(input.pan.trim()) },
    {
      label: "Project Name",
      present: Boolean(
        input.property.projectName?.trim() || input.selectedSuggestion?.projectName
      ),
      required: true,
    },
    {
      label: "Locality",
      present: Boolean(
        input.property.locality?.trim() || input.selectedSuggestion?.locality
      ),
    },
    {
      label: "Survey Number",
      present: Boolean(
        input.property.surveyNumber?.trim() || input.selectedSuggestion?.surveyNumber
      ),
    },
    {
      label: "Registration Number",
      present: Boolean(input.registration.registrationNumber?.trim()),
    },
    {
      label: "Flat / Unit",
      present: Boolean(
        input.property.flatNumber?.trim() || input.selectedSuggestion?.flatNumber
      ),
    },
  ];

  const weighted = signals.map((s) => ({
    ...s,
    weight: s.required ? 18 : s.label.includes("Survey") || s.label.includes("Registration") ? 14 : 10,
  }));

  const totalWeight = weighted.reduce((a, s) => a + s.weight, 0);
  const earned = weighted.filter((s) => s.present).reduce((a, s) => a + s.weight, 0);
  const percent = totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 0;

  const available = signals.filter((s) => s.present).map((s) => s.label);
  const missing = signals.filter((s) => !s.present).map((s) => s.label);

  return { percent, signals, available, missing };
}

export function smartInquiryToFormData(
  input: SmartInquiryInput,
  coBorrowers: { name: string; pan: string; mobile: string; relationship: string; id: string }[]
): InquiryFormData {
  const sug = input.selectedSuggestion;
  const projectName = input.property.projectName || sug?.projectName || "";
  const locality = input.property.locality || sug?.locality || "";
  const city = input.property.city || sug?.city || "";
  const queryLine = input.propertyQuery.trim() || sug?.label || projectName;

  const firstCo = coBorrowers[0];

  return {
    borrower: {
      borrowerType: "Individual",
      borrowerName: input.borrowerName.trim(),
      pan: input.pan.trim().toUpperCase(),
      dateOfBirth: input.dob,
      mobileNumber: input.mobile.trim(),
      email: input.email.trim(),
      coBorrowerName: firstCo?.name,
      coBorrowerPan: firstCo?.pan,
      coBorrowers: coBorrowers.length > 0 ? coBorrowers : undefined,
    },
    property: {
      propertyType: "Residential Apartment",
      surveyNumber: input.property.surveyNumber || sug?.surveyNumber || "",
      ctsNumber: input.property.ctsNumber || "",
      khataNumber: input.property.khataNumber || "",
      plotNumber: input.property.plotNumber || "",
      flatNumber: input.property.flatNumber || sug?.flatNumber || "",
      floorNumber: input.property.floorNumber || "",
      buildingName: input.property.buildingName || sug?.buildingName || projectName,
      towerName: input.property.towerName || sug?.towerName || "",
      projectName,
      addressLine1: input.property.addressLine1 || queryLine,
      addressLine2: input.property.addressLine2 || locality,
      locality,
      landmark: input.property.landmark || "",
      city,
      district: input.property.district || city,
      state: input.property.state || sug?.state || "Maharashtra",
      pincode: input.property.pincode || sug?.pincode || "",
    },
    registration: {
      registrationNumber: input.registration.registrationNumber || "",
      saleDeedNumber: input.registration.saleDeedNumber || "",
      registrarOffice: input.registration.registrarOffice || "",
    },
    searchSources: { ...DEFAULT_SEARCH_SOURCES },
  };
}

export function applySuggestionToProperty(
  suggestion: PropertySearchSuggestion
): Partial<PropertyDetails> {
  const projectName =
    suggestion.projectName?.trim() ||
    suggestion.buildingName?.trim() ||
    suggestion.label.split(",")[0]?.trim() ||
    "";
  return {
    projectName,
    locality: suggestion.locality,
    city: suggestion.city,
    state: suggestion.state,
    pincode: suggestion.pincode,
    buildingName: suggestion.buildingName ?? suggestion.projectName,
    flatNumber: "",
    towerName: "",
    surveyNumber: suggestion.surveyNumber ?? "",
    addressLine1: suggestion.label,
    district: suggestion.city,
  };
}
