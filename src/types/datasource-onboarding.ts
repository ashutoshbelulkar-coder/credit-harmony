/**
 * Datasource Onboarding & Master Data Model — TypeScript types
 *
 * Adopts POC casing conventions (UPPER_CASE) for new enums to keep the new
 * domain self-consistent. The existing `MasterSchemaStatus` (lower-case) and
 * `SourceType` (`telecom|utility|bank|gst|custom`) remain untouched and are
 * still the canonical persisted statuses / domain axis for master schemas.
 */
import type { SourceType } from "@/types/schema-mapper";

// ─── Enums (POC values) ─────────────────────────────────────────────────────

/** File-format axis for a datasource (orthogonal to the domain `SourceType`). */
export const SOURCE_MAPPING_TYPES = [
  "JSON",
  "XML",
  "CSV",
  "YAML",
  "NDJSON",
  "TSV",
  "TXT",
  "PARQUET",
  "AVRO",
  "ORC",
  "XLSX",
  "XLS",
  "PDF",
  "PROTOBUF",
  "MSGPACK",
] as const;

export type SourceMappingType = (typeof SOURCE_MAPPING_TYPES)[number];

/** Structured vs unstructured payloads (wizard Step 1). */
export type DatasourceDataLayout = "STRUCTURED" | "UNSTRUCTURED";

/** Lifecycle of the datasource record itself (defaults to ACTIVE; not edited in wizard). */
export type DatasourceStatus = "ACTIVE" | "INACTIVE";

/** AI / mapping confidence for review filters (optional on tree nodes). */
export type MappingConfidence = "HIGH" | "MEDIUM" | "LOW";

export type TreeMappingFilter = "all" | "mapped" | "unmapped" | "low_confidence";

/** Review status surfaced on the data-source review panel (per datasource). */
export type ProfileReviewStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CHANGES_REQUESTED";

/** Reviewer actions captured on the audit/review timeline. */
export type ProfileReviewAction =
  | "APPROVE"
  | "REJECT"
  | "REQUEST_CHANGES";

/** Data type of a tree node (POC casing). */
export type SchemaDataType =
  | "STRING"
  | "NUMBER"
  | "BOOLEAN"
  | "DATE"
  | "OBJECT"
  | "ARRAY";

/** Structural node type (FIELD = leaf scalar; OBJECT / ARRAY = container). */
export type NodeType = "FIELD" | "OBJECT" | "ARRAY";

/** Validation severity surfaced to the user. */
export type ValidationSeverity = "Error" | "Warning" | "Info";

/** Field-level validation rule vocabulary (enumerated per migration plan). */
export type ValidationRuleType =
  | "NOT_EMPTY"
  | "MAX_LENGTH"
  | "MIN_LENGTH"
  | "REGEX"
  | "UNIQUE";

/** Business validation category vocabulary. */
export type BusinessValidationType =
  | "MANDATORY_CHECK"
  | "FORMAT_CHECK"
  | "DOMAIN_CHECK"
  | "RANGE_CHECK";

/** Cross-field validation operator vocabulary (replaces POC free-text Rule). */
export type CrossFieldRule =
  | "EQUALS"
  | "NOT_EQUALS"
  | "GREATER_THAN"
  | "LESS_THAN"
  | "GREATER_OR_EQUAL"
  | "LESS_OR_EQUAL"
  | "REQUIRED_IF"
  | "FORBIDDEN_IF"
  | "SAME_AS"
  | "DIFFERENT_FROM";

/** Built-in transformation vocabulary. */
export type TransformationType =
  | "ALL_CAPS"
  | "ALL_LOWERCASE"
  | "TRIM"
  | "REPLACE"
  | "CONCATENATE";

/** Whether a field uses a DEFAULT value or a closed ENUM list. */
export type FieldValueMode = "DEFAULT" | "ENUM";

// ─── Core domain ────────────────────────────────────────────────────────────

export interface FieldValidationRule {
  Rule: ValidationRuleType;
  Severity: ValidationSeverity;
  /** Required for MAX_LENGTH / MIN_LENGTH. */
  Value?: string | number | null;
  /** Required for REGEX. */
  Pattern?: string;
  Message: string;
}

export interface FieldValidationProfile {
  Type: string;
  Rules: FieldValidationRule[];
}

export interface CrossFieldValidation {
  /** Must resolve to an entry in the master-path catalog. */
  FieldPath: string;
  Rule: CrossFieldRule;
  Severity: ValidationSeverity;
}

export interface FieldSourceMapping {
  SourceType: SourceMappingType;
  SourcePath: string;
  TargetPath: string;
}

export interface FieldProfile {
  PK: string;
  SK: string;
  FieldPath: string;
  Section: string;
  FieldName: string;
  DisplayName: string;
  DataType: SchemaDataType;
  IsPII: boolean;
  SimilarFields: string[];
  Description: string;
  Validation: FieldValidationProfile;
  BusinessValidations: BusinessValidationType[];
  CrossFieldValidations: CrossFieldValidation[];
  SourceMapping: FieldSourceMapping;
  ValueMode: FieldValueMode;
  DefaultValue: string | null;
  PossibleValues: string[];
  Transformations: TransformationType[];
}

