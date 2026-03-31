# Global API error dictionary (target contract)

**Version:** 1.1.0 | **Date:** 2026-03-30 | **Audience:** API consumers, SPA client, compliance reviewers

This document defines the **target** error model for HCB platform APIs. The in-repo **Fastify** dev server (`server/src/index.ts`) returns JSON shaped as `{ error, message }` today; production APIs should converge on the **envelope** below and the **stable codes** in the catalogue.

---

## 1. Standard error response envelope

```json
{
  "error": {
    "code": "ERR_VALIDATION",
    "message": "Human-safe summary for operators and clients"
  },
  "details": [
    { "field": "consentReference", "issue": "expired" }
  ],
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "retryable": false
}
```

| Field | Required | Rules |
|-------|----------|--------|
| `error.code` | Yes | `ERR_SNAKE_CASE` from this dictionary; never replace with free text. |
| `error.message` | Yes | Safe for end users; no stack traces, SQL, or PII. |
| `details` | No | Field-level or structured hints; omit if empty. |
| `correlationId` | Yes (prod) | Propagate from gateway or generate per request; log on server. |
| `retryable` | Yes | Client hint for backoff; must match §3. |

**HTTP status** is authoritative for transport semantics; `error.code` must be consistent with it (e.g. `ERR_NOT_FOUND` → 404).

---

## 2. Code catalogue (initial)

| Code | HTTP | Retryable | Meaning | Typical client action |
|------|------|-----------|---------|------------------------|
| `ERR_UNAUTHORIZED` | 401 | No | Missing or invalid Bearer token | Refresh token or re-login |
| `ERR_AUTH_FAILED` | 401 | No | Wrong credentials | Fix credentials |
| `ERR_ACCOUNT_SUSPENDED` | 403 | No | User or institution not active | Contact admin |
| `ERR_ACCESS_DENIED` | 403 | No | Authenticated but RBAC/ABAC denies | Escalate permissions |
| `ERR_NO_REFRESH_TOKEN` | 401 | No | Refresh body invalid | Re-login |
| `ERR_REFRESH_FAILED` | 401 | No | Revoked/expired refresh | Re-login |
| `ERR_NOT_FOUND` | 404 | No | Resource id unknown | Fix reference |
| `ERR_VALIDATION` | 400 | No | Schema/business validation failed | Fix payload |
| `ERR_CONFLICT` | 409 | No | Duplicate or state conflict | Merge or retry with new idempotency key |
| `ERR_RATE_LIMITED` | 429 | Yes | Quota or burst exceeded | Exponential backoff |
| `ERR_CONSENT_REQUIRED` | 403 | No | Consent missing/expired/wrong scope | Obtain valid consent |
| `ERR_INSTITUTION_PENDING_APPROVAL` | 403 | No | Member institution not yet approved / still **pending** | Wait for approval or contact bureau ops |
| `ERR_INSTITUTION_SUSPENDED` | 403 | No | Member institution **suspended** by operator | Contact bureau ops to reactivate |
| `ERR_INSTITUTION_DRAFT` | 403 | No | Member institution still in **draft** (onboarding incomplete) | Complete registration and approval |
| `ERR_INSTITUTION_NOT_ACTIVE` | 403 | No | Member lifecycle status is neither **active** nor one of the specific states above | Fix lifecycle state before calling traffic APIs |
| `ERR_INSTITUTION_NOT_FOUND` | 403 | No | API key or batch context could not be mapped to a member row (traffic path) | Fix key configuration or institution id |
| `ERR_INTERNAL` | 500 | Yes* | Unexpected server failure | Retry with idempotency; alert ops |
| `ERR_SERVICE_UNAVAILABLE` | 503 | Yes | Dependency down / maintenance | Backoff |

\*Retry only for **idempotent** reads or POSTs with `Idempotency-Key` (see [Idempotency-And-Retries.md](./Idempotency-And-Retries.md)).

**Spring note:** `com.hcb.platform.common.GlobalExceptionHandler` maps uncaught exceptions to **`500`** + **`ERR_INTERNAL`** without exposing SQL or stack traces. A common **local** cause (now guarded by tests) was **JdbcTemplate** queries referencing columns not present in **`backend/src/main/resources/db/create_tables.sql`**. If list **GET** routes still return **`500`**, run **`npm run spring:test`**, re-seed SQLite, and compare the controller SQL to DDL — see [Technical-Decision-Log.md](./Technical-Decision-Log.md) **TDL-018**.

### 2.1 Fastify dev API — observed codes (as of snapshot)

