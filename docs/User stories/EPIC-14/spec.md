# EPIC-14 — Batch Pipeline (Schemaless SFTP Ingestion) — v2 Implementation Specification

> **Epic Code:** BATCH | **Story Range:** BATCH-US-001–014
> **Owner:** Data Engineering / Platform Engineering | **Priority:** P0
> **Spec Version:** v2 — 2026-05-22
> **Source of Truth:** `HCB_Data_Ingestion_23042026.pptx`
> **Supersedes:** `docs/User stories/EPIC-14-Batch-Pipeline.md` (v1)
> **Status:** Implementation-Ready

---

## 1. Overview

### 1.1 Purpose

The Batch Pipeline is the bulk data ingestion pathway of the HCB credit bureau. Member institutions submit credit data files in any format (CSV, JSON, fixed-width, XML) by placing them in a designated SFTP folder assigned to their institution, or HCB polls the institution's own SFTP server (pull mode). The platform automatically detects the file, identifies its schema via an agentic parsing process, validates records, standardizes data, resolves consumer identities through an external IR Engine, loads data into the bureau database, and posts a full data quality report — without the member needing to conform to any predefined structure.

### 1.2 Scope

**In Scope:**
- SFTP push and pull intake channels (Phase 0)
- S3 staging layer for all downstream processing
- `SftpPollerService` — scheduled SFTP folder watcher
- `AgenticParserService` — AI-driven format detection and record extraction
- `FileFormatDetectorService` — deterministic fallback parser
- All 6 pipeline phases and their stages: `P1_PRE_PROCS → P2_VALIDTION → P3_STANDARZN → P4_IDENT_RES → P5_DATA_LOAD → P6_POST_PROC`
- `BatchJobController` — HTTP API (list, detail, retry, cancel, resume, override-pause, DQR)
- External IR Engine integration (`S41_CLST_ASN`)
- Data Quality Report (DQR) + Data Quality Index (DQI) generation and SFTP/S3 upload
- Full phase/stage/record tracking: `batch_jobs`, `batch_phase_logs`, `batch_stage_logs`, `batch_error_samples`
- `batch_sftp_events`, `batch_tracking_snapshots`, `dqr_results`, `ir_engine_events` tables
- `PAUSED` job state: threshold-triggered pause with operator resume/override
- Retry with exponential backoff (max 3); `PERMANENTLY_FAILED` flag
- Cancel with `/cancelled/` SFTP folder
- SFTP folder lifecycle: `incoming/ → processing/ → processed/ | failed/ | quarantine/ | cancelled/ | archive/`
- Monitoring integration (EPIC-09), Alert Engine (EPIC-10), Dashboard (EPIC-13)

**Out of Scope:**
- Real-time streaming ingestion (EPIC-15)
- Long-term archival to object storage beyond S3 staging (separate archival Epic)
- Sub-second latency guarantees (batch is asynchronous by design)
- Schema registration UI (EPIC-05 Schema Mapper Agent)
- IR Engine internal implementation (external service; HCB only consumes its API)

### 1.3 Business Context

Financial institutions and telecoms generate credit data in heterogeneous formats from their core banking, CRM, and billing systems. Requiring institutions to transform data to a bureau-defined format creates onboarding friction, delays, and ETL maintenance overhead. This pipeline eliminates that friction through schema-agnostic ingestion: once a schema is registered once via the Schema Agent (EPIC-05), all subsequent file submissions are zero-touch for the institution.

### 1.4 Goals / Non-Goals

**Goals:**
- Zero-touch ingestion: institution drops a file; pipeline handles everything end-to-end
- Schema agnosticism: any source format after one-time schema registration
- Full observability: every phase, stage, record, and DQI metric tracked
- Operational resilience: PAUSE/resume semantics, retry with backoff, duplicate prevention
- Data quality accountability: DQR + DQI report delivered to institution after every batch
- Identity accuracy: external IR Engine ensures cross-institution consumer unification

