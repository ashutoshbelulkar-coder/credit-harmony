/**
 * Schema Mapper Module – Mock data
 * Realistic credit bureau alternate data schemas.
 */

import type {
  SchemaRegistryEntry,
  MasterSchemaVersion,
  MasterSchemaField,
  ParsedSourceField,
  SourceFieldStatistics,
  AIMappingResult,
  AIMappingSummary,
  EnumReconciliation,
  GeneratedValidationRule,
  MappingVersionEntry,
  SchemaDiffEntry,
  MappingConfirmationSummary,
} from "@/types/schema-mapper";

// ─── Schema Registry ───────────────────────────────────────────────────────

export const schemaRegistryEntries: SchemaRegistryEntry[] = [
  {
    id: "reg-1",
    sourceName: "Jio Telecom",
    sourceType: "telecom",
    masterSchemaVersion: "HCB Master v1.1",
    mappingCoverage: 96,
    unmappedFields: 1,
    ruleCount: 14,
    status: "active",
    version: "v2.3",
    createdBy: "Priya Sharma",
    createdAt: "2025-11-10T09:00:00Z",
    lastModifiedBy: "Priya Sharma",
    lastModifiedAt: "2026-01-15T14:30:00Z",
  },
  {
    id: "reg-2",
    sourceName: "Airtel Telecom",
    sourceType: "telecom",
    masterSchemaVersion: "HCB Master v1.1",
    mappingCoverage: 88,
    unmappedFields: 3,
    ruleCount: 12,
    status: "approved",
    version: "v1.2",
    createdBy: "Rajesh Kumar",
    createdAt: "2025-12-01T10:00:00Z",
    lastModifiedBy: "Amit Patel",
    lastModifiedAt: "2026-01-28T11:00:00Z",
  },
  {
    id: "reg-3",
    sourceName: "Tata Power Utility",
    sourceType: "utility",
    masterSchemaVersion: "HCB Master v1.0",
    mappingCoverage: 72,
    unmappedFields: 5,
    ruleCount: 8,
    status: "under_review",
    version: "v1.0",
    createdBy: "Amit Patel",
    createdAt: "2026-01-05T08:30:00Z",
    lastModifiedBy: "Amit Patel",
    lastModifiedAt: "2026-02-10T16:45:00Z",
  },
  {
    id: "reg-4",
    sourceName: "HDFC Bank",
    sourceType: "bank",
    masterSchemaVersion: "HCB Master v1.1",
    mappingCoverage: 100,
    unmappedFields: 0,
    ruleCount: 22,
    status: "active",
    version: "v3.1",
    createdBy: "Sneha Gupta",
    createdAt: "2025-08-20T07:00:00Z",
    lastModifiedBy: "Sneha Gupta",
    lastModifiedAt: "2026-02-01T09:15:00Z",
  },
  {
    id: "reg-5",
    sourceName: "GST Portal",
    sourceType: "gst",
    masterSchemaVersion: "HCB Master v1.1",
    mappingCoverage: 64,
    unmappedFields: 8,
    ruleCount: 6,
    status: "draft",
    version: "v0.1",
    createdBy: "Vikram Singh",
    createdAt: "2026-02-05T11:00:00Z",
    lastModifiedBy: "Vikram Singh",
    lastModifiedAt: "2026-02-12T13:20:00Z",
  },
  {
    id: "reg-6",
    sourceName: "Mahanagar Gas Utility",
    sourceType: "utility",
    masterSchemaVersion: "HCB Master v1.0",
    mappingCoverage: 81,
    unmappedFields: 3,
    ruleCount: 10,
    status: "approved",
    version: "v1.1",
    createdBy: "Neha Joshi",
    createdAt: "2025-10-15T06:00:00Z",
    lastModifiedBy: "Rajesh Kumar",
    lastModifiedAt: "2026-01-20T10:30:00Z",
  },
  {
    id: "reg-7",
    sourceName: "BSNL Telecom",
    sourceType: "telecom",
    masterSchemaVersion: "HCB Master v1.1",
    mappingCoverage: 45,
    unmappedFields: 11,
    ruleCount: 4,
    status: "draft",
    version: "v0.2",
    createdBy: "Amit Patel",
    createdAt: "2026-02-10T09:00:00Z",
    lastModifiedBy: "Amit Patel",
    lastModifiedAt: "2026-02-14T15:00:00Z",
  },
  {
    id: "reg-8",
    sourceName: "Custom Micro-Finance",
    sourceType: "custom",
    masterSchemaVersion: "HCB Master v1.1",
    mappingCoverage: 0,
    unmappedFields: 0,
    ruleCount: 0,
    status: "archived",
    version: "v1.0",
    createdBy: "Sneha Gupta",
    createdAt: "2025-06-01T08:00:00Z",
    lastModifiedBy: "Sneha Gupta",
    lastModifiedAt: "2025-09-30T12:00:00Z",
  },
];

