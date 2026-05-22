# EPIC-14 — Open Questions and Unresolved Items

> **Version:** v2 — 2026-05-22
> **Status:** Requires resolution before implementation of tagged items begins.
> **Format:** Each item has an ID, category, description, options (where applicable), owner, and impact on implementation.

---

## P5 Rollback — Partially Committed Data Load

**ID:** OQ-01
**Category:** Architecture / Risk
**Priority:** HIGH — blocks cancel semantics implementation

**Issue:**
The PPT (slide 11) states: *"Any partially loaded records are rolled back"* when a job is cancelled. The v2 spec adopts a hybrid resolution: no rollback, with idempotent UPSERT as the recovery mechanism (cancel stops after the current committed chunk, committed chunks remain).

**Why this is unresolved:**
- For SQLite (development): there is no distributed transaction spanning multi-chunk loads. Rollback is only possible within a single SQLite transaction, not across 500-record chunks.
- For PostgreSQL (production): a saga-pattern compensation approach (delete inserted records by `batch_job_id`) is architecturally feasible but costly.
- The PPT does not clarify whether "rollback" means within a single atomic operation or across the entire P5 phase.

**Options:**
1. Accept no-rollback: document as known risk; rely on idempotent UPSERT on resubmission. (Current v2 resolution.)
2. Implement a saga compensation step: after cancel, execute `DELETE FROM tradelines WHERE batch_job_id = :id` for the cancelled job. Risk: destructive; requires production DB permissions.
3. Add a `load_status = 'CANCELLED'` soft-delete flag to tradelines; exclude from credit queries until resubmitted. Risk: query complexity.

**Owner:** Platform Engineering + Data Engineering lead
**Blocking:** BATCH-US-012 (Cancel) implementation
**Target:** Resolve before Sprint implementing P5_DATA_LOAD + cancel semantics

---

## IR Engine — SLA, Availability, and Circuit Breaker Thresholds

**ID:** OQ-02
**Category:** Integration / NFR
**Priority:** HIGH — blocks P4_IDENT_RES implementation

**Issue:**
The IR Engine is an external service. The following are not yet specified:
- What SLA (uptime, latency P99) does the IR Engine guarantee?
- Who owns the IR Engine? Is it an internal HCB team or a third-party vendor?
- What is the correct circuit breaker threshold? The spec defaults to 3 consecutive failures — is this appropriate?
- Does the IR Engine support partial responses (some records missing from response)?
- What is the maximum payload size the IR Engine accepts?
- Does the IR Engine enforce rate limits? What are they?
- Does the IR Engine support idempotent replay for the same `X-Request-ID`?

**Impact:** Circuit breaker thresholds, retry logic, batch sizing, and the PAUSED-on-circuit-open behaviour all depend on IR Engine SLA characteristics.

**Owner:** IR Engine team (external) / Integration Architect
**Target:** IR Engine SLA document required before P4 sprint

---

## S3 Bucket — IAM Policy Ownership and Bucket Structure

**ID:** OQ-03
**Category:** Infrastructure / Security
**Priority:** HIGH — blocks S12_FILE_INT (S3 upload) implementation

**Issue:**
The spec assumes `s3://hcb-batch-staging` exists with per-institution prefix isolation. The following are not yet confirmed:
- Who provisions and owns the S3 bucket and IAM policies?
- Is there a separate S3 bucket per environment (dev/staging/prod)?
- Should the staging bucket use SSE-KMS (customer-managed key) or SSE-S3?
- What is the lifecycle policy for staged files? When are they deleted from S3? (Currently the spec only deletes from SFTP after 30 days — S3 retention policy is undefined.)
- Does `SftpPollerService` use an IAM role (recommended) or IAM user with access key?
- Are there VPC endpoint restrictions for S3 access?

**Owner:** Infrastructure / DevOps
**Target:** Before Phase 2 sprint (BATCH-US-001)

---

## Agentic Parser — Model Selection, Vendor, and Fallback Policy

**ID:** OQ-04
**Category:** Architecture / AI
**Priority:** HIGH — blocks S13_REC_PARS implementation

