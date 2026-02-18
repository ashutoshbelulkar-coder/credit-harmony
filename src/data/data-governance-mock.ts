/**
 * Data Governance Module – Mock data for all screens
 * Replace with API calls when backend is available.
 */

import type {
  GovernanceKpi,
  MappingAccuracyPoint,
  ValidationFailureBySource,
  MatchConfidenceBucket,
  OverrideTrendPoint,
  RejectionReasonSlice,
  DataQualityTrendPoint,
  SourceSchemaField,
  CanonicalField,
  MappingPair,
  MappingHistoryEntry,
  RuleSet,
  ValidationRule,
  MatchCluster,
  ReasonCode,
  QualityMetric,
  AnomalyPoint,
  DriftAlert,
  GovernanceAuditLogEntry,
  ApprovalEvent,
  ApprovalConfig,
} from "@/types/data-governance";

// ─── Dashboard ─────────────────────────────────────────────────────────────
export const governanceKpis: GovernanceKpi[] = [
  { id: "1", label: "Mapping Accuracy %", value: 97.4, unit: "%", trend: "up" },
  { id: "2", label: "Validation Failure Rate %", value: 2.1, unit: "%", trend: "down" },
  { id: "3", label: "Match Confidence Avg %", value: 88.2, unit: "%", trend: "up" },
  { id: "4", label: "Override Rate %", value: 4.3, unit: "%", trend: "down" },
  { id: "5", label: "Active Rule Sets", value: 12, unit: "count", trend: "neutral" },
  { id: "6", label: "Pending Approvals Count", value: 7, unit: "count", trend: "neutral" },
];

export const mappingAccuracyTrend30: MappingAccuracyPoint[] = [
  { period: "D-29", accuracy: 96.2 },
  { period: "D-22", accuracy: 96.8 },
  { period: "D-15", accuracy: 97.0 },
  { period: "D-8", accuracy: 97.2 },
  { period: "D-1", accuracy: 97.4 },
];

export const mappingAccuracyTrend60: MappingAccuracyPoint[] = [
  { period: "D-58", accuracy: 95.8 },
  { period: "D-45", accuracy: 96.2 },
  { period: "D-30", accuracy: 96.5 },
  { period: "D-15", accuracy: 97.0 },
  { period: "D-1", accuracy: 97.4 },
];

export const mappingAccuracyTrend90: MappingAccuracyPoint[] = [
  { period: "D-90", accuracy: 95.2 },
  { period: "D-60", accuracy: 96.0 },
  { period: "D-45", accuracy: 96.5 },
  { period: "D-30", accuracy: 97.0 },
  { period: "D-1", accuracy: 97.4 },
];

export const validationFailureBySource: ValidationFailureBySource[] = [
  { source: "CBS Core", failures: 1240, total: 58000, rate: 2.14 },
  { source: "Alternate Data", failures: 890, total: 42000, rate: 2.12 },
  { source: "Bureau Incoming", failures: 320, total: 31000, rate: 1.03 },
  { source: "Legacy Import", failures: 450, total: 15000, rate: 3.0 },
];

export const matchConfidenceDistribution: MatchConfidenceBucket[] = [
  { bucket: "0–40", count: 6, min: 0, max: 40 },
  { bucket: "40–60", count: 18, min: 40, max: 60 },
  { bucket: "60–75", count: 32, min: 60, max: 75 },
  { bucket: "75–90", count: 48, min: 75, max: 90 },
  { bucket: "90–100", count: 26, min: 90, max: 100 },
];

export const overrideVsAutoAcceptTrend: OverrideTrendPoint[] = [
  { period: "W1", override: 18, autoAccept: 982 },
  { period: "W2", override: 21, autoAccept: 979 },
  { period: "W3", override: 24, autoAccept: 976 },
  { period: "W4", override: 20, autoAccept: 980 },
  { period: "W5", override: 19, autoAccept: 981 },
];

export const dataQualityScoreTrend: DataQualityTrendPoint[] = [
  { period: "D-14", score: 93.2 },
  { period: "D-10", score: 93.8 },
  { period: "D-7", score: 94.1 },
  { period: "D-4", score: 94.5 },
  { period: "Today", score: 94.8 },
];

export const rejectionReasonsBreakdown: RejectionReasonSlice[] = [
  { name: "Invalid format", value: 38 },
  { name: "Missing required field", value: 28 },
  { name: "Out of range", value: 18 },
  { name: "Cross-field mismatch", value: 12 },
  { name: "Duplicate", value: 4 },
];