// ─── Master Schema Versions ────────────────────────────────────────────────

export const masterSchemaVersions: MasterSchemaVersion[] = [
  {
    id: "master-v1.0",
    label: "HCB Master v1.0",
    description: "Initial master credit schema with core consumer fields",
    fieldCount: 12,
    lastUpdated: "2025-06-01T00:00:00Z",
  },
  {
    id: "master-v1.1",
    label: "HCB Master v1.1",
    description: "Added alternate data fields, telecom & utility support",
    fieldCount: 18,
    lastUpdated: "2025-12-15T00:00:00Z",
  },
];

// ─── Master Schema Tree (v1.1) ────────────────────────────────────────────

export const masterSchemaTree: MasterSchemaField[] = [
  {
    id: "ms-1", name: "consumer_id", dataType: "string",
    description: "Unique consumer identifier", path: "consumer_id",
    depth: 0, nullable: false, required: true,
  },
  {
    id: "ms-2", name: "full_name", dataType: "string",
    description: "Full legal name of the consumer", path: "full_name",
    depth: 0, nullable: false, required: true,
  },
  {
    id: "ms-3", name: "date_of_birth", dataType: "date",
    description: "Date of birth as per KYC", path: "date_of_birth",
    depth: 0, nullable: false, required: true,
  },
  {
    id: "ms-4", name: "pan", dataType: "string",
    description: "Permanent Account Number", path: "pan",
    depth: 0, nullable: true, required: false,
  },
  {
    id: "ms-5", name: "phone_number", dataType: "string",
    description: "Primary mobile number", path: "phone_number",
    depth: 0, nullable: false, required: true,
  },
  {
    id: "ms-6", name: "accounts", dataType: "array",
    description: "Credit account records", path: "accounts",
    depth: 0, nullable: true, required: false,
    children: [
      {
        id: "ms-6-1", name: "account_type", dataType: "enum",
        description: "Type of credit account", path: "accounts.account_type",
        depth: 1, nullable: false, required: true,
        enumValues: ["credit_card", "personal_loan", "home_loan", "auto_loan", "telecom", "utility"],
      },
      {
        id: "ms-6-2", name: "lender_name", dataType: "string",
        description: "Name of the lending institution", path: "accounts.lender_name",
        depth: 1, nullable: false, required: true,
      },
      {
        id: "ms-6-3", name: "current_balance", dataType: "number",
        description: "Current outstanding balance", path: "accounts.current_balance",
        depth: 1, nullable: true, required: false,
      },
      {
        id: "ms-6-4", name: "dpd", dataType: "number",
        description: "Days past due", path: "accounts.dpd",
        depth: 1, nullable: true, required: false,
      },
      {
        id: "ms-6-5", name: "account_status", dataType: "enum",
        description: "Current status of the account", path: "accounts.account_status",
        depth: 1, nullable: false, required: true,
        enumValues: ["current", "delinquent", "default", "closed", "written_off"],
      },
    ],
  },
  {
    id: "ms-7", name: "credit_score", dataType: "number",
    description: "Composite credit score", path: "credit_score",
    depth: 0, nullable: true, required: false,
  },
];

// ─── Telecom Source Schema (parsed) ───────────────────────────────────────

