# EPIC-14 Gap Analysis — PPT vs Existing Markdown

> **Revision:** v2 — 2026-05-22
> **Source of Truth:** `HCB_Data_Ingestion_23042026.pptx` (slides 1–15)
> **Baseline:** `docs/User stories/EPIC-14-Batch-Pipeline.md`
> **Methodology:** Every process step, actor, state transition, API, validation rule, business rule, input/output, dependency, orchestration logic, and exception path was compared. Gaps were identified under nine categories:
> - Missing Flow (PPT introduces element absent in markdown)
> - Outdated Logic (markdown contradicts PPT)
> - Undocumented API (PPT implies an endpoint markdown doesn't define)
> - Missing Validation (PPT states a rule markdown omits)
> - Failure Gap (PPT defines a failure path markdown ignores)
> - Hidden Assumption (markdown assumes something PPT makes explicit)
> - Contradictory Requirement (PPT and markdown directly conflict)
> - Inferred Architecture (PPT implies component; markdown doesn't document it)
> - Deprecated Element (markdown element not present in PPT; retained with note)

---

## Gap Table

| # | Existing Section | Gap Type | PPT Evidence (Slide) | Required Update |
|---|-----------------|----------|----------------------|-----------------|
| G-01 | §4 SFTP Folder Architecture | **Missing Flow** | Slide 4: "There can also be a possibility that we need to connect with institute SFTP to get the data instead of CRIF SFTP. So accordingly the provisions have to be made." | Add Phase 0 pull-from-institution SFTP mode as an alternate intake channel. `SftpPollerService` must support both push (bureau-hosted SFTP) and pull (connect to institution's SFTP). New config property `hcb.sftp.intake-mode = PUSH \| PULL`. New `batch_jobs.intake_mode` column. |
| G-02 | §5 Pipeline Architecture — S12_FILE_INT | **Missing Flow** | Slide 5: "Move file from SFTP to S3 bucket for processing" | After file stability confirmation and checksum, file must be transferred to S3 staging bucket (`s3://hcb-batch-staging/{institution_id}/{job_uuid}/raw/{filename}`). All downstream stages (S13–S51) read from S3 path, not from SFTP `processing/` folder. SFTP `processing/` folder retains a marker file for observability only. New `batch_jobs.s3_staging_path` column. |
| G-03 | §5 Pipeline — S13_REC_PARS | **Outdated Logic** | Slide 5: "Convert file → structured records using agentic process. Supports any format." | Replace deterministic `FileFormatDetectorService` as primary parser with `AgenticParserService` (LLM/agent-driven extraction). Deterministic fallback retained if agentic call times out (configurable: `hcb.parser.agentic-timeout-ms`). Parser contract must document agentic request/response schema and fallback behaviour. |
| G-04 | §5 Pipeline — P4_IDENT_RES | **Outdated Logic** | Slide 8: "HCB will send the data to IR Engine. IR Engine will assign cluster id to each record with a flag if it New or Existing cluster." | Replace in-process `S41_CLST_ASN` consumer lookup with outbound REST call to external IR Engine service. New integration contract: `POST {ir-engine.base-url}/ir/v1/cluster-assign`. Request: canonical record batch. Response: array of `{record_ref, cluster_id, cluster_action: NEW\|EXISTING}`. New table: `ir_engine_events`. New `batch_jobs.ir_engine_request_id` column. |
| G-05 | §5 Pipeline — P5_DATA_LOAD | **Missing Flow** | Slide 9: "Customer profile data / Trend data / Data for Analytics etc." | Data Load target stores are broader than `tradelines / consumers / credit_profiles`. Add explicit load targets: (1) customer profile records, (2) trend/time-series records, (3) analytics/reporting records. Document load sequence and table mapping for each category in spec. |
| G-06 | §5 Pipeline — P2_VALIDTION threshold decision | **Contradictory Requirement** | Slide 6: "If failure rate ≥ 30% (Configurable) → PAUSE JOB → Send Notification to Data Operator" | Markdown says `FAIL JOB` (terminal). PPT says `PAUSE JOB` (recoverable, operator must act). **Hybrid resolution:** Add `PAUSED` as a new job status. At ≥ 30% failure rate (P2 gate), job transitions `PROCESSING → PAUSED`. Data Operator receives notification. Job can then be `resumed` (reprocess failed records) or `force-advanced` (skip failed, continue with valid). |
| G-07 | §5 Pipeline — P3_STANDARZN threshold decision | **Contradictory Requirement** | Slide 7: "If failure rate ≥ 30% (Configurable) → PAUSE JOB → Send Notification to Data Operator. Schema Drift notifications to Data Operator." | Same as G-06: P3 L2 combined threshold also triggers `PAUSE` not `FAIL`. Additionally, schema drift (unmapped ratio > threshold) triggers a separate drift notification to Data Operator. |
| G-08 | §7 BATCH-US-011 — Retry | **Outdated Logic** | Slide 11: "Up to 3 retries with exponential backoff. On final retry failure → job marked PERMANENTLY_FAILED." | Markdown has no retry cap and no backoff. Add: `retry_count` max = 3 (configurable: `hcb.batch.max-retry-count`). Backoff schedule: attempt 1 = 30s, attempt 2 = 90s, attempt 3 = 270s. After 3rd failure: `is_permanently_failed = 1` on `batch_jobs`; job status stays `FAILED`; `failure_reason = RETRY_LIMIT_EXCEEDED`. Retry is blocked if `is_permanently_failed = 1`. |
| G-09 | §7 BATCH-US-011 — Retry | **Missing Flow** | Slide 11: "Pipeline restarted from last successful phase" | Markdown says full restart. PPT specifies restart from last successful phase. Implement `last_successful_phase` column on `batch_jobs`. Retry picks up from `last_successful_phase + 1`. |
| G-10 | §7 BATCH-US-012 — Cancel | **Contradictory Requirement** | Slide 11: "Any partially loaded records are rolled back. File moved to /cancelled directory." | Markdown explicitly says no rollback for P5 committed chunks (idempotent UPSERT as recovery). PPT requires rollback. **Hybrid resolution (documented risk):** No P5 rollback for committed SQLite/PostgreSQL chunks (distributed rollback not feasible without saga pattern). Document this as a known deviation in Open Questions. Introduce `/cancelled/` SFTP folder as new lifecycle destination (separate from `/failed/`). Update `batch_sftp_events.event_status` enum to include `CANCELLED`. |
| G-11 | §7 BATCH-US-012 — Cancel | **Missing Flow** | Slide 11: "File moved to /cancelled directory" | Markdown routes cancelled job's file to `/failed/` with `_CANCELLED` suffix. PPT introduces a dedicated `/cancelled/` folder. Add `/sftp/institutions/{id}/cancelled/` to SFTP folder architecture. Update `SftpPollerService` file lifecycle to move file to `/cancelled/` on cancel. |
| G-12 | §7 BATCH-US-008 — Post-Processing S62 | **Missing Flow** | Slide 10: "Computes Data Quality Score (DQS) based on: Missing fields, Invalid formats, Duplicates, Schema drift. Generates: Data Quality Report (DQR) → detailed metrics and Data Quality Index (DQI) → standardized score (e.g., 0–100). Uploads on the SFTP folder." | Markdown only mentions "validation metrics / drift check" internally. PPT requires: (1) formal DQS formula (weighted composite of component scores), (2) DQR JSON report with per-field breakdown, (3) DQI normalized 0–100 score, (4) upload DQR + DQI to SFTP `processed/{uuid}/` and to S3. New table: `dqr_results`. New column: `batch_jobs.dqr_url`. New API: `GET /api/v1/batch-jobs/:id/dqr`. |
| G-13 | §7 BATCH-US-008 — S61_ERR_REPT | **Outdated Logic** | Slide 10: "Uploads the detailed error report on the SFTP folder" | Markdown stores error report internally and generates a pre-signed URL. PPT requires the report to be uploaded to the institution's SFTP `processed/{uuid}/errors.json`. Update `S61_ERR_REPT` to push error report to SFTP and S3 in addition to internal storage. |
| G-14 | §5 Pipeline — S63_NOTIF_TR | **Missing Flow** | Slide 10: "Notification channels: Email / Webhooks / Dashboard alerts" | Markdown has `SENT \| FAILED \| NOT_APPLICABLE` for `notification_status`. PPT adds **Dashboard alerts** as an explicit channel. Update `notification_status` enum: `EMAIL_SENT \| WEBHOOK_SENT \| DASHBOARD_SENT \| PARTIAL \| FAILED \| NOT_APPLICABLE`. Notification may succeed on one channel and fail on another — add `notification_channels_json` column to capture per-channel outcome. |
| G-15 | §3 Personas | **Missing Flow** | Slide 6–7: "Send Notification to Data Operator". Slide 11: Operator is recipient of PAUSE notifications. | Add **Data Operator** persona: receives PAUSE notifications, can resume or override a paused job, investigates threshold breaches. Distinct from Bureau Administrator (admin-level) and Operations Engineer (monitoring-level). New RBAC role: `DATA_OPERATOR`. |
| G-16 | §5 Pipeline — S14_SCHM_LKP | **Inferred Architecture** | Slide 13: Schema Agent — "Understand the source data / Create profile id / Create expected schema (auto or user input) / Map source fields / Assign PII & confidence to each field / Create validation rules list / Create inside/outside relationship" | The schema _configuration_ workflow is driven by a Schema Agent (EPIC-05 agent). Document the dependency: `S14_SCHM_LKP` consumes schemas produced by the Schema Agent pipeline (profile_id → schema_mapper_registry). `S14_SCHM_LKP` must resolve `profile_id` as part of schema lookup, not just `institution_id + source_type`. Add `profile_id` to `schema_mapper_registry` and `batch_jobs`. |
| G-17 | §5 Pipeline — S14_SCHM_LKP | **Missing Validation** | Slide 13: "Assign PII & confidence to each field" | PII field classification is determined at schema registration. `S14_SCHM_LKP` must retrieve the PII classification map (per `mapping_pairs.pii_classification`) and propagate it to `S32_BIZ_XFRM` for encryption. Currently undocumented in the pipeline. |
| G-18 | §5 Pipeline — S12_FILE_INT | **Missing Validation** | Slide 5: "Structural issues → fail batch (no partial processing)" | Markdown allows partial processing for file integrity failures. PPT is explicit: structural issues at P1 fail the entire batch immediately — no records proceed. Distinguish: (a) file integrity failures (structural, encoding, readability) → `FAIL_JOB` immediately at P1; (b) record-level validation failures (P2/P3) → partial processing with threshold gate. |
| G-19 | §5 Pipeline — S13_REC_PARS | **Missing Validation** | Slide 5: "Format Detection: log format + detection method. Quarantine Handling: Unknown format/schema → move file to /quarantine/ with error tagging" | S13_REC_PARS must log: detected format, detection method (AGENTIC \| EXTENSION \| CONTENT_PROBE \| EXPLICIT), and detection confidence. Unrecognized format must quarantine the file immediately — not proceed to S14_SCHM_LKP. Currently, quarantine is only triggered by schema-not-found at S14. |
| G-20 | §7 BATCH-US-010 — Partial Success | **Outdated Logic** | Slide 11: "Job marked PARTIAL_SUCCESS" | Markdown canonical status is `partially_completed`. PPT uses `PARTIAL_SUCCESS`. **Hybrid resolution:** `PARTIALLY_COMPLETED` remains the canonical DB/API enum value. API response includes `statusDisplay: "PARTIAL_SUCCESS"` alias. OpenAPI enum description documents both labels. |
| G-21 | §6 Batch Console Data Model | **Missing Flow** | Slide 14: "Valid records → S3 bucket. Error records → S3 bucket" | Slide 14's ingestion workflow shows valid records and error records are staged to separate S3 buckets/prefixes after processing. Add: `batch_jobs.s3_valid_records_path` and `batch_jobs.s3_error_records_path` columns. Error records S3 path becomes the source for `S61_ERR_REPT`. |
| G-22 | §7 BATCH-US-001 — Idempotency | **Missing Validation** | Slide 5: "Idempotency (Critical): Prevent duplicate file processing (hash / filename / provider checks)" | Markdown uses SHA-256 checksum only. PPT adds **filename** and **provider** (institution) as separate idempotency dimensions. Update duplicate detection: `(checksum_sha256, institution_id)` is the primary key; additionally flag if `(original_filename, institution_id, reporting_period)` matches an existing processed job — log as a soft duplicate warning even if checksum differs. |
| G-23 | §9 Database Summary — `batch_jobs` | **Missing Flow** | Slides 5, 8, 10, 14 (inferred) | New `batch_jobs` columns required: `s3_staging_path TEXT`, `s3_valid_records_path TEXT`, `s3_error_records_path TEXT`, `ir_engine_request_id TEXT`, `ir_engine_response_status TEXT`, `dqr_url TEXT`, `dqi_score REAL`, `is_permanently_failed INTEGER DEFAULT 0`, `failure_reason TEXT`, `last_successful_phase TEXT`, `intake_mode TEXT DEFAULT 'PUSH'`, `profile_id TEXT`, `paused_at DATETIME`, `paused_reason TEXT`, `resumed_at DATETIME`, `resumed_by TEXT`. |
| G-24 | §9 Database Summary | **Missing Flow** | Slide 10 (DQR), Slide 8 (IR Engine) | Two new tables required: (1) `dqr_results` — stores per-job Data Quality Report with component scores (missing_fields_ratio, invalid_format_ratio, duplicate_ratio, schema_drift_ratio, dqi_score). (2) `ir_engine_events` — stores per-job IR Engine call lifecycle (request_id, payload_hash, sent_at, responded_at, status, error_code). |
| G-25 | §8 Epic API Summary | **Undocumented API** | Slide 6–7 (PAUSE → notify → resume flow) | Three new APIs required: (1) `POST /api/v1/batch-jobs/:id/resume` — resume a PAUSED job; (2) `POST /api/v1/batch-jobs/:id/override-pause` — operator overrides threshold decision and advances pipeline; (3) `GET /api/v1/batch-jobs/:id/dqr` — retrieve Data Quality Report and DQI score. |
| G-26 | §7 BATCH-US-009 — Stage Logging | **Inferred Architecture** | Slide 5: "Full Traceability: Log every step (format, parsing, errors, counts) for audit & monitoring" | `batch_stage_logs.stage_metadata_json` for `S13_REC_PARS` must include: `parserType` (`AGENTIC \| DETERMINISTIC`), `agenticModelVersion`, `detectionConfidence`, `parseLatencyMs`. Currently no agentic parser metadata is logged. |
| G-27 | §5 SFTP Folder Architecture | **Deprecated Element (Retained)** | Not mentioned in PPT | `archive/` folder and `hcb.sftp.archive-retention-days` are in markdown but not in PPT. Retained as operational best-practice. Note: with S3 staging, long-term archival shifts to S3. `archive/` retained for SFTP completeness. |
| G-28 | §7 BATCH-US-004 — S23_DUPE_CHK | **Hidden Assumption** | Slide 3 pipeline diagram omits S23_DUPE_CHK from the high-level flow column headers but slide 6 text includes duplicate check in P2 description. | S23_DUPE_CHK is retained as a canonical P2 stage. The high-level diagram omission is a presentation artefact, not a removal. Explicitly note in spec that S23_DUPE_CHK is present in P2_VALIDTION. |
| G-29 | §13 Gap Analysis table | **Missing Flow** | Slide 14: Ingestion workflow shows schema mapper as a separate service step between raw data and validation | Schema Mapper is an active transformation service called between S14_SCHM_LKP (schema resolution) and P2_VALIDTION. The current markdown treats schema mapping as a passive lookup. The spec must clarify that field mapping execution (S31_SCHM_CNV) is the active transformation step, and S14_SCHM_LKP is purely the resolution/lookup step. No overlap. |

---

## Contradictory Requirements — Resolution Table

| # | Topic | Markdown Says | PPT Says | Hybrid Resolution |
|---|-------|--------------|----------|-------------------|
| CR-1 | P2/P3 failure threshold outcome | `FAIL JOB` (terminal) | `PAUSE JOB` + notify Data Operator | Add `PAUSED` state. Operator can `resume` or `override-pause`. `FAIL JOB` only if `is_permanently_failed=1` after 3 retries. |
| CR-2 | Cancel — P5 partial load rollback | No rollback; idempotent UPSERT is recovery | Rollback partial loads | No rollback (SQLite/PG chunked UPSERT makes distributed rollback infeasible). Documented as known risk in open-questions.md. `/cancelled/` folder added. |
| CR-3 | Retry — max attempts | No cap; no backoff | 3 retries, exponential backoff, PERMANENTLY_FAILED | Cap at 3 (configurable). Backoff: 30s / 90s / 270s. `is_permanently_failed=1` after 3rd failure. |
| CR-4 | Cancel — SFTP folder | `/failed/` with `_CANCELLED` suffix | `/cancelled/` directory | New `/cancelled/` folder added. `batch_sftp_events.event_status = CANCELLED`. |
| CR-5 | P5 Data Load targets | `tradelines / consumers / credit_profiles` | Customer profile / Trend / Analytics | Add `trend_records` and `analytics_records` as additional load targets. Map customer profile → existing `consumers + credit_profiles`. |
| CR-6 | `PARTIAL_SUCCESS` vs `partially_completed` | `partially_completed` (DB/API) | `PARTIAL_SUCCESS` (PPT label) | DB/API canonical: `PARTIALLY_COMPLETED`. `statusDisplay` alias: `PARTIAL_SUCCESS`. |
| CR-7 | S13_REC_PARS parser | Deterministic `FileFormatDetectorService` | "Agentic process" | `AgenticParserService` as primary. Deterministic fallback on agentic timeout. |
| CR-8 | P4 cluster assignment | In-process lookup in `consumers` table | External IR Engine REST call | External IR Engine (outbound REST). In-process fallback if IR Engine is unreachable (circuit breaker open → fail P4, PAUSE job). |
| CR-9 | DQR delivery | Internal pre-signed URL | Upload to SFTP + S3 | Both: upload to SFTP `processed/{uuid}/` AND generate pre-signed S3 URL. |
| CR-10 | P1 structural failure → partial? | Partial processing allowed | Structural issues → fail entire batch | P1 failures (file integrity, encoding, unreadable) → `FAIL_JOB` immediately. P2/P3 record-level failures → partial with threshold gate. |

---

## Outdated Logic Inventory

| Element | Outdated Assumption | PPT Correction |
|---------|-------------------|----------------|
| `SftpPollerService` connects to bureau-hosted SFTP | Push-only model | Must also support pull from institution-hosted SFTP |
| `FileFormatDetectorService` as primary parser | Deterministic heuristics | Agentic parser as primary; deterministic as fallback |
| `S41_CLST_ASN` runs in-process | Self-contained cluster lookup | External IR Engine integration required |
| `partially_completed` status label | Internal naming convention | `PARTIAL_SUCCESS` is the business-facing label |
| `S62_DQ_REPRT` stores metrics internally | Observability-only | DQR + DQI must be uploaded to institution SFTP and S3 |
| `S61_ERR_REPT` generates internal pre-signed URL | Internal download only | Error report uploaded to institution's SFTP folder |
| P5 targets: `tradelines / consumers / credit_profiles` | 3-table model | Broader: customer profile + trend + analytics targets |
| Retry: no cap, no backoff | Indefinite retries | 3-attempt cap with exponential backoff |
| No `PAUSED` job state | Binary fail/proceed | `PAUSED` state required for threshold gate recovery |
| No `PERMANENTLY_FAILED` terminal flag | Implicit infinite retry | `is_permanently_failed` flag after retry cap |

---

## Missing Validation Rules (PPT-introduced, absent from markdown)

| Validation | PPT Slide | Applicable Stage | Required Spec Addition |
|-----------|-----------|-----------------|------------------------|
| Structural file issues → fail entire batch | Slide 5 | S12_FILE_INT | `FAIL_JOB` immediately; no partial processing |
| Format detection method must be logged | Slide 5 | S13_REC_PARS | Log: `format`, `detection_method`, `detection_confidence` |
| Unknown format → quarantine at S13 | Slide 5 | S13_REC_PARS | Quarantine before S14_SCHM_LKP; don't wait for schema failure |
| Idempotency: filename + provider checks | Slide 5 | S12_FILE_INT | Add filename+institution composite soft-duplicate check |
| PII classification propagated from schema registration | Slide 13 | S14_SCHM_LKP | PII map retrieved at schema lookup; applied in S32_BIZ_XFRM |
| DQS formula components: missing fields + invalid formats + duplicates + schema drift | Slide 10 | S62_DQ_REPRT | Formally define DQS weighted formula |

---

## Inferred Architecture Gaps (not explicit in either source; architecture strongly implies)

| Inferred Item | Basis | Recommended Action |
|--------------|-------|--------------------|
| IR Engine circuit breaker | External service dependency | When IR Engine is unreachable, open circuit breaker, set `ir_engine_response_status = CIRCUIT_OPEN`, pause job rather than indefinite retry |
| Agentic parser timeout / fallback | "Agentic process" implies external AI call | Configurable timeout; deterministic fallback; log parser type used |
| S3 IAM policy per institution | File isolation requirement | Each institution's S3 prefix (`s3://hcb-batch-staging/{institution_id}/`) must have scoped IAM policy |
| DQS weighting formula | PPT lists 4 components without weights | Define default weights: missing_fields=0.30, invalid_format=0.30, duplicates=0.20, schema_drift=0.20 |
| IR Engine request batching | Sending all records in single request risks timeout | Paginate IR Engine calls: max batch size configurable (`hcb.ir-engine.batch-size`, default 1000) |
| Report UUID namespacing | Multiple report uploads per job (retry runs) | Report paths include retry attempt: `processed/{job_id}/run_{retry_count}/dqr.json` |
| `profile_id` in schema lookup | Slide 13 explicitly mentions "Create profile id" | Add `profile_id` as a join key in `schema_mapper_registry`; surfaced in `batch_jobs` |
