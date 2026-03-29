# Global API error dictionary (target contract)

**Version:** 1.0.0 | **Date:** 2026-03-29 | **Audience:** API consumers, SPA client, compliance reviewers

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
| `ERR_INTERNAL` | 500 | Yes* | Unexpected server failure | Retry with idempotency; alert ops |
| `ERR_SERVICE_UNAVAILABLE` | 503 | Yes | Dependency down / maintenance | Backoff |

\*Retry only for **idempotent** reads or POSTs with `Idempotency-Key` (see [Idempotency-And-Retries.md](./Idempotency-And-Retries.md)).

### 2.1 Fastify dev API — observed codes (as of snapshot)

The dev server uses a subset aligned with the table above, including: `ERR_UNAUTHORIZED`, `ERR_AUTH_FAILED`, `ERR_ACCOUNT_SUSPENDED`, `ERR_NO_REFRESH_TOKEN`, `ERR_REFRESH_FAILED`, `ERR_NOT_FOUND`, `ERR_VALIDATION`, `ERR_CONFLICT`, `ERR_INTERNAL`. Extend this file when new codes ship; keep [openapi-hcb-fastify-snapshot.yaml](./openapi-hcb-fastify-snapshot.yaml) and integration tests in sync.

---

## 3. Logging

- Log `correlationId`, `error.code`, HTTP status, route, **tenant/bureau id** (when multi-tenant), and **actor id** (when authenticated).
- Never log passwords, refresh tokens, raw API keys, or unmasked PII in error paths.

---

## 4. Related documents

- [Idempotency-And-Retries.md](./Idempotency-And-Retries.md)
- [SPA-Service-Contract-Drift.md](./SPA-Service-Contract-Drift.md)
- [Data-Flow-Diagram.md](./Data-Flow-Diagram.md) (diagram `ERR_*` labels)
