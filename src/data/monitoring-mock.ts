/**
 * Mock data for main menu Monitoring page: Data Submission API, Batch, Inquiry API.
 */

/* ── Data Submission API ── */
export type ApiRequestStatus = "Success" | "Failed" | "Partial" | "Rate Limited";

export interface ApiSubmissionRequest {
  request_id: string;
  api_key: string;
  endpoint: string;
  status: ApiRequestStatus;
  response_time_ms: number;
  records: number;
  error_code: string | null;
  timestamp: string;
}

/** Map API key to data-submitter institution id (for filter by institution). */
export const dataSubmitterIdByApiKey: Record<string, string> = {
  "sk_live_***7x2k": "1",
  "sk_live_***9a1m": "2",
  "sk_live_***3b4n": "4",
};

/** Map API key to subscriber institution id (for filter by institution). */
export const subscriberIdByApiKey: Record<string, string> = {
  "sk_sub_***2a": "1",
  "sk_sub_***5b": "4",
  "sk_sub_***8c": "3",
};

function recentTs(minutesAgo: number): string {
  const d = new Date(Date.now() - minutesAgo * 60 * 1000);
  return d.toISOString().replace("T", " ").slice(0, 19);
}

export const apiSubmissionRequests: ApiSubmissionRequest[] = [
  { request_id: "REQ-991212", api_key: "sk_live_***7x2k", endpoint: "/submission", status: "Failed", response_time_ms: 210, records: 0, error_code: "INVALID_SCHEMA", timestamp: recentTs(5) },
  { request_id: "REQ-991211", api_key: "sk_live_***9a1m", endpoint: "/submission", status: "Success", response_time_ms: 145, records: 1200, error_code: null, timestamp: recentTs(12) },
  { request_id: "REQ-991210", api_key: "sk_live_***7x2k", endpoint: "/submission/bulk", status: "Partial", response_time_ms: 3200, records: 2500, error_code: "MISSING_MANDATORY_FIELD", timestamp: recentTs(25) },
  { request_id: "REQ-991209", api_key: "sk_live_***3b4n", endpoint: "/submission", status: "Rate Limited", response_time_ms: 89, records: 0, error_code: "RATE_LIMIT_EXCEEDED", timestamp: recentTs(30) },
  { request_id: "REQ-991208", api_key: "sk_live_***9a1m", endpoint: "/submission", status: "Success", response_time_ms: 198, records: 800, error_code: null, timestamp: recentTs(45) },
  { request_id: "REQ-991207", api_key: "sk_live_***7x2k", endpoint: "/submission", status: "Failed", response_time_ms: 52, records: 0, error_code: "AUTHENTICATION_FAILURE", timestamp: recentTs(60) },
  { request_id: "REQ-991206", api_key: "sk_live_***3b4n", endpoint: "/submission", status: "Success", response_time_ms: 176, records: 950, error_code: null, timestamp: recentTs(90) },
  { request_id: "REQ-991205", api_key: "sk_live_***9a1m", endpoint: "/submission/bulk", status: "Success", response_time_ms: 4100, records: 5000, error_code: null, timestamp: recentTs(120) },
  { request_id: "REQ-991204", api_key: "sk_live_***7x2k", endpoint: "/submission", status: "Success", response_time_ms: 167, records: 340, error_code: null, timestamp: recentTs(180) },
  { request_id: "REQ-991203", api_key: "sk_live_***3b4n", endpoint: "/submission", status: "Failed", response_time_ms: 310, records: 0, error_code: "SCHEMA_VERSION_MISMATCH", timestamp: recentTs(240) },
  { request_id: "REQ-991202", api_key: "sk_live_***9a1m", endpoint: "/submission", status: "Success", response_time_ms: 132, records: 620, error_code: null, timestamp: recentTs(300) },
  { request_id: "REQ-991201", api_key: "sk_live_***7x2k", endpoint: "/submission/bulk", status: "Partial", response_time_ms: 2800, records: 1800, error_code: "DUPLICATE_RECORDS", timestamp: recentTs(360) },
];

export const apiSubmissionKpis = {
  totalCallsToday: 28492,
  successRatePercent: 98.2,
  p95LatencyMs: 245,
  avgProcessingTimeMs: 182,
  rejectionRatePercent: 1.8,
  activeApiKeys: 12,
};

export const apiCallVolume30Days = Array.from({ length: 30 }, (_, i) => ({
  day: `D-${29 - i}`,
  volume: 25000 + Math.floor(Math.random() * 15000),
}));

export const latencyTrendData = Array.from({ length: 30 }, (_, i) => ({
  day: `D-${29 - i}`,
  p95: 180 + Math.floor(Math.random() * 80),
  p99: 220 + Math.floor(Math.random() * 120),
}));

export const successVsFailureData = [
  { name: "Success", value: 98.2 },
  { name: "Failure", value: 1.8 },
];

export const topRejectionReasonsData = [
  { reason: "Invalid Schema", count: 142 },
  { reason: "Missing Mandatory Field", count: 98 },
  { reason: "Authentication Failure", count: 45 },
  { reason: "Rate Limit Exceeded", count: 32 },
  { reason: "Other", count: 18 },
];

/* ── Data Submission Batch ── */
export type BatchStatus = "Completed" | "Processing" | "Failed" | "Queued" | "Suspended";

export interface BatchJob {
  batch_id: string;
  file_name: string;
  status: BatchStatus;
  total_records: number;
  success: number;
  failed: number;
  success_rate: number;
  duration_seconds: number;
  uploaded: string;
  uploaded_by: string;
  /** Institution id (data submitter) that uploaded the batch. */
  institution_id: string;
}

export const batchJobs: BatchJob[] = [
  { batch_id: "BATCH-20250919-0001", file_name: "loans_september_batch1.csv", status: "Completed", total_records: 1500, success: 1425, failed: 75, success_rate: 95.0, duration_seconds: 142, uploaded: "2026-02-25 08:00:00", uploaded_by: "Sarah Kimani", institution_id: "1" },
  { batch_id: "BATCH-20250919-0002", file_name: "accounts_feb_batch2.csv", status: "Processing", total_records: 3200, success: 2100, failed: 0, success_rate: 65.6, duration_seconds: 0, uploaded: "2026-02-25 09:30:00", uploaded_by: "James Oduya", institution_id: "2" },
  { batch_id: "BATCH-20250919-0003", file_name: "rejected_retry_batch.csv", status: "Failed", total_records: 500, success: 0, failed: 500, success_rate: 0, duration_seconds: 45, uploaded: "2026-02-25 07:15:00", uploaded_by: "System", institution_id: "4" },
  { batch_id: "BATCH-20250919-0004", file_name: "daily_export_20260225.csv", status: "Queued", total_records: 0, success: 0, failed: 0, success_rate: 0, duration_seconds: 0, uploaded: "2026-02-25 10:00:00", uploaded_by: "Grace Mutua", institution_id: "1" },
  { batch_id: "BATCH-20250918-0005", file_name: "loans_feb_batch1.csv", status: "Completed", total_records: 2800, success: 2792, failed: 8, success_rate: 99.7, duration_seconds: 210, uploaded: "2026-02-24 16:00:00", uploaded_by: "Sarah Kimani", institution_id: "2" },
];