export const telecomParsedFields: ParsedSourceField[] = [
  {
    id: "tf-1", name: "subscriber_id", dataType: "string", path: "subscriber_id",
    depth: 0, sampleValues: ["SUB-90012", "SUB-90013", "SUB-90014"],
    nullFrequency: 0, isEnumCandidate: false, detectedEnumValues: [],
  },
  {
    id: "tf-2", name: "customer_name", dataType: "string", path: "customer_name",
    depth: 0, sampleValues: ["Rajesh Kumar", "Priya Sharma", "Amit Patel"],
    nullFrequency: 1.2, isEnumCandidate: false, detectedEnumValues: [],
  },
  {
    id: "tf-3", name: "dob", dataType: "string", path: "dob",
    depth: 0, sampleValues: ["1985-03-15", "1990-07-22", "1988-11-10"],
    nullFrequency: 2.4, isEnumCandidate: false, detectedEnumValues: [],
  },
  {
    id: "tf-4", name: "mobile_no", dataType: "string", path: "mobile_no",
    depth: 0, sampleValues: ["9876543210", "8765432109", "7654321098"],
    nullFrequency: 0, isEnumCandidate: false, detectedEnumValues: [],
  },
  {
    id: "tf-5", name: "avg_monthly_bill", dataType: "number", path: "avg_monthly_bill",
    depth: 0, sampleValues: ["499.00", "799.50", "1299.00"],
    nullFrequency: 3.1, isEnumCandidate: false, detectedEnumValues: [],
  },
  {
    id: "tf-6", name: "payment_delay_days", dataType: "number", path: "payment_delay_days",
    depth: 0, sampleValues: ["0", "5", "15", "30"],
    nullFrequency: 0.8, isEnumCandidate: false, detectedEnumValues: [],
  },
  {
    id: "tf-7", name: "last_payment_status", dataType: "string", path: "last_payment_status",
    depth: 0, sampleValues: ["ON_TIME", "DELAYED", "MISSED", "PAID"],
    nullFrequency: 0.5, isEnumCandidate: true,
    detectedEnumValues: ["ON_TIME", "DELAYED", "MISSED", "PAID"],
  },
];

export const telecomFieldStatistics: SourceFieldStatistics = {
  totalFields: 7,
  nestedFields: 0,
  enumCandidates: 1,
  numericFields: 2,
  stringFields: 5,
  dateFields: 0,
};

// ─── AI Mapping Results (Telecom → Master v1.1) ──────────────────────────

export const telecomMappingResults: AIMappingResult[] = [
  {
    id: "aim-1", sourceFieldId: "tf-1", sourceFieldName: "subscriber_id",
    sourceFieldType: "string", suggestedMasterFieldId: "ms-1",
    suggestedMasterFieldName: "consumer_id", masterFieldType: "string",
    confidence: 76, matchType: "semantic", status: "needs_review",
  },
  {
    id: "aim-2", sourceFieldId: "tf-2", sourceFieldName: "customer_name",
    sourceFieldType: "string", suggestedMasterFieldId: "ms-2",
    suggestedMasterFieldName: "full_name", masterFieldType: "string",
    confidence: 92, matchType: "semantic", status: "auto_accepted",
  },
  {
    id: "aim-3", sourceFieldId: "tf-3", sourceFieldName: "dob",
    sourceFieldType: "string", suggestedMasterFieldId: "ms-3",
    suggestedMasterFieldName: "date_of_birth", masterFieldType: "date",
    confidence: 88, matchType: "semantic", status: "auto_accepted",
  },
  {
    id: "aim-4", sourceFieldId: "tf-4", sourceFieldName: "mobile_no",
    sourceFieldType: "string", suggestedMasterFieldId: "ms-5",
    suggestedMasterFieldName: "phone_number", masterFieldType: "string",
    confidence: 96, matchType: "exact", status: "auto_accepted",
  },
  {
    id: "aim-5", sourceFieldId: "tf-5", sourceFieldName: "avg_monthly_bill",
    sourceFieldType: "number", suggestedMasterFieldId: null,
    suggestedMasterFieldName: null, masterFieldType: null,
    confidence: 0, matchType: "exact", status: "unmapped",
  },
  {
    id: "aim-6", sourceFieldId: "tf-6", sourceFieldName: "payment_delay_days",
    sourceFieldType: "number", suggestedMasterFieldId: "ms-6-4",
    suggestedMasterFieldName: "accounts.dpd", masterFieldType: "number",
    confidence: 81, matchType: "contextual", status: "needs_review",
  },
  {
    id: "aim-7", sourceFieldId: "tf-7", sourceFieldName: "last_payment_status",
    sourceFieldType: "string", suggestedMasterFieldId: "ms-6-5",
    suggestedMasterFieldName: "accounts.account_status", masterFieldType: "enum",
    confidence: 84, matchType: "semantic", status: "needs_review",
  },
];

