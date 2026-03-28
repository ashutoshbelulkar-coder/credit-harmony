# API ↔ UI parity matrix (HCB Admin Portal)

**Version:** 1.1.0 | **Date:** 2026-03-29  
**Scope:** In-repo **Fastify** dev API (`server/src/index.ts`) and React SPA (`src/`).

This matrix records whether primary UI actions persist via HTTP. “Persisted” means the dev API mutates in-memory state (restart resets data).

| Area | UI surface | HTTP | Persisted in dev API | Notes |
|------|------------|------|----------------------|-------|
| Auth | Login / refresh / logout | POST login, refresh; POST logout | Yes | JWT access + refresh rotation |
| Institutions | List, detail, CRUD, suspend/reactivate | GET/PATCH/POST/DELETE | Yes | Soft delete (`isDeleted`) |
| Institution docs | Register wizard uploads | POST multipart | Yes | Updates `complianceDocs` |
| Consortium memberships (institution) | Memberships tab | GET/POST/DELETE | Yes | `state.institutionConsortiumMemberships` |
| Product subscriptions (institution) | Products tab | GET/POST/PATCH | Yes | `state.institutionProductSubscriptions` |
| Billing | Billing tab | GET summary, PATCH billing | Yes | Overrides on institution |
| API access | Institution API access tab | GET/PATCH | Yes | |
| Users | List, invite, suspend, activate, drawer | GET, POST invite, POST suspend/activate, **PATCH**, **POST deactivate** | Yes | Audit rows for lifecycle events (`entityType: USER`) |
| Approvals | Queue actions | GET, POST approve/reject/request-changes | Yes | |
| Batch jobs | Retry / cancel | POST retry/cancel | Yes | Updates job `status` (e.g. Queued / Cancelled) |
| Alert rules | List, create, **edit**, toggle, delete | GET/POST/PATCH/DELETE + activate/deactivate | Yes | Edit uses PATCH |
| Alert incidents | Ack / resolve | POST | Yes | |
| Consortiums | Wizard create/edit | POST/PATCH with `members`, `dataPolicy` | Yes | Members in `state.consortiumMembers`; GET `/members` reads store |
| Products | Catalogue CRUD | REST | Yes | |
| Reports | Request / cancel / retry / delete | REST | Yes | |
| Roles | CRUD | REST | Yes | |
| Dashboard | Export button | — | N/A | **Client-side CSV** of KPI snapshot (tooltip documents behaviour) |
| Login | Forgot password / SSO (when shown) | — | N/A | Demo UI gated by `VITE_SHOW_DEMO_AUTH_UI` / prod hidden |
| Agents | “Contact admin” sheet | — | N/A | Toast only; message clarifies demo vs prod |

### Orphan client helpers (historical)

- Older docs referenced `DELETE /v1/users/:id`; the dev API implements **`POST /v1/users/:id/deactivate`** instead (`deactivateUser` in `users.service.ts`).

### Contract testing

- Automated checks: `server/src/api.integration.test.ts` (Vitest, `app.inject`).
- Future: publish OpenAPI from the chosen production backend and add contract tests for the SPA service layer.

---

### Appendix — Fastify route index (`server/src/index.ts`)

All paths below are under the same origin as the SPA in dev when using Vite proxy (`/api` → `http://127.0.0.1:8091`). **Most routes require** `Authorization: Bearer <accessToken>` except login and refresh.

