# EPIC-14 — Batch Pipeline API Documentation

> **Spec Version:** v2 — 2026-05-22
> **Base URL:** `/api/v1`
> **Authentication:** Bearer JWT (OAuth2) unless noted.
> **All timestamps:** ISO 8601 UTC (e.g., `2026-03-31T10:00:00Z`)
> **All IDs:** UUID v4 strings unless noted.

---

## Global Headers

### Request Headers

| Header | Required | Description | Example |
|--------|----------|-------------|---------|
| `Authorization` | Yes | `Bearer {jwt_token}` | `Bearer eyJhbGc...` |
| `X-Request-ID` | Recommended | Client-generated UUID for idempotent tracking | `X-Request-ID: a1b2c3d4-...` |
| `X-Correlation-ID` | Optional | Trace ID from caller's system | `X-Correlation-ID: trace-abc-123` |
| `Content-Type` | Yes (POST/PATCH) | Always `application/json` | `application/json` |
| `Accept` | Recommended | `application/json` | `application/json` |

### Response Headers

| Header | Description |
|--------|-------------|
| `X-Request-ID` | Echoed from request or server-generated |
| `X-Trace-ID` | Internal distributed trace ID (OpenTelemetry) |
| `X-Rate-Limit-Remaining` | Remaining requests in current window |
| `X-Rate-Limit-Reset` | Unix timestamp when rate limit resets |

### Standard Error Response

All error responses follow this shape:

```json
{
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "correlationId": "corr-xyz-123",
  "traceId": "trace-abc-456",
  "timestamp": "2026-03-31T10:00:00Z",
  "status": 400,
  "errorCode": "ERR_JOB_NOT_RETRYABLE",
  "message": "Job is not in FAILED status and cannot be retried.",
  "details": []
}
```

---

## Enum Reference

### `JobStatus`

| Value | Description |
|-------|-------------|
| `QUEUED` | Job created, awaiting pipeline execution. Institution serial lock may apply. |
| `PROCESSING` | Pipeline actively executing phases. |
| `PAUSED` | Execution halted at a threshold gate (P2 or P3) or IR Engine circuit open. Awaiting operator action. |
| `COMPLETED` | All records processed successfully. Zero record failures. |
| `PARTIALLY_COMPLETED` | Pipeline completed with some record failures below threshold. Alias: `PARTIAL_SUCCESS` (business-facing label). |
| `FAILED` | Pipeline terminated due to system error or unrecoverable failure. Retry may be possible if `is_permanently_failed = false`. |
| `CANCELLED` | Operator cancelled the job. File moved to `/cancelled/` SFTP folder. |

### `PhaseStatus`

| Value | Description |
|-------|-------------|
| `pending` | Phase not yet started |
| `running` | Phase actively executing |
| `completed` | Phase completed with results within threshold |
| `paused` | Phase reached threshold gate; awaiting operator decision |
| `failed` | Phase terminated with error |
| `skipped` | Phase skipped (e.g., after cancel or override) |

### `SftpEventStatus`

| Value | Description |
|-------|-------------|
| `DETECTED` | File found in SFTP `/incoming/` folder |
| `STABLE` | File size stable across 2 polls or `.done` marker found |
| `QUEUED` | Batch job created; file moved to `processing/` |
| `PROCESSING` | Pipeline running |
| `PROCESSED` | Pipeline completed; file moved to `processed/` |
| `FAILED` | Pipeline failed; file moved to `failed/` |
| `QUARANTINED` | File moved to `quarantine/` (duplicate, too large, unknown format, schema not found) |
| `CANCELLED` | Job cancelled; file moved to `cancelled/` |
| `PAUSED` | Job paused at threshold gate; file remains in `processing/` |
| `REJECTED` | Institution inactive or pre-pipeline rejection |

### `FormatType`

| Value | Description |
|-------|-------------|
| `CSV` | Comma/pipe/tab/semicolon-delimited flat file |
| `JSON` | Top-level JSON array of objects |
| `JSONL` | One JSON object per line (newline-delimited JSON) |
| `FIXED_WIDTH` | Fixed-width fields; layout defined in schema registry metadata |
| `XML` | XML envelope; record element defined in schema registry metadata |
| `UNKNOWN` | Format could not be determined — results in quarantine |

### `DetectionMethod`

| Value | Description |
|-------|-------------|
| `AGENTIC` | Format detected by AgenticParserService (primary) |
| `EXTENSION` | Detected from file extension |
| `CONTENT_PROBE` | Detected by reading first 4 KB (deterministic fallback) |
| `EXPLICIT` | Source type explicitly provided in batch job metadata or SFTP directory |
| `FILENAME_HINT` | Matched from institution's filename pattern configuration |
| `HEADER_MATCH` | Matched by Jaccard similarity between file headers and mapping source paths |
| `FALLBACK` | Institution has exactly one approved mapping; used as default |

### `NotificationStatus`

| Value | Description |
|-------|-------------|
| `SENT` | All configured notification channels delivered successfully |
| `PARTIAL` | Some channels delivered; at least one failed |
| `FAILED` | All channels failed to deliver |
| `NOT_APPLICABLE` | No notification required for this job type/status |

### `ErrorSeverity`

| Value | Description |
|-------|-------------|
| `CRITICAL` | Record rejected; excluded from all downstream processing |
| `WARNING` | Record flagged but proceeds; flagged in DQR |
| `INFO` | Informational log only; no record impact |

### `SnapshotType`

