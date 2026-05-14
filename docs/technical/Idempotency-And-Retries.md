# Idempotency, deduplication, and retries

**Version:** 1.0.0 | **Date:** 2026-03-29 | **Audience:** Backend, integrations, billing

Financial and credit-adjacent APIs must avoid **duplicate side effects** when clients retry on timeouts or `5xx`/`429`. This document specifies the **target** behaviour for production HCB services. The Fastify dev API does not implement idempotency keys end-to-end today; treat this as the **implementation contract** for production hardening.

---

## 1. Idempotency-Key header

| Aspect | Rule |
|--------|------|
| Header name | `Idempotency-Key` |
| Format | Opaque string, 16–128 chars; UUID v4 recommended |
| Scope | Per **route + API credential** (or per **tenant** + user for admin JWT mutations) |
| TTL | Minimum **24 hours** for write endpoints; **72 hours** for billing-adjacent POSTs |
| Storage | Server stores `(key, route, principal_hash) → response snapshot` or `(key → created_resource_id)` |

### 1.1 Replay behaviour

- **First request:** process normally; persist outcome under the key until TTL expires.
- **Identical replay** (same key, same body hash): return **same HTTP status and body** as the original without re-executing side effects.
- **Conflict:** same key with **different** body → **409** `ERR_CONFLICT` with safe message (“Idempotency key reused with different payload”).

### 1.2 Endpoints that must support idempotency (production target)

- Tradeline / account submission POSTs  
- Bureau enquiry POSTs (hard/soft pull)  
- Report generation POSTs  
- Billing or usage-metering POSTs  
- Institution/product/consortium **mutations** where double-submit causes duplicate approvals or charges (optional but recommended for admin APIs exposed to integrators)

---

## 2. Retry classification

| Condition | Retry? | Strategy |
|-----------|--------|----------|
| 400, 401, 403, 404, 409, 422 | No | Fix client |
| 429 | Yes | Exponential backoff + jitter; respect `Retry-After` if present |
| 500, 502, 503, 504 | Yes* | Backoff + jitter; cap attempts |
| Network timeout / no response | Yes* | Same as 503 |

\*Only with **idempotency** for non-safe methods (POST). **GET/HEAD** retries are safe without keys.

---

## 3. Async jobs (reports, batch)

- Jobs receive a **stable job id**; duplicate create requests with the same idempotency key must return the **same job id**.
- States: `queued` → `processing` → `completed` | `failed` | `cancelled`.
- **DLQ:** after max retries, move to dead-letter with reason; **no silent drop**.
- Poison messages: quarantine after N failures; alert ops.

---

## 4. Related documents

- [Global-API-Error-Dictionary.md](./Global-API-Error-Dictionary.md)
- [Production-Backend-Roadmap.md](./Production-Backend-Roadmap.md)
