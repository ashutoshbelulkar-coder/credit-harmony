/**
 * Schema Mapper Module – TypeScript interfaces
 * Covers Registry, AI-Assisted Mapping Wizard, Enum Reconciliation,
 * Validation Rule Generation, Versioning & Audit.
 */

// ─── Enums & Literals ──────────────────────────────────────────────────────

export type SourceType = "telecom" | "utility" | "bank" | "gst" | "custom";

export type SchemaStatus =
  | "draft"
  | "under_review"
  | "approved"
  | "active"
  | "archived";

export type MatchType = "exact" | "semantic" | "contextual" | "derived";

export type AIMappingFieldStatus =
  | "auto_accepted"
  | "needs_review"
  | "unmapped";

export type UnmappedAction = "map_existing" | "create_new" | "ignore";

export type DataTypeOption =
  | "string"
  | "number"
  | "date"
  | "boolean"
  | "enum"
  | "object"
  | "array";

export type RuleSeverity = "info" | "warning" | "error" | "critical";

export type RuleType =
  | "regex"
  | "required"
  | "range"
  | "enum_validation"
  | "date_constraint"
  | "custom";

export type DiffChangeType = "added" | "removed" | "modified";

export type WizardStep =
  | "source_ingestion"
  | "multi_schema_matching"
  | "llm_field_intelligence"
  | "auto_rule_preview"
  | "semantic_insights"
  | "storage_visibility"
  | "governance_actions";

// ─── Schema Registry ───────────────────────────────────────────────────────

export interface SchemaRegistryEntry {
  id: string;
  sourceName: string;
  sourceType: SourceType;
  masterSchemaVersion: string;
  mappingCoverage: number;
  unmappedFields: number;
  ruleCount: number;
  status: SchemaStatus;
  version: string;
  createdBy: string;
  createdAt: string;
  lastModifiedBy: string;
  lastModifiedAt: string;
}

// ─── Source Category (for auto-detection) ────────────────────────────────────

export type SourceCategory = "telecom" | "utility" | "bank" | "gst" | "custom";

export interface SimilarSchemaEntry {
  schemaId: string;
  label: string;
  category: SourceCategory;
  similarityPercent: number;
  sharedFieldsCount: number;
  recommended: boolean;
}

export interface IngestedSourceMetadata {
  sourceName: string;
  sourceType: SourceType;
  sourceCategory: SourceCategory;
  detectionConfidence: number;
  similarSchemas: SimilarSchemaEntry[];
  institutionScope: string[];
  effectiveDate: string;
  versionNumber: string;
}

// ─── Source Definition (Step 1) ────────────────────────────────────────────

export interface SourceMetadata {
  sourceName: string;
  sourceType: SourceType;
  institutionScope: string[];
  effectiveDate: string;
  versionNumber: string;
}

export interface ParsedSourceField {
  id: string;
  name: string;
  dataType: string;
  path: string;
  depth: number;
  sampleValues: string[];
  nullFrequency: number;
  distinctCount?: number;
  isEnumCandidate: boolean;
  detectedEnumValues: string[];
  children?: ParsedSourceField[];
}

export interface SourceFieldStatistics {
  totalFields: number;
  nestedFields: number;
  enumCandidates: number;
  numericFields: number;
  stringFields: number;
  dateFields: number;
}

// ─── Target Master Schema (Step 2) ────────────────────────────────────────

export interface MasterSchemaVersion {
  id: string;
  label: string;
  description: string;
  fieldCount: number;
  lastUpdated: string;
}

export interface MasterSchemaField {
  id: string;
  name: string;
  dataType: DataTypeOption;
  description: string;
  path: string;
  depth: number;
  nullable: boolean;
  required: boolean;
  enumValues?: string[];
  children?: MasterSchemaField[];
}

// ─── LLM Field Intelligence (Step 3) ───────────────────────────────────────

export type LLMFieldAction = "map_existing" | "create_new" | "source_only";

export interface LLMFieldIntelligenceRow {
  id: string;
  sourceFieldId: string;
  sourceField: string;
  sourceFieldType: string;
  llmMeaning: string;
  canonicalMatch: string | null;
  canonicalMatchId: string | null;
  similarFieldsAcrossSystem: string[];
  confidence: number;
  pii: boolean;
  action?: LLMFieldAction;
}

// ─── AI Mapping Results (Step 3) ──────────────────────────────────────────

export interface AIMappingResult {
  id: string;
  sourceFieldId: string;
  sourceFieldName: string;
  sourceFieldType: string;
  suggestedMasterFieldId: string | null;
  suggestedMasterFieldName: string | null;
  masterFieldType: string | null;
  confidence: number;
  matchType: MatchType;
  status: AIMappingFieldStatus;
  mappingReason: string;
}

