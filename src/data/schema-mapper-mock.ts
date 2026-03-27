/**
 * Schema Mapper Module – Mock data
 * Core registry/schema data loaded from schema-mapper.json.
 * AI-mapping-specific objects (telecomMappingResults, validationRules, etc.) remain inline.
 */
import data from "./schema-mapper.json";

import type {
  SourceType,
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
  SimilarSchemaEntry,
  IngestedSourceMetadata,
  LLMFieldIntelligenceRow,
  FieldCluster,
  StorageMetadataSummary,
  LineageEntry,
  GovernanceSummary,
} from "@/types/schema-mapper";

// ─── Schema Registry ───────────────────────────────────────────────────────
export const schemaRegistryEntries = data.schemaRegistryEntries as SchemaRegistryEntry[];

// ─── Master Schema Versions ────────────────────────────────────────────────
export const masterSchemaVersions = data.masterSchemaVersions as MasterSchemaVersion[];

// ─── Master Schema Tree (v1.1) ────────────────────────────────────────────
export const masterSchemaTree = data.masterSchemaTree as MasterSchemaField[];

// ─── Telecom Source Schema (parsed) ───────────────────────────────────────
export const telecomParsedFields = data.telecomParsedFields as ParsedSourceField[];
export const telecomFieldStatistics = data.telecomFieldStatistics as SourceFieldStatistics;

// ─── Similar Existing Schemas (for Step 1 & 2) ───────────────────────────
export const similarSchemasForTelecom = data.similarSchemasForTelecom as SimilarSchemaEntry[];
export const similarityRankingForBarChart = data.similarityRankingForBarChart as { name: string; similarity: number }[];
export const ingestedSourceMetadataTelecom = data.ingestedSourceMetadataTelecom as IngestedSourceMetadata;

// ─── Previously Ingested Schemas (for dropdown) ─────────────────────────
export const previouslyIngestedSchemas = data.previouslyIngestedSchemas as { id: string; label: string; category: string }[];

// ─── Utility Source Schema (parsed) ──────────────────────────────────────
export const utilityParsedFields = data.utilityParsedFields as ParsedSourceField[];
export const utilityFieldStatistics = data.utilityFieldStatistics as SourceFieldStatistics;

// ─── LLM Field Intelligence Rows (Telecom) ─────────────────────────────────
export const llmFieldIntelligenceRowsTelecom: LLMFieldIntelligenceRow[] = [
  { id: "lli-1", sourceFieldId: "tf-1", sourceField: "subscriber_id", sourceFieldType: "string", llmMeaning: "Unique subscriber identifier", canonicalMatch: "consumer_id", canonicalMatchId: "ms-1", similarFieldsAcrossSystem: ["consumer_id", "utility_customer_id"], confidence: 76, pii: false },
  { id: "lli-2", sourceFieldId: "tf-2", sourceField: "customer_name", sourceFieldType: "string", llmMeaning: "Consumer Full Name", canonicalMatch: "full_name", canonicalMatchId: "ms-2", similarFieldsAcrossSystem: ["full_name", "name"], confidence: 92, pii: true },
  { id: "lli-3", sourceFieldId: "tf-3", sourceField: "dob", sourceFieldType: "string", llmMeaning: "Date of Birth", canonicalMatch: "date_of_birth", canonicalMatchId: "ms-3", similarFieldsAcrossSystem: ["date_of_birth", "birth_date", "customer_dob"], confidence: 88, pii: true },
  { id: "lli-4", sourceFieldId: "tf-4", sourceField: "mobile_no", sourceFieldType: "string", llmMeaning: "Phone Number", canonicalMatch: "phone_number", canonicalMatchId: "ms-5", similarFieldsAcrossSystem: ["phone_number"], confidence: 95, pii: true },
  { id: "lli-5", sourceFieldId: "tf-5", sourceField: "avg_monthly_bill", sourceFieldType: "number", llmMeaning: "Income Proxy", canonicalMatch: null, canonicalMatchId: null, similarFieldsAcrossSystem: [], confidence: 52, pii: false, action: "create_new" },
  { id: "lli-6", sourceFieldId: "tf-6", sourceField: "payment_delay_days", sourceFieldType: "number", llmMeaning: "Delinquency Proxy", canonicalMatch: "accounts.dpd", canonicalMatchId: "ms-6-4", similarFieldsAcrossSystem: ["accounts.dpd"], confidence: 81, pii: false },
  { id: "lli-7", sourceFieldId: "tf-7", sourceField: "last_payment_status", sourceFieldType: "string", llmMeaning: "Account payment status", canonicalMatch: "accounts.account_status", canonicalMatchId: "ms-6-5", similarFieldsAcrossSystem: ["accounts.account_status", "payment_status"], confidence: 84, pii: false },
];