| Value | Description |
|-------|-------------|
| `JOB_START` | Snapshot at job initiation |
| `JOB_COMPLETE` | Terminal snapshot: job completed |
| `JOB_FAILED` | Terminal snapshot: job failed |
| `JOB_PARTIAL` | Terminal snapshot: job partially completed |
| `JOB_PAUSED` | Snapshot at threshold pause |
| `PHASE_COMPLETE` | Snapshot after each phase completion |
| `PERIODIC` | Periodic in-flight KPI snapshot |

---

## API 1 — List Batch Jobs

### `GET /api/v1/batch-jobs`

**Purpose:** Retrieve a paginated, filterable list of batch jobs.
**Authentication:** Bearer JWT — roles: `BUREAU_ADMIN`, `DATA_OPERATOR`, `OPS_ENGINEER`
**Rate Limit:** 60 requests/minute per token

#### Query Parameters

| Parameter | Type | Required | Validation | Description | Example |
|-----------|------|----------|------------|-------------|---------|
| `institutionId` | string | No | Valid UUID | Filter by institution | `FNB-001` |
| `jobStatus` | string | No | Valid `JobStatus` enum | Filter by status | `FAILED` |
| `intakeChannel` | string | No | `SFTP` \| `API` \| `SIMULATION` | Filter by intake channel | `SFTP` |
| `detectedFormat` | string | No | Valid `FormatType` | Filter by file format | `CSV` |
| `submittedFrom` | string (ISO 8601) | No | Valid date-time | Filter jobs submitted after | `2026-03-01T00:00:00Z` |
| `submittedTo` | string (ISO 8601) | No | Valid date-time, >= submittedFrom | Filter jobs submitted before | `2026-03-31T23:59:59Z` |
| `isPermanentlyFailed` | boolean | No | — | Filter permanently failed jobs | `true` |
| `page` | integer | No | >= 1, default 1 | Page number | `2` |
| `size` | integer | No | 1–100, default 20 | Page size | `50` |
| `sortBy` | string | No | `submittedAt` \| `completedAt` \| `dqiScore`, default `submittedAt` | Sort field | `dqiScore` |
| `sortDir` | string | No | `ASC` \| `DESC`, default `DESC` | Sort direction | `ASC` |

#### Response (200)

```json
{
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "correlationId": null,
  "traceId": "trace-abc-456",
  "timestamp": "2026-03-31T11:00:00Z",
  "data": [
    {
      "batchJobId": "bj-00001",
      "institutionId": "FNB-001",
      "institutionName": "First National Bank",
      "jobStatus": "COMPLETED",
      "statusDisplay": "COMPLETED",
      "intakeChannel": "SFTP",
      "intakeMode": "PUSH",
      "originalFilename": "FNB_bank_2026-03-31_001.csv",
      "detectedFormat": "CSV",
      "sourceType": "bank",
                    "totalRecords": 5000,
                    "processedRecords": 4977,
                    "failedRecords": 23,
                    "tradelinesInserted": 4977,
                    "newConsumersCreated": 312,
      "validationFailureRate": 0.0040,
      "mappingCoveragePercent": 91.7,
      "dqiScore": 96.6,
      "submittedAt": "2026-03-31T09:59:58Z",
      "startedAt": "2026-03-31T10:00:00Z",
      "completedAt": "2026-03-31T10:02:05Z",
      "retryCount": 0,
      "isPermanentlyFailed": false
    }
  ],
  "pagination": {
    "page": 1,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

#### Error Responses

| HTTP | Error Code | Cause |
|------|-----------|-------|
| 400 | `ERR_INVALID_PARAM` | Invalid enum value or date format in query parameters |
| 401 | `ERR_UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `ERR_FORBIDDEN` | Insufficient role |

---

## API 2 — Get Batch Job Detail

### `GET /api/v1/batch-jobs/:id/detail`

**Purpose:** Get full execution detail for a batch job including phases, stages, error samples, SFTP event, and DQI score.
**Authentication:** Bearer JWT — roles: `BUREAU_ADMIN`, `DATA_OPERATOR`, `OPS_ENGINEER`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | `batch_job_id` |

#### Response (200)

