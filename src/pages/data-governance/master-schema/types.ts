export type ClassName =
  | "Business"
  | "Identifier"
  | "Edge"
  | "Reserved"
  | "Payload"
  | "Observation"
  | "Feature";

export type TargetTable =
  | "entity_master"
  | "entity_assets"
  | "entity_events"
  | "entity_relationships"
  | "feature_store"
  | "all";

export type DataType = "string" | "long" | "decimal" | "boolean" | "date" | "timestamp" | "json" | "edge";

export type Sensitivity = "Standard" | "PII" | "Sensitive-PII";

export type AttrStatus = "proposed" | "pending" | "active" | "deprecated" | "rejected";

export type RetentionClass =
  | "credit_account"
  | "credit_enquiry"
  | "feature_score"
  | "kyc_identity"
  | "consent_record"
  | "transaction_event"
  | "special_category"
  | "system"
  | "standard";

export type EntityKind = "subject" | "asset" | "event" | "feature" | "system";

export type ValidationRuleName = "NOT_EMPTY" | "MAX_LENGTH" | "MIN_LENGTH" | "REGEX" | "UNIQUE";
export type RuleSeverity = "Error" | "Warning" | "Info";
export type BusinessValidationName = "MANDATORY_CHECK" | "FORMAT_CHECK" | "DOMAIN_CHECK" | "RANGE_CHECK";
export type TransformationName = "ALL_CAPS" | "ALL_LOWERCASE" | "TRIM" | "REPLACE" | "CONCATENATE";
export type CrossFieldRuleName =
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

export type AllowedValues =
  | { kind: "enum"; values: string[] }
  | { kind: "format"; pattern: string }
  | { kind: "domain"; domain: string };

export interface ValidationRuleRow {
  rule: ValidationRuleName;
  severity: RuleSeverity;
  value?: number;
  pattern?: string;
  message: string;
}

export interface CrossFieldRuleRow {
  attributeId: string;
  rule: CrossFieldRuleName;
  severity: RuleSeverity;
}

export interface EnrichmentRuleRow {
  function: string;
  params?: Record<string, string>;
  message?: string;
}

export interface AttributeRules {
  validation: ValidationRuleRow[];
  businessValidations: BusinessValidationName[];
  crossField: CrossFieldRuleRow[];
  transformations: TransformationName[];
  enrichment: EnrichmentRuleRow[];
  defaultValue: string | null;
}

export interface CanonicalAttribute {
  attributeId: string;
  canonicalQualifier: string;
  class: ClassName;
  targetTable: TargetTable;
  columnFamily: "d";
  appliesTo: string[];
  attributeGroup: string | null;
  dataType: DataType;
  sensitivity: Sensitivity;
  governance: {
    legalBasisRequired: boolean;
    specialCategory: boolean;
    tokenize: boolean;
  };
  normalizationRule: string | null;
  allowedValues: AllowedValues | null;
  definition: string;
  synonyms: string[];
  status: AttrStatus;
  retentionClass: RetentionClass;
  sources: string[];
  displayName: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  approvedBy: string | null;
  supersededBy: string | null;
  rules: AttributeRules;
}

export interface EntityType {
  entityType: string;
  targetTable: TargetTable;
  kind: EntityKind;
  displayName: string;
  description: string;
  attributeCount: number;
  pendingCount: number;
  sources: string[];
  groups: string[];
  lastUpdated: string;
  subjectClass?: string;
  subtypeExamples?: string[];
  irResolutionKeys?: string[];
  groupManifest?: string[];
  nature?: string;
  legacy?: boolean;
  note?: string;
}

export interface AttributeGroup {
  group: string;
  scope: string;
  appliesTo: string;
  description: string;
}

export interface DomainCode {
  code: string;
  label: string;
  description: string;
}

export interface DomainEntry {
  domainName: string;
  codes: DomainCode[];
  usedBy: string[];
}