// ─── Auto-Mapping ───────────────────────────────────────────────────────────
export const dataSources = [
  { id: "cbs-core", name: "CBS Core" },
  { id: "alt-data", name: "Alternate Data" },
  { id: "bureau", name: "Bureau Incoming" },
];

export const schemaVersions = [
  { id: "v2.1", name: "v2.1" },
  { id: "v2.0", name: "v2.0" },
  { id: "v1.9", name: "v1.9" },
];

export const sourceSchemaFields: SourceSchemaField[] = [
  { id: "src-1", name: "cust_name", type: "string", dataSourceId: "cbs-core", version: "v2.1" },
  { id: "src-2", name: "customer_dob", type: "date", dataSourceId: "cbs-core", version: "v2.1" },
  { id: "src-3", name: "pan_number", type: "string", dataSourceId: "cbs-core", version: "v2.1" },
  { id: "src-4", name: "addr_line1", type: "string", dataSourceId: "cbs-core", version: "v2.1" },
  { id: "src-5", name: "mobile_no", type: "string", dataSourceId: "cbs-core", version: "v2.1" },
  { id: "src-6", name: "acct_balance", type: "decimal", dataSourceId: "cbs-core", version: "v2.1" },
  { id: "src-7", name: "loan_amt", type: "decimal", dataSourceId: "cbs-core", version: "v2.1" },
];

export const canonicalFields: CanonicalField[] = [
  { id: "can-1", name: "borrower_full_name", type: "string", description: "Full legal name" },
  { id: "can-2", name: "date_of_birth", type: "date", description: "DOB as per KYC" },
  { id: "can-3", name: "pan", type: "string", description: "PAN number" },
  { id: "can-4", name: "address_line_1", type: "string", description: "Primary address" },
  { id: "can-5", name: "mobile_number", type: "string", description: "Primary mobile" },
  { id: "can-6", name: "current_balance", type: "decimal", description: "Account balance" },
  { id: "can-7", name: "loan_amount", type: "decimal", description: "Disbursed amount" },
];

export const mappingPairs: MappingPair[] = [
  {
    id: "map-1",
    sourceFieldId: "src-1",
    sourceFieldName: "cust_name",
    canonicalFieldId: "can-1",
    canonicalFieldName: "borrower_full_name",
    confidence: 98,
    matchType: "exact",
    transformationLogic: "TRIM(UPPER(source))",
    workflowStatus: "approved",
  },
  {
    id: "map-2",
    sourceFieldId: "src-2",
    sourceFieldName: "customer_dob",
    canonicalFieldId: "can-2",
    canonicalFieldName: "date_of_birth",
    confidence: 95,
    matchType: "exact",
    transformationLogic: "TO_DATE(source, 'YYYY-MM-DD')",
    workflowStatus: "under_review",
  },
  {
    id: "map-3",
    sourceFieldId: "src-3",
    sourceFieldName: "pan_number",
    canonicalFieldId: "can-3",
    canonicalFieldName: "pan",
    confidence: 72,
    matchType: "fuzzy",
    workflowStatus: "draft",
  },
  {
    id: "map-4",
    sourceFieldId: "src-4",
    sourceFieldName: "addr_line1",
    canonicalFieldId: "can-4",
    canonicalFieldName: "address_line_1",
    confidence: 88,
    matchType: "heuristic",
    transformationLogic: "TRIM(source)",
    workflowStatus: "approved",
  },
  {
    id: "map-5",
    sourceFieldId: "src-5",
    sourceFieldName: "mobile_no",
    canonicalFieldId: "can-5",
    canonicalFieldName: "mobile_number",
    confidence: 91,
    matchType: "exact",
    workflowStatus: "approved",
  },
];

export const mappingHistory: MappingHistoryEntry[] = [
  {
    id: "hist-1",
    mappingId: "map-1",
    timestamp: "2025-02-18T10:30:00Z",
    user: "Jane Smith",
    action: "Approved",
    newValue: "cust_name → borrower_full_name",
    reason: "Exact semantic match verified",
  },
  {
    id: "hist-2",
    mappingId: "map-2",
    timestamp: "2025-02-17T14:00:00Z",
    user: "John Doe",
    action: "Edited",
    oldValue: "dob",
    newValue: "customer_dob",
    reason: "Align with source schema rename",
  },
];

// ─── Validation Rules ──────────────────────────────────────────────────────
export const ruleSets: RuleSet[] = [
  { id: "rs-1", name: "HCB Standard Rules", version: "v3.2", ruleCount: 24 },
  { id: "rs-2", name: "CBS Core Validation", version: "v2.1", ruleCount: 18 },
  { id: "rs-3", name: "Bureau Submission", version: "v1.8", ruleCount: 12 },
];

