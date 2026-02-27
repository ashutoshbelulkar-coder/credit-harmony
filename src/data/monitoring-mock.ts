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

export const apiSubmissionRequests: ApiSubmissionRequest[] = [
  { request_id: "REQ-991212", api_key: "sk_live_***7x2k", endpoint: "/submission", status: "Failed", response_time_ms: 210, records: 0, error_code: "INVALID_SCHEMA", timestamp: "2026-02-25 10:32:15" },
  { request_id: "REQ-991211", api_key: "sk_live_***9a1m", endpoint: "/submission", status: "Success", response_time_ms: 145, records: 1200, error_code: null, timestamp: "2026-02-25 10:28:44" },
  { request_id: "REQ-991210", api_key: "sk_live_***7x2k", endpoint: "/submission/bulk", status: "Partial", response_time_ms: 3200, records: 2500, error_code: "MISSING_MANDATORY_FIELD", timestamp: "2026-02-25 10:15:22" },
  { request_id: "REQ-991209", api_key: "sk_live_***3b4n", endpoint: "/submission", status: "Rate Limited", response_time_ms: 89, records: 0, error_code: "RATE_LIMIT_EXCEEDED", timestamp: "2026-02-25 10:12:08" },
  { request_id: "REQ-991208", api_key: "sk_live_***9a1m", endpoint: "/submission", status: "Success", response_time_ms: 198, records: 800, error_code: null, timestamp: "2026-02-25 09:58:33" },
  { request_id: "REQ-991207", api_key: "sk_live_***7x2k", endpoint: "/submission", status: "Failed", response_time_ms: 52, records: 0, error_code: "AUTHENTICATION_FAILURE", timestamp: "2026-02-25 09:45:11" },
  { request_id: "REQ-991206", api_key: "sk_live_***3b4n", endpoint: "/submission", status: "Success", response_time_ms: 176, records: 950, error_code: null, timestamp: "2026-02-25 09:30:00" },
  { request_id: "REQ-991205", api_key: "sk_live_***9a1m", endpoint: "/submission/bulk", status: "Success", response_time_ms: 4100, records: 5000, error_code: null, timestamp: "2026-02-25 09:00:00" },
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
export type BatchStatus = "Completed" | "Processing" | "Failed" | "Queued";

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

export const enquiryLogEntries: EnquiryLogEntry[] = [
  { enquiry_id: "ENQ-887421", api_key: "sk_sub_***2a", product: "Credit Report + Telecom", status: "Success", response_time_ms: 320, consumer_id: "CON-9912", alternate_data_used: 1, timestamp: "2026-02-25 10:35:22" },
  { enquiry_id: "ENQ-887420", api_key: "sk_sub_***5b", product: "Credit Report", status: "Success", response_time_ms: 185, consumer_id: "CON-9911", alternate_data_used: 0, timestamp: "2026-02-25 10:32:10" },
  { enquiry_id: "ENQ-887419", api_key: "sk_sub_***2a", product: "Credit Report + Bank Statement", status: "Failed", response_time_ms: 90, consumer_id: "CON-9910", alternate_data_used: 0, timestamp: "2026-02-25 10:28:45" },
  { enquiry_id: "ENQ-887418", api_key: "sk_sub_***8c", product: "Credit Report + Telecom", status: "Success", response_time_ms: 410, consumer_id: "CON-9909", alternate_data_used: 1, timestamp: "2026-02-25 10:25:00" },
  { enquiry_id: "ENQ-887417", api_key: "sk_sub_***5b", product: "Credit Report", status: "Success", response_time_ms: 198, consumer_id: "CON-9908", alternate_data_used: 0, timestamp: "2026-02-25 10:20:33" },
  { enquiry_id: "ENQ-887416", api_key: "sk_sub_***2a", product: "Credit Report", status: "Success", response_time_ms: 165, consumer_id: "CON-9907", alternate_data_used: 0, timestamp: "2026-02-25 10:15:12" },
  { enquiry_id: "ENQ-887415", api_key: "sk_sub_***8c", product: "Credit Report + Bank Statement", status: "Success", response_time_ms: 520, consumer_id: "CON-9906", alternate_data_used: 2, timestamp: "2026-02-25 10:10:00" },
  { enquiry_id: "ENQ-887414", api_key: "sk_sub_***5b", product: "Credit Report + Telecom", status: "Success", response_time_ms: 380, consumer_id: "CON-9905", alternate_data_used: 1, timestamp: "2026-02-25 10:05:44" },
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
