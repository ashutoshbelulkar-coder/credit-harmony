# Canonical backend for the HCB Admin Portal SPA

**Date:** 2026-03-29

## Summary

For local development, the React app is designed to talk to the **in-repo Fastify server** in `server/` on **port 8091**. That process is the **contract owner** for `src/services/*.service.ts` and `src/hooks/api/*` when you run `npm run server` and `npm run dev` with `VITE_USE_MOCK_FALLBACK=false`.

The **Spring Boot** application in `backend/` (default **port 8090**) is a separate track: normalized SQLite/PostgreSQL, RBAC, and overlapping but **not identical** REST shapes. Pointing the SPA at it requires `VITE_API_PROXY_TARGET=http://127.0.0.1:8090` (or your host) **when starting Vite**, plus client adapters for pagination and HTTP verbs — see [SPA-Service-Contract-Drift.md](./SPA-Service-Contract-Drift.md).

## Vite proxy

[`vite.config.ts`](../../vite.config.ts) sets:

```ts
proxy: {
  "/api": {
    target: process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:8091",
    ...
  },
}
```

Set `VITE_API_PROXY_TARGET` in the environment (or `.env.development`) **before** `npm run dev` so the config picks it up.

## Commands

| Goal | Command |
|------|---------|
| SPA + default Fastify API | Terminal 1: `npm run server` — Terminal 2: `VITE_USE_MOCK_FALLBACK=false npm run dev` |
| SPA → Spring (experimental) | Run Spring on 8090, then `VITE_API_PROXY_TARGET=http://127.0.0.1:8090 VITE_USE_MOCK_FALLBACK=false npm run dev` |
| E2E (live API, no mock fallback) | `npm run test:e2e` (starts Fastify + Vite on 4173) |

## Health check

Fastify exposes `GET /api/v1/health` (no auth) for probes and Playwright readiness.

## Audit log / User Management Activity Log

On startup, Fastify fills `state.auditLog` from `user-management.json` `activityLog`, sample governance rows, and dev-user samples (`server/src/auditSeed.ts`). Mutating handlers in `server/src/index.ts` call **`pushAudit`** (~33 sites), including **login** (success/failure paths), **logout**, **approval** approve/reject/request-changes, **institutions** (create, upload, suspend, PATCH, reactivate, delete, consortium/product/billing/API access/consent), **users**, **roles** CRUD, **batch** retry/cancel, **alert-rule** create, **product** and **consortium** create. **`GET /api/v1/audit-logs`** supports `actionType`, `entityType`, `entityId`, `userId`, `from`, and `to`. The Activity Log page uses **`allowMockFallback: false`** so it never substitutes `mockActivity` when the API errors.

`POST /api/v1/approvals/:id/approve` (and reject / request-changes) also append **`APPROVAL_*`** audit rows (`entityType: APPROVAL`).

## Data products → approval queue (dev API)

When the SPA saves a new catalogue product with `status: approval_pending` (the default on **Create product**), Fastify:

1. Appends the product to in-memory `state.products` (with optional `packetIds`, `packetConfigs`, `enquiryConfig` from the form).
2. Prepends an approval item to `state.approvals` with `type: "product"` and `metadata: { productId: "<id>" }`.
3. Writes an audit row (`PRODUCT_CREATE`).

`POST /api/v1/approvals/:id/approve` sets the linked product’s `status` to **`active`** and records **`pushAudit`** (`APPROVAL_APPROVE`). Reject and request-changes update linked entities and record **`APPROVAL_REJECT`** / **`APPROVAL_REQUEST_CHANGES`**. The React app invalidates both **products** and **approvals** query keys after create/update and after queue actions so lists stay in sync.

This behaviour is implemented in `server/src/index.ts` (not in the Spring Boot `backend/` track unless separately ported).

## Consortiums → approval queue (dev API)

When the SPA completes **Create consortium** (`POST /api/v1/consortiums` with `status: approval_pending`, the default when the field is omitted), Fastify:

1. Inserts the consortium into `state.consortiums` (and persists `dataPolicy` and other body fields on the row).
2. Applies `members` via `state.consortiumMembers` (same as before).
3. Prepends an approval item with `type: "consortium"` and `metadata: { consortiumId: "<id>" }`.
4. Writes an audit row (`CONSORTIUM_CREATE`).

Approval **approve** sets the linked consortium’s `status` to **`active`**. **Reject** and **request-changes** set it to **`pending`** (UI lists non-`active` as “Draft”). React Query invalidates **consortiums** and **approvals** after create/update and after queue actions.

To create a consortium **without** an approval item (e.g. automation), send an explicit `status` other than `approval_pending` / `pending`, such as `active`.

## Member registration → list + approval queue (dev API)

`POST /api/v1/institutions` (used by **Register member**) creates the institution with `institutionLifecycleStatus` defaulting to **`pending`** when omitted, pushes it into `state.institutions`, and prepends an approval item with `type: "institution"` and `metadata: { institutionId: "<numeric id>" }`.

The SPA **Member Institutions** page loads **`GET /api/v1/institutions?page=0&size=200`** so the full in-memory catalogue (up to the server cap) is available for the table; otherwise the first API page (default 20) can hide newly appended members when the seed set is large.

After registration, the client invalidates **institutions** and **approvals** and navigates to **`/institutions`**. Approving from the queue runs the existing handler that sets the institution to **`active`** and should trigger another **institutions** invalidation from the approval mutation.

## Related (target contracts)

- [Global-API-Error-Dictionary.md](./Global-API-Error-Dictionary.md) — error envelope and codes for production alignment  
- [Idempotency-And-Retries.md](./Idempotency-And-Retries.md) — write idempotency and async retries  
- [Multi-Tenant-Target-Architecture.md](./Multi-Tenant-Target-Architecture.md) — SaaS isolation model  
- [AI-Governance-Framework.md](./AI-Governance-Framework.md) — agents and LLM governance