export const batchKpis = {
  totalBatchesToday: 4,
  totalRecordsProcessed: 5200,
  avgBatchSuccessRate: 65.1,
  failedBatchesCount: 1,
  avgProcessingDurationSec: 99,
  queueBacklogCount: 2,
};

export const batchVolumeTrendData = Array.from({ length: 14 }, (_, i) => ({
  day: `D-${13 - i}`,
  batches: 3 + Math.floor(Math.random() * 5),
  success: 8000 + Math.floor(Math.random() * 4000),
  failed: 20 + Math.floor(Math.random() * 80),
}));

export const processingDurationTrendData = Array.from({ length: 14 }, (_, i) => ({
  day: `D-${13 - i}`,
  avgSec: 90 + Math.floor(Math.random() * 120),
}));

export const topBatchErrorCategoriesData = [
  { category: "Schema Mismatch", count: 45 },
  { category: "Duplicate Records", count: 28 },
  { category: "Invalid Format", count: 22 },
  { category: "Missing Consent", count: 15 },
  { category: "Other", count: 8 },
];

export interface BatchDetail {
  batch_id: string;
  file_name: string;
  upload_time: string;
  processing_start: string;
  processing_end: string;
  duration_seconds: number;
  total_records: number;
  success_records: number;
  failed_records: number;
  timeline: { step: string; timestamp: string; completed: boolean }[];
  record_failures: { record_id: string; field: string; error_type: string; error_message: string; severity: string }[];
  schema_drift?: { field: string; suggested_mapping: string; confidence: number; action: string }[];
}

/* ── Batch Execution Console (Flow / Phase / Stage) ── */
export type PhaseStatus = "Completed" | "Processing" | "Failed" | "Queued" | "Suspended";
export type SystemStatus = "OK" | "Error";
export type BusinessStatus = "OK" | "Error" | "Unknown";

export interface BatchPhase {
  phase_id: string;
  name: string;
  version?: string;
  status: PhaseStatus;
  system_status: SystemStatus;
  business_status: BusinessStatus;
  start: string;
  end?: string;
  elapsed_ms?: number;
  flow_uid?: string;
  phase_uid?: string;
  counters?: {
    to_be_processed: number;
    processing: number;
    system_ko: number;
    business_ko: number;
    business_ok: number;
    total_records: number;
  };
}

export interface BatchStage {
  stage_id: string;
  name: string;
  phase_id: string;
  status: PhaseStatus;
  start?: string;
  end?: string;
  records_processed: number;
  errors?: number;
  system_return_code?: number;
  business_return_code?: number;
  processed?: number;
  skipped?: number;
  error_rows?: { record_id: string; field_name: string; error_code: string; error_description: string }[];
  diagnostic_lines?: string[];
}

export interface FlowProgressSegment {
  phase_id: string;
  label: string;
  status: PhaseStatus;
  elapsed_time?: string;
  record_count?: number;
  start?: string;
  end?: string;
}

export type LogSeverity = "INFO" | "WARNING" | "ERROR";

export interface BatchLogEntry {
  timestamp: string;
  component: string;
  severity: LogSeverity;
  message: string;
}

export interface BatchConsoleData {
  batch_id: string;
  /** Override file name for console display (e.g. enterprise demo). */
  file_name?: string;
  institution_name?: string;
  submission_type?: string;
  processing_time_display?: string;
  flow_segments: FlowProgressSegment[];
  phases: BatchPhase[];
  stages: BatchStage[];
  logs: BatchLogEntry[];
}

export const batchDetails: Record<string, BatchDetail> = {
  "BATCH-20250919-0001": {
    batch_id: "BATCH-20250919-0001",
    file_name: "loans_september_batch1.csv",
    upload_time: "2026-02-25 08:00:00",
    processing_start: "2026-02-25 08:00:12",
    processing_end: "2026-02-25 08:02:34",
    duration_seconds: 142,
    total_records: 1500,
    success_records: 1425,
    failed_records: 75,
    timeline: [
      { step: "File Uploaded", timestamp: "2026-02-25 08:00:00", completed: true },
      { step: "Schema Validated", timestamp: "2026-02-25 08:00:05", completed: true },
      { step: "Records Parsed", timestamp: "2026-02-25 08:00:18", completed: true },
      { step: "Validation Completed", timestamp: "2026-02-25 08:02:10", completed: true },
      { step: "Stored to DB", timestamp: "2026-02-25 08:02:28", completed: true },
      { step: "Completed", timestamp: "2026-02-25 08:02:34", completed: true },
    ],
    record_failures: [
      { record_id: "REC-001", field: "national_id", error_type: "Format", error_message: "Invalid format", severity: "Error" },
      { record_id: "REC-042", field: "phone_number", error_type: "Missing", error_message: "Required field missing", severity: "Error" },
      { record_id: "REC-089", field: "date_of_birth", error_type: "Validation", error_message: "Date out of range", severity: "Warning" },
      { record_id: "REC-112", field: "account_number", error_type: "Format", error_message: "Invalid checksum", severity: "Error" },
      { record_id: "REC-156", field: "amount", error_type: "Validation", error_message: "Value exceeds maximum", severity: "Warning" },
      { record_id: "REC-203", field: "consent_flag", error_type: "Missing", error_message: "Required field missing", severity: "Error" },
    ],
    schema_drift: [
      { field: "new_income_field", suggested_mapping: "monthly_income", confidence: 0.92, action: "Review" },
    ],
  },
  "BATCH-20250919-0003": {
    batch_id: "BATCH-20250919-0003",
    file_name: "rejected_retry_batch.csv",
    upload_time: "2026-02-25 07:15:00",
    processing_start: "2026-02-25 07:15:10",
    processing_end: "2026-02-25 07:15:55",
    duration_seconds: 45,
    total_records: 500,
    success_records: 0,
    failed_records: 500,
    timeline: [
      { step: "File Uploaded", timestamp: "2026-02-25 07:15:00", completed: true },
      { step: "Schema Validated", timestamp: "2026-02-25 07:15:08", completed: true },
      { step: "Records Parsed", timestamp: "2026-02-25 07:15:20", completed: true },
      { step: "Validation Completed", timestamp: "2026-02-25 07:15:45", completed: true },
      { step: "Stored to DB", timestamp: "-", completed: false },
      { step: "Completed", timestamp: "2026-02-25 07:15:55", completed: true },
    ],
    record_failures: [
      { record_id: "R-1", field: "schema_version", error_type: "Schema", error_message: "Unsupported schema version", severity: "Error" },
      { record_id: "R-2", field: "header_row", error_type: "Schema", error_message: "Column count mismatch", severity: "Error" },
      { record_id: "R-3", field: "currency_code", error_type: "Validation", error_message: "Invalid ISO 4217 code", severity: "Warning" },
      { record_id: "R-4", field: "customer_id", error_type: "Format", error_message: "Duplicate record", severity: "Error" },
      { record_id: "R-5", field: "disbursement_date", error_type: "Validation", error_message: "Future date not allowed", severity: "Warning" },
    ],
  },
  "BATCH-20250918-0005": {
    batch_id: "BATCH-20250918-0005",
    file_name: "loans_feb_batch1.csv",
    upload_time: "2026-02-24 16:00:00",
    processing_start: "2026-02-24 16:00:08",
    processing_end: "2026-02-24 16:03:38",
    duration_seconds: 210,
    total_records: 2800,
    success_records: 2792,
    failed_records: 8,
    timeline: [
      { step: "File Uploaded", timestamp: "2026-02-24 16:00:00", completed: true },
      { step: "Schema Validated", timestamp: "2026-02-24 16:00:06", completed: true },
      { step: "Records Parsed", timestamp: "2026-02-24 16:00:22", completed: true },
      { step: "Validation Completed", timestamp: "2026-02-24 16:03:20", completed: true },
      { step: "Stored to DB", timestamp: "2026-02-24 16:03:35", completed: true },
      { step: "Completed", timestamp: "2026-02-24 16:03:38", completed: true },
    ],
    record_failures: [
      { record_id: "LF-1001", field: "loan_id", error_type: "Format", error_message: "Invalid ID format", severity: "Error" },
      { record_id: "LF-1042", field: "interest_rate", error_type: "Validation", error_message: "Rate out of allowed range", severity: "Warning" },
      { record_id: "LF-1089", field: "maturity_date", error_type: "Validation", error_message: "Required field missing", severity: "Error" },
      { record_id: "LF-1120", field: "collateral_type", error_type: "Missing", error_message: "Required field missing", severity: "Error" },
      { record_id: "LF-1155", field: "principal_amount", error_type: "Format", error_message: "Invalid number format", severity: "Error" },
      { record_id: "LF-1190", field: "borrower_id", error_type: "Validation", error_message: "Reference not found", severity: "Error" },
      { record_id: "LF-1221", field: "product_code", error_type: "Validation", error_message: "Invalid product code", severity: "Warning" },
      { record_id: "LF-1250", field: "branch_code", error_type: "Missing", error_message: "Required field missing", severity: "Error" },
    ],
  },
};