| Method | Path |
|--------|------|
| POST | `/api/v1/auth/login` |
| POST | `/api/v1/auth/refresh` |
| POST | `/api/v1/auth/logout` |
| GET | `/api/v1/institutions` |
| GET | `/api/v1/institutions/:id` |
| GET | `/api/v1/institutions/:id/overview-charts` |
| POST | `/api/v1/institutions/:id/documents` |
| POST | `/api/v1/institutions` |
| PATCH | `/api/v1/institutions/:id` |
| POST | `/api/v1/institutions/:id/suspend` |
| POST | `/api/v1/institutions/:id/reactivate` |
| DELETE | `/api/v1/institutions/:id` |
| GET | `/api/v1/institutions/:id/consortium-memberships` |
| POST | `/api/v1/institutions/:id/consortium-memberships` |
| DELETE | `/api/v1/institutions/:id/consortium-memberships/:membershipId` |
| GET | `/api/v1/institutions/:id/product-subscriptions` |
| POST | `/api/v1/institutions/:id/product-subscriptions` |
| PATCH | `/api/v1/institutions/:id/product-subscriptions/:subscriptionId` |
| GET | `/api/v1/institutions/:id/billing-summary` |
| PATCH | `/api/v1/institutions/:id/billing` |
| GET | `/api/v1/institutions/:id/api-access` |
| PATCH | `/api/v1/institutions/:id/api-access` |
| GET | `/api/v1/institutions/:id/consent` |
| PATCH | `/api/v1/institutions/:id/consent` |
| GET | `/api/v1/institutions/:id/monitoring-summary` |
| GET | `/api/v1/api-keys` |
| POST | `/api/v1/api-keys` |
| POST | `/api/v1/api-keys/:id/regenerate` |
| POST | `/api/v1/api-keys/:id/revoke` |
| GET | `/api/v1/approvals` |
| POST | `/api/v1/approvals/:id/approve` |
| POST | `/api/v1/approvals/:id/reject` |
| POST | `/api/v1/approvals/:id/request-changes` |
| GET | `/api/v1/users` |
| POST | `/api/v1/users/invitations` |
| POST | `/api/v1/users/:id/suspend` |
| POST | `/api/v1/users/:id/activate` |
| PATCH | `/api/v1/users/:id` |
| POST | `/api/v1/users/:id/deactivate` |
| GET | `/api/v1/roles` |
| POST | `/api/v1/roles` |
| PATCH | `/api/v1/roles/:id` |
| DELETE | `/api/v1/roles/:id` |
| GET | `/api/v1/audit-logs` |
| GET | `/api/v1/monitoring/api-requests` |
| GET | `/api/v1/monitoring/kpis` |
| GET | `/api/v1/monitoring/enquiries` |
| GET | `/api/v1/monitoring/charts` |
| GET | `/api/v1/batch-jobs` |
| GET | `/api/v1/batch-jobs/:id` |
| GET | `/api/v1/batch-jobs/:id/detail` |
| GET | `/api/v1/batch-jobs/kpis` |
| POST | `/api/v1/batch-jobs/:id/retry` |
| POST | `/api/v1/batch-jobs/:id/cancel` |
| GET | `/api/v1/alert-rules` |
| POST | `/api/v1/alert-rules` |
| PATCH | `/api/v1/alert-rules/:id` |
| DELETE | `/api/v1/alert-rules/:id` |
| POST | `/api/v1/alert-rules/:id/activate` |
| POST | `/api/v1/alert-rules/:id/deactivate` |
| GET | `/api/v1/alert-incidents` |
| GET | `/api/v1/alert-incidents/charts` |
| GET | `/api/v1/alert-incidents/breach-history` |
| POST | `/api/v1/alert-incidents/:id/acknowledge` |
| POST | `/api/v1/alert-incidents/:id/resolve` |
| GET | `/api/v1/sla-configs` |
| PATCH | `/api/v1/sla-configs/:id` |
| GET | `/api/v1/reports` |
| POST | `/api/v1/reports` |
| DELETE | `/api/v1/reports/:id` |
| POST | `/api/v1/reports/:id/cancel` |
| POST | `/api/v1/reports/:id/retry` |
| GET | `/api/v1/dashboard/metrics` |
| GET | `/api/v1/dashboard/charts` |
| GET | `/api/v1/dashboard/activity` |
| GET | `/api/v1/dashboard/command-center` |
| GET | `/api/v1/consortiums` |
| GET | `/api/v1/consortiums/:id` |
| GET | `/api/v1/consortiums/:id/members` |
| POST | `/api/v1/consortiums` |
| PATCH | `/api/v1/consortiums/:id` |
| DELETE | `/api/v1/consortiums/:id` |
| GET | `/api/v1/products` |
| GET | `/api/v1/products/:id` |
| POST | `/api/v1/products` |
| PATCH | `/api/v1/products/:id` |
| DELETE | `/api/v1/products/:id` |

*If this appendix drifts from code, treat `server/src/index.ts` as authoritative and update this table in the same PR.*