**Issue:**
The PPT describes "agentic process" for record parsing but does not specify:
- Which AI model or vendor provides the agentic parser? (Internal model, OpenAI, Azure AI, etc.)
- Is the agentic parser a standalone microservice or an embedded model?
- What is the expected latency for the agentic parser? The spec defaults timeout to 60s — is this appropriate?
- What is the input format for the agentic parser (raw file bytes, pre-extracted text, S3 path reference)?
- What happens to agentic parser costs for large batches (e.g. 500 MB XML files)?
- Is the deterministic fallback always available (no external dependency) — confirmed yes, but should be explicitly validated.
- How is the agentic parser versioned? Should `agenticModelVersion` be stored per-job for auditability?
- Does the agentic parser need to be auditable (financial regulation requires explainability of data transformation decisions)?

**Owner:** AI/ML Platform team / Data Engineering
**Target:** Before Phase 3 sprint (BATCH-US-002)

---

## DQI Scoring Formula — Weight Validation

**ID:** OQ-05
**Category:** Business Rules / Product
**Priority:** MEDIUM — does not block implementation but affects DQI accuracy

**Issue:**
The spec defines DQI weights as:
- Missing fields: 0.30
- Invalid format: 0.30
- Duplicates: 0.20
- Schema drift: 0.20

These weights are **inferred** from the PPT's listing order and equal-importance assumption. The PPT states the 4 components but does not specify weights.

**Questions:**
- Are these weights correct from a credit bureau data governance perspective?
- Should different source types (bank vs telecom vs utility) have different weight profiles?
- Should the DQI be configurable per institution?
- What DQI threshold constitutes "acceptable" quality? (The spec uses 70 for alerts and 90 for NFR average — are these thresholds validated with the product team?)
- Should L2 cross-field failures contribute to a separate component (currently they are not directly in the 4-component formula)?

**Owner:** Product Manager (EPIC-14) + Data Governance team
**Target:** Before Phase 5 sprint (BATCH-US-010)

---

## Pull-SFTP — Institution Credential Management

**ID:** OQ-06
**Category:** Security / Architecture
**Priority:** MEDIUM — blocks pull-SFTP mode

**Issue:**
In pull mode (`intake_mode = PULL`), HCB connects to the institution's SFTP server using credentials stored in `institutions.sftp_config_json`. Questions:
- Where are institution SFTP private keys stored? The spec references `vault://sftp-keys/{institution_id}` — is HashiCorp Vault provisioned and available?
- How are pull-SFTP credentials rotated? When an institution rotates their SFTP key, what is the process to update HCB's stored reference?
- Should pull-SFTP credentials be provisioned through the Institution Management API (EPIC-02) or through a separate ops workflow?
- Should HCB mark the downloaded file on the institution's SFTP after successful S3 staging (rename to `.done` or move to a processed folder)? This is configurable in the spec (`hcb.sftp.pull-mark-processed`) but the institution must provision the write permission.
- What happens if HCB's polling IP is blocked by the institution's firewall? Alert chain unclear.

**Owner:** Security team + EPIC-02 (Institution Management) team
**Target:** Before pull-SFTP implementation sprint

---

## PAUSED Job — Maximum Wait Time and Auto-Expiry

**ID:** OQ-07
**Category:** Business Rules
**Priority:** MEDIUM

**Issue:**
The spec defines `PAUSED` as an indefinite state awaiting operator action. There is no defined maximum time a job can remain PAUSED. Questions:
- Should a PAUSED job auto-expire (transition to `FAILED`) after a configurable duration (e.g., 48 hours) if no operator action is taken?
- Should the institution be notified again if a PAUSED job remains unactioned for X hours?
- Can multiple jobs for the same institution be PAUSED simultaneously (currently yes, since serial execution only applies to PROCESSING, not PAUSED)?
- Should `PAUSED` count against the institution's SLA?

**Recommendation:** Define `hcb.batch.paused-expiry-hours` (suggested default: 72h). After expiry: transition to `FAILED`, set `failure_reason = PAUSED_EXPIRY_TIMEOUT`, notify Bureau Admin.

**Owner:** Product Manager + Operations
**Target:** Before PAUSE semantics implementation

---

## Partially Completed Jobs — Reprocess Failed Records

**ID:** OQ-08
**Category:** Feature Scope
**Priority:** LOW (deferred)

**Issue:**
The spec states (and the markdown v1 notes as future): "PARTIALLY_COMPLETED jobs may be retried (reprocesses failed records only — future)". The current retry implementation restarts from `last_successful_phase`, which would re-process all records (both originally passed and failed).