```json
{
  "requestId": "...",
  "correlationId": "corr-bj-001",
  "traceId": "trace-bj-001",
  "timestamp": "2026-03-31T11:00:00Z",
  "data": {
    "batchJobId": "bj-00001",
    "correlationId": "corr-bj-001",
    "institutionId": "FNB-001",
    "jobStatus": "PARTIALLY_COMPLETED",
    "statusDisplay": "PARTIAL_SUCCESS",
    "intakeChannel": "SFTP",
    "intakeMode": "PUSH",
    "originalFilename": "FNB_bank_2026-03-31_001.csv",
    "detectedFormat": "CSV",
    "schemaRegistryId": "REG-FNB-001",
    "profileId": "PROF-001",
    "mappingId": "MAP-FNB-BANK-v3",
    "mappingVersion": 3,
    "schemaDetectionMethod": "EXPLICIT",
    "schemaDetectionConfidence": 1.0,
    "s3StagingPath": "s3://hcb-batch-staging/FNB-001/bj-00001/raw/FNB_bank_2026-03-31_001.csv",
    "dqiScore": 96.6,
    "dqrUrl": "https://s3.amazonaws.com/hcb-batch-staging/.../dqr.json?X-Amz-Expires=604800",
    "errorReportUrl": "https://s3.amazonaws.com/hcb-batch-staging/.../errors.json?...",
    "totalRecords": 5000,
    "processedRecords": 4977,
    "failedRecords": 23,
    "tradelinesInserted": 4977,
    "newConsumersCreated": 312,
    "existingConsumersUpdated": 4665,
    "validationFailureRate": 0.0040,
    "mappingCoveragePercent": 91.7,
    "driftAlertTriggered": false,
    "isPermanentlyFailed": false,
    "failureReason": null,
    "lastSuccessfulPhase": "P6_POST_PROC",
    "retryCount": 0,
    "notificationStatus": "SENT",
    "notificationChannelsJson": { "email": "SENT", "webhook": "SENT", "dashboard": "SENT" },
    "submittedAt": "2026-03-31T09:59:58Z",
    "startedAt": "2026-03-31T10:00:00Z",
    "completedAt": "2026-03-31T10:02:05Z",
    "phases": [
      {
        "phaseName": "P1_PRE_PROCS",
        "phaseStatus": "completed",
        "startedAt": "2026-03-31T10:00:00Z",
        "completedAt": "2026-03-31T10:00:02Z",
        "processedCount": 1,
        "failedCount": 0,
        "retryAttempt": 0
      },
      {
        "phaseName": "P2_VALIDTION",
        "phaseStatus": "completed",
        "startedAt": "2026-03-31T10:00:05Z",
        "completedAt": "2026-03-31T10:00:45Z",
        "processedCount": 5000,
        "failedCount": 20,
        "retryAttempt": 0
      },
      {
        "phaseName": "P3_STANDARZN",
        "phaseStatus": "completed",
        "startedAt": "2026-03-31T10:00:46Z",
        "completedAt": "2026-03-31T10:01:10Z",
        "processedCount": 4980,
        "failedCount": 3,
        "retryAttempt": 0
      },
      {
        "phaseName": "P4_IDENT_RES",
        "phaseStatus": "completed",
        "startedAt": "2026-03-31T10:01:11Z",
        "completedAt": "2026-03-31T10:01:30Z",
        "processedCount": 4977,
        "failedCount": 0,
        "retryAttempt": 0
      },
      {
        "phaseName": "P5_DATA_LOAD",
        "phaseStatus": "completed",
        "startedAt": "2026-03-31T10:01:31Z",
        "completedAt": "2026-03-31T10:02:00Z",
        "processedCount": 4977,
        "failedCount": 0,
        "retryAttempt": 0
      },
      {
        "phaseName": "P6_POST_PROC",
        "phaseStatus": "completed",
        "startedAt": "2026-03-31T10:02:01Z",
        "completedAt": "2026-03-31T10:02:05Z",
        "processedCount": 1,
        "failedCount": 0,
        "retryAttempt": 0
      }
    ],
    "stages": [
      {
        "stageName": "S13_REC_PARS",
        "phaseName": "P1_PRE_PROCS",
        "stageStatus": "completed",
        "recordsProcessed": 5000,
        "recordsFailed": 0,
        "metadata": {
          "parserType": "AGENTIC",
          "agenticModelVersion": "hcb-parser-v1.2",
          "detectionConfidence": 0.98,
          "parseLatencyMs": 420,
          "format": "CSV",
          "delimiter": ",",
          "headerRow": true,
          "columnCount": 11
        },
        "retryAttempt": 0
      },
      {
        "stageName": "S22_L1_VALID",
        "phaseName": "P2_VALIDTION",
        "stageStatus": "completed",
        "recordsProcessed": 5000,
        "recordsFailed": 20,
        "metadata": null,
        "retryAttempt": 0
      },
      {
        "stageName": "S33_L2_VALID",
        "phaseName": "P3_STANDARZN",
        "stageStatus": "completed",
        "recordsProcessed": 4980,
        "recordsFailed": 3,
        "metadata": null,
        "retryAttempt": 0
      },
      {
        "stageName": "S41_CLST_ASN",
        "phaseName": "P4_IDENT_RES",
        "stageStatus": "completed",
        "recordsProcessed": 4977,
        "recordsFailed": 0,
        "metadata": {
          "irEngineCallCount": 5,
          "totalRecordsSent": 4977,
          "totalRecordsReceived": 4977,
          "newClusters": 312,
          "existingClusters": 4665,
          "latencyMs": 1180
        },
        "retryAttempt": 0
      }
    ],
    "errorSamples": [
      {
        "rowNumber": 147,
        "errorCode": "VALIDATION_L1_FORMAT_FAILED",
        "errorMessage": "account_number does not match ^[A-Z0-9-]{5,20}$",
        "fieldName": "account_number",
        "fieldValue": "[REDACTED]",
        "errorType": "FORMAT",
        "severity": "CRITICAL",
        "correlationId": "corr-bj-001"
      }
    ],
    "sftpEvent": {
      "sftpPath": "/sftp/institutions/FNB-001/incoming/FNB_bank_2026-03-31_001.csv",
      "fileSize": 2048576,
      "checksumSha256": "a3f2c...",
      "detectedAt": "2026-03-31T09:59:58Z",
      "eventStatus": "PROCESSED"
    }
  }
}
```

#### Error Responses

| HTTP | Error Code | Cause |
|------|-----------|-------|
| 401 | `ERR_UNAUTHORIZED` | Missing/invalid JWT |
| 403 | `ERR_FORBIDDEN` | Insufficient role |
| 404 | `ERR_JOB_NOT_FOUND` | No batch job with given ID |

---

## API 3 — Get Data Quality Report

### `GET /api/v1/batch-jobs/:id/dqr`