export const telecomMappingSummary: AIMappingSummary = {
  totalFields: 7,
  autoMapped: 3,
  needsReview: 3,
  unmapped: 1,
  coveragePercent: 86,
};

// ─── Enum Reconciliation ─────────────────────────────────────────────────

export const telecomEnumReconciliations: EnumReconciliation[] = [
  {
    sourceFieldId: "tf-7",
    sourceFieldName: "last_payment_status",
    detectedValues: ["ON_TIME", "DELAYED", "MISSED", "PAID"],
    masterEnumValues: ["current", "delinquent", "default", "closed", "written_off"],
    mappings: [
      { sourceValue: "ON_TIME", masterValue: "current", isApproved: false },
      { sourceValue: "DELAYED", masterValue: "delinquent", isApproved: false },
      { sourceValue: "MISSED", masterValue: "delinquent", isApproved: false },
      { sourceValue: "PAID", masterValue: "current", isApproved: false },
    ],
  },
];

// ─── Validation Rules (auto-generated) ───────────────────────────────────

export const generatedValidationRules: GeneratedValidationRule[] = [
  {
    id: "vr-1", field: "phone_number", ruleType: "regex",
    ruleLogic: "^[6-9][0-9]{9}$", severity: "error",
    isEnabled: true, isEditable: true, impactPercent: 1.2,
    description: "Indian mobile number must start with 6-9 and be 10 digits",
  },
  {
    id: "vr-2", field: "phone_number", ruleType: "required",
    ruleLogic: "NOT NULL", severity: "error",
    isEnabled: true, isEditable: true, impactPercent: 0.0,
    description: "Phone number is required",
  },
  {
    id: "vr-3", field: "date_of_birth", ruleType: "date_constraint",
    ruleLogic: "value < TODAY()", severity: "error",
    isEnabled: true, isEditable: true, impactPercent: 0.3,
    description: "Date of birth must be a past date",
  },
  {
    id: "vr-4", field: "date_of_birth", ruleType: "date_constraint",
    ruleLogic: "AGE(value) >= 18", severity: "warning",
    isEnabled: true, isEditable: true, impactPercent: 0.8,
    description: "Consumer must be at least 18 years old",
  },
  {
    id: "vr-5", field: "accounts.dpd", ruleType: "range",
    ruleLogic: "0 <= value <= 999", severity: "error",
    isEnabled: true, isEditable: true, impactPercent: 0.1,
    description: "Days past due must be between 0 and 999",
  },
  {
    id: "vr-6", field: "accounts.account_status", ruleType: "enum_validation",
    ruleLogic: "IN(current, delinquent, default, closed, written_off)", severity: "error",
    isEnabled: true, isEditable: true, impactPercent: 0.0,
    description: "Account status must be a valid enum value",
  },
  {
    id: "vr-7", field: "accounts.account_status", ruleType: "required",
    ruleLogic: "NOT NULL IF accounts EXISTS", severity: "critical",
    isEnabled: true, isEditable: true, impactPercent: 0.5,
    description: "Account status cannot be null if account record exists",
  },
  {
    id: "vr-8", field: "avg_monthly_bill", ruleType: "range",
    ruleLogic: "value >= 0", severity: "warning",
    isEnabled: true, isEditable: true, impactPercent: 0.2,
    description: "Average monthly bill must be non-negative",
  },
  {
    id: "vr-9", field: "avg_monthly_bill", ruleType: "custom",
    ruleLogic: "DECIMAL(10,2)", severity: "info",
    isEnabled: true, isEditable: true, impactPercent: 0.0,
    description: "Precision constraint: decimal with 10 digits and 2 decimal places",
  },
  {
    id: "vr-10", field: "full_name", ruleType: "required",
    ruleLogic: "NOT NULL AND LENGTH > 0", severity: "error",
    isEnabled: true, isEditable: true, impactPercent: 0.0,
    description: "Full name is required and cannot be empty",
  },
  {
    id: "vr-11", field: "consumer_id", ruleType: "required",
    ruleLogic: "NOT NULL AND UNIQUE", severity: "critical",
    isEnabled: true, isEditable: true, impactPercent: 0.0,
    description: "Consumer ID must be unique and not null",
  },
  {
    id: "vr-12", field: "pan", ruleType: "regex",
    ruleLogic: "^[A-Z]{5}[0-9]{4}[A-Z]$", severity: "error",
    isEnabled: false, isEditable: true, impactPercent: 1.5,
    description: "PAN must follow AAAAA9999A format (disabled for telecom source)",
  },
  {
    id: "vr-13", field: "accounts.current_balance", ruleType: "range",
    ruleLogic: "value >= 0", severity: "warning",
    isEnabled: true, isEditable: true, impactPercent: 0.4,
    description: "Current balance must be non-negative",
  },
  {
    id: "vr-14", field: "credit_score", ruleType: "range",
    ruleLogic: "300 <= value <= 900", severity: "warning",
    isEnabled: false, isEditable: true, impactPercent: null,
    description: "Credit score range validation (not applicable for raw telecom data)",
  },
];