export interface AIMappingSummary {
  totalFields: number;
  autoMapped: number;
  needsReview: number;
  unmapped: number;
  coveragePercent: number;
}

// ─── Unmapped Field Handling ──────────────────────────────────────────────

export interface UnmappedFieldAction {
  sourceFieldId: string;
  action: UnmappedAction;
  mappedMasterFieldId?: string;
  newFieldDefinition?: MasterFieldDefinition;
  ignoreReason?: string;
}

// ─── Master Schema Extension ─────────────────────────────────────────────

export interface MasterFieldDefinition {
  fieldName: string;
  dataType: DataTypeOption;
  description: string;
  nullable: boolean;
  required: boolean;
  isDerived: boolean;
  defaultValue: string;
  parentObjectPath: string;
  piiClassification?: string;
  riskClassification?: string;
  enumMappingSuggestions?: { sourceValue: string; canonicalValue: string }[];
}

// ─── Enum Reconciliation ─────────────────────────────────────────────────

export interface EnumMappingEntry {
  sourceValue: string;
  masterValue: string;
  isApproved: boolean;
}

export interface EnumReconciliation {
  sourceFieldId: string;
  sourceFieldName: string;
  detectedValues: string[];
  masterEnumValues: string[];
  mappings: EnumMappingEntry[];
}

// ─── Validation Rule Generation (Step 4) ──────────────────────────────────

export interface GeneratedValidationRule {
  id: string;
  field: string;
  ruleType: RuleType;
  ruleLogic: string;
  severity: RuleSeverity;
  isEnabled: boolean;
  isEditable: boolean;
  impactPercent: number | null;
  description: string;
}

// ─── Confirmation & Versioning (Step 5) ──────────────────────────────────

export interface MappingConfirmationSummary {
  mappingCoverage: number;
  newFieldsCreated: number;
  enumValuesAdded: number;
  validationRulesGenerated: number;
  allUnmappedResolved: boolean;
  enumMappingValidated: boolean;
  rulesReviewed: boolean;
}

// ─── Semantic Clusters (Step 6) ──────────────────────────────────────────

export type FieldClusterAction = "merge" | "keep_alias" | "flag_duplicate";

export interface FieldCluster {
  id: string;
  canonicalLabel: string;
  fieldNames: string[];
  action?: FieldClusterAction;
}

// ─── Storage / Lineage (Step 7) ───────────────────────────────────────────

export interface StorageMetadataSummary {
  rawPayloadStored: boolean;
  normalizedPayloadGenerated: boolean;
  mappingMetadataStored: boolean;
  lineageCaptured: boolean;
  schemaVersion: string;
}

export interface LineageEntry {
  source_field: string;
  mapped_to: string;
  confidence: number;
  llm_model: string;
  timestamp: string;
}

// ─── Governance (Step 8) ─────────────────────────────────────────────────

export type EvolutionQueueStatus = "AI Proposed" | "Under Review" | "Approved" | "Rejected";

export interface GovernanceSummary {
  mappingCoveragePercent: number;
  newFieldsProposed: number;
  enumChangesProposed: number;
  rulesGenerated: number;
  evolutionQueueStatus?: EvolutionQueueStatus;
}

// ─── Version Control & Audit ─────────────────────────────────────────────

export interface MappingVersionEntry {
  id: string;
  mappingVersion: string;
  masterSchemaVersion: string;
  sourceSchemaHash: string;
  ruleSetVersion: string;
  createdBy: string;
  approvedBy: string | null;
  createdAt: string;
  approvedAt: string | null;
  status: SchemaStatus;
  changesSummary: string;
}

export interface SchemaDiffEntry {
  field: string;
  changeType: DiffChangeType;
  oldValue: string | null;
  newValue: string | null;
  category: "field" | "mapping" | "enum" | "rule";
}

// ─── Wizard State ────────────────────────────────────────────────────────

export interface SchemaMapperWizardState {
  currentStep: WizardStep;
  sourceMetadata: SourceMetadata | null;
  ingestedMetadata: IngestedSourceMetadata | null;
  parsedSourceFields: ParsedSourceField[];
  fieldStatistics: SourceFieldStatistics | null;
  selectedMasterVersion: string | null;
  selectedSchemaId: string | null;
  mappingResults: AIMappingResult[];
  mappingSummary: AIMappingSummary | null;
  llmFieldIntelligenceRows: LLMFieldIntelligenceRow[];
  unmappedActions: UnmappedFieldAction[];
  enumReconciliations: EnumReconciliation[];
  generatedRules: GeneratedValidationRule[];
  fieldClusters: FieldCluster[];
  storageMetadata: StorageMetadataSummary | null;
  lineagePreview: LineageEntry[];
  governanceSummary: GovernanceSummary | null;
  confirmationSummary: MappingConfirmationSummary | null;
}