export const validationRules: ValidationRule[] = [
  {
    id: "rule-1",
    name: "PAN Format",
    ruleSetId: "rs-1",
    type: "format",
    severity: "error",
    status: "active",
    version: "v3.2",
    lastModified: "2025-02-15",
    applicableInstitutions: ["All"],
    applicableDataSource: "CBS Core",
    expressionBlocks: [
      { id: "eb-1", field: "pan", operator: "matches_regex", value: "^[A-Z]{5}[0-9]{4}[A-Z]$", logicalOp: "and" },
    ],
    errorMessage: "PAN must be in format AAAAA9999A",
    effectiveDate: "2025-01-01",
    impactPercent: 0.8,
    testResult: { passed: 9920, failed: 80, total: 10000 },
  },
  {
    id: "rule-2",
    name: "DOB Range",
    ruleSetId: "rs-1",
    type: "range",
    severity: "warning",
    status: "active",
    version: "v3.2",
    lastModified: "2025-02-14",
    applicableInstitutions: ["First National Bank", "Metro Credit Union"],
    applicableDataSource: "CBS Core",
    expressionBlocks: [
      { id: "eb-2", field: "date_of_birth", operator: "in_range", valueMin: 1900, valueMax: 2010, logicalOp: "and" },
    ],
    errorMessage: "Date of birth must be between 1900 and 2010",
    effectiveDate: "2025-01-01",
    impactPercent: 0.2,
    testResult: { passed: 9980, failed: 20, total: 10000 },
  },
  {
    id: "rule-3",
    name: "Name vs PAN consistency",
    ruleSetId: "rs-1",
    type: "cross_field",
    severity: "critical",
    status: "inactive",
    version: "v3.1",
    lastModified: "2025-02-10",
    applicableInstitutions: ["All"],
    applicableDataSource: "CBS Core",
    expressionBlocks: [
      { id: "eb-3", field: "borrower_full_name", operator: "not_empty", logicalOp: "and" },
      { id: "eb-4", field: "pan", operator: "not_empty", logicalOp: "and" },
    ],
    errorMessage: "Borrower name and PAN must both be present",
    effectiveDate: "2025-01-01",
    expiryDate: "2025-03-01",
    impactPercent: 1.2,
    testResult: { passed: 9880, failed: 120, total: 10000 },
  },
];

// ─── Match Review ───────────────────────────────────────────────────────────
export const reasonCodes: ReasonCode[] = [
  { code: "VERIFIED", label: "Manually verified" },
  { code: "DOCUMENT_MATCH", label: "Document evidence" },
  { code: "LOW_RISK", label: "Low risk override" },
  { code: "FALSE_POSITIVE", label: "False positive merge" },
  { code: "INVESTIGATION", label: "Flag for investigation" },
  { code: "OTHER", label: "Other (comment required)" },
];

export const matchClusters: MatchCluster[] = [
  {
    id: "cl-1",
    recordCount: 2,
    confidence: 94,
    hasConflicts: false,
    conflictIndicators: [],
    approvalState: "pending",
    records: [
      {
        id: "rec-1",
        recordA: { name: "Rajesh Kumar", dob: "1985-03-15", pan: "ABCDE1234F", address: "12 MG Road, Mumbai" },
        recordB: { name: "Rajesh Kumar", dob: "1985-03-15", pan: "ABCDE1234F", address: "12, MG Road, Mumbai" },
        mismatchedFields: ["address"],
        similarity: { name: 100, dob: 100, pan: 100, address: 92, overall: 94 },
      },
    ],
  },
  {
    id: "cl-2",
    recordCount: 2,
    confidence: 78,
    hasConflicts: true,
    conflictIndicators: ["DOB mismatch", "Address diff"],
    approvalState: "first_approved",
    isHighRiskOverride: true,
    records: [
      {
        id: "rec-2",
        recordA: { name: "Priya Sharma", dob: "1990-07-22", pan: "FGHIJ5678K", address: "Block A, Delhi" },
        recordB: { name: "Priya Sharma", dob: "1990-07-23", pan: "FGHIJ5678K", address: "Block A, New Delhi" },
        mismatchedFields: ["dob", "address"],
        similarity: { name: 100, dob: 95, pan: 100, address: 85, overall: 78 },
      },
    ],
  },
  {
    id: "cl-3",
    recordCount: 3,
    confidence: 65,
    hasConflicts: true,
    conflictIndicators: ["Multiple records"],
    approvalState: "pending",
    records: [
      {
        id: "rec-3a",
        recordA: { name: "Amit Patel", dob: "1988-11-10", pan: "KLMNO9012P", address: "Pune" },
        recordB: { name: "Amit R Patel", dob: "1988-11-10", pan: "KLMNO9012P", address: "Pune, MH" },
        mismatchedFields: ["name", "address"],
        similarity: { name: 88, dob: 100, pan: 100, address: 75, overall: 65 },
      },
    ],
  },
];