**Purpose:** Retrieve the Data Quality Report and DQI score for a completed batch job.
**Authentication:** Bearer JWT — roles: `BUREAU_ADMIN`, `DATA_OPERATOR`, `OPS_ENGINEER`, `INSTITUTION` (own jobs only)
**Rate Limit:** 30 requests/minute per token

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | `batch_job_id` |

#### Response (200)

```json
{
  "requestId": "...",
  "correlationId": "corr-bj-001",
  "traceId": "trace-dqr-001",
  "timestamp": "2026-03-31T11:05:00Z",
  "data": {
    "batchJobId": "bj-00001",
    "institutionId": "FNB-001",
    "retryAttempt": 0,
    "dqiScore": 96.6,
    "rawDqs": 0.034,
    "components": {
      "missingFieldsRatio": 0.0,
      "invalidFormatRatio": 0.004,
      "duplicateRatio": 0.0,
      "schemaDriftRatio": 0.083
    },
    "weights": {
      "missingFields": 0.30,
      "invalidFormat": 0.30,
      "duplicates": 0.20,
      "schemaDrift": 0.20
    },
    "summary": {
      "totalRecords": 5000,
      "processedRecords": 4977,
      "failedRecords": 23,
      "mandatoryFailedCount": 0,
      "l1FormatFailedCount": 20,
      "duplicateFailedCount": 0,
      "l2CrossFieldFailedCount": 3,
      "unmappedFieldCount": 415,
      "totalFieldCount": 5000
    },
    "l1BreakdownByField": {
      "account_number": 15,
      "pan_number": 5
    },
    "l2Breakdown": {
      "outstanding_balance_vs_loan_amount": 2,
      "repayment_date_sequence": 1
    },
    "dqrS3Path": "s3://hcb-batch-staging/FNB-001/bj-00001/dqr/dqr.json",
    "dqrSftpPath": "/sftp/institutions/FNB-001/processed/bj-00001/run_0/dqr.json",
    "dqrPresignedUrl": "https://s3.amazonaws.com/hcb-batch-staging/.../dqr.json?X-Amz-Expires=604800",
    "dqrPresignedUrlExpiresAt": "2026-04-07T10:02:05Z",
    "generatedAt": "2026-03-31T10:02:03Z",
    "uploadedAt": "2026-03-31T10:02:04Z"
  }
}
```

#### Business Rules
- Job must be in terminal status (`COMPLETED`, `PARTIALLY_COMPLETED`, `FAILED`, `CANCELLED`) or `PAUSED`. Returns 404 if DQR not yet generated.
- `INSTITUTION` role users can only access DQR for jobs belonging to their own institution.

#### Error Responses

| HTTP | Error Code | Cause |
|------|-----------|-------|
| 404 | `ERR_JOB_NOT_FOUND` | No batch job with given ID |
| 422 | `ERR_DQR_NOT_GENERATED` | Job is still in PROCESSING status; DQR not yet available |
| 403 | `ERR_FORBIDDEN` | Institution role accessing another institution's job |

---

## API 4 — Retry a Batch Job

### `POST /api/v1/batch-jobs/:id/retry`

**Purpose:** Retry a FAILED batch job. Pipeline restarts from the last successful phase.
**Authentication:** Bearer JWT — role: `BUREAU_ADMIN`
**Idempotency:** Idempotent per `X-Request-ID` within 60 seconds. Duplicate call with same `X-Request-ID` within 60s returns the same response without re-triggering.
**Rate Limit:** 5 requests/minute per `batch_job_id`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | `batch_job_id` |

#### Request Body (optional)

```json
{
  "reason": "Transient IR Engine failure resolved — retrying."
}
```

#### Validation Rules
- Job must have `job_status = FAILED`
- `is_permanently_failed` must be `false`
- Institution must have `institution_lifecycle_status = 'active'`
- For SFTP-sourced jobs: file must be present in `processing/` or `failed/` SFTP folder; if missing: `ERR_BATCH_FILE_NOT_FOUND`
- `retry_count` must be < `hcb.batch.max-retry-count` (default 3)

#### Business Rules
- `retry_count` is incremented before new phase/stage logs are written
- Pipeline restarts from `last_successful_phase + 1`
- New phase/stage logs appended with `retry_attempt = new retry_count`
- Exponential backoff enforced: system will not start execution until the backoff period has elapsed
- If `retry_count` reaches `max_retry_count` after this call's failure: `is_permanently_failed = 1` is set

#### Response (200)

```json
{
  "requestId": "...",
  "correlationId": "corr-bj-001",
  "traceId": "...",
  "timestamp": "2026-03-31T12:00:00Z",
  "data": {
    "batchJobId": "bj-00001",
    "batchJobStatus": "QUEUED",
    "retryCount": 1,
    "maxRetryCount": 3,
    "isPermanentlyFailed": false,
    "backoffSchedule": {
      "attempt": 1,
      "minimumWaitMs": 30000,
      "executionNotBefore": "2026-03-31T12:00:30Z"
    },
    "lastSuccessfulPhase": "P3_STANDARZN",
    "restartingFromPhase": "P4_IDENT_RES"
  }
}
```

#### Error Responses

| HTTP | Error Code | Cause |
|------|-----------|-------|
| 400 | `ERR_JOB_NOT_RETRYABLE` | Job status is not `FAILED` |
| 409 | `ERR_RETRY_LIMIT_EXCEEDED` | `is_permanently_failed = true` |
| 404 | `ERR_BATCH_FILE_NOT_FOUND` | SFTP source file missing from processing/failed folders |
| 403 | `ERR_INSTITUTION_NOT_ACTIVE` | Institution deactivated since original submission |