/** Shared flow segment labels for batch console dummy data. */
const FLOW_SEGMENT_LABELS = [
  { phase_id: "CB_CSDF_PRE", label: "Pre-Processing" },
  { phase_id: "CB_CSDF_CPS", label: "Data Validation" },
  { phase_id: "CB_CSDF_LPC", label: "Load Processing" },
  { phase_id: "POST", label: "Post-Processing" },
  { phase_id: "COMMIT", label: "Data Commit" },
];

/** Batch Execution Console: phases, stages, flow segments, logs keyed by batch_id. */
export const batchConsoleByBatchId: Record<string, BatchConsoleData> = {
  "BATCH-20250919-0001": {
    batch_id: "BATCH-20250919-0001",
    file_name: "loans_september_batch1.csv",
    institution_name: "FNB",
    submission_type: "Loans Batch",
    processing_time_display: "2m 22s",
    flow_segments: [
      { ...FLOW_SEGMENT_LABELS[0], status: "Completed" as const, elapsed_time: "5s", record_count: 1500, start: "08:00:12", end: "08:00:17" },
      { ...FLOW_SEGMENT_LABELS[1], status: "Completed" as const, elapsed_time: "18s", record_count: 1495, start: "08:00:18", end: "08:00:36" },
      { ...FLOW_SEGMENT_LABELS[2], status: "Completed" as const, elapsed_time: "94s", record_count: 1416, start: "08:00:37", end: "08:02:11" },
      { ...FLOW_SEGMENT_LABELS[3], status: "Completed" as const, elapsed_time: "17s", record_count: 1416, start: "08:02:12", end: "08:02:29" },
      { ...FLOW_SEGMENT_LABELS[4], status: "Completed" as const, elapsed_time: "5s", record_count: 1416, start: "08:02:30", end: "08:02:34" },
    ],
    phases: [
      { phase_id: "CB_CSDF_PRE", name: "Pre-Processing", version: "v1.0", status: "Completed", system_status: "OK", business_status: "OK", start: "08:00:12", end: "08:00:17", elapsed_ms: 5000, flow_uid: "FLOW-0001-001", phase_uid: "PHASE-PRE-001", counters: { to_be_processed: 1500, processing: 0, system_ko: 0, business_ko: 5, business_ok: 1495, total_records: 1500 } },
      { phase_id: "CB_CSDF_CPS", name: "Data Validation", version: "v1.2", status: "Completed", system_status: "OK", business_status: "Error", start: "08:00:18", end: "08:00:36", elapsed_ms: 18000, flow_uid: "FLOW-0001-001", phase_uid: "PHASE-CPS-002", counters: { to_be_processed: 1495, processing: 0, system_ko: 0, business_ko: 79, business_ok: 1416, total_records: 1495 } },
      { phase_id: "CB_CSDF_LPC", name: "Load Processing", version: "v2.0", status: "Completed", system_status: "OK", business_status: "OK", start: "08:00:37", end: "08:02:11", elapsed_ms: 94000, flow_uid: "FLOW-0001-001", phase_uid: "PHASE-LPC-003", counters: { to_be_processed: 1416, processing: 0, system_ko: 0, business_ko: 1, business_ok: 1415, total_records: 1416 } },
    ],
    stages: [
      {
        stage_id: "STG-1",
        name: "File Integrity Check",
        phase_id: "CB_CSDF_PRE",
        status: "Completed",
        start: "08:00:12",
        end: "08:00:15",
        records_processed: 1500,
        errors: 2,
        error_rows: [
          { record_id: "FILE-001", field_name: "checksum", error_code: "CHK-001", error_description: "MD5 checksum mismatch" },
          { record_id: "FILE-002", field_name: "header", error_code: "CHK-002", error_description: "Missing required header row" },
        ],
      },
      {
        stage_id: "STG-2",
        name: "Schema Mapping",
        phase_id: "CB_CSDF_PRE",
        status: "Completed",
        start: "08:00:15",
        end: "08:00:17",
        records_processed: 1498,
        errors: 3,
        error_rows: [
          { record_id: "MAP-001", field_name: "customer_id", error_code: "MAP-001", error_description: "Column not found in source" },
          { record_id: "MAP-002", field_name: "disbursement_date", error_code: "MAP-002", error_description: "Type mismatch: expected date" },
          { record_id: "MAP-003", field_name: "account_type", error_code: "MAP-003", error_description: "Unmapped enum value" },
        ],
      },
      {
        stage_id: "STG-3",
        name: "File Validation",
        phase_id: "CB_CSDF_CPS",
        status: "Completed",
        start: "08:00:18",
        end: "08:00:25",
        records_processed: 1495,
        errors: 4,
        error_rows: [
          { record_id: "REC-101", field_name: "account_id", error_code: "VAL-001", error_description: "Invalid format" },
          { record_id: "REC-102", field_name: "amount", error_code: "VAL-002", error_description: "Value out of range" },
          { record_id: "REC-103", field_name: "date_field", error_code: "VAL-003", error_description: "Required field missing" },
          { record_id: "REC-104", field_name: "status", error_code: "VAL-004", error_description: "Invalid enum value" },
        ],
      },
      {
        stage_id: "STG-4",
        name: "Business Rule Validation",
        phase_id: "CB_CSDF_CPS",
        status: "Completed",
        start: "08:00:25",
        end: "08:00:36",
        records_processed: 1491,
        errors: 75,
        error_rows: [
          { record_id: "REC-001", field_name: "national_id", error_code: "BR-001", error_description: "Invalid format" },
          { record_id: "REC-042", field_name: "phone_number", error_code: "BR-002", error_description: "Required field missing" },
          { record_id: "REC-089", field_name: "date_of_birth", error_code: "BR-003", error_description: "Date out of range" },
          { record_id: "REC-112", field_name: "account_number", error_code: "BR-004", error_description: "Invalid checksum" },
          { record_id: "REC-156", field_name: "amount", error_code: "BR-005", error_description: "Value exceeds maximum" },
        ],
      },
      {
        stage_id: "STG-5",
        name: "Load Processing",
        phase_id: "CB_CSDF_LPC",
        status: "Completed",
        start: "08:00:37",
        end: "08:02:11",
        records_processed: 1416,
        errors: 1,
        error_rows: [
          { record_id: "LOD-001", field_name: "—", error_code: "LOD-001", error_description: "Duplicate key on insert" },
        ],
      },
    ],
    logs: [
      { timestamp: "2026-02-25 08:00:12", component: "BatchLoader", severity: "INFO", message: "Batch BATCH-20250919-0001 started" },
      { timestamp: "2026-02-25 08:00:17", component: "PreProcessor", severity: "INFO", message: "Pre-Processing completed. 1500 records." },
      { timestamp: "2026-02-25 08:00:36", component: "SchemaValidator", severity: "INFO", message: "Data Validation completed. 75 business validation failures." },
      { timestamp: "2026-02-25 08:02:11", component: "LoadProcessor", severity: "INFO", message: "Load Processing completed. 1425 records committed." },
      { timestamp: "2026-02-25 08:02:34", component: "BatchLoader", severity: "INFO", message: "Batch BATCH-20250919-0001 completed successfully" },
    ],
  },
  "BATCH-20250919-0002": {
    batch_id: "BATCH-20250919-0002",
    file_name: "accounts_feb_batch2.csv",
    institution_name: "Airtel",
    submission_type: "Accounts Batch",
    processing_time_display: "In progress",
    flow_segments: [
      { ...FLOW_SEGMENT_LABELS[0], status: "Completed" as const, elapsed_time: "8s", record_count: 3200, start: "09:30:05", end: "09:30:13" },
      { ...FLOW_SEGMENT_LABELS[1], status: "Completed" as const, elapsed_time: "42s", record_count: 3198, start: "09:30:14", end: "09:30:56" },
      { ...FLOW_SEGMENT_LABELS[2], status: "Processing" as const, elapsed_time: "—", record_count: 3193, start: "09:30:57", end: undefined },
      { ...FLOW_SEGMENT_LABELS[3], status: "Queued" as const, start: undefined, end: undefined },
      { ...FLOW_SEGMENT_LABELS[4], status: "Queued" as const, start: undefined, end: undefined },
    ],
    phases: [
      { phase_id: "CB_CSDF_PRE", name: "Pre-Processing", version: "v1.0", status: "Completed", system_status: "OK", business_status: "OK", start: "09:30:05", end: "09:30:13", elapsed_ms: 8000, flow_uid: "FLOW-0002-001", phase_uid: "PHASE-PRE-001", counters: { to_be_processed: 3200, processing: 0, system_ko: 0, business_ko: 2, business_ok: 3198, total_records: 3200 } },
      { phase_id: "CB_CSDF_CPS", name: "Data Validation", version: "v1.2", status: "Completed", system_status: "OK", business_status: "OK", start: "09:30:14", end: "09:30:56", elapsed_ms: 42000, flow_uid: "FLOW-0002-001", phase_uid: "PHASE-CPS-002", counters: { to_be_processed: 3198, processing: 0, system_ko: 0, business_ko: 5, business_ok: 3193, total_records: 3198 } },
      { phase_id: "CB_CSDF_LPC", name: "Load Processing", version: "v2.0", status: "Processing", system_status: "OK", business_status: "OK", start: "09:30:57", end: undefined, elapsed_ms: undefined, flow_uid: "FLOW-0002-001", phase_uid: "PHASE-LPC-003", counters: { to_be_processed: 3193, processing: 1092, system_ko: 0, business_ko: 1, business_ok: 2100, total_records: 3193 } },
    ],
    stages: [
      {
        stage_id: "STG-1",
        name: "File Integrity Check",
        phase_id: "CB_CSDF_PRE",
        status: "Completed",
        start: "09:30:05",
        end: "09:30:09",
        records_processed: 3200,
        errors: 0,
        diagnostic_lines: [
          "[09:30:05] File Integrity Check started for accounts_feb_batch2.csv",
          "[09:30:06] Checksum verified. File size: 2.4 MB",
          "[09:30:07] Header row validated. 24 columns detected",
          "[09:30:08] Encoding: UTF-8. No BOM.",
          "[09:30:09] File Integrity Check completed. 3200 records to process.",
        ],
      },
      {
        stage_id: "STG-2",
        name: "Schema Mapping",
        phase_id: "CB_CSDF_PRE",
        status: "Completed",
        start: "09:30:09",
        end: "09:30:13",
        records_processed: 3200,
        errors: 2,
        error_rows: [
          { record_id: "MAP-001", field_name: "customer_id", error_code: "MAP-001", error_description: "Column not found in source" },
          { record_id: "MAP-002", field_name: "amount", error_code: "MAP-004", error_description: "Source column renamed in registry" },
        ],
        diagnostic_lines: [
          "[09:30:09] Schema Mapping started. Profile: accounts_v2",
          "[09:30:10] Mapped 24 source columns to CBS core schema",
          "[09:30:12] Defaults applied for optional fields: 0",
          "[09:30:13] Schema Mapping completed. All records mapped.",
        ],
      },
      {
        stage_id: "STG-3",
        name: "File Validation",
        phase_id: "CB_CSDF_CPS",
        status: "Completed",
        start: "09:30:14",
        end: "09:30:35",
        records_processed: 3198,
        errors: 3,
        error_rows: [
          { record_id: "REC-101", field_name: "account_id", error_code: "VAL-001", error_description: "Invalid format" },
          { record_id: "REC-102", field_name: "amount", error_code: "VAL-002", error_description: "Value out of range" },
          { record_id: "REC-103", field_name: "date_field", error_code: "VAL-003", error_description: "Required field missing" },
        ],
        diagnostic_lines: [
          "[09:30:14] Data Validation phase started",
          "[09:30:18] File Validation: format checks passed for 3198 records",
          "[09:30:22] Date range validation: min 2026-01-01, max 2026-02-25",
          "[09:30:28] Null check: 0 nulls in mandatory fields",
          "[09:30:35] File Validation completed. 3195 records passed.",
        ],
      },
      {
        stage_id: "STG-4",
        name: "Business Rule Validation",
        phase_id: "CB_CSDF_CPS",
        status: "Completed",
        start: "09:30:35",
        end: "09:30:56",
        records_processed: 3195,
        errors: 2,
        error_rows: [
          { record_id: "BIZ-001", field_name: "overdue_days", error_code: "BR-001", error_description: "Overdue days exceeds limit" },
          { record_id: "BIZ-002", field_name: "account_status", error_code: "BR-004", error_description: "Status inconsistent with closure date" },
        ],
        diagnostic_lines: [
          "[09:30:35] Business Rule Validation started. Rule set: accounts_feb_2026",
          "[09:30:40] Rule BR-ACCT-001 (account_status): 3195 passed",
          "[09:30:45] Rule BR-ACCT-002 (balance_non_negative): 3195 passed",
          "[09:30:50] Rule BR-ACCT-003 (currency_code): 3195 passed",
          "[09:30:56] Business Rule Validation completed. 2 failures.",
        ],
      },
      {
        stage_id: "STG-5",
        name: "Load Processing",
        phase_id: "CB_CSDF_LPC",
        status: "Processing",
        start: "09:30:57",
        end: undefined,
        records_processed: 3193,
        errors: 1,
        error_rows: [
          { record_id: "LOD-001", field_name: "—", error_code: "LOD-002", error_description: "Constraint violation: foreign key" },
        ],
        diagnostic_lines: [
          "[09:30:57] Load Processing started. Commit batch size: 500",
          "[09:31:02] Chunk 1/7 committed. 500 records. Running total: 500",
          "[09:31:07] Chunk 2/7 committed. 500 records. Running total: 1000",
          "[09:31:12] Chunk 3/7 committed. 500 records. Running total: 1500",
          "[09:31:17] Chunk 4/7 committed. 500 records. Running total: 2000",
          "[09:31:22] Chunk 5/7 in progress. 2100 / 3193 records committed.",
        ],
      },
    ],
    logs: [
      { timestamp: "2026-02-25 09:30:05", component: "BatchLoader", severity: "INFO", message: "Batch BATCH-20250919-0002 started. File: accounts_feb_batch2.csv" },
      { timestamp: "2026-02-25 09:30:05", component: "PreProcessor", severity: "INFO", message: "Pre-Processing phase started" },
      { timestamp: "2026-02-25 09:30:09", component: "PreProcessor", severity: "INFO", message: "File Integrity Check completed. 3200 records." },
      { timestamp: "2026-02-25 09:30:13", component: "PreProcessor", severity: "INFO", message: "Pre-Processing completed. 3198 records to next phase." },
      { timestamp: "2026-02-25 09:30:14", component: "DataValidator", severity: "INFO", message: "Data Validation phase started" },
      { timestamp: "2026-02-25 09:30:35", component: "DataValidator", severity: "INFO", message: "File Validation completed. 3195 records passed." },
      { timestamp: "2026-02-25 09:30:56", component: "DataValidator", severity: "INFO", message: "Data Validation completed. 3193 records to Load. 5 business failures." },
      { timestamp: "2026-02-25 09:30:57", component: "LoadProcessor", severity: "INFO", message: "Load Processing started. Committing in chunks of 500." },
      { timestamp: "2026-02-25 09:31:02", component: "LoadProcessor", severity: "INFO", message: "Chunk 1 committed. 500 records." },
      { timestamp: "2026-02-25 09:31:07", component: "LoadProcessor", severity: "INFO", message: "Chunk 2 committed. 500 records." },
      { timestamp: "2026-02-25 09:31:12", component: "LoadProcessor", severity: "INFO", message: "Chunk 3 committed. 500 records." },
      { timestamp: "2026-02-25 09:31:17", component: "LoadProcessor", severity: "INFO", message: "Chunk 4 committed. 500 records." },
      { timestamp: "2026-02-25 09:31:22", component: "LoadProcessor", severity: "INFO", message: "Chunk 5 in progress. 2100 / 3200 records committed so far." },
    ],
  },
  "BATCH-20250919-0003": {
    batch_id: "BATCH-20250919-0003",
    file_name: "daily_loans_batch.csv",
    institution_name: "ABC Bank",
    submission_type: "Daily Loans",
    processing_time_display: "3m 42s",
    flow_segments: [
      { phase_id: "CB_CSDF_PRE", label: "Pre-Processing", status: "Completed", elapsed_time: "10s", record_count: 850, start: "10:15:00", end: "10:15:10" },
      { phase_id: "CB_CSDF_CPS", label: "Data Validation", status: "Completed", elapsed_time: "9s", record_count: 845, start: "10:15:11", end: "10:15:20" },
      { phase_id: "CB_CSDF_LPC", label: "Load Processing", status: "Failed", elapsed_time: "—", record_count: 772, start: "10:15:21", end: undefined },
      { phase_id: "POST", label: "Post-Processing", status: "Queued", start: undefined, end: undefined },
      { phase_id: "COMMIT", label: "Data Commit", status: "Queued", start: undefined, end: undefined },
    ],
    phases: [
      {
        phase_id: "CB_CSDF_PRE",
        name: "Pre-Processing",
        version: "v1.0",
        status: "Completed",
        system_status: "OK",
        business_status: "OK",
        start: "10:15:00",
        end: "10:15:10",
        elapsed_ms: 10000,
        flow_uid: "FLOW-20250919-001",
        phase_uid: "PHASE-PRE-001",
        counters: { to_be_processed: 850, processing: 0, system_ko: 0, business_ko: 5, business_ok: 845, total_records: 850 },
      },
      {
        phase_id: "CB_CSDF_CPS",
        name: "Data Validation",
        version: "v1.2",
        status: "Completed",
        system_status: "OK",
        business_status: "Error",
        start: "10:15:11",
        end: "10:15:20",
        elapsed_ms: 9000,
        flow_uid: "FLOW-20250919-001",
        phase_uid: "PHASE-CPS-002",
        counters: { to_be_processed: 845, processing: 0, system_ko: 0, business_ko: 73, business_ok: 772, total_records: 845 },
      },
      {
        phase_id: "CB_CSDF_LPC",
        name: "Load Processing",
        version: "v2.0",
        status: "Failed",
        system_status: "Error",
        business_status: "Unknown",
        start: "10:15:21",
        end: undefined,
        elapsed_ms: undefined,
        flow_uid: "FLOW-20250919-001",
        phase_uid: "PHASE-LPC-003",
        counters: { to_be_processed: 772, processing: 0, system_ko: 1, business_ko: 70, business_ok: 0, total_records: 772 },
      },
    ],
    stages: [
      {
        stage_id: "STG-1",
        name: "File Integrity Check",
        phase_id: "CB_CSDF_PRE",
        status: "Completed",
        start: "10:15:00",
        end: "10:15:05",
        records_processed: 850,
        errors: 2,
        error_rows: [
          { record_id: "FILE-001", field_name: "checksum", error_code: "CHK-001", error_description: "MD5 checksum mismatch" },
          { record_id: "FILE-002", field_name: "header", error_code: "CHK-002", error_description: "Missing required header row" },
        ],
      },
      {
        stage_id: "STG-2",
        name: "Schema Mapping",
        phase_id: "CB_CSDF_PRE",
        status: "Completed",
        start: "10:15:05",
        end: "10:15:10",
        records_processed: 848,
        errors: 3,
        error_rows: [
          { record_id: "MAP-001", field_name: "disbursement_date", error_code: "MAP-002", error_description: "Type mismatch: expected date" },
          { record_id: "MAP-002", field_name: "account_type", error_code: "MAP-003", error_description: "Unmapped enum value" },
          { record_id: "MAP-003", field_name: "amount", error_code: "MAP-004", error_description: "Source column renamed in registry" },
        ],
      },
      {
        stage_id: "STG-3",
        name: "File Validation",
        phase_id: "CB_CSDF_CPS",
        status: "Completed",
        start: "10:15:11",
        end: "10:15:14",
        records_processed: 845,
        errors: 2,
        error_rows: [
          { record_id: "REC-101", field_name: "account_id", error_code: "VAL-001", error_description: "Invalid format" },
          { record_id: "REC-102", field_name: "status", error_code: "VAL-004", error_description: "Invalid enum value" },
        ],
      },
      {
        stage_id: "STG-4",
        name: "Schema Mapping",
        phase_id: "CB_CSDF_CPS",
        status: "Completed",
        start: "10:15:14",
        end: "10:15:17",
        records_processed: 843,
        errors: 1,
        error_rows: [
          { record_id: "MAP-004", field_name: "customer_id", error_code: "MAP-001", error_description: "Column not found in source" },
        ],
      },
      {
        stage_id: "STG-5",
        name: "Business Rule Validation",
        phase_id: "CB_CSDF_CPS",
        status: "Failed",
        start: "10:15:17",
        end: "10:15:20",
        records_processed: 842,
        errors: 70,
        system_return_code: 0,
        business_return_code: 1,
        processed: 780,
        skipped: 0,
        error_rows: [
          { record_id: "REC-101", field_name: "national_id", error_code: "BR-001", error_description: "Invalid format" },
          { record_id: "REC-102", field_name: "loan_amount", error_code: "BR-002", error_description: "Value out of range" },
          { record_id: "REC-103", field_name: "disbursement_date", error_code: "BR-003", error_description: "Future date not allowed" },
        ],
        diagnostic_lines: [
          "[10:15:17] BusinessRuleValidator started for phase CB_CSDF_CPS",
          "[10:15:18] Loaded 12 rules for product daily_loans",
          "[10:15:19] Validation error count reached threshold (70). Stopping.",
          "java.lang.Exception: High business error rate in Validation Phase",
          "  at com.hcb.validator.BusinessRuleValidator.validate(BusinessRuleValidator.java:142)",
        ],
      },
      {
        stage_id: "STG-6",
        name: "Load Processing",
        phase_id: "CB_CSDF_LPC",
        status: "Failed",
        start: "10:15:21",
        end: undefined,
        records_processed: 772,
        errors: 2,
        error_rows: [
          { record_id: "LOD-001", field_name: "—", error_code: "LOD-001", error_description: "Duplicate key on insert" },
          { record_id: "LOD-002", field_name: "—", error_code: "LOD-003", error_description: "Transaction timeout" },
        ],
      },
    ],
    logs: [
      { timestamp: "2026-02-25 10:15:00", component: "BatchLoader", severity: "INFO", message: "Batch BATCH-20250919-0003 started" },
      { timestamp: "2026-02-25 10:15:00", component: "PreProcessor", severity: "INFO", message: "Pre-Processing phase started" },
      { timestamp: "2026-02-25 10:15:10", component: "PreProcessor", severity: "INFO", message: "Pre-Processing completed. 850 records." },
      { timestamp: "2026-02-25 10:15:11", component: "SchemaValidator", severity: "INFO", message: "Data Validation started" },
      { timestamp: "2026-02-25 10:15:18", component: "SchemaValidator", severity: "WARNING", message: "Business validation failures: 70 records" },
      { timestamp: "2026-02-25 10:15:20", component: "SchemaValidator", severity: "INFO", message: "Data Validation completed" },
      { timestamp: "2026-02-25 10:15:21", component: "LoadProcessor", severity: "INFO", message: "Load Processing started" },
      { timestamp: "2026-02-25 10:15:22", component: "LoadProcessor", severity: "ERROR", message: "System error: connection pool exhausted" },
    ],
  },
  "BATCH-20250919-0004": {
    batch_id: "BATCH-20250919-0004",
    file_name: "daily_export_20260225.csv",
    institution_name: "FNB",
    submission_type: "Daily Export",
    processing_time_display: "—",
    flow_segments: [
      { ...FLOW_SEGMENT_LABELS[0], status: "Queued" as const, start: undefined, end: undefined },
      { ...FLOW_SEGMENT_LABELS[1], status: "Queued" as const, start: undefined, end: undefined },
      { ...FLOW_SEGMENT_LABELS[2], status: "Queued" as const, start: undefined, end: undefined },
      { ...FLOW_SEGMENT_LABELS[3], status: "Queued" as const, start: undefined, end: undefined },
      { ...FLOW_SEGMENT_LABELS[4], status: "Queued" as const, start: undefined, end: undefined },
    ],
    phases: [],
    stages: [],
    logs: [
      { timestamp: "2026-02-25 10:00:00", component: "BatchLoader", severity: "INFO", message: "Batch BATCH-20250919-0004 queued. Position 2 in queue." },
      { timestamp: "2026-02-25 10:00:00", component: "BatchLoader", severity: "INFO", message: "File daily_export_20260225.csv uploaded. Waiting for slot." },
    ],
  },
  "BATCH-20250918-0005": {
    batch_id: "BATCH-20250918-0005",
    file_name: "loans_feb_batch1.csv",
    institution_name: "Airtel",
    submission_type: "Loans Batch",
    processing_time_display: "3m 30s",
    flow_segments: [
      { ...FLOW_SEGMENT_LABELS[0], status: "Completed" as const, elapsed_time: "8s", record_count: 2800, start: "16:00:08", end: "16:00:16" },
      { ...FLOW_SEGMENT_LABELS[1], status: "Completed" as const, elapsed_time: "22s", record_count: 2797, start: "16:00:17", end: "16:00:39" },
      { ...FLOW_SEGMENT_LABELS[2], status: "Completed" as const, elapsed_time: "197s", record_count: 2787, start: "16:00:40", end: "16:03:57" },
      { ...FLOW_SEGMENT_LABELS[3], status: "Completed" as const, elapsed_time: "2s", record_count: 2787, start: "16:03:58", end: "16:04:00" },
      { ...FLOW_SEGMENT_LABELS[4], status: "Completed" as const, elapsed_time: "38s", record_count: 2787, start: "16:04:01", end: "16:04:38" },
    ],
    phases: [
      { phase_id: "CB_CSDF_PRE", name: "Pre-Processing", version: "v1.0", status: "Completed", system_status: "OK", business_status: "OK", start: "16:00:08", end: "16:00:16", elapsed_ms: 8000, flow_uid: "FLOW-0005-001", phase_uid: "PHASE-PRE-001", counters: { to_be_processed: 2800, processing: 0, system_ko: 0, business_ko: 3, business_ok: 2797, total_records: 2800 } },
      { phase_id: "CB_CSDF_CPS", name: "Data Validation", version: "v1.2", status: "Completed", system_status: "OK", business_status: "Error", start: "16:00:17", end: "16:00:39", elapsed_ms: 22000, flow_uid: "FLOW-0005-001", phase_uid: "PHASE-CPS-002", counters: { to_be_processed: 2797, processing: 0, system_ko: 0, business_ko: 10, business_ok: 2787, total_records: 2797 } },
      { phase_id: "CB_CSDF_LPC", name: "Load Processing", version: "v2.0", status: "Completed", system_status: "OK", business_status: "OK", start: "16:00:40", end: "16:03:57", elapsed_ms: 197000, flow_uid: "FLOW-0005-001", phase_uid: "PHASE-LPC-003", counters: { to_be_processed: 2787, processing: 0, system_ko: 0, business_ko: 1, business_ok: 2786, total_records: 2787 } },
    ],
    stages: [
      {
        stage_id: "STG-1",
        name: "File Integrity Check",
        phase_id: "CB_CSDF_PRE",
        status: "Completed",
        start: "16:00:08",
        end: "16:00:12",
        records_processed: 2800,
        errors: 1,
        error_rows: [
          { record_id: "FILE-001", field_name: "encoding", error_code: "CHK-003", error_description: "Unsupported file encoding" },
        ],
      },
      {
        stage_id: "STG-2",
        name: "Schema Mapping",
        phase_id: "CB_CSDF_PRE",
        status: "Completed",
        start: "16:00:12",
        end: "16:00:16",
        records_processed: 2799,
        errors: 2,
        error_rows: [
          { record_id: "MAP-001", field_name: "customer_id", error_code: "MAP-001", error_description: "Column not found in source" },
          { record_id: "MAP-002", field_name: "account_type", error_code: "MAP-003", error_description: "Unmapped enum value" },
        ],
      },
      {
        stage_id: "STG-3",
        name: "File Validation",
        phase_id: "CB_CSDF_CPS",
        status: "Completed",
        start: "16:00:17",
        end: "16:00:25",
        records_processed: 2797,
        errors: 2,
        error_rows: [
          { record_id: "REC-101", field_name: "account_id", error_code: "VAL-001", error_description: "Invalid format" },
          { record_id: "REC-102", field_name: "date_field", error_code: "VAL-003", error_description: "Required field missing" },
        ],
      },
      {
        stage_id: "STG-4",
        name: "Business Rule Validation",
        phase_id: "CB_CSDF_CPS",
        status: "Completed",
        start: "16:00:25",
        end: "16:00:39",
        records_processed: 2795,
        errors: 8,
        error_rows: [
          { record_id: "LF-1001", field_name: "loan_id", error_code: "BR-001", error_description: "Invalid ID format" },
          { record_id: "LF-1042", field_name: "interest_rate", error_code: "BR-002", error_description: "Rate out of allowed range" },
          { record_id: "LF-1089", field_name: "maturity_date", error_code: "BR-003", error_description: "Required field missing" },
          { record_id: "LF-1120", field_name: "collateral_type", error_code: "BR-004", error_description: "Required field missing" },
          { record_id: "LF-1155", field_name: "principal_amount", error_code: "BR-005", error_description: "Invalid number format" },
          { record_id: "LF-1190", field_name: "borrower_id", error_code: "BR-006", error_description: "Reference not found" },
          { record_id: "LF-1221", field_name: "product_code", error_code: "BR-007", error_description: "Invalid product code" },
          { record_id: "LF-1250", field_name: "branch_code", error_code: "BR-008", error_description: "Required field missing" },
        ],
      },
      {
        stage_id: "STG-5",
        name: "Load Processing",
        phase_id: "CB_CSDF_LPC",
        status: "Completed",
        start: "16:00:40",
        end: "16:03:57",
        records_processed: 2787,
        errors: 1,
        error_rows: [
          { record_id: "LOD-001", field_name: "—", error_code: "LOD-002", error_description: "Constraint violation: foreign key" },
        ],
      },
    ],
    logs: [
      { timestamp: "2026-02-24 16:00:08", component: "BatchLoader", severity: "INFO", message: "Batch BATCH-20250918-0005 started" },
      { timestamp: "2026-02-24 16:00:39", component: "SchemaValidator", severity: "INFO", message: "Data Validation completed. 8 business validation failures." },
      { timestamp: "2026-02-24 16:03:57", component: "LoadProcessor", severity: "INFO", message: "Load Processing completed. 2792 records committed." },
      { timestamp: "2026-02-24 16:04:38", component: "BatchLoader", severity: "INFO", message: "Batch BATCH-20250918-0005 completed successfully" },
    ],
  },
};