export interface SchemaNode {
  id: string;
  name: string;
  code: string;
  nodeType: NodeType;
  dataType: SchemaDataType;
  sourceMapping: string;
  destinationMapping: string;
  validations: { id: string; type: ValidationRuleType; value?: string }[];
  businessRules: { id: string; code: BusinessValidationType; description?: string }[];
  transformations: { id: string; type: TransformationType; value?: string }[];
  children: SchemaNode[];
  fieldProfile?: FieldProfile;
  /** Populated by profile generation mock for review filters / colour hints. */
  mappingConfidence?: MappingConfidence;
}

export interface ReviewComment {
  id: string;
  action: ProfileReviewAction;
  comment: string;
  createdAt: string;
  /** Best-effort author label; backed by audit log for canonical attribution. */
  author?: string;
}

export interface Datasource {
  id: string;
  /** Trimmed, globally unique per workspace. */
  name: string;
  sourceType: SourceMappingType;
  /** Existing project's domain axis (telecom/utility/bank/gst/custom). */
  domainSourceType: SourceType;
  /** When `domainSourceType` is `custom`, user-defined label (unique in workspace). */
  customDataSourceTypeName?: string;
  status: DatasourceStatus;
  /** Structured vs unstructured data (wizard). */
  dataLayout: DatasourceDataLayout;
  /** Required: data-submitter institution id. */
  dataSubmitterInstitutionId: string;
  pkPattern: string;
  profileReviewStatus: ProfileReviewStatus;
  reviewComments: ReviewComment[];
  nodes: SchemaNode[];
  /** ISO timestamp of last save. */
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  /** Optional link to the backing master-schema record. */
  masterSchemaId?: string;
}

// ─── Master Data Model (tree-based) ─────────────────────────────────────────

export interface MasterNodeProfile {
  pk: string;
  sk: string;
  fieldPath: string;
  fieldName: string;
  displayName: string;
  dataType: SchemaDataType;
  sourcePath: string;
  targetPath: string;
  validationRules: FieldValidationRule[];
  businessValidations: BusinessValidationType[];
  crossFieldValidations: CrossFieldValidation[];
  valueMode: FieldValueMode;
  defaultValue: string | null;
  possibleValues: string[];
  transformations: TransformationType[];
  isPii: boolean;
  similarFields: string[];
  description: string;
}

export interface TreePathNode {
  /** The field name (last segment of `fullPath`). */
  key: string;
  /** Full dot-notation path (e.g. "BasicInformation.CompanyName"). */
  fullPath: string;
  /** Marks an ARRAY container (its only direct child is `[*]`). */
  isArray: boolean;
  /** Whether this is a selectable leaf (FIELD). */
  isLeaf: boolean;
  /** Container children (excludes `[*]` for ARRAY; uses the literal `[*]` key). */
  children: TreePathNode[];
  nodeType: NodeType;
  dataType: SchemaDataType;
  profile?: MasterNodeProfile;
}

// ─── List / aggregate types ─────────────────────────────────────────────────

export interface DatasourceListItem {
  id: string;
  name: string;
  sourceType: SourceMappingType;
  domainSourceType: SourceType;
  customDataSourceTypeName?: string;
  status: DatasourceStatus;
  dataLayout: DatasourceDataLayout;
  dataSubmitterInstitutionId: string;
  profileReviewStatus: ProfileReviewStatus;
  fieldCount: number;
  updatedAt: string;
  updatedBy: string;
}

export interface SchemaValidationResult {
  isValid: boolean;
  errors: SchemaValidationIssue[];
}

export interface SchemaValidationIssue {
  /** Full path of the failing node (when applicable). */
  path?: string;
  /** Human-readable message. */
  message: string;
  /** Severity (Error blocks Finish; Warning / Info do not). */
  severity: ValidationSeverity;
}

// ─── Step / wizard state ────────────────────────────────────────────────────

export type DatasourceWizardStep =
  | "datasource_details"
  | "profile_generation"
  | "profile_review";

export interface DatasourceWizardState {
  currentStep: DatasourceWizardStep;
  completedSteps: Set<DatasourceWizardStep>;
  datasource: Pick<
    Datasource,
    | "name"
    | "sourceType"
    | "domainSourceType"
    | "customDataSourceTypeName"
    | "status"
    | "dataLayout"
    | "dataSubmitterInstitutionId"
    | "pkPattern"
  >;
  files: {
    sampleFiles: File[];
    jsonSchemaFile: File | null;
    guideDocFile: File | null;
  };
  isGeneratingProfile: boolean;
  nodes: SchemaNode[];
  selectedNodeId: string | null;
  expandedNodeIds: Set<string>;
  schemaValidation: SchemaValidationResult;
  activeView: "tree" | "review";
}