**Example error response:**
```json
{
  "requestId": "...",
  "correlationId": "corr-bj-001",
  "traceId": "...",
  "timestamp": "2026-03-31T12:00:00Z",
  "status": 409,
  "errorCode": "ERR_RETRY_LIMIT_EXCEEDED",
  "message": "Job bj-00001 has reached the maximum retry limit of 3 attempts and is permanently failed.",
  "details": [
    { "field": "isPermanentlyFailed", "value": true },
    { "field": "retryCount", "value": 3 }
  ]
}
```

---

## API 5 — Cancel a Batch Job

### `POST /api/v1/batch-jobs/:id/cancel`

**Purpose:** Cancel a queued or in-progress batch job.
**Authentication:** Bearer JWT — role: `BUREAU_ADMIN`
**Rate Limit:** 5 requests/minute per `batch_job_id`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | `batch_job_id` |

#### Request Body (optional)

```json
{
  "reason": "Erroneous file submitted; replacement file will be dropped."
}
```

#### Validation Rules
- Job must have `job_status IN (QUEUED, PROCESSING, PAUSED)`
- Jobs in terminal states `COMPLETED`, `PARTIALLY_COMPLETED`, `CANCELLED`, `FAILED` (permanently): return 400

#### Business Rules
- Cancellation flag set immediately; current stage's active atomic unit completes
- No further stages execute after cancellation is acknowledged
- P5 committed chunks NOT rolled back (idempotent UPSERT ensures safety on resubmission)
- File moved from `processing/` to `/cancelled/` SFTP folder
- `batch_sftp_events.event_status = CANCELLED`
- P6_POST_PROC runs after cancellation (error report and notification generated)
- `batch_jobs.cancelled_at` = NOW(); `batch_jobs.cancelled_by` = requesting user ID

#### Response (200)

```json
{
  "requestId": "...",
  "correlationId": "corr-bj-001",
  "traceId": "...",
  "timestamp": "2026-03-31T12:05:00Z",
  "data": {
    "batchJobId": "bj-00001",
    "batchJobStatus": "CANCELLED",
    "cancelledAt": "2026-03-31T12:05:00Z",
    "cancelledBy": "admin-user-001",
    "phaseAtCancellation": "P3_STANDARZN",
    "recordsProcessedBeforeCancel": 2400,
    "sftpFileMovedTo": "/sftp/institutions/FNB-001/cancelled/FNB_bank_2026-03-31_001.csv"
  }
}
```

#### Error Responses

| HTTP | Error Code | Cause |
|------|-----------|-------|
| 400 | `ERR_JOB_NOT_CANCELLABLE` | Job is already COMPLETED, PARTIALLY_COMPLETED, or CANCELLED |

---

## API 6 — Resume a Paused Batch Job

### `POST /api/v1/batch-jobs/:id/resume`

**Purpose:** Resume a PAUSED batch job from the phase where it was paused. Data Operator reviews the pause reason and triggers resume after corrective action.
**Authentication:** Bearer JWT — roles: `DATA_OPERATOR`, `BUREAU_ADMIN`
**Rate Limit:** 5 requests/minute per `batch_job_id`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | `batch_job_id` |

#### Request Body