export interface RetentionPolicyRow {
  retentionClass: string;
  hotWindow?: string;
  totalRetention?: string;
  expiryAction?: string;
  legalHoldSensitive?: boolean | string;
  [key: string]: unknown;
}

export interface RowKeyLayout {
  table: string;
  layout: string;
  notes?: string;
}

export interface DictionaryEnums {
  class: ClassName[];
  targetTable: TargetTable[];
  dataType: DataType[];
  sensitivity: Sensitivity[];
  status: AttrStatus[];
  retentionClass: RetentionClass[];
  normalizationRules: string[];
  sources: string[];
  placeholderValidationRules: ValidationRuleName[];
  placeholderBusinessValidations: BusinessValidationName[];
  placeholderTransformations: TransformationName[];
  placeholderEnrichment: string[];
  crossFieldRules: CrossFieldRuleName[];
  severity: RuleSeverity[];
}

export interface VersionHistoryRow {
  id: string;
  attributeId: string;
  version: number | string;
  change: string;
  changedBy: string;
  changedAt: string;
  dictionaryVersion: string;
}

export type MsmApprovalAction =
  | "submitted"
  | "approved"
  | "rejected"
  | "revision requested"
  | "deprecated"
  | "reinstated";

export interface MsmApprovalEvent {
  id: string;
  attributeId: string;
  entityType?: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: MsmApprovalAction;
  comment: string;
}

export interface MasterDictionarySeed {
  dictionaryVersion: string;
  generatedFrom?: string;
  entityTypes: EntityType[];
  attributeGroups: AttributeGroup[];
  domains: DomainEntry[];
  retentionPolicy: RetentionPolicyRow[];
  rowKeys: RowKeyLayout[];
  attributes: CanonicalAttribute[];
  enums: DictionaryEnums;
}

export interface DictionarySnapshot {
  dictionaryVersion: string;
  entityTypes: EntityType[];
  attributes: CanonicalAttribute[];
  attributeGroups: AttributeGroup[];
  domains: DomainEntry[];
  retentionPolicy: RetentionPolicyRow[];
  rowKeys: RowKeyLayout[];
  enums: DictionaryEnums;
  versionHistory: VersionHistoryRow[];
  approvalEvents: MsmApprovalEvent[];
  seedSynonyms: Record<string, string[]>;
}

export interface DictFilters {
  search: string;
  status: AttrStatus | "all";
  table: TargetTable | "all";
  className: ClassName | "all";
  sensitivity: Sensitivity | "all";
  source: string | "all";
  group: string | "all";
}

export interface ValidationIssue {
  attributeId: string;
  code: string;
  severity: "Error" | "Warning" | "Info";
  message: string;
  cta?: "revision-or-replace";
}

export const EMPTY_RULES: AttributeRules = {
  validation: [],
  businessValidations: [],
  crossField: [],
  transformations: [],
  enrichment: [],
  defaultValue: null,
};

export const MUTATING_ROLES = ["Super Admin", "Bureau Admin", "Data Admin", "Compliance Officer"] as const;

export const KIND_ORDER: EntityKind[] = ["subject", "asset", "event", "feature", "system"];

export const KIND_LABELS: Record<EntityKind, string> = {
  subject: "Subjects",
  asset: "Assets",
  event: "Events",
  feature: "Features",
  system: "System",
};

export const SUBJECT_CLASSES = ["HUMAN", "LEGAL_ENTITY", "COLLECTIVE", "DIGITAL", "ASSET", "UNKNOWN"] as const;

export const NATURE_OPTIONS = [
  "Deterministic",
  "Probabilistic",
  "Composite / probabilistic",
  "Deterministic / probabilistic",
  "Probabilistic / decaying",
] as const;

export const KIND_TO_TABLE: Record<Exclude<EntityKind, "system">, TargetTable> = {
  subject: "entity_master",
  asset: "entity_assets",
  event: "entity_events",
  feature: "feature_store",
};