// ─── Field Clusters (Semantic Insights) ───────────────────────────────────
export const fieldClusters: FieldCluster[] = [
  { id: "cluster-dob", canonicalLabel: "Date of Birth", fieldNames: ["dob", "birth_date", "date_of_birth", "customer_dob"], action: "merge" },
  { id: "cluster-name", canonicalLabel: "Full Name", fieldNames: ["customer_name", "name", "full_name", "consumer_name"], action: "merge" },
  { id: "cluster-phone", canonicalLabel: "Phone Number", fieldNames: ["mobile_no", "phone_number", "mobile", "contact_number"], action: "keep_alias" },
  { id: "cluster-status", canonicalLabel: "Account Status", fieldNames: ["last_payment_status", "payment_status", "account_status"], action: "keep_alias" },
];

// ─── Storage Metadata & Lineage ─────────────────────────────────────────────
export const storageMetadataSummary: StorageMetadataSummary = {
  rawPayloadStored: true,
  normalizedPayloadGenerated: true,
  mappingMetadataStored: true,
  lineageCaptured: true,
  schemaVersion: "v1.2",
};

export const lineagePreview: LineageEntry[] = [
  { source_field: "mobile_no", mapped_to: "phone_number", confidence: 0.95, llm_model: "gpt-4.1", timestamp: "2026-02-21T10:30:00Z" },
  { source_field: "customer_name", mapped_to: "full_name", confidence: 0.92, llm_model: "gpt-4.1", timestamp: "2026-02-21T10:30:00Z" },
  { source_field: "dob", mapped_to: "date_of_birth", confidence: 0.88, llm_model: "gpt-4.1", timestamp: "2026-02-21T10:30:00Z" },
];

// ─── Governance Summary ───────────────────────────────────────────────────
export const governanceSummaryDefault: GovernanceSummary = {
  mappingCoveragePercent: 92,
  newFieldsProposed: 1,
  enumChangesProposed: 2,
  rulesGenerated: 7,
  evolutionQueueStatus: "AI Proposed",
};

