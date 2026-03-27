/**
 * Data Governance Module – TypeScript interfaces
 * Used across Dashboard, Auto-Mapping, Validation Rules, Match Review, Data Quality, Audit Logs
 */

// ─── Dashboard ─────────────────────────────────────────────────────────────
export interface GovernanceKpi {
  id: string;
  label: string;
  value: number | string;
  unit?: "%" | "count";
  trend?: "up" | "down" | "neutral";
}

export interface MappingAccuracyPoint {
  period: string;
  accuracy: number;
}

export interface ValidationFailureByInstitution {
  institution: string;
  failures: number;
  total: number;
  rate: number;
}

/** @deprecated Use ValidationFailureByInstitution */
export type ValidationFailureBySource = ValidationFailureByInstitution;

export interface MatchConfidenceBucket {
  bucket: string;
  count: number;
  min: number;
  max: number;
}

export interface OverrideTrendPoint {
  period: string;
  override: number;
  autoAccept: number;
}

export interface RejectionReasonSlice {
  name: string;
  value: number;
}

export interface DataQualityTrendPoint {
  period: string;
  score: number;
}

// ─── Auto-Mapping ───────────────────────────────────────────────────────────
export type MappingWorkflowStatus = "draft" | "under_review" | "approved" | "rolled_back";
export type MatchType = "exact" | "fuzzy" | "heuristic";

export interface SourceSchemaField {
  id: string;
  name: string;
  type: string;
  dataSourceId: string;
  version: string;
}

export interface CanonicalField {
  id: string;
  name: string;
  type: string;
  description?: string;
}

export interface MappingPair {
  id: string;
  sourceFieldId: string;
  sourceFieldName: string;
  canonicalFieldId: string;
  canonicalFieldName: string;
  confidence: number;
  matchType: MatchType;
  transformationLogic?: string;
  workflowStatus: MappingWorkflowStatus;
}

export interface MappingHistoryEntry {
  id: string;
  mappingId: string;
  timestamp: string;
  user: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

// ─── Validation Rules ───────────────────────────────────────────────────────
export type RuleType = "format" | "range" | "cross_field";
export type RuleSeverity = "warning" | "error" | "critical";

export interface ExpressionBlock {
  id: string;
  field: string;
  operator: "equals" | "in_range" | "matches_regex" | "not_empty" | "custom";
  value?: string;
  valueMin?: number;
  valueMax?: number;
  logicalOp?: "and" | "or";
}

export interface ValidationRule {
  id: string;
  name: string;
  ruleSetId: string;
  type: RuleType;
  severity: RuleSeverity;
  status: "active" | "inactive";
  version: string;
  lastModified: string;
  applicableInstitutions: string[];
  applicableDataSource: string;
  expressionBlocks: ExpressionBlock[];
  errorMessage: string;
  effectiveDate: string;
  expiryDate?: string;
  impactPercent?: number;
  testResult?: { passed: number; failed: number; total: number };
}

export interface RuleSet {
  id: string;
  name: string;
  version: string;
  ruleCount: number;
}

// ─── Match Review ──────────────────────────────────────────────────────────
export type ApprovalState = "pending" | "first_approved" | "approved" | "rejected" | "flagged";

export interface SimilarityBreakdown {
  name: number;
  dob: number;
  pan: number;
  address: number;
  overall: number;
}

export interface RecordPair {
  id: string;
  recordA: Record<string, string>;
  recordB: Record<string, string>;
  mismatchedFields: string[];
  similarity: SimilarityBreakdown;
}

export interface MatchCluster {
  id: string;
  recordCount: number;
  confidence: number;
  hasConflicts: boolean;
  conflictIndicators: string[];
  records: RecordPair[];
  approvalState: ApprovalState;
  isHighRiskOverride?: boolean;
}

export interface ReasonCode {
  code: string;
  label: string;
}

// ─── Data Quality ─────────────────────────────────────────────────────────
export interface QualityMetric {
  id: string;
  label: string;
  value: number;
  unit: "%" | "count";
  threshold?: number;
  trend?: "up" | "down";
}

export interface AnomalyPoint {
  period: string;
  value: number;
  isAnomaly?: boolean;
}

export interface DriftAlert {
  id: string;
  type: "schema" | "mapping";
  source: string;
  message: string;
  timestamp: string;
  severity: "low" | "medium" | "high";
}

// ─── Audit Logs ────────────────────────────────────────────────────────────
export type AuditActionType =
  | "mapping_approved"
  | "mapping_rejected"
  | "rule_created"
  | "rule_updated"
  | "rule_activated"
  | "merge_performed"
  | "override_performed"
  | "config_changed";

export interface GovernanceAuditLogEntry {
  changeId: string;
  user: string;
  role: string;
  actionType: AuditActionType;
  entityAffected: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
  ipAddress: string;
  details?: Record<string, unknown>;
}

// ─── Workflow & Approval ──────────────────────────────────────────────────
export type WorkflowStatus = "draft" | "submitted" | "approved" | "rejected" | "rolled_back";

export interface ApprovalEvent {
  id: string;
  timestamp: string;
  approverName: string;
  approverRole: string;
  action: "submit" | "approve" | "reject" | "rollback";
  comment?: string;
  reason?: string;
}

export interface ApprovalConfig {
  dualApprovalRequired: boolean;
  requiredApprovers?: number;
}