**Non-Goals:**
- The pipeline does not validate schema mappings (that is the Schema Agent's responsibility)
- The pipeline does not manage institution onboarding or SFTP credential provisioning
- The pipeline does not provide real-time record-level status to the institution during processing

### 1.5 Actors

| Actor | Role | System | Interaction |
|-------|------|--------|-------------|
| Member Institution | Data submitter | External | Drops files to SFTP folder; receives DQR and error reports |
| SFTP Poller Service | Internal scheduler | Internal | Watches SFTP folders every 30s; creates batch jobs |
| Agentic Parser Service | AI-driven extractor | Internal / External AI | Detects format and extracts structured records from raw file |
| IR Engine | Identity resolver | External Service | Assigns cluster IDs to canonical records; returns NEW/EXISTING flags |
| Schema Agent | Schema registry manager | Internal (EPIC-05) | Produces approved schema mappings consumed by S14_SCHM_LKP |
| Data Operator | Threshold responder | Internal | Receives PAUSE notifications; decides resume or override |
| Bureau Administrator | Pipeline administrator | Internal | Retries, cancels, force-overrides paused jobs |
| Operations Engineer | Monitoring responder | Internal | Monitors KPI dashboards; investigates failures |
| Notification Service | Alert dispatcher | Internal | Sends email/webhook/dashboard alerts to institutions and operators |

### 1.6 Dependencies

| Dependency | Component | Integration Point | EPIC |
|-----------|-----------|------------------|------|
| Schema Mapper Registry | `schema_mapper_registry`, `schema_mapper_mapping`, `mapping_pairs` | `S14_SCHM_LKP` reads approved mappings | EPIC-05 |
| IR Engine | External REST API | `S41_CLST_ASN` makes outbound calls | — |
| Alert Engine | Alert threshold evaluation | PAUSE/FAIL events emit alerts | EPIC-10 |
| Monitoring Dashboard | KPI queries | `batch_tracking_snapshots`, `batch_jobs` | EPIC-09 |
| Command Center | Execution console | `GET /batch-jobs/:id/detail` | EPIC-13 |
| S3 / Object Storage | File staging and report delivery | File upload after stability check | Infrastructure |
| Notification Service | Email / Webhook / Dashboard | `S63_NOTIF_TR` | Internal |

### 1.7 Assumptions

1. Each active `is_data_submitter = true` institution has a provisioned SFTP folder tree before the pipeline runs.
2. Each institution has at least one approved schema mapping in `schema_mapper_registry` before files are submitted.
3. The IR Engine is a separate, independently deployed service; HCB treats it as a black box with a defined API contract.
4. S3 bucket `hcb-batch-staging` exists with appropriate IAM policies scoped per institution prefix.
5. The agentic parser is available as a callable service (REST endpoint or embedded model); if unavailable, the deterministic fallback always applies.
6. `reporting_period` is derivable from the file metadata or filename pattern; if not, it defaults to the submission date.
7. SQLite is the development database; PostgreSQL is the production database. All DDL and query logic must be compatible with both.
8. Batch jobs for the same `institution_id` run serially (no concurrent execution per institution) to prevent identity cluster split during P4.

---

## 2. Architecture

### 2.1 Intake Channels

```
PUSH Mode (default):
  Institution → uploads file → Bureau-hosted SFTP → SftpPollerService detects

PULL Mode (hcb.sftp.intake-mode = PULL):
  SftpPollerService → connects to Institution-hosted SFTP → downloads file → Bureau S3 staging
  Config: institution.sftp_config_json contains { "pullSftpHost", "pullSftpPort", "pullSftpUser",
           "pullSftpKeyRef", "pullSftpRemotePath" }
```

Both modes converge at the S3 staging step: regardless of intake channel, the file lands in `s3://hcb-batch-staging/{institution_id}/{job_uuid}/raw/{filename}` before any downstream processing stage begins.

### 2.2 Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| `SftpPollerService` | Schedule-driven SFTP scanner; file stability check; SHA-256 checksum; duplicate detection; S3 upload; `batch_sftp_events` + `batch_jobs` creation |
| `AgenticParserService` | AI-driven format detection and record extraction; returns structured record array + format metadata |
| `FileFormatDetectorService` | Deterministic fallback: extension check → content probe → delimiter heuristic → fixed-width |
| `SchemaLookupService` | Resolves `profile_id` + `institution_id` + `source_type` to approved `mapping_id` + `mapping_pairs`; returns PII classification map |
| `ValidationEngine` | Applies `validation_rules` per record; computes failure rates; triggers PAUSE at threshold |
| `StandardizationEngine` | Schema conversion, business transformation, enum normalization, L2 cross-field validation |
| `IrEngineClient` | Outbound REST client for IR Engine; manages batching, circuit breaker, retry, response mapping |
| `DataLoadService` | Upserts consumers/trend/analytics/credit_profiles; inserts tradelines; idempotent conflict handling |
| `PostProcessingService` | Error report generation; DQS/DQR/DQI computation; SFTP + S3 report upload; notification dispatch |
| `BatchJobController` | REST API: list, detail, retry, cancel, resume, override-pause, DQR |

### 2.3 System Interaction Diagram

```
Institution
  │
  │ (PUSH) drops file to SFTP /incoming/
  │ (PULL) SftpPollerService downloads from institution SFTP
  ▼
SftpPollerService
  │ file stability check → SHA-256 → duplicate check
  │ DB writes first, then file move
  ▼
S3 Staging Bucket
  │ s3://hcb-batch-staging/{institution_id}/{job_uuid}/raw/
  ▼
P1_PRE_PROCS
  ├── S11_BTCH_CRE    → batch_jobs (QUEUED)
  ├── S12_FILE_INT    → checksum, integrity, idempotency check
  ├── S13_REC_PARS    → AgenticParserService → structured records
  │                      (fallback: FileFormatDetectorService)
  └── S14_SCHM_LKP   → SchemaLookupService → mapping_id, profile_id, PII map
             │
             ▼
P2_VALIDTION
  ├── S21_MAND_CHK   → mandatory field presence
  ├── S22_L1_VALID   → field-level format/regex/type rules
  └── S23_DUPE_CHK   → intra-batch duplicate check
             │
    failure_rate >= 30%? → PAUSED → notify Data Operator
             │ (< 30% or operator resumes)
             ▼
P3_STANDARZN
  ├── S31_SCHM_CNV   → map source → canonical (locked mapping version)
  ├── S32_BIZ_XFRM   → type cast, date norm, enum norm, PII encryption
  └── S33_L2_VALID   → cross-field logical consistency
             │
    combined_failure_rate >= 30%? → PAUSED → notify Data Operator
             │ (< 30% or operator resumes)
             ▼
P4_IDENT_RES
  └── S41_CLST_ASN   → IrEngineClient → POST /ir/v1/cluster-assign
                         → cluster_id, cluster_action: NEW|EXISTING
             │
    IR Engine unavailable? → circuit breaker → PAUSED
             ▼
P5_DATA_LOAD
  └── S51_DATA_LOD   → UPSERT consumers
                     → INSERT tradelines
                     → INSERT trend_records
                     → UPSERT analytics_records
                     → UPDATE credit_profiles
             ▼
P6_POST_PROC
  ├── S61_ERR_REPT   → error report JSON → SFTP + S3 + internal URL
  ├── S62_DQ_REPRT   → DQS formula → DQR JSON → DQI score → SFTP + S3
  └── S63_NOTIF_TR   → email + webhook + dashboard → institution + operators
             │
  File lifecycle: processing/ → processed/ | failed/ | cancelled/
  batch_tracking_snapshots (JOB_COMPLETE | JOB_FAILED | JOB_PARTIAL | JOB_PAUSED)
```

### 2.4 SFTP Folder Architecture

Each active `is_data_submitter = true` institution with `institution_lifecycle_status = 'active'` gets an isolated folder tree:

```
/sftp/
  institutions/
    {institution_id}/
      incoming/      ← institution drops files here (PUSH mode)
      processing/    ← file moved here when picked up (marker only; actual data in S3)
      processed/     ← file moved here after successful pipeline
        {job_uuid}/  ← DQR and error report uploaded here by S62/S61
      failed/        ← file moved here after pipeline FAIL
      quarantine/    ← file moved here for format/schema rejections
      cancelled/     ← file moved here when job is cancelled (NEW — PPT slide 11)
      archive/       ← files moved here after 30-day retention (configurable)
```

> **Note on S3 vs SFTP processing:** The `processing/` folder now serves as a lifecycle marker only. The actual file used for parsing is `batch_jobs.s3_staging_path`. This ensures SFTP folder access during processing does not create read/write contention.

---

## 3. End-to-End Flow

### Phase 0 — File Submission (Pre-Pipeline)

**Trigger:** Institution uploads file to `/sftp/institutions/{id}/incoming/` (PUSH) or SftpPollerService scheduled scan (PULL)
**Source:** Institution system or institution-hosted SFTP server
**Action:** File placed in incoming folder; poller detects on next cycle (every 30s, configurable)

| Step | Action | Business Rule | Failure Handling |
|------|--------|--------------|-----------------|
| P0-1 | PUSH: Institution places file in `/incoming/` | Files accepted with any name; naming convention recommended but not enforced | None required from institution |
| P0-2 | PULL: `SftpPollerService` connects to institution SFTP (`sftp_config_json.pullSftpHost`) | Only when `intake_mode = PULL` for the institution | If connection fails: log `ERR_PULL_SFTP_CONNECT_FAILED`, emit alert, skip institution in this poll cycle |
| P0-3 | Poller detects file; enforces max file size (`hcb.sftp.max-file-size-bytes`, default 500 MB) | IF size > max → quarantine; no `batch_jobs` created | `batch_sftp_events` INSERT (`QUARANTINED`, `error_code = ERR_FILE_TOO_LARGE`) |
| P0-4 | File stability check: size stable across 2 consecutive polls OR `.done` marker file present | Prevents reading partially uploaded files | If unstable: wait next poll cycle; log at TRACE level |

---

### Phase 1 — PRE-PROCESSING (P1_PRE_PROCS)

**Trigger:** File is stable in `/incoming/`
**Outcome:** File staged in S3; schema resolved; `batch_jobs` row created in QUEUED status

#### S11_BTCH_CRE — Batch Creation

| Attribute | Value |
|-----------|-------|
| Trigger | Stable file detected |
| Action | INSERT `batch_jobs` (status=`QUEUED`, intake_channel=`SFTP`, institution_id, original_filename, intake_mode) |
| Business Rule | Institution must have `institution_lifecycle_status = 'active'` AND `is_data_submitter = true`. If not: INSERT `batch_sftp_events` (`FAILED`, `ERR_INSTITUTION_NOT_ACTIVE`), move file to `/failed/`, no batch_jobs created. |
| Output | `batch_job_id` (UUID), `correlation_id` (UUID), `submitted_at` timestamp |
| State Transition | → `QUEUED` |
| Failure Handling | Institution inactive: fail immediately; do not create `batch_jobs` |

> **DB-first protocol:** `batch_sftp_events` INSERT (DETECTED) → `batch_jobs` INSERT (QUEUED) → file move: `incoming/ → processing/` → `batch_sftp_events` UPDATE (QUEUED). This ordering prevents stranded files if the process crashes between steps.

#### S12_FILE_INT — File Integrity

| Attribute | Value |
|-----------|-------|
| Trigger | `batch_jobs` row created |
| Action | (1) Compute SHA-256 checksum; (2) validate encoding (UTF-8; BOM stripped); (3) validate readability (at least 1 parseable byte); (4) idempotency checks; (5) upload file to S3 staging |
| Business Rule — Structural | IF file is unreadable, truncated, or encoding is invalid → `FAIL_JOB` immediately (no partial processing). No records proceed. |
| Business Rule — Duplicate | Primary: IF `checksum_sha256` matches any `batch_sftp_events` row for same `institution_id` in last `hcb.sftp.duplicate-window-hours` (default 24h) WHERE `event_status IN (QUEUED, PROCESSING, PROCESSED, FAILED)` → QUARANTINE. Soft duplicate: IF `(original_filename, institution_id, reporting_period_hint)` matches a previously completed job → log `WARN_SOFT_DUPLICATE`, proceed. |
| Business Rule — S3 Upload | After successful integrity check: upload to `s3://hcb-batch-staging/{institution_id}/{job_uuid}/raw/{original_filename}`. Update `batch_jobs.s3_staging_path`. |
| Output | `checksum_sha256`, `file_size_bytes`, `s3_staging_path` stored on `batch_jobs` and `batch_sftp_events` |
| State Transition | On success: file moved `incoming/ → processing/` (marker) |
| Failure — Structural | `batch_jobs.job_status = FAILED`, `failure_reason = ERR_FILE_STRUCTURAL_INVALID`; file moved to `/failed/`; P6_POST_PROC runs |
| Failure — Duplicate | `batch_sftp_events.event_status = QUARANTINED`, `is_duplicate = 1`; file moved to `/quarantine/`; pipeline halted |

#### S13_REC_PARS — Record Parsing

| Attribute | Value |
|-----------|-------|
| Trigger | S12_FILE_INT successful; `s3_staging_path` available |
| Action | Read file from S3 staging path. Call `AgenticParserService` to detect format and extract structured records. |
| Agentic Parser Contract | POST `{hcb.parser.agentic-base-url}/parse` with `{ s3Path, institutionId, jobId }`. Response: `{ format, detectionMethod: AGENTIC, detectionConfidence, records: [...], metadata: { delimiter, headerRow, columnCount, recordCount } }`. Timeout: `hcb.parser.agentic-timeout-ms` (default 60s). |
| Fallback | If agentic parser times out or returns error: use `FileFormatDetectorService`. Log `parserType = DETERMINISTIC` in stage metadata. |
| Format Probe (deterministic fallback) | Read first 4 KB. JSON bracket check → XML declaration check → delimiter frequency heuristic → fixed-width layout from registry metadata. |
| Business Rule — Unknown Format | IF format cannot be determined by either parser: `QUARANTINE` file; `ERR_UNSUPPORTED_FORMAT`; halt pipeline. |
| Business Rule — Structural | Malformed lines in JSONL → error sample logged; line skipped. Parse errors > 50% of lines → `FAIL_JOB` with `ERR_PARSE_FAILURE_THRESHOLD`. |
| Output | Structured record array written to `s3://hcb-batch-staging/{id}/{uuid}/parsed/records.json`. `detected_format`, `format_detection_method`, `total_records` stored on `batch_jobs`. |
| Logging | `batch_stage_logs` `S13_REC_PARS` metadata: `{ parserType, agenticModelVersion, detectionConfidence, parseLatencyMs, format, delimiter, headerRow, columnCount, recordCount }` |

**Supported Formats:**

| Format | Detection | Extensions | Notes |
|--------|-----------|------------|-------|
| CSV | Delimiter frequency in first 10 rows | `.csv`, `.txt`, `.tsv` | Auto-detect: comma, pipe, tab, semicolon |
| JSON Array | `[{...}]` top-level | `.json` | Nested objects up to 5 levels (dot-notation) |
| JSON Lines (JSONL) | One JSON object per line | `.jsonl`, `.ndjson` | Malformed lines → error sample, line skipped |
| Fixed-Width | No delimiters; layout from `schema_mapper_registry.metadata_json` | `.txt`, `.dat`, `.fix` | `fixedWidthLayout` array required in registry |
| XML | `<?xml` or `<root>` envelope | `.xml` | SAX streaming; record element from `xmlRecordElement` |

#### S14_SCHM_LKP — Schema Lookup

| Attribute | Value |
|-----------|-------|
| Trigger | S13_REC_PARS successful; records in S3 |
| Action | Resolve `profile_id`, `mapping_id`, `mapping_version`, and PII classification map for this institution and detected format/sourceType |
| Detection Strategy (priority order) | **1 — Explicit:** sourceType present in `batch_jobs` or SFTP directory. **2 — Filename Hint:** match filename against `institution.sftp_config_json.filenamePatterns`. **3 — Header Match:** Jaccard similarity ≥ 0.60 (configurable) between file headers and `mapping_pairs.source_field_path` set. **4 — Fallback:** Institution has exactly one approved mapping. |
| Business Rule — Not Found | IF no strategy succeeds → `QUARANTINE`; `ERR_SCHEMA_NOT_REGISTERED`; file moved to `/quarantine/`; halt pipeline |
| Business Rule — Low Confidence | IF detection method = `HEADER_MATCH` AND confidence 0.60–0.75 → proceed; log `WARNING` in `batch_error_samples` (`error_type = SCHEMA_DETECTION`, `severity = WARNING`) |
| Business Rule — PII | Retrieve `mapping_pairs.pii_classification` for all fields. Store as `batch_jobs.pii_map_json`. This map is consumed by `S32_BIZ_XFRM` for encryption. |
| Output | `schema_registry_id`, `mapping_id`, `mapping_version`, `profile_id`, `schema_detection_method`, `schema_detection_confidence`, `pii_map_json` stored on `batch_jobs` |
| State Transition | `batch_jobs.job_status = PROCESSING`; `batch_jobs.started_at` set |

**Schema lookup SQL:**
```sql
SELECT sr.registry_id, sr.source_type, sr.profile_id,
       sm.mapping_id, sm.payload AS mapping_payload, sm.version
FROM schema_mapper_registry sr
JOIN schema_mapper_mapping sm ON sm.mapping_id = sr.mapping_id
WHERE sr.institution_id = :institutionId
  AND sr.source_type = :sourceType
  AND sr.schema_status = 'active'
  AND JSON_EXTRACT(sm.payload, '$.status') = 'approved'
ORDER BY sm.version DESC
LIMIT 1;
```

---

### Phase 2 — VALIDATION (P2_VALIDTION)

**Trigger:** P1_PRE_PROCS complete; records available in S3 parsed path
**Outcome:** Records classified as passed / failed / flagged; threshold gate evaluated

#### S21_MAND_CHK — Mandatory Check

| Attribute | Value |
|-----------|-------|
| Action | Validate required field presence on every record |
| Business Rule | Mandatory fields defined in `validation_rules` where `rule_type = 'MANDATORY'`. IF mandatory field missing → `CRITICAL` failure; record marked failed. |
| Output | Per-record pass/fail; `batch_error_samples` row per failed record (`error_type = MANDATORY`, `severity = CRITICAL`, `error_code = VALIDATION_MANDATORY_FIELD_MISSING`) |

#### S22_L1_VALID — L1 Field Validation

| Attribute | Value |
|-----------|-------|
| Action | Apply active `validation_rules` (format, regex, type) to each field value on each record |
| Business Rule — CRITICAL | Mark record as failed; add to `batch_error_samples`; exclude from downstream |
| Business Rule — WARNING | Mark record as flagged; add to `batch_error_samples` with `severity = WARNING`; record proceeds |
| Business Rule — INFO | Log only; record proceeds |
| Output | `batch_stage_logs` `S22_L1_VALID`; error samples (max 100 total per job across all stages) |

#### S23_DUPE_CHK — Duplicate Check

| Attribute | Value |
|-----------|-------|
| Action | Detect intra-batch duplicate records: same `account_number` + `reporting_period` within this batch |
| Business Rule | Duplicate record → `CRITICAL` failure; added to `batch_error_samples` (`error_code = VALIDATION_DUPLICATE_RECORD`) |
| Note | S23_DUPE_CHK is a canonical P2 stage. Its omission from the PPT high-level diagram (slide 3 column headers) is a presentation artefact — the slide 6 validation description explicitly includes duplicate checking. |

#### P2 Threshold Gate

```
failure_rate = failed_records / total_records

IF failure_rate >= FAILURE_THRESHOLD (default 0.30):
  → batch_jobs.job_status = PAUSED
  → batch_jobs.paused_at = NOW()
  → batch_jobs.paused_reason = 'P2_VALIDATION_THRESHOLD_EXCEEDED'
  → batch_phase_logs PHASE_02: phase_status = 'paused'
  → batch_tracking_snapshots INSERT (snapshot_type = JOB_PAUSED)
  → Notify Data Operator: "Batch {job_id} paused — validation failure rate {rate}% exceeds {threshold}%"
  → Await operator action: RESUME or OVERRIDE_PAUSE

IF failure_rate < FAILURE_THRESHOLD:
  → Proceed to P3_STANDARZN with valid records
  → batch_jobs.job_status = PROCESSING (no status change)
  → IF failure_rate > 0: batch_jobs.job_status will become PARTIALLY_COMPLETED at completion
```

> **FAILURE_THRESHOLD** is configurable per institution in `api_access_json` as decimal ratio (e.g., `0.30` = 30%). System default: `0.30`.

---

### Phase 3 — DATA STANDARDIZATION (P3_STANDARZN)

**Trigger:** P2_VALIDTION complete and gate passed (or operator resume/override)
**Outcome:** All records in canonical schema with typed values; L2 validated; drift assessed

#### S31_SCHM_CNV — Schema Conversion

| Attribute | Value |
|-----------|-------|
| Action | Map each source field → canonical field using `mapping_pairs` (pinned to `mapping_version` locked at S14_SCHM_LKP) |
| Business Rule — Mapping Version Lock | `batch_jobs.mapping_version` is fixed at S14_SCHM_LKP time. S31_SCHM_CNV MUST use this pinned version. Schema changes after intake do not affect in-flight jobs. |
| Business Rule — Unmapped Fields | Per `UnmappedAction` config: `DROP` (silent), `FLAG` (keep with `unmapped_` prefix + warning), `FAIL` (reject record) |
| Business Rule — Drift Detection | IF `unmapped_field_count / total_fields > hcb.batch.drift-threshold` (default 0.20): INSERT `ingestion_drift_alerts`; SET `batch_jobs.drift_alert_triggered = 1`; notify Data Operator |
| Output | `batch_jobs.mapping_coverage_percent`, `unmapped_field_paths_json`; stage log with `stage_metadata_json` |

**Mapping query:**
```sql
SELECT mp.source_field_path, mp.canonical_field_code, mp.enum_reconciliation_json, mp.pii_classification
FROM mapping_pairs mp
WHERE mp.schema_mapper_mapping_id = :mappingId
  AND mp.is_approved = 1;
```

#### S32_BIZ_XFRM — Business Transformation

| Attribute | Value |
|-----------|-------|
| Action | Apply domain-specific transformations to all records |
| Transformations | (1) Type casting: String → native DB type (decimal, integer, date). (2) Date normalization: any format → ISO 8601. (3) String trimming: leading/trailing whitespace removed. (4) Null standardization: empty string → NULL. (5) Enum normalization: apply `enum_reconciliation_json` per field; map institution-specific values → canonical bureau enum values. (6) PII encryption: for each field where `pii_classification = 'PII'`, apply AES-256 encryption (key from `hcb.security.pii-encryption-key`); store encrypted value; original value must not persist in any log. |
| Business Rule — PII | PII fields are identified from `batch_jobs.pii_map_json` (populated at S14_SCHM_LKP). PII values MUST NOT appear in `batch_error_samples.field_value`, `batch_stage_logs.stage_metadata_json`, or any log output. Mask with `[REDACTED]` in all log contexts. |

#### S33_L2_VALID — Cross-Field Validation

| Attribute | Value |
|-----------|-------|
| Action | Apply logical consistency rules across canonically typed canonical fields |
| Examples | `outstanding_balance ≤ loan_amount` (decimal comparison). `dpd_days ≥ 0` (integer). `repayment_date ≥ disbursement_date` (ISO 8601 date). `credit_limit ≥ 0`. |
| Business Rule — CRITICAL | Cross-field failure → record marked failed; `batch_error_samples` (`error_type = CROSS_FIELD`, `error_code = VALIDATION_L2_CROSS_FIELD_FAILED`, `severity = CRITICAL`) |
| Output | `batch_phase_logs` `P3_STANDARZN` updated with L2 failure counts |

#### P3 Threshold Gate

```
combined_failure_rate = (p2_failed_records + l2_failed_records) / total_records

IF combined_failure_rate >= FAILURE_THRESHOLD:
  → batch_jobs.job_status = PAUSED
  → batch_jobs.paused_reason = 'P3_STANDARDIZATION_THRESHOLD_EXCEEDED'
  → Notify Data Operator
  → Await operator action

IF combined_failure_rate < FAILURE_THRESHOLD:
  → Proceed to P4_IDENT_RES with valid records
```

---

### Phase 4 — IDENTITY RESOLUTION (P4_IDENT_RES)

**Trigger:** P3_STANDARZN complete; valid canonical records available
**Outcome:** Each record assigned a `cluster_id` with `cluster_action = NEW | EXISTING`

#### S41_CLST_ASN — Cluster Assignment

| Attribute | Value |
|-----------|-------|
| Action | Send canonicalized records (in batches of `hcb.ir-engine.batch-size`, default 1000) to IR Engine. Receive cluster assignments. |
| IR Engine Request | `POST {hcb.ir-engine.base-url}/ir/v1/cluster-assign` — see API section for full contract |
| IR Engine Response | Array of `{ recordRef, clusterId, clusterAction: NEW\|EXISTING, confidence }` |
| Business Rule — Concurrency | Batch jobs for the same `institution_id` run serially. A new job waits in `QUEUED` status if another job for the same institution is in `PROCESSING`. |
| Business Rule — Circuit Breaker | IF IR Engine returns 5xx OR connection timeout exceeds `hcb.ir-engine.timeout-ms` (default 30s) AND consecutive failures ≥ `hcb.ir-engine.circuit-breaker-threshold` (default 3): open circuit breaker; `batch_jobs.ir_engine_response_status = CIRCUIT_OPEN`; transition job to `PAUSED`; notify Bureau Administrator. |
| Business Rule — Partial Response | IF IR Engine returns partial results (some records missing): re-request missing records up to `hcb.ir-engine.max-retries` (default 2). If still missing: mark those records as failed with `ERR_IR_ENGINE_NO_ASSIGNMENT`. |
| Output | `batch_jobs.ir_engine_request_id`, `new_consumers_created`, `existing_consumers_updated`; `ir_engine_events` row per call |
| Logging | `batch_stage_logs` `S41_CLST_ASN`: `{ irEngineCallCount, totalRecordsSent, totalRecordsReceived, newClusters, existingClusters, latencyMs }` |

---

### Phase 5 — DATA LOAD (P5_DATA_LOAD)

**Trigger:** P4_IDENT_RES complete; all valid records have `cluster_id` assigned
**Outcome:** Data durably stored in bureau database

#### S51_DATA_LOD — Data Load

| Attribute | Value |
|-----------|-------|
| Action | For each valid record with `cluster_id`: (1) UPSERT `consumers`; (2) INSERT `credit_profiles` if new cluster; (3) INSERT `tradelines`; (4) INSERT `trend_records`; (5) UPSERT `analytics_records`; (6) UPDATE `credit_profiles` summary fields |
| Business Rule — Load Order | Consumers MUST be upserted before tradelines (FK constraint). Trend and analytics records may be loaded in parallel after consumer upsert. |
| Business Rule — Idempotency | On tradeline conflict (`account_number + reporting_period + reporting_institution_id`): UPDATE if incoming `reporting_period` is newer; otherwise SKIP. This makes the load safe for retry without data duplication. |
| Business Rule — Chunking | Records loaded in chunks of `hcb.batch.load-chunk-size` (default 500). Each chunk committed independently. |
| Business Rule — Cancel During P5 | IF cancel signal received between chunks: stop after current chunk completes. Committed chunks are NOT rolled back (idempotent UPSERT provides safety on resubmission). Remaining records not loaded. Job enters `CANCELLED` status. |
| Output | `batch_jobs.tradelines_inserted`, `new_consumers_created`, `existing_consumers_updated`, `processed_records`, `failed_records`; valid records written to `s3://hcb-batch-staging/{id}/{uuid}/valid/records.json`; error records written to `s3://hcb-batch-staging/{id}/{uuid}/errors/records.json` |

**Load sequence SQL (consumers):**
```sql
INSERT INTO consumers (consumer_id, national_id_hash, phone_hash, email_hash, reporting_institution_id)
VALUES (:clusterId, :nationalIdHash, :phoneHash, :emailHash, :institutionId)
ON CONFLICT(national_id_hash) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;
```

**Load sequence SQL (tradelines):**
```sql
INSERT INTO tradelines (consumer_id, account_number, facility_type,
  loan_amount, outstanding_balance, dpd_days, reporting_period,
  reporting_institution_id, batch_job_id, source_type, correlation_id,
  additional_metadata_json)
VALUES (:consumerId, :accountNumber, :facilityType, :loanAmount,
        :outstandingBalance, :dpdDays, :reportingPeriod,
        :institutionId, :batchJobId, :sourceType, :correlationId, :metadata)
ON CONFLICT(account_number, reporting_period, reporting_institution_id)
  DO UPDATE SET
    outstanding_balance = EXCLUDED.outstanding_balance,
    dpd_days = EXCLUDED.dpd_days,
    updated_at = CURRENT_TIMESTAMP
  WHERE EXCLUDED.reporting_period > tradelines.reporting_period;
```

---

### Phase 6 — POST-PROCESSING (P6_POST_PROC)

**Trigger:** P5_DATA_LOAD complete (or any terminal state: FAILED, PAUSED-terminal, CANCELLED)
**Outcome:** Audit artifacts generated; institution notified; SFTP file lifecycle finalized

> P6_POST_PROC executes regardless of pipeline outcome: COMPLETED, FAILED, PARTIALLY_COMPLETED, CANCELLED, PAUSED.

#### S61_ERR_REPT — Error Report

| Attribute | Value |
|-----------|-------|
| Action | Query all `batch_error_samples` for this `batch_job_id`. Classify errors: Structural, Validation (L1/L2), Business Rule, Transformation, Ingestion. Generate structured JSON report. |
| Delivery | (1) Upload to SFTP: `/sftp/institutions/{id}/processed/{job_uuid}/run_{retry_count}/errors.json`. (2) Upload to S3: `s3://hcb-batch-staging/{id}/{uuid}/errors/error_report.json`. (3) Store pre-signed S3 URL on `batch_jobs.error_report_url`. |
| Business Rule | If no errors: generate empty report with `{ "totalErrors": 0, "message": "No errors recorded" }`. Still upload for auditability. |

#### S62_DQ_REPRT — Data Quality Report

| Attribute | Value |
|-----------|-------|
| Action | Compute Data Quality Score (DQS), generate Data Quality Report (DQR), compute Data Quality Index (DQI 0–100) |

**DQS Formula:**
```
component_scores:
  missing_fields_ratio    = mandatory_failed_count / total_records        (weight: 0.30)
  invalid_format_ratio    = l1_format_failed_count / total_records        (weight: 0.30)
  duplicate_ratio         = duplicate_failed_count / total_records        (weight: 0.20)
  schema_drift_ratio      = unmapped_field_count / total_field_count      (weight: 0.20)
  -- total_field_count = total_records * fields_per_record (canonical field count per record)

raw_dqs = Σ(component_score_i * weight_i)
  = (missing_fields_ratio * 0.30) + (invalid_format_ratio * 0.30)
  + (duplicate_ratio * 0.20) + (schema_drift_ratio * 0.20)

DQI = (1 - raw_dqs) * 100    [clamped to 0–100]
```

> DQI of 100 = perfect quality; DQI of 0 = total failure on all components.

| Attribute | Value |
|-----------|-------|
| Output — DQR | JSON containing: `{ dqi, raw_dqs, components: { missing_fields, invalid_format, duplicates, schema_drift }, validation_failure_rate, mapping_coverage_percent, l1_failure_breakdown_by_field, l2_failure_breakdown, processing_summary: { total, processed, failed, tradelines_inserted, new_consumers, existing_consumers } }` |
| Delivery | (1) Upload DQR to SFTP: `/sftp/institutions/{id}/processed/{job_uuid}/run_{retry_count}/dqr.json`. (2) Upload DQR to S3: `s3://hcb-batch-staging/{id}/{uuid}/dqr/dqr.json`. (3) Store `dqi_score` and `dqr_url` on `batch_jobs` and INSERT into `dqr_results`. |
| Snapshot | INSERT `batch_tracking_snapshots` (`JOB_COMPLETE` | `JOB_FAILED` | `JOB_PARTIAL` | `JOB_PAUSED`) with all KPI counters and timing data. |

#### S63_NOTIF_TR — Notification Trigger

| Attribute | Value |
|-----------|-------|
| Action | Determine outcome template; dispatch notifications to institution and operators |
| Templates | `SUCCESS`, `PARTIAL_SUCCESS`, `FAILED`, `QUARANTINED`, `PAUSED`, `CANCELLED`, `PERMANENTLY_FAILED` |
| Notification Content | `{ job_id, outcome, processed_count, failed_count, dqi_score, error_report_url, dqr_url, processing_duration_ms }` |
| Channels | (1) Email (institution contact from `institutions.contact_email`). (2) Webhook (institution's `notification_webhook_url` from `api_access_json`). (3) Dashboard alert (EPIC-13). |
| Per-Channel Status | `batch_jobs.notification_channels_json`: `{ "email": "SENT", "webhook": "FAILED", "dashboard": "SENT" }` |
| Business Rule | Notification failure on one channel does NOT affect job status. `batch_jobs.notification_status = PARTIAL` if some channels succeed and some fail; `FAILED` if all fail; `SENT` if all succeed. |
| SFTP File Lifecycle | IF success or partial: move `processing/` → `processed/`. IF failed: move `processing/` → `failed/`. IF cancelled: move `processing/` → `cancelled/`. UPDATE `batch_sftp_events.event_status` accordingly. |

---

## 4. User / System Journeys

### Journey A — SFTP Happy Path

```
Institution drops FNB_bank_2026-03-31.csv to /sftp/institutions/1/incoming/
  → SftpPollerService detects file (next 30s cycle)
  → File size stable (2 consecutive polls)
  → SHA-256 computed: a3f2c...
  → No duplicate in batch_sftp_events (last 24h)
  → batch_sftp_events INSERT (DETECTED)
  → S3 upload: s3://hcb-batch-staging/1/{uuid}/raw/FNB_bank_2026-03-31.csv
  → batch_jobs INSERT (QUEUED, intake_channel=SFTP, s3_staging_path set)

P1_PRE_PROCS:
  S11_BTCH_CRE: Institution active, is_data_submitter=true ✓
  S12_FILE_INT: UTF-8, readable, no integrity issues ✓
  S13_REC_PARS: AgenticParserService → CSV, delimiter=comma, 5000 records parsed
               → records.json to S3 parsed path
  S14_SCHM_LKP: EXPLICIT (sourceType=bank) → MAP-FNB-BANK-v3, profile_id=PROF-001
              → PII map: { national_id: PII, phone_number: PII, email: PII }
              → batch_jobs.job_status = PROCESSING

P2_VALIDTION:
  S21_MAND_CHK: 5000 records → 0 mandatory failures
  S22_L1_VALID: 5000 records → 20 field-level format failures
  S23_DUPE_CHK: 4980 records → 0 intra-batch duplicates
  failure_rate = 20/5000 = 0.40% (< 30%) → proceed

P3_STANDARZN:
  S31_SCHM_CNV: 4980 records mapped, coverage 91.7%, unmapped_ratio 8.3% < 20% → no drift alert
  S32_BIZ_XFRM: enum values normalized; PII fields encrypted
  S33_L2_VALID: 4980 → 3 cross-field failures → 4977 pass
  combined_failure_rate = 23/5000 = 0.46% (< 30%) → proceed

P4_IDENT_RES:
  S41_CLST_ASN: IR Engine call → 312 NEW, 4665 EXISTING

P5_DATA_LOAD:
  S51_DATA_LOD: 312 consumer INSERTs, 4665 UPSERTs; 4977 tradelines inserted

P6_POST_PROC:
  S61_ERR_REPT: 23 errors → errors.json uploaded to SFTP + S3
  S62_DQ_REPRT: DQI = (1 - (0/5000*0.30 + 20/5000*0.30 + 0/5000*0.20 + 11.7%*0.20)) * 100 ≈ 96.6
               DQR uploaded to SFTP + S3
  S63_NOTIF_TR: Email + webhook + dashboard → SENT
    File moved: processing/ → processed/
    batch_sftp_events UPDATE (PROCESSED)
    batch_tracking_snapshots INSERT (JOB_COMPLETE)
    batch_jobs.job_status = PARTIALLY_COMPLETED (23 failed records)
```

### Journey B — Schema Auto-Detection (No sourceType Provided)

```
Institution drops report_2026-03.csv (no source type in name)
  → S13_REC_PARS: CSV, headers extracted: ["acct_no","pan_number","mobile","outstanding","dpd"]
  → S14_SCHM_LKP: Strategy 1 (explicit): no sourceType → skip
                  Strategy 2 (filename hint): no pattern match → skip
                  Strategy 3 (header match): Jaccard vs MAP-FNB-BANK-v3 = 0.82 > 0.60 ✓
                  schema_detection_method = HEADER_MATCH, confidence = 0.82
                  → Warning: confidence 0.82 < 0.90; batch_error_samples WARNING
  → Pipeline proceeds through P2 → P6 normally
```

### Journey C — Failure → PAUSE → Operator Resume

```
P2_VALIDTION:
  S22_L1_VALID: 35% records fail L1 checks (above 30% threshold)
  → batch_jobs.job_status = PAUSED
  → batch_jobs.paused_at = NOW()
  → batch_jobs.paused_reason = 'P2_VALIDATION_THRESHOLD_EXCEEDED'
  → Notification to Data Operator: "Job {id} PAUSED — 35% failure rate"

Data Operator investigates via EPIC-09 dashboard and EPIC-13 console:
  → Reviews error samples by field / error code
  → Determines: source data had a formatting change in 2 fields
  → Decides: failed records to be skipped; valid records (65%) to proceed

Data Operator calls: POST /api/v1/batch-jobs/{id}/override-pause
  → { "action": "ADVANCE_WITH_VALID", "reason": "Known source format change; invalid records excluded" }
  → batch_jobs.job_status = PROCESSING
  → batch_jobs.paused_reason appended with override note
  → Pipeline resumes from P3_STANDARZN with 65% valid records

P6_POST_PROC:
  DQI computed on partial dataset
  Institution notified: "PARTIAL_SUCCESS — 65% records processed; 35% excluded (operator override)"
  batch_jobs.job_status = PARTIALLY_COMPLETED
```

### Journey D — Duplicate File Rejection

```
Institution accidentally drops same CSV twice within 24h
  → Second detect: SHA-256 matches existing batch_sftp_events (event_status=PROCESSED)
  → batch_sftp_events INSERT (is_duplicate=1, original_sftp_event_id=X, event_status=QUARANTINED)
  → File moved: incoming/ → quarantine/
  → No batch_jobs created; pipeline not triggered
  → Dashboard alert: DUPLICATE_FILE_REJECTED (LOW severity)
```

### Journey E — Cancel Mid-Pipeline

```
Admin identifies erroneous submission during P3_STANDARZN
  → POST /api/v1/batch-jobs/{id}/cancel
  → System sets cancellation flag
  → Current stage (S32_BIZ_XFRM) completes active record batch
  → No further stages executed
  → Any P5 chunks already committed remain (idempotent UPSERT is recovery)
  → File moved: processing/ → cancelled/
  → batch_sftp_events.event_status = CANCELLED
  → batch_jobs.job_status = CANCELLED, cancelled_at = NOW()
  → P6_POST_PROC runs: generates error report + notification
  → Institution notified: "Batch CANCELLED — {records} records processed before cancellation"
```

### Journey F — Retry with Exponential Backoff → PERMANENTLY_FAILED

```
Job fails during P4_IDENT_RES (IR Engine 500 errors)
  → batch_jobs.job_status = FAILED
  → batch_jobs.retry_count = 0, is_permanently_failed = 0

Operator issues: POST /api/v1/batch-jobs/{id}/retry
  → retry_count = 1; backoff = 30s
  → Pipeline restarts from P4_IDENT_RES (last_successful_phase = P3_STANDARZN)
  → IR Engine still unavailable → FAILED again

Operator issues: POST /api/v1/batch-jobs/{id}/retry
  → retry_count = 2; backoff = 90s
  → FAILED again

Operator issues: POST /api/v1/batch-jobs/{id}/retry
  → retry_count = 3; backoff = 270s
  → FAILED again
  → is_permanently_failed = 1; failure_reason = RETRY_LIMIT_EXCEEDED
  → batch_jobs.job_status = FAILED (permanently)
  → Notification: "Batch PERMANENTLY_FAILED after 3 retry attempts"
  → Further retry calls return 409: ERR_RETRY_LIMIT_EXCEEDED
```

### Journey G — Pull-from-Institution SFTP

```
Institution has intake_mode = PULL configured in institutions.sftp_config_json:
  { "intakeMode": "PULL", "pullSftpHost": "sftp.acme-bank.com",
    "pullSftpPort": 22, "pullSftpUser": "hcb_poller",
    "pullSftpKeyRef": "vault://sftp-keys/acme-bank",
    "pullSftpRemotePath": "/exports/credit_reports/" }

SftpPollerService (next 30s cycle):
  → Connects to sftp.acme-bank.com using key from vault
  → Lists files in /exports/credit_reports/
  → Downloads file to local temp path
  → Proceeds with same flow as PUSH mode from S12_FILE_INT onward
  → S3 staging path: s3://hcb-batch-staging/{id}/{uuid}/raw/{filename}
  → After successful S3 upload: optionally move/rename file on institution SFTP
    (configurable: hcb.sftp.pull-mark-processed = true → rename to .done on institution SFTP)
```

### Journey H — IR Engine Timeout / Circuit Breaker

```
P4_IDENT_RES → S41_CLST_ASN:
  → POST /ir/v1/cluster-assign (batch 1 of 5): response OK
  → POST /ir/v1/cluster-assign (batch 2 of 5): timeout after 30s
  → Retry batch 2 (attempt 1/2): timeout again
  → Retry batch 2 (attempt 2/2): timeout again
  → Circuit breaker threshold reached (3 consecutive failures)
  → ir_engine_response_status = CIRCUIT_OPEN
  → batch_jobs.job_status = PAUSED
  → batch_jobs.paused_reason = 'IR_ENGINE_CIRCUIT_OPEN'
  → Alert: BUREAU_ADMIN level HIGH — IR Engine unavailable
  → Bureau Admin investigates IR Engine health
  → IR Engine restored → Admin calls POST /batch-jobs/{id}/resume
  → Pipeline resumes S41_CLST_ASN from batch 2
```

### Journey I — Schema Drift Detection

```
P3_STANDARZN → S31_SCHM_CNV:
  → 420/5000 records have unmapped field: "debt_restructuring_flag"
  → unmapped_ratio = 420/5000 = 8.4% > configured threshold 5%
  → ingestion_drift_alerts INSERT: { institution_id, source_type, unmapped_field_path: "debt_restructuring_flag", unmapped_ratio: 0.084 }
  → batch_jobs.drift_alert_triggered = 1
  → batch_jobs.unmapped_field_paths_json: ["debt_restructuring_flag"]
  → Notification to Data Operator: "Schema drift detected — 8.4% records have unmapped field 'debt_restructuring_flag'"
  → Pipeline CONTINUES (drift is a warning, not a PAUSE trigger unless UnmappedAction = FAIL)
  → Operations team registers new field in schema_mapper_mapping
```

---

## 5. State Model

### 5.1 Job Status Transitions

| Current Status | Trigger | Condition | Next Status | Failure Path | Retry Allowed |
|---------------|---------|-----------|-------------|-------------|--------------|
| — | File detected, institution active | `is_data_submitter=true`, no duplicate | `QUEUED` | `batch_sftp_events QUARANTINED` (no job) | N/A |
| `QUEUED` | Pipeline scheduler picks up job | No other job for same institution in `PROCESSING` | `PROCESSING` | `QUEUED` (wait) | N/A |
| `PROCESSING` | P2 threshold gate | `failure_rate >= FAILURE_THRESHOLD` | `PAUSED` | — | No |
| `PROCESSING` | P3 combined threshold gate | `combined_failure_rate >= FAILURE_THRESHOLD` | `PAUSED` | — | No |
| `PROCESSING` | IR Engine circuit breaker | `consecutive_ir_failures >= threshold` | `PAUSED` | — | No |
| `PROCESSING` | All phases complete, 0 record failures | — | `COMPLETED` | — | No |
| `PROCESSING` | All phases complete, some record failures | `failure_rate < FAILURE_THRESHOLD` | `PARTIALLY_COMPLETED` | — | No |
| `PROCESSING` | Unrecoverable system error at any phase | Exception not catchable | `FAILED` | P6 runs | Yes |
| `PROCESSING` | Cancel signal received | Between stages | `CANCELLED` | P6 runs | No |
| `PAUSED` | Data Operator calls resume | `is_permanently_failed = 0` | `PROCESSING` | — | No |
| `PAUSED` | Data Operator calls override-pause | `action = ADVANCE_WITH_VALID` | `PROCESSING` | — | No |
| `FAILED` | Operator calls retry | `retry_count < max_retry_count (3)`, `is_permanently_failed = 0` | `QUEUED` | — | Yes |
| `FAILED` | Operator calls retry | `retry_count >= max_retry_count (3)` | `FAILED` (blocked) | `is_permanently_failed = 1` | No |
| `COMPLETED` | — | — | Terminal | — | No |
| `PARTIALLY_COMPLETED` | — | — | Terminal | — | No (future: reprocess failed) |
| `CANCELLED` | — | — | Terminal | — | No |

### 5.2 SFTP Event Status Transitions

| Current | Trigger | Next |
|---------|---------|------|
| `DETECTED` | Stability confirmed | `STABLE` |
| `STABLE` | Duplicate found | `QUARANTINED` |
| `STABLE` | File too large | `QUARANTINED` |
| `STABLE` | Format unknown | `QUARANTINED` |
| `STABLE` | Schema not found | `QUARANTINED` |
| `STABLE` | Institution inactive | `FAILED` |
| `STABLE` | DB write + file move success | `QUEUED` |
| `QUEUED` | Pipeline starts | `PROCESSING` |
| `PROCESSING` | Pipeline success | `PROCESSED` |
| `PROCESSING` | Pipeline failure (terminal) | `FAILED` |
| `PROCESSING` | Job cancelled | `CANCELLED` |
| `PROCESSING` | Job paused (threshold) | `PAUSED` |
| `PAUSED` | Operator resumes | `PROCESSING` |

### 5.3 is_permanently_failed Flag

| Condition | is_permanently_failed | Effect |
|-----------|----------------------|--------|
| `retry_count < max_retry_count` | 0 | Retry allowed |
| `retry_count = max_retry_count` AND job fails | 1 | Retry blocked; API returns 409 |

---

## 6. Business Rules

### BR-01 — Threshold-Triggered Pause
**IF** `(failed_records / total_records) >= FAILURE_THRESHOLD` at end of P2_VALIDTION OR at end of P3_STANDARZN (combined rate)
**THEN** `batch_jobs.job_status = PAUSED`; notify Data Operator; halt pipeline until operator action.

### BR-02 — Operator Resume
**IF** Data Operator calls `POST /batch-jobs/:id/resume`
**AND** `batch_jobs.job_status = PAUSED`
**AND** `is_permanently_failed = 0`
**THEN** `job_status = PROCESSING`; restart pipeline from paused phase.

### BR-03 — Operator Override Pause
**IF** Data Operator calls `POST /batch-jobs/:id/override-pause` with `action = ADVANCE_WITH_VALID`
**THEN** job advances to next phase using only valid records; failed records are permanently excluded;
        `paused_reason` appended with override note and `resumed_by`.

### BR-04 — Retry Backoff Schedule
**IF** `retry_count = 1` **THEN** minimum wait before retry = 30s
**IF** `retry_count = 2` **THEN** minimum wait = 90s
**IF** `retry_count = 3` **THEN** minimum wait = 270s
**IF** `retry_count >= max_retry_count` **THEN** `is_permanently_failed = 1`; retry blocked.

### BR-05 — Retry From Last Successful Phase
**IF** job is retried
**THEN** pipeline restarts from `last_successful_phase + 1`, NOT from P1_PRE_PROCS.
        Phase logs from prior runs are preserved; new logs append with new `retry_attempt` value.

### BR-06 — Cancel Semantics
**IF** cancel called during P1–P4
**THEN** current stage atomic unit completes; no further stages execute; job enters `CANCELLED`.
**IF** cancel called during P5
**THEN** current chunk completes; remaining chunks skipped; job enters `CANCELLED`.
        Already-committed records are NOT rolled back (known limitation — see open-questions.md).

### BR-07 — File Integrity Failure
**IF** file is structurally invalid (truncated, unreadable encoding, zero bytes)
**THEN** `FAIL_JOB` immediately at S12_FILE_INT; no partial processing; P6 runs.

### BR-08 — Duplicate File Detection
**IF** `checksum_sha256` matches an existing `batch_sftp_events` row for the same `institution_id` within `duplicate-window-hours`
**THEN** QUARANTINE file; no `batch_jobs` created; log `ERR_DUPLICATE_FILE`.
**ADDITIONALLY IF** `(original_filename, institution_id)` matches a recent job but checksum differs
**THEN** log `WARN_SOFT_DUPLICATE`; proceed; operators are notified.

### BR-09 — S3 Read During Processing
**IF** a stage requires the raw or parsed file
**THEN** it reads from `batch_jobs.s3_staging_path`; SFTP `processing/` folder is a marker only and must not be read.

### BR-10 — Mapping Version Lock
**IF** S14_SCHM_LKP resolves `mapping_version`
**THEN** that version is stored on `batch_jobs.mapping_version` and ALL subsequent phases (S31, S32, S33) MUST use this exact version, even if a new mapping version is approved after intake.

### BR-11 — PII in Logs
**IF** a field has `pii_classification = 'PII'`
**THEN** its value MUST appear as `[REDACTED]` in all `batch_error_samples.field_value` rows,
        `batch_stage_logs.stage_metadata_json`, application logs, and API responses.

### BR-12 — Serial Execution Per Institution
**IF** a job for institution `X` is in `PROCESSING` status
**THEN** any subsequent job for institution `X` waits in `QUEUED` status until the first completes.

### BR-13 — DQI Computation
**IF** S62_DQ_REPRT executes
**THEN** DQI = `(1 - raw_dqs) * 100`, clamped to [0, 100], where `raw_dqs` = weighted sum of the four component ratios (weights: missing_fields=0.30, invalid_format=0.30, duplicates=0.20, schema_drift=0.20).

### BR-14 — Notification Failure Independence
**IF** one notification channel fails
**THEN** the job status is NOT affected; `notification_status = PARTIAL` is recorded; other channels still attempted.

### BR-15 — IR Engine Batching
**IF** validated canonical records > `hcb.ir-engine.batch-size` (default 1000)
**THEN** IR Engine is called in multiple sequential batches; each batch is fully resolved before the next is sent.

---

## 7. Error Matrix

| Error Code | Cause | HTTP (API) | Action | Retry | Escalation |
|-----------|-------|------------|--------|-------|-----------|
| `ERR_FILE_TOO_LARGE` | File exceeds `max-file-size-bytes` | 400 | Quarantine; no job created | No | Institution |
| `ERR_INSTITUTION_NOT_ACTIVE` | `institution_lifecycle_status != active` | 403 | Move to `/failed/`; no job | No | Bureau Admin |
| `ERR_FILE_STRUCTURAL_INVALID` | Unreadable, truncated, or encoding error | 422 | FAIL_JOB immediately; P6 runs | No | Institution (manual resubmission) |
| `ERR_DUPLICATE_FILE` | SHA-256 matches recent event for same institution | 409 | Quarantine; no job | No | None (info log) |
| `WARN_SOFT_DUPLICATE` | Filename+institution match but checksum differs | — | Proceed; warn operators | No | Ops team review |
| `ERR_UNSUPPORTED_FORMAT` | Neither agentic nor deterministic parser could determine format | 422 | Quarantine; no job | No | Institution |
| `ERR_SCHEMA_NOT_REGISTERED` | No approved mapping for institution+sourceType | 404 | Quarantine; no job | No | Bureau Admin → Schema Agent |
| `ERR_PARSE_FAILURE_THRESHOLD` | >50% lines malformed (JSONL/XML parse errors) | 422 | FAIL_JOB; P6 runs | Yes | Institution |
| `VALIDATION_MANDATORY_FIELD_MISSING` | Required field absent on record | 422 | Record failed (CRITICAL); excluded from P3+ | Record-level | Institution (in DQR) |
| `VALIDATION_L1_FORMAT_FAILED` | Field value fails format/regex/type rule | 422 | Record failed (CRITICAL) or flagged (WARNING) | Record-level | Institution (in DQR) |
| `VALIDATION_DUPLICATE_RECORD` | Intra-batch duplicate (same account_number+period) | — | Record failed (CRITICAL) | Record-level | Institution (in DQR) |
| `VALIDATION_L2_CROSS_FIELD_FAILED` | Cross-field logical inconsistency | — | Record failed (CRITICAL) | Record-level | Institution (in DQR) |
| `ERR_SCHEMA_DRIFT_THRESHOLD` | Unmapped field ratio exceeds drift threshold | — | Insert `ingestion_drift_alerts`; notify Data Operator | No | Schema Agent team |
| `ERR_IR_ENGINE_TIMEOUT` | IR Engine call timed out | 504 (from IR Engine) | Retry up to `max-retries`; circuit breaker | Yes | Bureau Admin |
| `ERR_IR_ENGINE_NO_ASSIGNMENT` | IR Engine returned no cluster_id for record | — | Record marked failed | Record-level | IR Engine team |
| `ERR_IR_ENGINE_CIRCUIT_OPEN` | Circuit breaker triggered on IR Engine | 503 | PAUSE job; notify Bureau Admin | Yes (after resume) | Bureau Admin |
| `ERR_S3_UPLOAD_FAILED` | S3 staging upload failed | 503 | FAIL_JOB at S12_FILE_INT; retry file from SFTP | Yes | Ops Engineer |
| `ERR_NOTIFICATION_FAILED` | All notification channels failed | — | Log; `notification_status = FAILED`; job status unaffected | No | Ops Engineer |
| `ERR_RETRY_LIMIT_EXCEEDED` | `is_permanently_failed = 1`; retry blocked | 409 | Return 409 to API caller | No | Bureau Admin |
| `ERR_JOB_NOT_RETRYABLE` | Job status is not `FAILED` | 400 | Return 400 to API caller | N/A | — |
| `ERR_JOB_NOT_CANCELLABLE` | Job status is `COMPLETED` or `CANCELLED` | 400 | Return 400 | N/A | — |
| `ERR_JOB_NOT_RESUMABLE` | Job status is not `PAUSED` | 400 | Return 400 | N/A | — |
| `ERR_BATCH_FILE_NOT_FOUND` | SFTP file missing from `processing/` on retry | 404 | Return 404; require manual resubmission | No | Ops Engineer |
| `ERR_PULL_SFTP_CONNECT_FAILED` | Cannot connect to institution SFTP in PULL mode | — | Skip institution this cycle; emit alert after N consecutive | Yes (next cycle) | Bureau Admin |

---

## 8. Audit & Logging

### 8.1 Correlation Identifiers

| Identifier | Scope | Populated By | Propagated To |
|-----------|-------|-------------|--------------|
| `correlation_id` | Entire batch job lifecycle | `S11_BTCH_CRE` (UUID v4) | `batch_jobs`, `batch_sftp_events`, `batch_phase_logs`, `batch_stage_logs`, `batch_error_samples`, `tradelines`, `ir_engine_events`, `audit_logs` |
| `request_id` | Single HTTP request | API gateway / controller | HTTP response headers (`X-Request-ID`); API logs |
| `trace_id` | Distributed trace | Application trace framework (e.g., Spring Sleuth / OpenTelemetry) | All service calls including IR Engine call; logged with every stage entry/exit |

### 8.2 PII Masking Rules

| Field Category | Log Behaviour | API Response Behaviour |
|---------------|---------------|----------------------|
| `pii_classification = 'PII'` (national_id, phone, email) | `[REDACTED]` in all log lines | `[REDACTED]` in `field_value` in error samples |
| Encrypted fields (`_hash` suffix in DB) | Raw hash value may appear in logs; plaintext never | Plaintext never returned |
| `account_number` | Partially masked: first 4 + last 4, remainder as `*` | Same masking in API responses |
| File content | Never logged as raw text; only structural metadata (row count, column names) | N/A |

### 8.3 Audit Events

| Event | Table | Action | Data |
|-------|-------|--------|------|
| Batch job created | `audit_logs` | `BATCH_JOB_CREATED` | `{ job_id, institution_id, filename, correlation_id }` |
| Job status change | `audit_logs` | `BATCH_JOB_STATUS_CHANGED` | `{ job_id, from_status, to_status, changed_by, reason }` |
| Job paused (threshold) | `audit_logs` | `BATCH_JOB_PAUSED` | `{ job_id, phase, failure_rate, threshold }` |
| Job resumed by operator | `audit_logs` | `BATCH_JOB_RESUMED` | `{ job_id, resumed_by, action }` |
| Job cancelled | `audit_logs` | `BATCH_JOB_CANCELLED` | `{ job_id, cancelled_by, phase_at_cancel }` |
| Job completed | `audit_logs` | `BATCH_JOB_COMPLETED` | `{ job_id, outcome, processed, failed, dqi_score }` |
| DQR generated | `audit_logs` | `DQR_GENERATED` | `{ job_id, dqi_score, dqr_url }` |
| IR Engine called | `ir_engine_events` | (insert per call) | `{ job_id, batch_index, sent_at, responded_at, status, error_code }` |

### 8.4 Log Level Policy

| Event | Level |
|-------|-------|
| File detected in SFTP | INFO |
| Stage start/end | INFO |
| Record failed (CRITICAL) | WARN |
| Job PAUSED | WARN |
| Job FAILED | ERROR |
| IR Engine failure | ERROR |
| S3 upload failure | ERROR |
| PII field encountered | DEBUG (no value logged) |
| Agentic parser called | DEBUG |
| Duplicate file detected | INFO |

---

## 9. Security

### 9.1 Authentication

| Layer | Mechanism |
|-------|-----------|
| SFTP (PUSH mode) | SSH key pair or username/password; credentials stored encrypted in `institutions.sftp_config_json` (`AES-256`) |
| SFTP (PULL mode) | SSH private key for institution's SFTP; key stored in `vault://sftp-keys/{institution_id}`; never stored in DB |
| S3 Staging | IAM role-based access; `SftpPollerService` uses service account with policy scoped to `s3://hcb-batch-staging/*` |
| REST API (`BatchJobController`) | Bearer JWT (OAuth2 / Auth Server); `BUREAU_ADMIN` or `DATA_OPERATOR` role required |
| IR Engine | JWT bearer token issued by HCB auth server; rotated every `hcb.ir-engine.token-ttl-seconds` (default 3600s) |

### 9.2 Authorization

**Roles:**
- `BUREAU_ADMIN` — Full pipeline administration access
- `DATA_OPERATOR` — Can view jobs and act on PAUSED jobs (resume/override); cannot retry or cancel
- `OPS_ENGINEER` — Read-only monitoring access
- `INSTITUTION` — Institution users authenticated via API key; scoped to their own institution's data only

| Endpoint | Required Role |
|---------|--------------|
| `GET /batch-jobs` | `BUREAU_ADMIN`, `DATA_OPERATOR`, `OPS_ENGINEER` |
| `GET /batch-jobs/:id/detail` | `BUREAU_ADMIN`, `DATA_OPERATOR`, `OPS_ENGINEER` |
| `GET /batch-jobs/:id/dqr` | `BUREAU_ADMIN`, `DATA_OPERATOR`, `OPS_ENGINEER`, `INSTITUTION` (own institution only) |
| `POST /batch-jobs/:id/retry` | `BUREAU_ADMIN` |
| `POST /batch-jobs/:id/cancel` | `BUREAU_ADMIN` |
| `POST /batch-jobs/:id/resume` | `DATA_OPERATOR`, `BUREAU_ADMIN` |
| `POST /batch-jobs/:id/override-pause` | `DATA_OPERATOR`, `BUREAU_ADMIN` |
| `GET /batch-jobs/sftp-events` | `BUREAU_ADMIN`, `OPS_ENGINEER` |
| `GET /batch-jobs/sftp-health` | `BUREAU_ADMIN`, `OPS_ENGINEER` |

### 9.3 Sensitive Data Handling

- PII fields are encrypted in-transit (TLS 1.2+) and at-rest (AES-256 in DB and S3).
- S3 objects are encrypted using SSE-S3 or SSE-KMS.
- Error reports and DQRs on SFTP are transmitted over SFTP/TLS; contain no decrypted PII.
- `batch_error_samples.field_value` is PII-masked before storage.
- SFTP credentials stored in `sftp_config_json` are encrypted with AES-256; never returned in API responses.

### 9.4 Rate Limits

| Endpoint | Rate Limit |
|---------|-----------|
| `POST /batch-jobs/:id/retry` | 5 requests per minute per `batch_job_id` |
| `POST /batch-jobs/:id/cancel` | 5 requests per minute per `batch_job_id` |
| `POST /batch-jobs/:id/resume` | 5 requests per minute per `batch_job_id` |
| `POST /batch-jobs/:id/override-pause` | 3 requests per minute per `batch_job_id` |
| `GET /batch-jobs` | 60 requests per minute per auth token |
| `GET /batch-jobs/:id/dqr` | 30 requests per minute per auth token |

---

## 10. Non-Functional Requirements

| Requirement | Target | Notes |
|------------|--------|-------|
| SFTP-to-queue latency P95 | < 90s | Max 2 poll cycles (30s each) + stability check |
| Batch processing throughput | > 5,000 records/min | End-to-end including all phases |
| Batch completion time (10k records) | < 5 minutes | Excluding PAUSED wait time |
| IR Engine call latency P95 | < 5s per batch of 1000 records | Per IR Engine call |
| API response latency P95 | < 200ms | For list/detail endpoints |
| Schema auto-detection success rate | > 95% | Of files with at least one registered mapping |
| Validation failure rate (system-wide) | < 5% | Across all active institutions |
| Mapping coverage average | > 85% | Per batch job |
| DQI average | > 90 | Across all completed jobs |
| Retry success rate | > 95% | Of retried jobs after transient errors |
| Duplicate file rejection rate | < 1% | Of total submissions |
| SFTP folder health | 0 files in processing/ > 30 min | SLA |
| Availability | 99.5% | SFTP poller and API |
| Idempotency | Guaranteed for load operations | UPSERT pattern; retry-safe |
| Concurrency | 1 job per institution simultaneously | Serial execution enforced |
| Observability | 100% of phases/stages traced | All events logged with correlationId |

---

## 11. Edge Cases

| # | Scenario | Expected Behaviour |
|---|---------|-------------------|
| EC-01 | Institution SFTP folder missing at poll time (PUSH mode) | Log `WARN_SFTP_FOLDER_MISSING`; skip institution; emit EPIC-10 alert after 3 consecutive misses |
| EC-02 | Agentic parser returns a different format than file extension suggests | Use agentic parser's determination; log extension mismatch as WARNING; continue with agentic format |
| EC-03 | File is exactly at max size limit | Accepted if `file_size_bytes <= max-file-size-bytes`; rejected if strictly greater |
| EC-04 | Schema mapping approved mid-processing for a different version | Ignored; `batch_jobs.mapping_version` locked at S14; in-flight job uses locked version (BR-10) |
| EC-05 | IR Engine returns `cluster_action = NEW` for a consumer who already exists in `consumers` | UPSERT in P5 handles this correctly; existing consumer updated, not duplicated |
| EC-06 | IR Engine returns duplicate `cluster_id` for different records | Both records assigned same consumer; both tradelines linked to same consumer (correct: same person, two accounts) |
| EC-07 | DQR SFTP upload fails | Log error; continue; store in S3 only; set `notification_status` channel for SFTP to `FAILED`; job status unaffected (BR-14) |
| EC-08 | Batch job in QUEUED for > 2 hours (institution serialisation lock) | Alert: `BATCH_QUEUE_TIMEOUT`; surface in `sftp-health` endpoint; Ops Engineer investigates blocking job |
| EC-09 | Same `account_number + reporting_period` appears in two different batches processed simultaneously | BR-12 (serial per institution) prevents this; two jobs for same institution cannot run concurrently |
| EC-10 | `enum_reconciliation_json` missing for a categorical field | Field value stored as-is (no normalization); log WARNING; mapping coverage unaffected |
| EC-11 | S3 staging path already exists (UUID collision) | UUID is generated with `java.util.UUID.randomUUID()` (v4); collision probability negligible; on existence check failure: retry with new UUID (max 3 attempts) |
| EC-12 | File placed in wrong institution folder | SHA-256 check will not find a duplicate; schema lookup may fail if institution has different mappings → quarantine; the wrong institution receives no notification as no job was created against their ID |
| EC-13 | Institution deactivated while their job is in PROCESSING | P6_POST_PROC still runs; notification attempted to institution's last known contact. New files rejected (BR-01 institution active check). In-flight job completes. |
| EC-14 | Operator resumes a PAUSED job, then a new threshold breach occurs in P3 | Job re-enters PAUSED at P3 gate; separate notification sent; operator must act again. Previous resume is logged in audit trail. |
| EC-15 | IR Engine returns more records than were sent | Log `ERROR_IR_ENGINE_RESPONSE_MISMATCH`; take only records with matching `record_ref`; extras discarded; alert emitted |
| EC-16 | DQI = 0 (all components at maximum failure) | DQR uploaded with `dqi = 0`; `batch_jobs.dqi_score = 0`; EPIC-10 alert: `DQI_CRITICAL_FAILURE`; institution notified urgently |
| EC-17 | Retry called on a PARTIALLY_COMPLETED job | Current implementation: 400 `ERR_JOB_NOT_RETRYABLE`. Future: reprocess only failed records. Document in open-questions.md. |
| EC-18 | Two files from same institution dropped simultaneously in PUSH mode | Poller processes them sequentially (file list iteration); second file waits in QUEUED until first job reaches COMPLETED/FAILED/PARTIALLY_COMPLETED |

---

## 12. Database Schema

### 12.1 New / Extended `batch_jobs` Columns

```sql
-- S3 staging and processing paths
ALTER TABLE batch_jobs ADD COLUMN s3_staging_path TEXT;           -- s3://hcb-batch-staging/{inst}/{uuid}/raw/
ALTER TABLE batch_jobs ADD COLUMN s3_valid_records_path TEXT;     -- s3://.../{uuid}/valid/records.json
ALTER TABLE batch_jobs ADD COLUMN s3_error_records_path TEXT;     -- s3://.../{uuid}/errors/records.json

-- Schema and profile
ALTER TABLE batch_jobs ADD COLUMN profile_id TEXT;                -- Schema Agent profile_id
ALTER TABLE batch_jobs ADD COLUMN pii_map_json TEXT;              -- PII field classification map (JSON)

-- IR Engine
ALTER TABLE batch_jobs ADD COLUMN ir_engine_request_id TEXT;      -- UUID of first IR Engine call for this job
ALTER TABLE batch_jobs ADD COLUMN ir_engine_response_status TEXT; -- OK | TIMEOUT | PARTIAL | CIRCUIT_OPEN

-- Data Quality
ALTER TABLE batch_jobs ADD COLUMN dqr_url TEXT;                   -- Pre-signed S3 URL for DQR JSON
ALTER TABLE batch_jobs ADD COLUMN error_report_url TEXT;          -- Pre-signed S3 URL for error report
ALTER TABLE batch_jobs ADD COLUMN dqi_score REAL;                 -- 0–100 Data Quality Index

-- Retry and failure management
ALTER TABLE batch_jobs ADD COLUMN is_permanently_failed INTEGER DEFAULT 0;
ALTER TABLE batch_jobs ADD COLUMN failure_reason TEXT;            -- RETRY_LIMIT_EXCEEDED | ERR_FILE_STRUCTURAL_INVALID | etc.
ALTER TABLE batch_jobs ADD COLUMN last_successful_phase TEXT;     -- P1_PRE_PROCS | P2_VALIDTION | etc.

-- Pause management
ALTER TABLE batch_jobs ADD COLUMN paused_at DATETIME;
ALTER TABLE batch_jobs ADD COLUMN paused_reason TEXT;
ALTER TABLE batch_jobs ADD COLUMN resumed_at DATETIME;
ALTER TABLE batch_jobs ADD COLUMN resumed_by TEXT;                -- user_id or system token

    -- Intake mode
ALTER TABLE batch_jobs ADD COLUMN intake_mode TEXT DEFAULT 'PUSH'; -- PUSH | PULL

    -- Cancel tracking
ALTER TABLE batch_jobs ADD COLUMN cancelled_at DATETIME;
ALTER TABLE batch_jobs ADD COLUMN cancelled_by TEXT;              -- user_id or system token

    -- Notification channels
ALTER TABLE batch_jobs ADD COLUMN notification_channels_json TEXT;
-- e.g. { "email": "SENT", "webhook": "FAILED", "dashboard": "SENT" }

-- Already in v1, retained:
-- sftp_event_id, original_filename, file_size_bytes, checksum_sha256, detected_format,
-- format_detection_method, source_type, schema_registry_id, mapping_id, mapping_version,
-- schema_detection_method, schema_detection_confidence, mapping_coverage_percent,
-- unmapped_field_paths_json, new_consumers_created, existing_consumers_updated,
-- tradelines_inserted, validation_failure_rate, drift_alert_triggered, notification_status
```

### 12.2 New Table: `dqr_results`

```sql
CREATE TABLE IF NOT EXISTS dqr_results (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_job_id                TEXT NOT NULL,
    institution_id              TEXT NOT NULL,
    retry_attempt               INTEGER NOT NULL DEFAULT 0,

    -- DQS components (ratios: 0.0–1.0)
    missing_fields_ratio        REAL NOT NULL DEFAULT 0,
    invalid_format_ratio        REAL NOT NULL DEFAULT 0,
    duplicate_ratio             REAL NOT NULL DEFAULT 0,
    schema_drift_ratio          REAL NOT NULL DEFAULT 0,

    -- Computed scores
    raw_dqs                     REAL NOT NULL DEFAULT 0,   -- weighted sum of components
    dqi_score                   REAL NOT NULL DEFAULT 100, -- (1 - raw_dqs) * 100, clamped 0–100

    -- Summary counts
    total_records               INTEGER DEFAULT 0,
    processed_records           INTEGER DEFAULT 0,
    failed_records              INTEGER DEFAULT 0,
    mandatory_failed_count      INTEGER DEFAULT 0,
    l1_format_failed_count      INTEGER DEFAULT 0,
    duplicate_failed_count      INTEGER DEFAULT 0,
    l2_cross_field_failed_count INTEGER DEFAULT 0,
    unmapped_field_count        INTEGER DEFAULT 0,
    total_field_count           INTEGER DEFAULT 0,

    -- Delivery
    dqr_s3_path                 TEXT,       -- S3 object key for full DQR JSON
    dqr_sftp_path               TEXT,       -- SFTP path where DQR was uploaded
    dqr_presigned_url           TEXT,       -- Pre-signed S3 URL (TTL: 7 days)
    dqr_presigned_url_expires_at DATETIME,

    -- Quality breakdown JSON
    l1_breakdown_by_field_json  TEXT,       -- { "account_number": 15, "pan_number": 5, ... }
    l2_breakdown_json           TEXT,       -- { "balance_vs_loan": 2, "date_sequence": 1 }

    generated_at                DATETIME NOT NULL DEFAULT (datetime('now')),
    uploaded_at                 DATETIME,

    FOREIGN KEY (batch_job_id) REFERENCES batch_jobs(batch_job_id)
);

CREATE INDEX idx_dqr_batch_job ON dqr_results(batch_job_id);
CREATE INDEX idx_dqr_institution ON dqr_results(institution_id, generated_at);
CREATE INDEX idx_dqr_score ON dqr_results(dqi_score);
```

### 12.3 New Table: `ir_engine_events`

```sql
CREATE TABLE IF NOT EXISTS ir_engine_events (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_job_id        TEXT NOT NULL,
    institution_id      TEXT NOT NULL,
    call_index          INTEGER NOT NULL,       -- sequential batch call number (1, 2, 3...)
    batch_size          INTEGER NOT NULL,       -- number of records in this call
    request_id          TEXT NOT NULL,          -- UUID for this specific IR Engine call
    payload_hash        TEXT NOT NULL,          -- SHA-256 of request payload (no PII)

    -- Timing
    sent_at             DATETIME NOT NULL,
    responded_at        DATETIME,
    latency_ms          INTEGER,

    -- Outcome
    status              TEXT NOT NULL DEFAULT 'PENDING',
    -- PENDING | OK | TIMEOUT | ERROR | CIRCUIT_OPEN | PARTIAL
    records_sent        INTEGER DEFAULT 0,
    records_received    INTEGER DEFAULT 0,
    new_clusters        INTEGER DEFAULT 0,
    existing_clusters   INTEGER DEFAULT 0,

    -- Error
    error_code          TEXT,
    error_message       TEXT,

    created_at          DATETIME NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (batch_job_id) REFERENCES batch_jobs(batch_job_id)
);

CREATE INDEX idx_ir_events_batch_job ON ir_engine_events(batch_job_id);
CREATE INDEX idx_ir_events_status ON ir_engine_events(status, sent_at);
```

### 12.4 Updated `batch_sftp_events.event_status` Enum

```
DETECTED        ← File found in SFTP folder
STABLE          ← File size stable / .done marker detected
QUEUED          ← batch_jobs created; file moved to processing/
PROCESSING      ← Pipeline is running
PROCESSED       ← Pipeline completed; file moved to processed/
FAILED          ← Pipeline failed; file moved to failed/
QUARANTINED     ← File quarantined (duplicate, too large, unknown format, no schema)
DUPLICATE       ← Alias for QUARANTINED with is_duplicate=1 (retained for backward compat)
CANCELLED       ← Job cancelled; file moved to cancelled/  [NEW]
PAUSED          ← Job paused at threshold gate; file remains in processing/  [NEW]
REJECTED        ← Institution inactive or other pre-pipeline rejection
```

### 12.5 SFTP Folder Architecture (Updated)

```sql
-- New SFTP cancelled folder lifecycle
UPDATE batch_sftp_events
SET outcome_path = '/sftp/institutions/{id}/cancelled/{filename}',
    event_status = 'CANCELLED'
WHERE batch_job_id = :jobId;
```

---

## 13. KPIs and Monitoring Integration

### KPI Group 7 — Data Quality (New)

| KPI | Query Basis | Table |
|-----|-------------|-------|
| Average DQI across all completed jobs (today) | `AVG(dqi_score) WHERE snapshotted_at >= today` | `batch_tracking_snapshots` |
| Average DQI by institution | `AVG(dqi_score) GROUP BY institution_id` | `dqr_results` |
| Jobs with DQI < 70 | `COUNT(*) WHERE dqi_score < 70` | `dqr_results` |
| DQI trend (7-day) | `AVG(dqi_score) GROUP BY DATE(generated_at)` | `dqr_results` |
| Top fields by L1 validation failure | Aggregate `l1_breakdown_by_field_json` | `dqr_results` |
| DQR delivery success rate | `COUNT(*) WHERE dqr_sftp_path IS NOT NULL` / total | `dqr_results` |

### KPI Group 8 — IR Engine Health (New)

| KPI | Query Basis | Table |
|-----|-------------|-------|
| IR Engine call success rate | `COUNT(*) WHERE status='OK'` / total | `ir_engine_events` |
| IR Engine P95 latency | 95th percentile of `latency_ms` | `ir_engine_events` |
| Circuit breaker openings today | `COUNT(*) WHERE status='CIRCUIT_OPEN' AND sent_at >= today` | `ir_engine_events` |
| New vs existing clusters ratio | `SUM(new_clusters) / SUM(records_received)` | `ir_engine_events` |

### Alert Thresholds (Extended)

| Alert | Threshold | Severity | Trigger |
|-------|-----------|----------|---------|
| DQI critical | `dqi_score < 50` on any job | HIGH | `dqr_results.dqi_score < 50` |
| DQI degradation trend | Rolling 7-day avg DQI < 80 | MEDIUM | Per institution |
| IR Engine down | `status='CIRCUIT_OPEN'` | HIGH | Immediate; notify Bureau Admin |
| Jobs paused (threshold) | Any job enters PAUSED state | MEDIUM | Notify Data Operator |
| PERMANENTLY_FAILED job | `is_permanently_failed = 1` set | HIGH | Notify Bureau Admin |
| Batch failure rate spike | `failure rate > 20%` in 1 hour | HIGH | Existing alert |
| Agentic parser failures | Agentic timeout rate > 10% in 30 min | MEDIUM | Fallback to deterministic; alert Ops |

---

## 14. Configuration Reference

---

## 15. Internal Review — Findings and Fixes Applied

> Reviewed as: Senior Engineer, Product Manager, QA Lead, Security Architect, API Governance Reviewer

| # | Reviewer Role | Finding | Fix Applied |
|---|--------------|---------|------------|
| IR-01 | Security Architect | `INSTITUTION` role was referenced in API section but not defined or scoped in the Security section. | Added role definition to section 9.2 with institution-scoping note (JWT claim `institution_id` enforcement). |
| IR-02 | Senior Engineer | `cancelled_at` and `cancelled_by` columns were referenced in cancel business logic but not in the DB DDL extension list. | Added both columns to section 12.1 DDL. |
| IR-03 | Senior Engineer | `schema_drift_ratio` denominator `total_field_count` was ambiguous — could mean total fields in schema or total field-occurrences across all records. | Clarified in DQS formula: `total_field_count = total_records × fields_per_record`. |
| IR-04 | QA Lead | Cancel API validation: spec said only `COMPLETED`, `PARTIALLY_COMPLETED`, `CANCELLED` are blocked. `FAILED` jobs that are permanently failed should also be non-cancellable (already failed). | Clarified validation to include `FAILED` terminal state. |
| IR-05 | API Governance | `tradelines_inserted` field used underscore_case in OpenAPI schema (`BatchJobSummary`) while all other fields used camelCase. | Renamed to `tradelinesInserted` in OpenAPI schema and API examples. |
| IR-06 | QA Lead | Rate-limited POST endpoints (retry, cancel, resume, override-pause) were missing `429 TooManyRequests` responses in OpenAPI paths. | Added `429` response to all four POST mutation endpoints. |
| IR-07 | QA Lead | `GET /batch-jobs/:id/dqr` returned 404 for in-progress jobs, conflating "resource not found" with "not yet generated". | Changed to `422 ERR_DQR_NOT_GENERATED` for in-progress state; 404 reserved for truly non-existent job IDs. |
| IR-08 | Senior Engineer | `BatchJobDetail.phases` was marked as required array but legacy jobs have no phase logs. | Added `nullable: true` with explicit description of legacy vs new behaviour. |
| IR-09 | Security Architect | OpenAPI security definitions for `INSTITUTION` role scoping were undocumented. | Added role definitions to OpenAPI `info.description` with JWT claim enforcement note. |
| IR-10 | API Governance | `500 InternalError` responses were absent from all OpenAPI endpoints. | Added global note in `info.description`; explicitly added `500` to all POST endpoints. |

---

```yaml
hcb:
  sftp:
    enabled: true
    root-path: /sftp
    intake-mode: PUSH                     # PUSH | PULL
    poll-interval-ms: 30000
    stable-file-strategy: SIZE_STABLE     # SIZE_STABLE | DONE_MARKER
    stable-size-check-count: 2
    duplicate-window-hours: 24
    archive-retention-days: 30
    max-file-size-bytes: 524288000        # 500 MB
    alert-after-consecutive-failures: 3
    pull-mark-processed: true             # rename file on institution SFTP after download

  s3:
    staging-bucket: hcb-batch-staging
    staging-prefix-template: "{institutionId}/{jobUuid}"
    presigned-url-ttl-days: 7

  parser:
    agentic-base-url: http://agentic-parser-service/parse
    agentic-timeout-ms: 60000
    agentic-fallback-enabled: true

  ir-engine:
    base-url: http://ir-engine-service
    batch-size: 1000
    timeout-ms: 30000
    max-retries: 2
    circuit-breaker-threshold: 3
    token-ttl-seconds: 3600

  batch:
    max-retry-count: 3
    retry-backoff-multiplier: 3           # 30s, 90s, 270s
    retry-initial-backoff-ms: 30000
    failure-threshold: 0.30              # 30%; overridable per institution
    drift-threshold: 0.20               # 20%; triggers drift alert
    load-chunk-size: 500

  security:
    pii-encryption-key: "${HCB_PII_ENCRYPTION_KEY}"
    pii-encryption-algorithm: AES-256-GCM
```