// ─── AI Mapping Results (Telecom → Master v1.1) ──────────────────────────
export const telecomMappingResults: AIMappingResult[] = [
  {
    id: "aim-1", sourceFieldId: "tf-1", sourceFieldName: "subscriber_id",
    sourceFieldType: "string", suggestedMasterFieldId: "ms-1",
    suggestedMasterFieldName: "consumer_id", masterFieldType: "string",
    confidence: 76, matchType: "semantic", status: "needs_review",
    mappingReason: "Both fields serve as unique customer identifiers; semantic similarity in naming convention despite different prefixes",
  },
  {
    id: "aim-2", sourceFieldId: "tf-2", sourceFieldName: "customer_name",
    sourceFieldType: "string", suggestedMasterFieldId: "ms-2",
    suggestedMasterFieldName: "full_name", masterFieldType: "string",
    confidence: 92, matchType: "semantic", status: "auto_accepted",
    mappingReason: "Direct name field match; both represent the consumer's legal name with high semantic overlap",
  },
  {
    id: "aim-3", sourceFieldId: "tf-3", sourceFieldName: "dob",
    sourceFieldType: "string", suggestedMasterFieldId: "ms-3",
    suggestedMasterFieldName: "date_of_birth", masterFieldType: "date",
    confidence: 88, matchType: "semantic", status: "auto_accepted",
    mappingReason: "Abbreviation expansion match; sample values confirm ISO date format compatible with master date type",
  },
  {
    id: "aim-4", sourceFieldId: "tf-4", sourceFieldName: "mobile_no",
    sourceFieldType: "string", suggestedMasterFieldId: "ms-5",
    suggestedMasterFieldName: "phone_number", masterFieldType: "string",
    confidence: 96, matchType: "exact", status: "auto_accepted",
    mappingReason: "Near-exact match; mobile_no and phone_number are equivalent fields with identical data patterns in sample values",
  },
  {
    id: "aim-5", sourceFieldId: "tf-5", sourceFieldName: "avg_monthly_bill",
    sourceFieldType: "number", suggestedMasterFieldId: null,
    suggestedMasterFieldName: null, masterFieldType: null,
    confidence: 0, matchType: "exact", status: "unmapped",
    mappingReason: "No corresponding field found in master schema; telecom-specific billing metric requires a new master field",
  },
  {
    id: "aim-6", sourceFieldId: "tf-6", sourceFieldName: "payment_delay_days",
    sourceFieldType: "number", suggestedMasterFieldId: "ms-6-4",
    suggestedMasterFieldName: "accounts.dpd", masterFieldType: "number",
    confidence: 81, matchType: "contextual", status: "needs_review",
    mappingReason: "Contextual match based on sample value ranges; payment_delay_days aligns with days-past-due (DPD) concept in credit reporting",
  },
  {
    id: "aim-7", sourceFieldId: "tf-7", sourceFieldName: "last_payment_status",
    sourceFieldType: "string", suggestedMasterFieldId: "ms-6-5",
    suggestedMasterFieldName: "accounts.account_status", masterFieldType: "enum",
    confidence: 84, matchType: "semantic", status: "needs_review",
    mappingReason: "Semantic match; payment status values map to account status enum with type coercion from string to enum required",
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
  { id: "vr-1", field: "phone_number", ruleType: "regex", ruleLogic: "^[6-9][0-9]{9}$", severity: "error", isEnabled: true, isEditable: true, impactPercent: 1.2, description: "Indian mobile number must start with 6-9 and be 10 digits" },
  { id: "vr-2", field: "phone_number", ruleType: "required", ruleLogic: "NOT NULL", severity: "error", isEnabled: true, isEditable: true, impactPercent: 0.0, description: "Phone number is required" },
  { id: "vr-3", field: "date_of_birth", ruleType: "date_constraint", ruleLogic: "value < TODAY()", severity: "error", isEnabled: true, isEditable: true, impactPercent: 0.3, description: "Date of birth must be a past date" },
  { id: "vr-4", field: "date_of_birth", ruleType: "date_constraint", ruleLogic: "AGE(value) >= 18", severity: "warning", isEnabled: true, isEditable: true, impactPercent: 0.8, description: "Consumer must be at least 18 years old" },
  { id: "vr-5", field: "accounts.dpd", ruleType: "range", ruleLogic: "0 <= value <= 999", severity: "error", isEnabled: true, isEditable: true, impactPercent: 0.1, description: "Days past due must be between 0 and 999" },
  { id: "vr-6", field: "accounts.account_status", ruleType: "enum_validation", ruleLogic: "IN(current, delinquent, default, closed, written_off)", severity: "error", isEnabled: true, isEditable: true, impactPercent: 0.0, description: "Account status must be a valid enum value" },
  { id: "vr-7", field: "accounts.account_status", ruleType: "required", ruleLogic: "NOT NULL IF accounts EXISTS", severity: "critical", isEnabled: true, isEditable: true, impactPercent: 0.5, description: "Account status cannot be null if account record exists" },
  { id: "vr-8", field: "avg_monthly_bill", ruleType: "range", ruleLogic: "value >= 0", severity: "warning", isEnabled: true, isEditable: true, impactPercent: 0.2, description: "Average monthly bill must be non-negative" },
  { id: "vr-9", field: "avg_monthly_bill", ruleType: "custom", ruleLogic: "DECIMAL(10,2)", severity: "info", isEnabled: true, isEditable: true, impactPercent: 0.0, description: "Precision constraint: decimal with 10 digits and 2 decimal places" },
  { id: "vr-10", field: "full_name", ruleType: "required", ruleLogic: "NOT NULL AND LENGTH > 0", severity: "error", isEnabled: true, isEditable: true, impactPercent: 0.0, description: "Full name is required and cannot be empty" },
  { id: "vr-11", field: "consumer_id", ruleType: "required", ruleLogic: "NOT NULL AND UNIQUE", severity: "critical", isEnabled: true, isEditable: true, impactPercent: 0.0, description: "Consumer ID must be unique and not null" },
  { id: "vr-12", field: "pan", ruleType: "regex", ruleLogic: "^[A-Z]{5}[0-9]{4}[A-Z]$", severity: "error", isEnabled: false, isEditable: true, impactPercent: 1.5, description: "PAN must follow AAAAA9999A format (disabled for telecom source)" },
  { id: "vr-13", field: "accounts.current_balance", ruleType: "range", ruleLogic: "value >= 0", severity: "warning", isEnabled: true, isEditable: true, impactPercent: 0.4, description: "Current balance must be non-negative" },
  { id: "vr-14", field: "credit_score", ruleType: "range", ruleLogic: "300 <= value <= 900", severity: "warning", isEnabled: false, isEditable: true, impactPercent: null, description: "Credit score range validation (not applicable for raw telecom data)" },
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
  { id: "ver-1", mappingVersion: "v2.3", masterSchemaVersion: "HCB Master v1.1", sourceSchemaHash: "a3f8b2c1", ruleSetVersion: "RS-3.2", createdBy: "Priya Sharma", approvedBy: "Rajesh Kumar", createdAt: "2026-01-15T14:30:00Z", approvedAt: "2026-01-16T09:00:00Z", status: "active", changesSummary: "Added telecom_avg_bill field, updated enum mappings" },
  { id: "ver-2", mappingVersion: "v2.2", masterSchemaVersion: "HCB Master v1.1", sourceSchemaHash: "a3f8b2c1", ruleSetVersion: "RS-3.1", createdBy: "Priya Sharma", approvedBy: "Amit Patel", createdAt: "2025-12-20T10:00:00Z", approvedAt: "2025-12-21T11:30:00Z", status: "approved", changesSummary: "Refined confidence thresholds, added DPD validation rule" },
  { id: "ver-3", mappingVersion: "v2.1", masterSchemaVersion: "HCB Master v1.0", sourceSchemaHash: "b7e4d9f2", ruleSetVersion: "RS-2.8", createdBy: "Rajesh Kumar", approvedBy: "Sneha Gupta", createdAt: "2025-11-10T09:00:00Z", approvedAt: "2025-11-11T15:00:00Z", status: "approved", changesSummary: "Initial telecom mapping with 6 fields" },
  { id: "ver-4", mappingVersion: "v2.0", masterSchemaVersion: "HCB Master v1.0", sourceSchemaHash: "c1a3e5b8", ruleSetVersion: "RS-2.5", createdBy: "Rajesh Kumar", approvedBy: null, createdAt: "2025-10-01T08:00:00Z", approvedAt: null, status: "archived", changesSummary: "Draft mapping, superseded by v2.1" },
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

/** Flat paths from parsed source fields (Schema Mapper raw ingest). */
function pathsFromParsedFields(fields: ParsedSourceField[]): string[] {
  const out: string[] = [];
  const walk = (f: ParsedSourceField) => {
    out.push(f.path || f.name);
    f.children?.forEach(walk);
  };
  fields.forEach(walk);
  return out;
}

function pathsFromMasterTree(nodes: MasterSchemaField[]): string[] {
  const out: string[] = [];
  const walk = (n: MasterSchemaField) => {
    out.push(n.path);
    n.children?.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}

/** Master schema as parsed-source shape — same path set as `pathsFromMasterTree(masterSchemaTree)`. */
function masterFieldsToParsedSourceFields(nodes: MasterSchemaField[]): ParsedSourceField[] {
  return nodes.map((n) => ({
    id: n.id,
    name: n.name,
    dataType: n.dataType,
    path: n.path,
    depth: n.depth,
    sampleValues: [],
    nullFrequency: 0,
    isEnumCandidate: !!(n.enumValues && n.enumValues.length),
    detectedEnumValues: n.enumValues ?? [],
    distinctCount: undefined,
    children: n.children?.length ? masterFieldsToParsedSourceFields(n.children) : undefined,
  }));
}

const masterSchemaAsParsedSourceFields: ParsedSourceField[] = masterFieldsToParsedSourceFields(masterSchemaTree);

function aggregateStatsFromParsedTree(nodes: ParsedSourceField[]): SourceFieldStatistics {
  let totalFields = 0;
  let nestedFields = 0;
  let enumCandidates = 0;
  let numericFields = 0;
  let stringFields = 0;
  let dateFields = 0;

  const walk = (f: ParsedSourceField) => {
    totalFields += 1;
    if (f.path.includes(".")) nestedFields += 1;
    if (f.isEnumCandidate) enumCandidates += 1;
    const dt = (f.dataType || "").toLowerCase();
    if (dt === "number") numericFields += 1;
    else if (dt === "date") dateFields += 1;
    else stringFields += 1;
    f.children?.forEach(walk);
  };
  nodes.forEach(walk);

  return {
    totalFields,
    nestedFields,
    enumCandidates,
    numericFields,
    stringFields,
    dateFields,
  };
}

const masterSchemaFieldStatistics: SourceFieldStatistics =
  aggregateStatsFromParsedTree(masterSchemaAsParsedSourceFields);

/**
 * Parsed field tree shown in Schema Mapper for a source type — aligns with
 * {@link getRawIngestedFieldKeysForSourceType} (same paths as Product packet Raw tab).
 */
export function getParsedSourceFieldsForSourceType(sourceType: SourceType): ParsedSourceField[] {
  switch (sourceType) {
    case "telecom":
      return telecomParsedFields;
    case "utility":
      return utilityParsedFields;
    case "bank":
    case "gst":
    case "custom":
    default:
      return masterSchemaAsParsedSourceFields;
  }
}

/**
 * Field statistics for {@link getParsedSourceFieldsForSourceType} (mock aggregates).
 */
export function getSourceFieldStatisticsForSourceType(sourceType: SourceType): SourceFieldStatistics {
  switch (sourceType) {
    case "telecom":
      return telecomFieldStatistics;
    case "utility":
      return utilityFieldStatistics;
    case "bank":
    case "gst":
    case "custom":
    default:
      return masterSchemaFieldStatistics;
  }
}

export type SchemaIngestionInputMode = "upload_json" | "upload_csv" | "paste_json" | "select_previous";

/**
 * When loading a named previous sample, use that sample’s tree; otherwise use the
 * catalogue for the selected {@link SourceType} (same as Data Products packet config).
 */
export function getParsedSourceFieldsForIngestionScenario(
  sourceType: SourceType,
  schemaInput: SchemaIngestionInputMode,
  selectedPreviousId: string,
): ParsedSourceField[] {
  if (schemaInput === "select_previous") {
    if (selectedPreviousId === "utility-sample") return utilityParsedFields;
    if (selectedPreviousId === "telecom-sample") return telecomParsedFields;
  }
  return getParsedSourceFieldsForSourceType(sourceType);
}

export function getSourceFieldStatisticsForIngestionScenario(
  sourceType: SourceType,
  schemaInput: SchemaIngestionInputMode,
  selectedPreviousId: string,
): SourceFieldStatistics {
  if (schemaInput === "select_previous") {
    if (selectedPreviousId === "utility-sample") return utilityFieldStatistics;
    if (selectedPreviousId === "telecom-sample") return telecomFieldStatistics;
  }
  return getSourceFieldStatisticsForSourceType(sourceType);
}

/**
 * All raw ingested field keys exposed by Schema Mapper for a given Source Type.
 * Used by Product Configurator packet configuration (Raw Data section).
 */
export function getRawIngestedFieldKeysForSourceType(sourceType: SourceType): string[] {
  switch (sourceType) {
    case "telecom":
      return pathsFromParsedFields(telecomParsedFields);
    case "utility":
      return pathsFromParsedFields(utilityParsedFields);
    case "bank":
    case "gst":
    case "custom":
    default:
      return pathsFromMasterTree(masterSchemaTree);
  }
}