Questions:
- Is selective reprocessing of only failed records in scope for any current sprint?
- If yes: where are the originally-failed records stored for reprocessing? Currently they exist in `batch_error_samples` (sampled, max 100) and `s3_error_records_path` (full set). The full set from S3 would be required for reprocessing.
- If reprocessing is supported: does the retry create a new `batch_job_id` (preferred for audit clarity) or extend the existing job?

**Owner:** Product Manager
**Deferred to:** Phase 7 (per execution roadmap)

---

## Report Upload to SFTP — Institution File Access

**ID:** OQ-09
**Category:** Architecture
**Priority:** MEDIUM

**Issue:**
`S61_ERR_REPT` and `S62_DQ_REPRT` upload reports to the institution's SFTP `processed/{job_uuid}/` folder. Questions:
- Who writes to the institution's `processed/` folder? Currently `SftpPollerService` manages the SFTP connection and lifecycle moves. The report upload would need to use the same connection context.
- If the institution's SFTP uses PUSH mode (bureau-hosted SFTP), the bureau server can write files freely. If PULL mode (institution-hosted SFTP), the bureau must have write permission on the institution's server — which is not guaranteed.
- For PULL mode: should reports be uploaded to a separate `reports/` folder on the institution's SFTP? Or only delivered via email/webhook attachment/S3 pre-signed URL?
- File naming for reports: the spec uses `run_{retry_count}` suffix. Should there also be a timestamp suffix to prevent overwrites?

**Owner:** Platform Engineering + Integration team
**Target:** Before Phase 5 sprint (BATCH-US-008 Post-Processing)

---

## Schema Agent Inside/Outside Relationship

**ID:** OQ-10
**Category:** Schema Design
**Priority:** MEDIUM

**Issue:**
The PPT (slide 13) mentions the Schema Agent creates "inside/outside relationship" mapping between source and expected schema. This concept is not documented in EPIC-05 (Schema Mapper Agent spec) or in EPIC-14.

Questions:
- What does "inside/outside relationship" mean in the context of schema mapping? (Possible interpretation: inside = core credit fields required by bureau; outside = enrichment or non-credit fields)
- How does this relationship affect `mapping_pairs`? Are "outside" fields flagged differently?
- Should "outside" fields be treated as `FLAG` under `UnmappedAction` (keep with prefix) by default?
- Is this concept already modelled in `schema_mapper_registry` or does it require a new column?

**Owner:** EPIC-05 (Schema Mapper Agent) team + Data Governance
**Target:** Schema Agent team to clarify before S14_SCHM_LKP implementation

---

## Trend and Analytics Data Model

**ID:** OQ-11
**Category:** Data Model
**Priority:** MEDIUM — blocks P5_DATA_LOAD completeness

**Issue:**
The PPT (slide 9) says P5 loads: "Customer profile data / Trend data / Data for Analytics etc." The spec maps:
- Customer profile → `consumers` + `credit_profiles`
- Tradelines → existing `tradelines` table

But `trend_records` and `analytics_records` are referenced as new tables without a defined schema.

Questions:
- What constitutes "trend data"? Is it aggregated over time (e.g., monthly balance snapshots per consumer)?
- What constitutes "analytics data"? Is it pre-computed aggregates for reporting?
- Are `trend_records` and `analytics_records` new physical tables, or are they materialised views on `tradelines`?
- Who owns the schema definition for these tables?
- Do they have FK constraints to `consumers` and `tradelines`?

**Owner:** Data Engineering + Analytics team
**Target:** Before P5_DATA_LOAD implementation sprint

---

## Notification — Email Template Ownership

**ID:** OQ-12
**Category:** Product / Operations
**Priority:** LOW