/* ── Inquiry API ── */
export type EnquiryStatus = "Success" | "Failed";

export interface EnquiryLogEntry {
  enquiry_id: string;
  api_key: string;
  product: string;
  status: EnquiryStatus;
  response_time_ms: number;
  consumer_id: string;
  alternate_data_used: number;
  timestamp: string;
}

/** Enquiry log entries with timestamps relative to now so they pass "Last 24 hrs" (and shorter) filters. */
export const enquiryLogEntries: EnquiryLogEntry[] = [
  { enquiry_id: "ENQ-887421", api_key: "sk_sub_***2a", product: "Credit Report + Telecom", status: "Success", response_time_ms: 320, consumer_id: "CON-9912", alternate_data_used: 1, timestamp: recentTs(5) },
  { enquiry_id: "ENQ-887420", api_key: "sk_sub_***5b", product: "Credit Report", status: "Success", response_time_ms: 185, consumer_id: "CON-9911", alternate_data_used: 0, timestamp: recentTs(12) },
  { enquiry_id: "ENQ-887419", api_key: "sk_sub_***2a", product: "Credit Report + Bank Statement", status: "Failed", response_time_ms: 90, consumer_id: "CON-9910", alternate_data_used: 0, timestamp: recentTs(18) },
  { enquiry_id: "ENQ-887418", api_key: "sk_sub_***8c", product: "Credit Report + Telecom", status: "Success", response_time_ms: 410, consumer_id: "CON-9909", alternate_data_used: 1, timestamp: recentTs(25) },
  { enquiry_id: "ENQ-887417", api_key: "sk_sub_***5b", product: "Credit Report", status: "Success", response_time_ms: 198, consumer_id: "CON-9908", alternate_data_used: 0, timestamp: recentTs(35) },
  { enquiry_id: "ENQ-887416", api_key: "sk_sub_***2a", product: "Credit Report", status: "Success", response_time_ms: 165, consumer_id: "CON-9907", alternate_data_used: 0, timestamp: recentTs(48) },
  { enquiry_id: "ENQ-887415", api_key: "sk_sub_***8c", product: "Credit Report + Bank Statement", status: "Success", response_time_ms: 520, consumer_id: "CON-9906", alternate_data_used: 2, timestamp: recentTs(62) },
  { enquiry_id: "ENQ-887414", api_key: "sk_sub_***5b", product: "Credit Report + Telecom", status: "Success", response_time_ms: 380, consumer_id: "CON-9905", alternate_data_used: 1, timestamp: recentTs(75) },
  { enquiry_id: "ENQ-887413", api_key: "sk_sub_***2a", product: "Full Package", status: "Success", response_time_ms: 610, consumer_id: "CON-9904", alternate_data_used: 2, timestamp: recentTs(95) },
  { enquiry_id: "ENQ-887412", api_key: "sk_sub_***8c", product: "Credit Report", status: "Failed", response_time_ms: 88, consumer_id: "CON-9903", alternate_data_used: 0, timestamp: recentTs(110) },
  { enquiry_id: "ENQ-887411", api_key: "sk_sub_***5b", product: "Credit Report + Bank Statement", status: "Success", response_time_ms: 445, consumer_id: "CON-9902", alternate_data_used: 1, timestamp: recentTs(130) },
  { enquiry_id: "ENQ-887410", api_key: "sk_sub_***2a", product: "Credit Report + Telecom", status: "Success", response_time_ms: 298, consumer_id: "CON-9901", alternate_data_used: 1, timestamp: recentTs(180) },
  { enquiry_id: "ENQ-887409", api_key: "sk_sub_***8c", product: "Credit Report", status: "Success", response_time_ms: 172, consumer_id: "CON-9900", alternate_data_used: 0, timestamp: recentTs(240) },
  { enquiry_id: "ENQ-887408", api_key: "sk_sub_***5b", product: "Credit Report + Telecom", status: "Success", response_time_ms: 365, consumer_id: "CON-9899", alternate_data_used: 1, timestamp: recentTs(320) },
  { enquiry_id: "ENQ-887407", api_key: "sk_sub_***2a", product: "Credit Report + Bank Statement", status: "Failed", response_time_ms: 102, consumer_id: "CON-9898", alternate_data_used: 0, timestamp: recentTs(400) },
  { enquiry_id: "ENQ-887406", api_key: "sk_sub_***8c", product: "Full Package", status: "Success", response_time_ms: 588, consumer_id: "CON-9897", alternate_data_used: 2, timestamp: recentTs(480) },
  { enquiry_id: "ENQ-887405", api_key: "sk_sub_***5b", product: "Credit Report", status: "Success", response_time_ms: 156, consumer_id: "CON-9896", alternate_data_used: 0, timestamp: recentTs(600) },
  { enquiry_id: "ENQ-887404", api_key: "sk_sub_***2a", product: "Credit Report + Telecom", status: "Success", response_time_ms: 334, consumer_id: "CON-9895", alternate_data_used: 1, timestamp: recentTs(720) },
  { enquiry_id: "ENQ-887403", api_key: "sk_sub_***8c", product: "Credit Report", status: "Success", response_time_ms: 201, consumer_id: "CON-9894", alternate_data_used: 0, timestamp: recentTs(900) },
  { enquiry_id: "ENQ-887402", api_key: "sk_sub_***5b", product: "Credit Report + Bank Statement", status: "Success", response_time_ms: 412, consumer_id: "CON-9893", alternate_data_used: 1, timestamp: recentTs(1100) },
];

export const enquiryKpis = {
  totalEnquiriesToday: 3842,
  successRatePercent: 97.1,
  p95LatencyMs: 420,
  alternateDataCalls: 892,
  rateLimitBreaches: 3,
  creditConsumption: 3842,
};

export const enquiryVolumeData = Array.from({ length: 30 }, (_, i) => ({
  day: `D-${29 - i}`,
  volume: 3000 + Math.floor(Math.random() * 1500),
}));

export const enquiryResponseTimeTrendData = Array.from({ length: 30 }, (_, i) => ({
  day: `D-${29 - i}`,
  p95: 250 + Math.floor(Math.random() * 200),
  avg: 180 + Math.floor(Math.random() * 120),
}));

export const enquiryByProductData = [
  { product: "Credit Report", success: 2100, failed: 42 },
  { product: "Credit Report + Telecom", success: 980, failed: 28 },
  { product: "Credit Report + Bank Statement", success: 520, failed: 15 },
  { product: "Full Package", success: 182, failed: 8 },
];

export const enquirySuccessVsFailedData = [
  { name: "Success", value: 97.1 },
  { name: "Failed", value: 2.9 },
];