```json
{
  "reason": "Reviewed failed records. Source data issue identified and documented. Proceeding with valid records."
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `reason` | string | Yes | 10–500 chars | Operator's reason for resuming; stored in `batch_jobs.paused_reason` (appended) |

#### Validation Rules
- Job must have `job_status = PAUSED`
- `is_permanently_failed` must be `false`

#### Business Rules
- Job transitions `PAUSED → PROCESSING`
- `batch_jobs.resumed_at` = NOW(); `batch_jobs.resumed_by` = requesting user ID
- Pipeline restarts from the paused phase with the records that had passed (failed records remain excluded)
- `batch_jobs.paused_reason` appended with: `"[RESUMED by {user} at {timestamp}]: {reason}"`
- If threshold gate is breached again in a later phase, job may enter PAUSED again

#### Response (200)

```json
{
  "requestId": "...",
  "correlationId": "corr-bj-001",
  "traceId": "...",
  "timestamp": "2026-03-31T12:10:00Z",
  "data": {
    "batchJobId": "bj-00001",
    "batchJobStatus": "PROCESSING",
    "resumedAt": "2026-03-31T12:10:00Z",
    "resumedBy": "data-operator-001",
    "resumingFromPhase": "P3_STANDARZN",
    "validRecordsProceeding": 3250,
    "failedRecordsExcluded": 1750
  }
}
```

#### Error Responses

| HTTP | Error Code | Cause |
|------|-----------|-------|
| 400 | `ERR_JOB_NOT_RESUMABLE` | Job status is not `PAUSED` |
| 409 | `ERR_RETRY_LIMIT_EXCEEDED` | `is_permanently_failed = true`; job cannot be resumed |

---

## API 7 — Override Pause (Advance With Valid Records)

### `POST /api/v1/batch-jobs/:id/override-pause`

**Purpose:** Operator overrides the pause threshold gate and directs the pipeline to advance using only valid records, permanently excluding failed records for this run.
**Authentication:** Bearer JWT — roles: `DATA_OPERATOR`, `BUREAU_ADMIN`
**Rate Limit:** 3 requests/minute per `batch_job_id`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | `batch_job_id` |

#### Request Body

```json
{
  "action": "ADVANCE_WITH_VALID",
  "reason": "Failure pattern is due to known source system schema change. Failed records to be resubmitted next cycle."
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `action` | string | Yes | `ADVANCE_WITH_VALID` (only supported value) | Override action type |
| `reason` | string | Yes | 10–500 chars | Operator justification; stored in audit log and job record |

#### Validation Rules
- Job must have `job_status = PAUSED`
- `is_permanently_failed` must be `false`

#### Business Rules
- Job transitions `PAUSED → PROCESSING`
- Permanently excludes all current-phase failed records from further processing
- Stored in `batch_jobs.paused_reason`: `"[OVERRIDE by {user} at {timestamp} — action: ADVANCE_WITH_VALID]: {reason}"`
- Audit event: `BATCH_JOB_PAUSE_OVERRIDDEN`
- Job will complete as `PARTIALLY_COMPLETED` (since records were excluded)

#### Response (200)

```json
{
  "requestId": "...",
  "correlationId": "corr-bj-001",
  "traceId": "...",
  "timestamp": "2026-03-31T12:15:00Z",
  "data": {
    "batchJobId": "bj-00001",
    "batchJobStatus": "PROCESSING",
    "overriddenAt": "2026-03-31T12:15:00Z",
    "overriddenBy": "data-operator-001",
    "action": "ADVANCE_WITH_VALID",
    "validRecordsAdvancing": 3250,
    "failedRecordsPermanentlyExcluded": 1750,
    "resumingFromPhase": "P3_STANDARZN"
  }
}
```

#### Error Responses

| HTTP | Error Code | Cause |
|------|-----------|-------|
| 400 | `ERR_JOB_NOT_PAUSED` | Job is not in PAUSED status |
| 400 | `ERR_INVALID_OVERRIDE_ACTION` | Unsupported `action` value |

---

## API 8 — Get Batch KPIs

### `GET /api/v1/batch-jobs/kpis`

**Purpose:** Extended KPI metrics for monitoring dashboards (EPIC-09).
**Authentication:** Bearer JWT — roles: `BUREAU_ADMIN`, `OPS_ENGINEER`

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | ISO 8601 | No | Start of KPI window (default: today 00:00 UTC) |
| `to` | ISO 8601 | No | End of KPI window (default: now) |
| `institutionId` | string | No | Scope KPIs to specific institution |
| `sourceType` | string | No | Scope KPIs to specific source type |

#### Response (200) — excerpt

```json
{
  "requestId": "...",
  "timestamp": "2026-03-31T11:00:00Z",
  "data": {
    "window": { "from": "2026-03-31T00:00:00Z", "to": "2026-03-31T11:00:00Z" },
    "volume": {
      "jobsSubmitted": 42,
      "jobsCompleted": 38,
      "jobsPartial": 3,
      "jobsFailed": 1,
      "jobsPaused": 0,
      "jobsCancelled": 0,
      "jobsPermanentlyFailed": 0,
      "totalRecordsProcessed": 215000,
      "totalTradelines": 198500,
      "newConsumers": 12300,
      "sftpFilesReceived": 42,
      "sftpFilesByFormat": { "CSV": 30, "JSON": 8, "JSONL": 4 }
    },
    "rates": {
      "batchSuccessRate": 0.905,
      "batchPartialRate": 0.071,
      "batchFailureRate": 0.024,
      "avgValidationFailureRate": 0.031,
      "duplicateFileRate": 0.005,
      "schemaDetectionFailureCount": 2,
      "avgMappingCoveragePercent": 93.2,
      "avgDqiScore": 94.8
    },
    "performance": {
      "p95EndToEndDurationMs": 287000,
      "p95SftpToQueueLatencyMs": 62000,
      "avgValidationDurationMs": 18500,
      "avgLoadDurationMs": 22000,
      "throughputRecordsPerMinute": 5120
    },
    "irEngine": {
      "callSuccessRate": 0.998,
      "p95LatencyMs": 3200,
      "circuitBreakerOpenings": 0
    },
    "dqi": {
      "avgDqiScore": 94.8,
      "jobsWithDqiBelow70": 0,
      "dqrDeliverySuccessRate": 1.0
    },
    "sftp": {
      "filesInProcessing": 1,
      "filesStuckInProcessing": 0,
      "filesInQuarantine": 2,
      "filesInFailed": 1,
      "driftAlertsTriggered": 1
    }
  }
}
```

---

## API 9 — Get Batch Charts

### `GET /api/v1/batch-jobs/charts`

**Purpose:** Time-series chart data for volume, success rate, and DQI trends.
**Authentication:** Bearer JWT — roles: `BUREAU_ADMIN`, `OPS_ENGINEER`

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `metric` | string | Yes | `VOLUME` \| `SUCCESS_RATE` \| `DQI_TREND` \| `VALIDATION_FAILURE_RATE` |
| `granularity` | string | No | `HOUR` \| `DAY` \| `WEEK`, default `DAY` |
| `from` | ISO 8601 | No | Window start |
| `to` | ISO 8601 | No | Window end |
| `institutionId` | string | No | Filter |

#### Response (200)

```json
{
  "requestId": "...",
  "timestamp": "2026-03-31T11:00:00Z",
  "data": {
    "metric": "DQI_TREND",
    "granularity": "DAY",
    "series": [
      { "timestamp": "2026-03-29T00:00:00Z", "value": 93.2 },
      { "timestamp": "2026-03-30T00:00:00Z", "value": 94.5 },
      { "timestamp": "2026-03-31T00:00:00Z", "value": 94.8 }
    ]
  }
}
```

---

## API 10 — List SFTP Events

### `GET /api/v1/batch-jobs/sftp-events`

**Purpose:** List SFTP file events with filtering. Used by operations engineers and EPIC-13 dashboard.
**Authentication:** Bearer JWT — roles: `BUREAU_ADMIN`, `OPS_ENGINEER`

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `institutionId` | string | No | Filter by institution | `FNB-001` |
| `eventStatus` | string | No | Valid `SftpEventStatus` | `QUARANTINED` |
| `detectedFormat` | string | No | Valid `FormatType` | `CSV` |
| `isDuplicate` | boolean | No | Filter duplicates | `true` |
| `from` | ISO 8601 | No | Filter from date | `2026-03-31T00:00:00Z` |
| `to` | ISO 8601 | No | Filter to date | |
| `page` | integer | No | default 1 | |
| `size` | integer | No | 1–100, default 20 | |

#### Field Schema (per item)

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | SFTP event ID |
| `institutionId` | string | Institution identifier |
| `originalFilename` | string | Filename as dropped by institution |
| `sftpPath` | string | Full SFTP path at detection |
| `processingPath` | string \| null | Path after move to `processing/` |
| `outcomePath` | string \| null | Final path (`processed/`, `failed/`, `cancelled/`, `quarantine/`) |
| `fileSizeBytes` | integer | File size in bytes |
| `checksumSha256` | string | SHA-256 of file content |
| `detectedFormat` | `FormatType` | Detected file format |
| `formatDetectionMethod` | `DetectionMethod` | How format was detected |
| `eventStatus` | `SftpEventStatus` | Current lifecycle status |
| `batchJobId` | string \| null | Linked batch job (null if quarantined before job creation) |
| `isDuplicate` | boolean | True if file is a duplicate of a prior submission |
| `originalSftpEventId` | integer \| null | Reference to original event if duplicate |
| `errorCode` | string \| null | Error code if quarantined or failed |
| `detectedAt` | ISO 8601 | When file was first detected |
| `stableConfirmedAt` | ISO 8601 \| null | When file stability was confirmed |
| `queuedAt` | ISO 8601 \| null | When batch job was created |

#### Response (200)

```json
{
  "requestId": "...",
  "timestamp": "2026-03-31T11:00:00Z",
  "data": [
    {
      "id": 1042,
      "institutionId": "FNB-001",
      "originalFilename": "FNB_bank_2026-03-31_001.csv",
      "sftpPath": "/sftp/institutions/FNB-001/incoming/FNB_bank_2026-03-31_001.csv",
      "processingPath": "/sftp/institutions/FNB-001/processing/bj-00001_FNB_bank_2026-03-31_001.csv",
      "outcomePath": "/sftp/institutions/FNB-001/processed/FNB_bank_2026-03-31_001.csv",
      "fileSizeBytes": 2048576,
      "checksumSha256": "a3f2c...",
      "detectedFormat": "CSV",
      "formatDetectionMethod": "AGENTIC",
      "eventStatus": "PROCESSED",
      "batchJobId": "bj-00001",
      "isDuplicate": false,
      "originalSftpEventId": null,
      "errorCode": null,
      "detectedAt": "2026-03-31T09:59:58Z",
      "stableConfirmedAt": "2026-03-31T10:00:28Z",
      "queuedAt": "2026-03-31T10:00:29Z"
    }
  ],
  "pagination": { "page": 1, "size": 20, "totalElements": 1, "totalPages": 1 }
}
```

---

## API 11 — Get SFTP Event Detail

### `GET /api/v1/batch-jobs/sftp-events/:id`

**Purpose:** Full detail for a single SFTP file event.
**Authentication:** Bearer JWT — roles: `BUREAU_ADMIN`, `OPS_ENGINEER`

Returns the same schema as a single item from the list endpoint, plus `schemaRegistryId`, `mappingId`, `schemaDetectionMethod`, `sourceTypeHint`, `intakeMode`.

#### Error Responses

| HTTP | Error Code | Cause |
|------|-----------|-------|
| 404 | `ERR_SFTP_EVENT_NOT_FOUND` | No SFTP event with given ID |

---

## API 12 — Get SFTP Health

### `GET /api/v1/batch-jobs/sftp-health`

**Purpose:** Real-time SFTP folder health status. Used by EPIC-13 operational health widget and EPIC-10 alerts.
**Authentication:** Bearer JWT — roles: `BUREAU_ADMIN`, `OPS_ENGINEER`

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `institutionId` | string | No | Scope to specific institution |

#### Response (200)

```json
{
  "requestId": "...",
  "timestamp": "2026-03-31T11:00:00Z",
  "data": {
    "overall": "DEGRADED",
    "summary": {
      "filesInProcessing": 3,
      "filesStuckInProcessingOver30Min": 1,
      "filesInFailed": 2,
      "filesInQuarantine": 4,
      "filesInCancelled": 1,
      "jobsPaused": 0,
      "jobsPermanentlyFailed": 0,
      "pollerStatus": "HEALTHY",
      "lastSuccessfulPollAt": "2026-03-31T10:59:45Z"
    },
    "stuckFiles": [
      {
        "sftpEventId": 1041,
        "institutionId": "SCOM-002",
        "originalFilename": "SCOM_telecom_2026-03-30.json",
        "processingPath": "/sftp/institutions/SCOM-002/processing/bj-00098_...",
        "stableConfirmedAt": "2026-03-31T09:10:00Z",
        "stuckForMs": 3540000,
        "linkedBatchJobId": "bj-00098",
        "linkedJobStatus": "PROCESSING"
      }
    ],
    "quarantinedFiles": [
      {
        "sftpEventId": 1039,
        "institutionId": "FNB-001",
        "originalFilename": "FNB_bank_2026-03-30_001.csv",
        "errorCode": "ERR_DUPLICATE_FILE",
        "quarantinedAt": "2026-03-30T14:22:00Z"
      }
    ]
  }
}
```

**`overall` values:** `HEALTHY` (no issues), `DEGRADED` (files stuck or quarantined), `CRITICAL` (poller down or multiple stuck files)

---

## API 13 — IR Engine Integration (Outbound)

> **Note:** HCB is the **client** in this interaction. The IR Engine is an external service.

### `POST {hcb.ir-engine.base-url}/ir/v1/cluster-assign`

**Purpose:** Submit a batch of canonical, validated records to the IR Engine for identity cluster assignment. Returns cluster IDs and NEW/EXISTING classification for each record.
**Direction:** HCB → IR Engine (outbound call from `S41_CLST_ASN`)
**Authentication:** Bearer JWT issued by HCB auth server; rotated every `hcb.ir-engine.token-ttl-seconds` seconds
**Max Batch Size:** `hcb.ir-engine.batch-size` (default 1000 records)
**Timeout:** `hcb.ir-engine.timeout-ms` (default 30,000 ms)

#### Request Headers

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer {ir_engine_jwt}` |
| `X-Request-ID` | `{ir_engine_call_uuid}` — unique per call; used by IR Engine for idempotency |
| `X-HCB-Job-ID` | `{batch_job_id}` |
| `X-HCB-Batch-Index` | `{1-based index of this batch in the job}` |
| `Content-Type` | `application/json` |

#### Request Schema

| Field | Type | Required | Validation | Description | Example |
|-------|------|----------|------------|-------------|---------|
| `institutionId` | string | Yes | Non-empty | Submitting institution | `FNB-001` |
| `batchJobId` | string | Yes | UUID | HCB batch job identifier | `bj-00001` |
| `batchIndex` | integer | Yes | >= 1 | Sequential index of this batch | `1` |
| `records` | array | Yes | 1–1000 items | Canonical records for cluster assignment | see below |
| `records[].recordRef` | string | Yes | Non-empty | Unique record reference within job | `rec-0001` |
| `records[].nationalIdHash` | string | Yes | 64 chars (SHA-256 hex) | Hashed national ID | `a3b4c5...` |
| `records[].phoneHash` | string | No | 64 chars if provided | Hashed phone number | `f2e3d4...` |
| `records[].emailHash` | string | No | 64 chars if provided | Hashed email address | `c1b2a3...` |
| `records[].institutionId` | string | Yes | Non-empty | Reporting institution | `FNB-001` |
| `records[].sourceType` | string | Yes | Non-empty | Source data type | `bank` |

#### Example Request

```json
{
  "institutionId": "FNB-001",
  "batchJobId": "bj-00001",
  "batchIndex": 1,
  "records": [
    {
      "recordRef": "rec-0001",
      "nationalIdHash": "a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4",
      "phoneHash": "f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3",
      "emailHash": null,
      "institutionId": "FNB-001",
      "sourceType": "bank"
    }
  ]
}
```

#### Response Schema (200)

| Field | Type | Description |
|-------|------|-------------|
| `batchJobId` | string | Echoed from request |
| `batchIndex` | integer | Echoed from request |
| `processedCount` | integer | Number of records in response |
| `assignments` | array | Cluster assignments |
| `assignments[].recordRef` | string | Matches request `recordRef` |
| `assignments[].clusterId` | string | Assigned cluster (consumer) UUID |
| `assignments[].clusterAction` | `NEW` \| `EXISTING` | NEW = new consumer; EXISTING = matched existing |
| `assignments[].confidence` | number | 0.0–1.0; matching confidence |

#### Example Response

```json
{
  "batchJobId": "bj-00001",
  "batchIndex": 1,
  "processedCount": 1,
  "assignments": [
    {
      "recordRef": "rec-0001",
      "clusterId": "cluster-uuid-001",
      "clusterAction": "EXISTING",
      "confidence": 0.99
    }
  ]
}
```

#### IR Engine Error Codes

| HTTP | Error Code | HCB Behaviour |
|------|-----------|--------------|
| 400 | `INVALID_REQUEST` | Log; mark records as failed; do not retry |
| 401 | `UNAUTHORIZED` | Refresh token; retry once |
| 429 | `RATE_LIMITED` | Back off; retry after `Retry-After` header |
| 500 | `IR_ENGINE_ERROR` | Increment circuit breaker counter; retry up to `max-retries` |
| 503 | `IR_ENGINE_UNAVAILABLE` | Increment circuit breaker counter; if threshold reached → PAUSE job |
| 504 | `IR_ENGINE_TIMEOUT` | Same as 503 |

#### Circuit Breaker Behaviour

```
consecutive_failures = 0

For each IR Engine call:
  IF response is 5xx OR timeout:
    consecutive_failures += 1
  ELSE (success):
    consecutive_failures = 0

IF consecutive_failures >= hcb.ir-engine.circuit-breaker-threshold (default 3):
  circuit_breaker = OPEN
  batch_jobs.ir_engine_response_status = CIRCUIT_OPEN
  batch_jobs.job_status = PAUSED
  Notify Bureau Admin: "IR Engine circuit breaker OPEN for job {id}"
  → Await operator resume after IR Engine health is restored
```

**Idempotency:** Each IR Engine call includes `X-Request-ID`. IR Engine must deduplicate calls with the same `X-Request-ID` within 5 minutes and return the same result without reprocessing.