The dev server uses a subset aligned with the table above, including: `ERR_UNAUTHORIZED`, `ERR_AUTH_FAILED`, `ERR_ACCOUNT_SUSPENDED`, `ERR_NO_REFRESH_TOKEN`, `ERR_REFRESH_FAILED`, `ERR_NOT_FOUND`, `ERR_VALIDATION`, `ERR_CONFLICT`, `ERR_INTERNAL`, and (for batch retry) `ERR_INSTITUTION_*` from §2.3. Extend this file when new codes ship; keep [openapi-hcb-fastify-snapshot.yaml](./openapi-hcb-fastify-snapshot.yaml) and integration tests in sync.

### 2.2 Schema Mapper (`/api/v1/schema-mapper`) — envelope

**Spring** and **legacy Fastify** use `{ error: { code, message, details: [] }, requestId }` for domain failures (Spring: `SchemaMapperApiException` → `GlobalExceptionHandler`).

| Code | HTTP | Meaning |
|------|------|---------|
| `ERR_VALIDATION` | 400 | Missing `sourceName`, `schemaVersionId`, etc.; **`GET …/schemas/source-type-fields`** without a concrete `sourceType` query param (or `sourceType=all`). |
| `SCHEMA_VERSION_NOT_FOUND` | 404 | Unknown schema version |
| `MAPPING_NOT_FOUND` | 404 | Unknown mapping id |
| `MAPPING_IN_PROGRESS` | 409 | Job already queued/processing for version |
| `MAPPING_LOCKED` | 422 | Edit not allowed in `under_review` / `active` |
| `CANONICAL_PATH_INVALID` | 422 | PATCH references unknown canonical path |
| `MAPPING_INVALID_STATE` | 422 | Submit approval from wrong status |
| `RULE_NOT_FOUND` | 404 | Validation rule id |

### 2.3 Data Submission API, batch ingestion, and Enquiry API — member must be **active**

**When this applies:** Any ingress where the **member institution** is identified (typically via **subscriber / data-submitter API key**, or **batch job ownership**). **Not** for pure portal JWT routes unless they re-queue member traffic (see Fastify **`POST /api/v1/batch-jobs/:id/retry`** below).

| Code | HTTP | Example `message` (human-safe; tune per product) |
|------|------|--------------------------------------------------|
| `ERR_INSTITUTION_PENDING_APPROVAL` | 403 | This member institution is pending approval. Data Submission API, batch ingestion, and Enquiry API are available only after the institution is approved and active. |
| `ERR_INSTITUTION_SUSPENDED` | 403 | This member institution is suspended. Data Submission API, batch ingestion, and Enquiry API calls are blocked until an operator reactivates the institution. |
| `ERR_INSTITUTION_DRAFT` | 403 | This member institution is in draft and is not active. Complete onboarding and approval before using Data Submission, batch, or Enquiry APIs. |
| `ERR_INSTITUTION_NOT_ACTIVE` | 403 | This member institution is not active. Data Submission API, batch ingestion, and Enquiry API require institution lifecycle status **active**. |
| `ERR_INSTITUTION_NOT_FOUND` | 403 | Member institution could not be resolved for this request. Data Submission, batch, and Enquiry APIs require a valid member. |

**Lifecycle mapping (canonical):** `institutionLifecycleStatus` (or equivalent) **`active`** → allow traffic. Values treated as **pending approval** include **`pending`**, **`approval_pending`** (normalize case and spacing). **`suspended`** → `ERR_INSTITUTION_SUSPENDED`. **`draft`** → `ERR_INSTITUTION_DRAFT`. Any other non-active value → `ERR_INSTITUTION_NOT_ACTIVE`.

**Fastify dev API (partial implementation):** `institutionActiveForTrafficOrError` in `server/src/institutionTrafficGate.ts` implements the table for **`POST /api/v1/batch-jobs/:id/retry`** when the job has **`institution_id`**. External X-API-Key tradeline/enquiry endpoints are **not** implemented in this repo; production gateways should apply the same rules before processing. **`POST …/batch-jobs/:id/cancel`** intentionally does **not** apply this gate so operators can cancel jobs for non-active members.

See [Data-Flow-Diagram.md](./Data-Flow-Diagram.md) (Tradeline Submission and Credit Bureau Inquiry flows).

---

## 3. Logging

- Log `correlationId`, `error.code`, HTTP status, route, **tenant/bureau id** (when multi-tenant), and **actor id** (when authenticated).
- Never log passwords, refresh tokens, raw API keys, or unmasked PII in error paths.

---

## 4. Related documents

- [Idempotency-And-Retries.md](./Idempotency-And-Retries.md)
- [SPA-Service-Contract-Drift.md](./SPA-Service-Contract-Drift.md)
- [Data-Flow-Diagram.md](./Data-Flow-Diagram.md) (diagram `ERR_*` labels)