**Issue:**
`S63_NOTIF_TR` sends email/webhook/dashboard alerts with outcome templates (`SUCCESS`, `PARTIAL_SUCCESS`, `FAILED`, `QUARANTINED`, `PAUSED`, `CANCELLED`, `PERMANENTLY_FAILED`). Questions:
- Who owns the email template content and formatting?
- Should the error report (JSON) be attached to the email, or only the pre-signed URL?
- What are the size limits for webhook payloads?
- Should the Data Operator also receive a copy of SUCCESS notifications, or only PAUSED/FAILED?
- What is the retry behaviour for failed email delivery? (The spec says notification failure doesn't affect job status, but silent failure is a risk.)

**Owner:** Product Manager + Operations
**Target:** Before S63_NOTIF_TR implementation

---

## SFTP Archive Folder — Long-term Retention Ownership

**ID:** OQ-13
**Category:** Infrastructure
**Priority:** LOW

**Issue:**
The spec retains the `archive/` SFTP folder with 30-day retention. With S3 staging in place, long-term archival is conceptually covered by S3. Questions:
- Should the `archive/` SFTP folder be deprecated in favour of S3-only archival?
- If retained: who moves files from `processed/` to `archive/`? Is this a scheduled job in `SftpPollerService`?
- What is the institution-facing expectation? Can institutions retrieve archived files from SFTP after the 30-day window?

**Owner:** Platform Engineering + Operations
**Target:** Can be deferred to Phase 7

---

## Monitoring — EPIC-09 KPI Query Backward Compatibility

**ID:** OQ-14
**Category:** Integration / Migration
**Priority:** MEDIUM

**Issue:**
Existing EPIC-09 `MonitoringController` KPI queries read from `api_requests` table (backward-compat row written at P5). The new tracking architecture uses `batch_tracking_snapshots`. Questions:
- Is the `api_requests` backward-compat row (tracking point #40 in the v1 spec) still required?
- When should it be deprecated? Is there a migration plan for EPIC-09 queries to use `batch_tracking_snapshots` instead?
- Are there any direct SQL queries in EPIC-09 that will break if `api_requests` no longer receives batch pipeline rows?

**Owner:** EPIC-09 (Monitoring) team
**Target:** Coordinate with EPIC-09 sprint

---

## IR Engine — Multi-Source Cross-Institution Identity Unification

**ID:** OQ-15
**Category:** Feature Scope / Architecture
**Priority:** LOW (deferred)

**Issue:**
The v1 spec notes: "Multi-source matching (future): cross-institution identity unification using phone_hash and email_hash as secondary match signals." The PPT describes the IR Engine as performing cluster assignment.

Questions:
- Is cross-institution identity unification in scope for the IR Engine in the current integration?
- If yes: does the IR Engine already receive phone_hash and email_hash in the current `POST /ir/v1/cluster-assign` request? (The spec includes them as optional fields — but are they used?)
- If the IR Engine unifies consumers across institutions: what happens to existing `consumers` rows in HCB's DB that were created with institution-scoped identity? Does the IR Engine's response override the existing consumer_id?

**Owner:** IR Engine team + Identity Resolution team
**Target:** Future sprint; document as deferred in BATCH-US-006

---

## Summary Table

| ID | Title | Priority | Owner | Blocks |
|----|-------|----------|-------|--------|
| OQ-01 | P5 Rollback | HIGH | Platform Eng + Data Eng | BATCH-US-012 |
| OQ-02 | IR Engine SLA | HIGH | IR Engine team | BATCH-US-006 |
| OQ-03 | S3 IAM Policy | HIGH | Infrastructure | BATCH-US-001 |
| OQ-04 | Agentic Parser | HIGH | AI/ML Platform | BATCH-US-002 |
| OQ-05 | DQI Formula Weights | MEDIUM | Product + Governance | BATCH-US-010 |
| OQ-06 | Pull-SFTP Credentials | MEDIUM | Security + EPIC-02 | Pull-SFTP mode |
| OQ-07 | PAUSED Expiry | MEDIUM | Product + Ops | PAUSE semantics |
| OQ-08 | Partial Retry | LOW | Product | Deferred Phase 7 |
| OQ-09 | Report SFTP Upload | MEDIUM | Platform Eng | BATCH-US-008 |
| OQ-10 | Inside/Outside Schema | MEDIUM | EPIC-05 team | S14_SCHM_LKP |
| OQ-11 | Trend/Analytics Schema | MEDIUM | Data Eng + Analytics | S51_DATA_LOD |
| OQ-12 | Notification Templates | LOW | Product + Ops | S63_NOTIF_TR |
| OQ-13 | Archive Folder | LOW | Infra + Ops | Deferred Phase 7 |
| OQ-14 | EPIC-09 KPI Compat | MEDIUM | EPIC-09 team | Monitoring integration |
| OQ-15 | Cross-Institution IR | LOW | IR Engine team | Deferred future |