// ─── Data Quality ──────────────────────────────────────────────────────────
export const dataQualityMetrics: QualityMetric[] = [
  { id: "mq-1", label: "Missing Field %", value: 1.2, unit: "%", threshold: 2, trend: "down" },
  { id: "mq-2", label: "Invalid Format %", value: 2.1, unit: "%", threshold: 3, trend: "down" },
  { id: "mq-3", label: "Duplicate Rate %", value: 0.4, unit: "%", threshold: 1, trend: "up" },
  { id: "mq-4", label: "Schema Drift Alerts", value: 2, unit: "count", trend: "neutral" },
  { id: "mq-5", label: "Mapping Drift Alerts", value: 1, unit: "count", trend: "neutral" },
];

export const dataQualityTrendWithAnomaly: AnomalyPoint[] = [
  { period: "D-14", value: 94.0 },
  { period: "D-12", value: 94.2 },
  { period: "D-10", value: 91.5, isAnomaly: true },
  { period: "D-8", value: 94.5 },
  { period: "D-6", value: 94.8 },
  { period: "D-4", value: 95.0 },
  { period: "Today", value: 94.8 },
];

export const driftAlerts: DriftAlert[] = [
  {
    id: "drift-1",
    type: "schema",
    source: "CBS Core",
    message: "New field 'occupation_type' detected in v2.2",
    timestamp: "2025-02-17T09:00:00Z",
    severity: "low",
  },
  {
    id: "drift-2",
    type: "mapping",
    source: "Alternate Data",
    message: "Confidence drop on field 'mobile_no' below 85%",
    timestamp: "2025-02-16T14:30:00Z",
    severity: "medium",
  },
];

// ─── Audit Logs ─────────────────────────────────────────────────────────────
export const governanceAuditLogs: GovernanceAuditLogEntry[] = [
  {
    changeId: "chg-001",
    user: "Jane Smith",
    role: "Data Governance Officer",
    actionType: "mapping_approved",
    entityAffected: "Mapping: cust_name → borrower_full_name",
    oldValue: "Under Review",
    newValue: "Approved",
    timestamp: "2025-02-18T10:30:00Z",
    ipAddress: "192.168.1.105",
  },
  {
    changeId: "chg-002",
    user: "John Doe",
    role: "Compliance Officer",
    actionType: "rule_updated",
    entityAffected: "Rule: PAN Format",
    oldValue: "v3.1",
    newValue: "v3.2",
    timestamp: "2025-02-18T09:15:00Z",
    ipAddress: "192.168.1.112",
  },
  {
    changeId: "chg-003",
    user: "Alice Brown",
    role: "Risk Analyst",
    actionType: "override_performed",
    entityAffected: "Cluster cl-2",
    oldValue: "Reject",
    newValue: "Override (pending second approval)",
    timestamp: "2025-02-18T08:45:00Z",
    ipAddress: "192.168.1.98",
  },
  {
    changeId: "chg-004",
    user: "Bob Wilson",
    role: "Audit",
    actionType: "config_changed",
    entityAffected: "Dual approval requirement",
    oldValue: "false",
    newValue: "true",
    timestamp: "2025-02-17T16:20:00Z",
    ipAddress: "192.168.1.50",
  },
  {
    changeId: "chg-005",
    user: "Jane Smith",
    role: "Data Governance Officer",
    actionType: "mapping_rejected",
    entityAffected: "Mapping: temp_field → deprecated_canonical",
    oldValue: "Under Review",
    newValue: "Rejected",
    timestamp: "2025-02-17T11:00:00Z",
    ipAddress: "192.168.1.105",
  },
];

// ─── Workflow ──────────────────────────────────────────────────────────────
export const approvalEvents: ApprovalEvent[] = [
  {
    id: "ev-1",
    timestamp: "2025-02-18T10:30:00Z",
    approverName: "Jane Smith",
    approverRole: "Data Governance Officer",
    action: "approve",
    comment: "Exact semantic match verified against canonical spec.",
    reason: "VERIFIED",
  },
  {
    id: "ev-2",
    timestamp: "2025-02-18T09:00:00Z",
    approverName: "John Doe",
    approverRole: "Compliance Officer",
    action: "submit",
    comment: "Ready for review.",
  },
];

export const approvalConfig: ApprovalConfig = {
  dualApprovalRequired: true,
  requiredApprovers: 2,
};
