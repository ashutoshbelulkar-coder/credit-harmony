# API ↔ UI parity matrix (HCB Admin Portal)

**Version:** 1.3.4 | **Date:** 2026-03-29  
**Scope:** In-repo **Fastify** dev API (`server/src/index.ts`) and React SPA (`src/`).

This matrix records whether primary UI actions persist via HTTP. “Persisted” means the dev API mutates in-memory state (restart resets data).

**OpenAPI (hand snapshot):** [`openapi-hcb-fastify-snapshot.yaml`](./openapi-hcb-fastify-snapshot.yaml).  
**Spring Boot alternate:** Not the Vite default proxy target; drift vs the SPA is documented in [`SPA-Service-Contract-Drift.md`](./SPA-Service-Contract-Drift.md). Canonical choice for local SPA dev: [`Canonical-Backend.md`](./Canonical-Backend.md).

| Area | UI surface | HTTP | Persisted in dev API | Notes |
|------|------------|------|----------------------|-------|
| Auth | Login / refresh / logout | POST login, refresh; POST logout | Yes | JWT access + refresh rotation |
| Institutions | List, detail, CRUD, suspend/reactivate, **register wizard** | GET/PATCH/POST/DELETE + multipart docs | Yes | **List** uses `GET /v1/institutions?page=0&size=200` so new rows are not clipped by default pagination. **POST** creates row + **`institution`** approval (`metadata.institutionId`). **Approve** sets lifecycle **`active`**. **Dev API:** `pushAudit` on create, document upload, suspend, **PATCH**, reactivate, soft delete, and institution sub-resource mutators (consortium membership, product subscription, billing, API access, consent). |
| Institution docs | Register wizard uploads | POST multipart | Yes | Updates `complianceDocs` |
| Consortium memberships (institution) | Memberships tab | GET/POST/DELETE | Yes | `state.institutionConsortiumMemberships` |
| Product subscriptions (institution) | Products tab | GET/POST/PATCH | Yes | `state.institutionProductSubscriptions` |
| Billing | Billing tab | GET summary, PATCH billing | Yes | Overrides on institution |
| API access | Institution API access tab | GET/PATCH | Yes | |
| Users | List, invite, row ⋮ menu, detail drawer | GET, **POST `/v1/users/invitations`**, **POST** `/:id/suspend` \| `/:id/activate` \| `/:id/deactivate`, **PATCH** `/:id` (`roles`, `displayName`, …) | Yes | **Row actions:** View → drawer; **Edit role** → opens drawer + role dialog → **PATCH** + `USER_UPDATE` audit; Suspend / Activate / Deactivate → matching POSTs + audits. **Deactivate** hidden when already deactivated; **Activate** hidden when deactivated. Invite: duplicate email **409**; audit **`USER_INVITE`**. |
| User Management — Activity Log | `/user-management/activity` table | **GET `/v1/audit-logs`** (paginated; **`actionType`**, **`userId`**, **`from`** / **`to`**, **`entityType`** / **`entityId`**) | Yes | **`allowMockFallback: false`** — list is never `mockActivity` JSON. **Seed:** `user-management.json` `activityLog` + sample `GOVERNANCE` rows + per-dev-user rows (`server/src/auditSeed.ts`). **Dynamic:** `pushAudit` (~33 sites in `server/src/index.ts`) on **login** (success/fail), **logout**, **approval** approve/reject/request-changes, **users**, **institutions** (including PATCH/reactivate/delete and sub-tabs), **batch**, **alert-rule** create, **product/consortium** create, **roles** CRUD. **Not audited** until extended: e.g. `auth/refresh`, API keys, many alert/report/product patch/delete paths. Response maps `ipAddress` → `ipAddressHash` for display. |
| Approvals | Queue actions | GET, POST approve/reject/request-changes | Yes | **Institution:** `POST /v1/institutions` enqueues `type: institution`; approve → **`active`**. **Product / consortium / alert_rule:** same pattern. **`pushAudit`:** `APPROVAL_APPROVE`, `APPROVAL_REJECT`, `APPROVAL_REQUEST_CHANGES` with `entityType: APPROVAL`. Mutations invalidate **institutions**, **products**, **consortiums**, **alert** caches as applicable. |
| Batch jobs | Retry / cancel | POST retry/cancel | Yes | Updates job `status` (e.g. Queued / Cancelled) |
| Alert rules | List, create, **edit**, toggle, delete | GET/POST/PATCH/DELETE + activate/deactivate | Yes | **Create:** `POST` persists rule with **`Pending approval`**, prepends **`type: alert_rule`** approval (`metadata.alertRuleId`). **`POST /approvals/:id/approve`** sets rule **`Enabled`**; reject/request-changes → **`Disabled`**. **`POST .../activate`** returns **400** while still pending. Edit uses PATCH. |
| Alert incidents | Ack / resolve | POST | Yes | |
| SLA breach history (filters) | Institution combobox on SLA Configuration page | GET `/v1/institutions?size=300` | Yes (when API up) | `SlaBreachHistory` uses `InstitutionFilterSelect` **`mode="all"`** with **`allowMockFallback: false`**. Table rows still from `GET /v1/sla-configs/breach-history` (or mock fallback for that list only). Institution filter matches row `institution_id` with digit-normalized id. |
| Consortiums | Wizard create/edit | POST/PATCH with `members`, `dataPolicy` | Yes | **POST** requires `name`. Default `status` is **`approval_pending`** (wizard sends explicitly); then prepends **`consortium`** approval with `metadata.consortiumId`. Optional `status: active` skips the queue. Members in `state.consortiumMembers`; GET `/members` reads store. |
| Products | Catalogue CRUD + create form | GET/POST/PATCH/DELETE | Yes | **Create:** `POST /v1/products` validates `name`, stores optional `packetIds`, `packetConfigs`, `enquiryConfig`; if `status` is `approval_pending`, prepends a **`product`** row to `state.approvals` with `metadata.productId`. **Detail GET** returns those catalogue fields when present. In-memory only (restart clears). |
| Reports | Request / cancel / retry / delete | REST | Yes | |
| Roles | List, create, edit, delete (section matrix) | GET/POST/PATCH/DELETE `/v1/roles` | Yes | **Fastify seed** (`server/src/state.ts`) stores the full section×action matrix per built-in role (same defaults as `user-management-mock`). **UI merge:** `mergeRolePermissionsFromApi(roleName, permissions)` — explicit cells from the API win; missing cells fall back to built-in defaults for known role names (covers **Spring `Role`** JSON with no `permissions` field and sparse/placeholder matrices). **GET** rows are normalized (`id` string, `roleName` from `roleName` \| `name` \| `role`). **409** duplicate `roleName`. **Offline:** `local-*` ids; create still POSTs. **Dev API:** `pushAudit` on **ROLE_CREATE** / **ROLE_UPDATE** / **ROLE_DELETE**. |
| Dashboard | Export button | — | N/A | **Client-side CSV** of KPI snapshot (tooltip documents behaviour) |
| Monitoring | Layout KPI alert banners (success rate / P95) | GET `/monitoring/kpis` | Read-only | Uses `useMonitoringKpis` (live API); error card + retry on failure |
| Monitoring (filters) | Data Submission / Enquiry API **Institution** combobox | GET `/v1/institutions?size=300` | Yes (when API up) | `InstitutionFilterSelect` calls `useInstitutions(..., { allowMockFallback: false })`: options are **always** from the API (no `institutions-mock` fallback even if `VITE_USE_MOCK_FALLBACK=true`). Client filters to `isDataSubmitter` (Data Submission API) or `isSubscriber` (Inquiry API). Static labels only for the top option: “All data submission institutes” / “All subscribers”. |
| Monitoring | Inquiry API **Detailed Enquiry Log** table | GET `/v1/monitoring/enquiries` | Read-only | Dev seed merges `monitoring.json` `enquiryLogEntries` with **synthetic** rows (`src/lib/generateEnquiryStateRows.ts`): last **24h** (30m slots) + **36 days** future, subscriber institutions only, sorted newest-first. API supports `status`, `dateFrom`, `dateTo`, `institutionId`, pagination. **InquiryApiSection** “Institute” filter in the log card uses the same **`InstitutionFilterSelect`** (API-only) as the layout toolbar. Time range (5m–24h) is client-side via `isWithinRelativeWindow` (future timestamps stay visible). |
| Institutions (overview) | Usage by Data Products chart | GET `/monitoring/enquiries?institutionId=` or GET `/institutions/:id/monitoring/enquiries` | Read-only | Paged list items include `productId`, `productName`, `alternateDataUsed`; chart counts successful enquiries only (`InstitutionDetail`) |
| Login | Forgot password / SSO (when shown) | — | N/A | Demo UI gated by `VITE_SHOW_DEMO_AUTH_UI` / prod hidden |
| Agents | “Contact admin” sheet | — | N/A | Toast only; message clarifies demo vs prod |

### Orphan client helpers (historical)

- Older docs referenced `DELETE /v1/users/:id`; the dev API implements **`POST /v1/users/:id/deactivate`** instead (`deactivateUser` in `users.service.ts`).

### Contract testing

- Automated checks: `server/src/api.integration.test.ts` (Vitest, `app.inject`).
- OpenAPI snapshot syntax / schema validation: **`npm run openapi:validate`** (`swagger-cli validate docs/technical/openapi-hcb-fastify-snapshot.yaml`) — runs in CI (`.github/workflows/ci.yml`).
- E2E (Playwright): `npm run test:e2e` — Fastify + Vite on port 4173, `VITE_USE_MOCK_FALLBACK=false`.
- Future: generate OpenAPI from the chosen production backend and add response-schema contract tests for the SPA service layer.

---

### Appendix — Fastify route index (`server/src/index.ts`)

All paths below are under the same origin as the SPA in dev when using Vite proxy (`/api` → `http://127.0.0.1:8091`). **Most routes require** `Authorization: Bearer <accessToken>` except login, refresh, and **GET `/api/v1/health`**.

| Method | Path |
|--------|------|
| GET | `/api/v1/health` |
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
| GET | `/api/v1/institutions/:id/monitoring/enquiries` |
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