// ─── Confirmation Summary ────────────────────────────────────────────────

export const telecomConfirmationSummary: MappingConfirmationSummary = {
  mappingCoverage: 96,
  newFieldsCreated: 1,
  enumValuesAdded: 2,
  validationRulesGenerated: 14,
  allUnmappedResolved: true,
  enumMappingValidated: true,
  rulesReviewed: true,
};

// ─── Version History ─────────────────────────────────────────────────────

export const mappingVersionHistory: MappingVersionEntry[] = [
  {
    id: "ver-1", mappingVersion: "v2.3", masterSchemaVersion: "HCB Master v1.1",
    sourceSchemaHash: "a3f8b2c1", ruleSetVersion: "RS-3.2",
    createdBy: "Priya Sharma", approvedBy: "Rajesh Kumar",
    createdAt: "2026-01-15T14:30:00Z", approvedAt: "2026-01-16T09:00:00Z",
    status: "active", changesSummary: "Added telecom_avg_bill field, updated enum mappings",
  },
  {
    id: "ver-2", mappingVersion: "v2.2", masterSchemaVersion: "HCB Master v1.1",
    sourceSchemaHash: "a3f8b2c1", ruleSetVersion: "RS-3.1",
    createdBy: "Priya Sharma", approvedBy: "Amit Patel",
    createdAt: "2025-12-20T10:00:00Z", approvedAt: "2025-12-21T11:30:00Z",
    status: "approved", changesSummary: "Refined confidence thresholds, added DPD validation rule",
  },
  {
    id: "ver-3", mappingVersion: "v2.1", masterSchemaVersion: "HCB Master v1.0",
    sourceSchemaHash: "b7e4d9f2", ruleSetVersion: "RS-2.8",
    createdBy: "Rajesh Kumar", approvedBy: "Sneha Gupta",
    createdAt: "2025-11-10T09:00:00Z", approvedAt: "2025-11-11T15:00:00Z",
    status: "approved", changesSummary: "Initial telecom mapping with 6 fields",
  },
  {
    id: "ver-4", mappingVersion: "v2.0", masterSchemaVersion: "HCB Master v1.0",
    sourceSchemaHash: "c1a3e5b8", ruleSetVersion: "RS-2.5",
    createdBy: "Rajesh Kumar", approvedBy: null,
    createdAt: "2025-10-01T08:00:00Z", approvedAt: null,
    status: "archived", changesSummary: "Draft mapping, superseded by v2.1",
  },
];

// ─── Version Diff ────────────────────────────────────────────────────────

export const sampleVersionDiff: SchemaDiffEntry[] = [
  { field: "telecom_avg_bill", changeType: "added", oldValue: null, newValue: "number (new master field)", category: "field" },
  { field: "last_payment_status → account_status", changeType: "modified", oldValue: "confidence: 78%", newValue: "confidence: 84%", category: "mapping" },
  { field: "PAID → current", changeType: "added", oldValue: null, newValue: "Enum mapping added", category: "enum" },
  { field: "DPD range validation", changeType: "added", oldValue: null, newValue: "0 <= value <= 999", category: "rule" },
  { field: "subscriber_id → consumer_id", changeType: "modified", oldValue: "confidence: 72%", newValue: "confidence: 76%", category: "mapping" },
];

// ─── Institution Scope Options ───────────────────────────────────────────

export const institutionOptions = [
  "Jio Telecom",
  "Airtel Telecom",
  "BSNL Telecom",
  "Tata Power",
  "Mahanagar Gas",
  "HDFC Bank",
  "ICICI Bank",
  "SBI",
  "GST Portal",
  "NPCI",
];
