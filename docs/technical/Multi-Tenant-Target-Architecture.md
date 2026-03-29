# Multi-tenant SaaS — target architecture

**Version:** 1.0.0 | **Date:** 2026-03-29 | **Audience:** Enterprise architecture, security, product

The current admin portal models **institutions** (members) and **bureau operators**. **Multi-tenant SaaS** for multiple independent bureaus or white-label deployments requires an explicit **tenant** boundary above institutions. This document is a **target** reference; the Fastify dev API is single-tenant/in-memory.

---

## 1. Definitions

| Term | Meaning |
|------|---------|
| **Tenant** | Isolated customer of the platform (e.g. a national bureau operator, a regional credit network). Owns configuration, branding limits, SLAs, and billing account. |
| **Institution** | Bank / MFI / subscriber member **within** a tenant’s registry. |
| **Break-glass** | Super-admin cross-tenant access for support; fully audited, time-bound, MFA-gated. |

**Rule:** `tenant_id` must appear on **every** durable row and log line in production (or be implied by **database-per-tenant** / **schema-per-tenant** with no shared tables without tenant scoping).

---

## 2. Isolation patterns (choose one primary)

| Pattern | Pros | Cons |
|---------|------|------|
| **RLS (PostgreSQL)** | Single fleet, operational simplicity | Careful migration discipline |
| **Schema per tenant** | Strong isolation | Many schemas at scale |
| **Database per tenant** | Maximum isolation | Cost, ops complexity |
| **Silo + shared control plane** | Hybrid | Two operational models |

Recommendation for HCB-scale: **RLS + encrypted columns** for PII, with optional **dedicated DB** for regulated “premium” tenants.

---

## 3. Configuration per tenant

- Feature flags, consent templates, SLA thresholds, rate limits, API gateway routes, and **data retention** profiles.
- Version configuration changes; audit who changed what (append-only).

---

## 4. Billing and metering

- Emit **usage events** with `tenant_id`, `institution_id`, `product_id`, `idempotency_key`, `quantity`, `timestamp`.
- Align events with [Idempotency-And-Retries.md](./Idempotency-And-Retries.md) for billable POSTs.

---

## 5. Security

- JWT claims include **`tenant_id`** and **role scopes** limited to that tenant.
- No cross-tenant queries without break-glass policy.
- Encryption: tenant-scoped CMKs optional for high-assurance deployments.

---

## 6. Related documents

- [Global-API-Error-Dictionary.md](./Global-API-Error-Dictionary.md)
- [ERD-Schema-Map.md](./ERD-Schema-Map.md) (extend with `tenant_id` on core entities for production)
- [Production-Backend-Roadmap.md](./Production-Backend-Roadmap.md)
