# API ↔ UI parity matrix (HCB Admin Portal)

**Version:** 1.9.1 | **Date:** 2026-03-31  
**Scope:** **Spring Boot** API (`backend/`, default port **8090**) as the primary target, plus legacy **Fastify** (`server/`) where behaviour still differs. React SPA (`src/`).

Most **member-detail**, **API keys**, **user deactivate**, **drift alerts**, and **overview charts** flows are now described against **Spring + SQLite/Postgres**. Rows still mention **Fastify** where the legacy server is the easiest reference for in-memory audit seed behaviour or historical wording.

### Institution display labels (legal name first)

When the UI or an API payload shows **one** human-readable string for a member institution (member pickers, dashboard command-center **`member`** / **`memberQualitySubmitters`**, monitoring rows that resolve ids, enquiry filter summaries, alert dashboard institution filter, etc.), the convention is **legal name** (`institutions.name` / JSON **`name`**) first, then **trading name** (`trading_name` / **`tradingName`**) only if legal is empty after trim.

- **Spring:** `DashboardController` JDBC uses `COALESCE(NULLIF(TRIM(i.name), ''), i.trading_name)` for command-center institution axes (batch pipeline, member quality grid, anomaly suffix, submitter label list).
- **SPA:** `institutionDisplayLabel()` in [`src/lib/institutions-display.ts`](../../src/lib/institutions-display.ts) (used by `InstitutionFilterSelect`, monitoring sections, schema-mapper Step 1 source name, `dashboard-mock.ts`).
- **Legacy Fastify:** `institutionDisplayLabel()` in [`server/src/index.ts`](../../server/src/index.ts) for approval queue descriptions; **`POST /institutions`** stores optional **`tradingName`** only (no back-fill from legal).

Register member and institution **detail** views still collect and may show **both** fields explicitly where the product requires it.

**OpenAPI (legacy Fastify snapshot):** [`openapi-hcb-fastify-snapshot.yaml`](./openapi-hcb-fastify-snapshot.yaml).  
**Spring:** Vite default proxy **8090**; drift vs the SPA is documented in [`SPA-Service-Contract-Drift.md`](./SPA-Service-Contract-Drift.md). Inventory: [`Spring-SPA-Route-Inventory.md`](./Spring-SPA-Route-Inventory.md). Canonical setup: [`Canonical-Backend.md`](./Canonical-Backend.md).

| Area | UI surface | HTTP | Persisted in dev API | Notes |
|------|------------|------|----------------------|-------|
| Auth | Login / refresh / logout | POST login, refresh; POST logout | Yes | JWT access + refresh rotation |
| Institutions | List, detail, CRUD, suspend/reactivate, **register wizard** | GET/PATCH/POST/DELETE + multipart docs + **`GET /v1/institutions/form-metadata?geography=`** | Yes | **List** primary name column is legal **`name`**; optional **`tradingName`** stored separately. **Single-string labels** in pickers and dashboards follow **legal first** (see *Institution display labels* above). **Register member Step 1** is rendered from **`registerForm.sections`** (field defs, validation hints, **`selectionMode`** / control type for single vs multi, enums or **`optionSource`** resolved to **`options`**). Geography config is dev-seeded in **`src/data/institution-register-form.json`**; query **`geography`** selects the section set (fallback: **`defaultGeography`**). Top-level **`geographyId`**, **`geographyLabel`**, **`geographyDescription`** explain the active configuration. SPA aligns metadata + **`POST /v1/institutions?geography=`** via **`VITE_INSTITUTION_REGISTER_GEOGRAPHY`**. Also returns **`institutionTypes`**, **`activeConsortiums`**, **`requiredComplianceDocuments`** (same as before; **`null`** skips compliance step). **POST** **`consortiumIds`**: multi-select when Subscriber (config-driven visibility). **List** `size=200`. **POST** validates against the geography register form. **Approve** → **`active`**. **PATCH** ignores `complianceDocs`. **Dev API:** `pushAudit` on create, uploads, suspend, **PATCH**, reactivate, delete, sub-resources. |
| Institution docs | Register wizard uploads; member Overview **View** | POST multipart; GET `…/documents/:documentId` | Yes | **POST** stores file as **base64** in memory, upserts by `documentName`, returns sanitized `complianceDocs` (`id`, `name`, `status`, `fileName`, `mimeType`, `uploadedAt`). **GET** by `documentId` returns JSON `{ name, fileName, mimeType, dataBase64 }` for client preview. Seed-only rows without `id` / content cannot be opened in the UI. |
| Consortium memberships (institution) | Memberships tab | GET/POST/DELETE | Yes | `state.institutionConsortiumMemberships`; rows include **`consortiumName`**, **`consortiumStatus`** (no **`consortiumType`**) |
| Product subscriptions (institution) | Products tab | GET/POST/PATCH | Yes | `state.institutionProductSubscriptions` |
| Billing | Billing tab | GET summary, PATCH billing | Yes | Overrides on institution |
| API access | Institution API access tab | GET/PATCH | Yes | |
| Users | List, invite, row ⋮ menu, detail drawer | GET, **POST `/v1/users/invitations`**, **POST** `/:id/suspend` \| `/:id/activate` \| `/:id/deactivate`, **PATCH** `/:id` (`roles`, `displayName`, …) | Yes | **Row actions:** View → drawer; **Edit role** → opens drawer + role dialog → **PATCH** + `USER_UPDATE` audit; Suspend / Activate / Deactivate → matching POSTs + audits. **Deactivate** hidden when already deactivated; **Activate** hidden when deactivated. Invite: duplicate email **409**; audit **`USER_INVITE`**. **Spring:** **`GET`**, invite, and PATCH responses return **JdbcTemplate** JSON maps (**`roles[]`** from role names, **`mfaEnabled`**, institution fields) — not raw JPA **`User`** entities. |
| User Management — Activity Log | `/user-management/activity` table | **GET `/v1/audit-logs`** (paginated; **`actionType`**, **`userId`**, **`from`** / **`to`**, **`entityType`** / **`entityId`**, **`institutionId`**) | Yes | **`allowMockFallback: false`** — list is never `mockActivity` JSON. **Seed:** `user-management.json` `activityLog` + sample `GOVERNANCE` rows (some with **`institutionId`**) + per-dev-user rows (`server/src/auditSeed.ts`). **`institutionId`** filter: digit-normalized match on row `institutionId` when present. **Dynamic:** `pushAudit` (~33 sites in `server/src/index.ts`) on **login** (success/fail), **logout**, **approval** approve/reject/request-changes, **users**, **institutions** (including PATCH/reactivate/delete and sub-tabs), **batch**, **alert-rule** create, **product/consortium** create, **roles** CRUD. **Not audited** until extended: e.g. `auth/refresh`, API keys, many alert/report/product patch/delete paths. Response maps `ipAddress` → `ipAddressHash` for display. **Spring:** **`AuditLogController`** — **JdbcTemplate**, flat **`userId`/`userEmail`** per row, filters include **`entityType`**; **`SecurityConfig`** does **not** grant **`VIEWER`** access to **`/api/v1/audit-logs/**`** (use **ANALYST+** or **`API_USER`**). |
| Approvals | Queue actions | GET, POST approve/reject/request-changes | Yes (Spring) | **Spring:** **`GET /v1/approvals`** — each **`content[]`** item has string **`id`**, **`type`** (`institution` \| `schema_mapping` \| `consortium` \| `product` \| `alert_rule`), and **`metadata`** map (`institutionId`, `mappingId`, `productId`, `consortiumId`, `alertRuleId` from **`entity_ref_id`**). **`POST …/approve`**, **`/reject`**, **`/request-changes`** → **204 No Content**; **`reject`** body **`reason`**, **`request-changes`** body **`comment`** (stored in **`rejection_reason`**). **Enqueue:** **`POST /v1/institutions`**; product create when **`status`** is **`approval_pending`**, **`pending`**, or **`pending_approval`**; consortium create unless **`status: active`**; **`POST /v1/alert-rules`**; schema-mapper **submit-approval**. **Domain sync on decision:** institution approve → **`active`**; product approve → **`active`**, reject/changes → **`draft`**; consortium approve → **`active`**, reject/changes → **`pending`**; alert_rule approve → DB **`enabled`**, reject/changes → **`disabled`**; **`schema_mapping`** via **`SchemaMapperStateService`**. **`AuditService`** logs **`APPROVAL_*`**. **Legacy Fastify:** in-memory `pushAudit` on the same actions. SPA invalidates related query keys after mutations. |
| Batch jobs | List / KPIs / charts / detail row | GET `/v1/batch-jobs`, `/kpis`, `/charts`, `/:id`, **`GET /v1/batch-jobs/:id/detail`** | Yes | **List** paged; **charts** DB aggregates (volume / duration / error categories). **`GET …/:id/detail` (Spring):** when the job has **`batch_phase_logs`** rows, body includes **`phases`**, **`stages`** (each with **`phaseKey`**, **`stageLogId`**, counters, camelCase fields), **`flowSegments`**, **`logs`**, and mapped **`errorSamples`** (optional **`batchStageLogId`**). Jobs with **no** phase rows return legacy shape: empty **`phases`** / **`flowSegments`** / **`logs`** and raw JDBC **`stages`** + **`errorSamples`**. SPA: **`useBatchDetail`**, **`resolveBatchConsoleData`** in [`src/lib/batch-console-from-api.ts`](../../src/lib/batch-console-from-api.ts); mock catalogue **`batchConsoleByBatchId`** still used for **`BATCH-*`** batch ids from static monitoring data. **Seeded demo:** `batch_jobs.id = 999901` carries a full multi-phase / multi-stage tree (`seed_data.sql`). |
| Batch jobs | Retry / cancel | POST retry/cancel | Yes | **Retry:** if the job has **`institution_id`**, the owning member must be **`active`**; otherwise **403** with `ERR_INSTITUTION_*` (see [Global-API-Error-Dictionary.md](./Global-API-Error-Dictionary.md) §2.3). **Cancel:** allowed even when the member is not active (operator stop). Updates job `status` (e.g. Queued / Cancelled). |
| Alert rules | List, create, **edit**, toggle, delete | GET/POST/PATCH/DELETE + activate/deactivate | Yes | **Spring:** **`POST`** stores **`alert_rule_status=pending_approval`**, enqueues **`approval_queue`** **`alert_rule`** with **`entity_ref_id`** = numeric rule id; **GET** returns SPA-shaped JSON (**`name`**, **`domain`**, **`condition`**, **`severity`**, **`status`** as **`Pending approval`** / **`Enabled`** / **`Disabled`**). **`POST /approvals/:id/approve`** sets **`enabled`**; reject/request-changes → **`disabled`**. **`POST .../activate`** returns **400** with **`ERR_INVALID_STATE`** while **`pending_approval`**. **Legacy Fastify:** in-memory **`Pending approval`** string + metadata. |
| Alert incidents | Ack / resolve | POST | Yes | |
| SLA breach history (filters) | Source name combobox on SLA Configuration page | GET `/v1/institutions?page=0&size=300` | Yes (when API up) | `SlaBreachHistory` uses `InstitutionFilterSelect` **`mode="all"`** with **`allowMockFallback: false`**. Option text uses **`institutionDisplayLabel`** (legal name first). Top option **All institutions**. Table rows still from `GET /v1/sla-configs/breach-history` (or mock fallback for that list only). Filter matches row `institution_id` with digit-normalized id. |
| Consortiums | Wizard create/edit | POST/PATCH with `members`, optional `dataPolicy: { dataVisibility }` | Yes | **Spring `POST`:** persists **`consortium_members`** from **`members[]`** (**`{ institutionId }`** only, **`Consumer`** / **`pending`**); sets **`data_visibility`** from **`dataPolicy.dataVisibility`** when valid (`full` \| `masked_pii` \| `derived`). **`status: active`** skips **`approval_queue`** and sets consortium **`active`**; otherwise **`pending`** + enqueue **`consortium`** (**`entity_ref_id`** = numeric id). **201** response includes **`id`** (string), **`name`**, **`status`**, **`membersCount`**, etc. **GET `/members`** — institution + **`joinedAt`**. **Legacy Fastify:** in-memory members + approval prepend. **Wizard** default **`approval_pending`**; **`GET /api/v1/institutions?page=0&size=200&role=subscriber`**, **`allowMockFallback: false`**. |
| Products | Catalogue CRUD + create form | GET/POST/PATCH/DELETE + **GET `/v1/products/packet-catalog`**; **PacketConfigModal** uses **`GET /v1/schema-mapper/schemas/source-type-fields?sourceType=`** + **`GET /v1/schema-mapper/schemas?sourceType=`** | Yes | **Packet catalog:** unchanged (Spring **`catalog/product-packet-catalog.json`**). **Spring `POST`:** respects **`status`** — **`approval_pending`**, **`pending`**, or **`pending_approval`** → DB **`pending_approval`** + **`approval_queue`** **`product`** (**`entity_ref_id`** = numeric product id); **`active`** → **`active`**; else default **`draft`**. **201** returns **`id`** (string), **`name`**, **`type`**, **`status`**, **`lastUpdated`**. **Detail GET** / list from JDBC (packet JSON columns may be limited vs Fastify in-memory — align incrementally). **Legacy Fastify:** in-memory approvals prepend. |
| Reports | Request / cancel / retry / delete | REST | Yes | **Spring:** JDBC aligned to **`reports`** table (**`date_range_*`**, **`report_status`** lowercase per CHECK); **DELETE** removes row; **cancel** sets **`failed`** (no **`cancelled`** in CHECK). |
| Roles | List, create, edit, delete (section matrix) | GET/POST/PATCH/DELETE `/v1/roles` | Yes | **Fastify seed** (`server/src/state.ts`) stores the full section×action matrix per built-in role (same defaults as `user-management-mock`). **UI merge:** `mergeRolePermissionsFromApi(roleName, permissions)` — explicit cells from the API win; missing cells fall back to built-in defaults for known role names (covers **Spring `Role`** JSON with no `permissions` field and sparse/placeholder matrices). **GET** rows are normalized (`id` string, `roleName` from `roleName` \| `name` \| `role`). **409** duplicate `roleName`. **Offline:** `local-*` ids; create still POSTs. **Dev API:** `pushAudit` on **ROLE_CREATE** / **ROLE_UPDATE** / **ROLE_DELETE**. |
| Dashboard | Export button | — | N/A | **Client-side CSV** of KPI snapshot (tooltip documents behaviour) |
| Monitoring | Layout KPI alert banners (success rate / P95) | GET `/monitoring/kpis` | Read-only | Uses `useMonitoringKpis` (live API); error card + retry on failure |
| Monitoring (filters) | Data Submission / Enquiry API **Source name** combobox | GET `/v1/institutions?page=0&size=300&role=dataSubmitter` or **`role=subscriber`** | Yes (when API up) | `InstitutionFilterSelect` calls `useInstitutions(..., { allowMockFallback: false })`: options are **always** from the API (no `institutions-mock` fallback even if `VITE_USE_MOCK_FALLBACK=true`); each option label is **`institutionDisplayLabel`** (legal name first). **Fastify** scopes the list with the **`role`** query param (**`dataSubmitter`** / **`subscriber`**). Top options: **All submitters** / **All subscribers**. **`DataSubmissionApiSection`** / **`DataSubmissionBatchSection`** / **`InquiryApiSection`** / **`AlertMonitoringDashboard`** use the same legal-first rule where a single string is shown. |
| Monitoring | Inquiry API **Detailed Enquiry Log** table | GET `/v1/monitoring/enquiries` | Read-only | Dev seed merges `monitoring.json` `enquiryLogEntries` with **synthetic** rows (`src/lib/generateEnquiryStateRows.ts`): last **24h** (30m slots) + **36 days** future, subscriber institutions only, sorted newest-first. API supports `status`, `dateFrom`, `dateTo`, `institutionId`, pagination. **InquiryApiSection** uses **`InstitutionFilterSelect`** (`mode="subscribers"`) in the log card and toolbar. Time range (5m–24h) is client-side via `isWithinRelativeWindow` (future timestamps stay visible). |
| Monitoring | Data Submission API + Enquiry API **Status** column (log tables) | — | N/A | Spring returns **lowercase** DB enums on the wire (**`success`**, **`failed`**, **`rate_limited`**, **`consent_missing`**, etc.). Mapping, display labels, pill colours, and **status filter `Select` values** (must match **`lower(?)`** in `MonitoringController`) live in [`src/lib/status-badges.ts`](../../src/lib/status-badges.ts): **`apiRequestStatusBadgeClass`**, **`enquiryStatusBadgeClass`**, **`API_REQUEST_STATUS_FILTER_OPTIONS`**, **`ENQUIRY_STATUS_FILTER_OPTIONS`**. Badges use shadcn **`Badge`** + **`border-0`** + semantic **`/20`** tints (**`--success`**, **`--destructive`**, **`--warning`**, **`--primary`**). Detail drawers use **`apiRequestStatusTextClass`** / **`enquiryStatusTextClass`**. |
| Reporting | Hybrid Credit Reports list **Status** column | — | N/A | Spring returns **`report_status`** as lowercase (**`queued`**, **`processing`**, **`completed`**, **`failed`**). **`ReportListPage`** uses **`reportStatusBadgeClass`**, **`reportStatusLabel`**, and **`reportStatusesEqual`** (client filter + row actions) from [`src/lib/status-badges.ts`](../../src/lib/status-badges.ts). |
| Institutions (overview) | Usage by Data Products chart | GET `/monitoring/enquiries?institutionId=` or GET `/institutions/:id/monitoring/enquiries` | Read-only | Paged list items include `productId`, `productName`, `alternateDataUsed`; chart counts successful enquiries only (`InstitutionDetail`) |
| Institutions (overview) | Overview tab **trend** charts (submission volume, success vs rejected, rejection reasons, processing time; enquiry volume, success vs failed, response time) | GET `/institutions/:id/overview-charts` | Yes (Spring) | **Spring:** `InstitutionController` JDBC aggregates (**last 30 days**), aligned with monitoring-style filters. New members with no API keys / no traffic get **empty** series. **Fastify:** same URL on **8091** for comparison. |
| Login | Forgot password / SSO (when shown) | — | N/A | Demo UI gated by `VITE_SHOW_DEMO_AUTH_UI` / prod hidden |
| Agents | “Contact admin” sheet | — | N/A | Toast only; message clarifies demo vs prod |
| **Schema Mapper Agent** | Registry + wizard (`/data-governance/auto-mapping-review`); wizard **Step 1** — **Source name** picker (**`InstitutionFilterSelect`**, submitters) sets display **source name** (e.g. **All submitters** or selected member via **`institutionDisplayLabel`** — legal **`name`** first, then **`tradingName`**); **Source Type** + **Data Category** from **`GET …/wizard-metadata`** (`useSchemaMapperWizardMetadata`) **without** echoing the GET path as on-screen microcopy under **Source Type**; **LLM Field Intelligence** (**Step 3** UI) lets operators set **PII** (**Yes/No**) per mapped source field; values persist on **`fieldMappings[].containsPii`** via **`PATCH …/mappings/:id`**; **Validation Rules** uses **`GET …/schemas/source-types`** and **`GET …/schemas/source-type-fields?sourceType=`** (no inline GET path caption under expression blocks); **Data Products** **`PacketConfigModal`** uses **source-type-fields** + **schemas** (modal may cycle **packet ids** that share a **`sourceType`**); approval drawer when `metadata.mappingId` set | **`/v1/schema-mapper/*`** (schemas, ingest, **`wizard-metadata`**, mappings, rules, drift stub, metrics); **`GET …/schemas/source-type-fields`**; **`POST …/submit-approval`** → queue item **`schema_mapping`** | Yes | **Spring:** **`SchemaMapperController`** + **`schema_mapper_*`** JSON tables; mirror **`backend/src/main/resources/config/schema-mapper.json`** with **`src/data/schema-mapper.json`**. Async worker (~400ms) + heuristics + optional OpenAI. **`submit-approval`** → **`approval_queue`** (`approval_item_type`, **`entity_ref_id`**). List **`size`** max **500**. **`fetchWizardMetadata`**, **`wizardMetadataFromSeed`**, **`useSourceTypeFields`**, **`useSchemaRegistryList`**, PII on **`PATCH …/mappings/:id`**, invalidate **`schemaMapper`** keys. **Fastify (8091):** in-memory; **ingest** / mapping completion prepends **`state.ingestionDriftAlerts`** — compare Spring **`data-ingestion`** drift behaviour separately. |
| **Data Quality Monitoring** | `/data-governance/data-quality-monitoring` — Schema & mapping drift alert list + drift KPI counts | **`GET /v1/data-ingestion/drift-alerts`** (`dateFrom`, `dateTo`, `sourceType`) | Yes (Spring) | **`DataIngestionController`** reads **`ingestion_drift_alerts`** (seeded in `seed_data.sql`); **`sourceType`** filter uses **`schema_mapper_registry`** payloads when present (Fastify-equivalent name matching). **`useDriftAlerts`** / **`data-ingestion.service.ts`**. **`VITE_USE_MOCK_FALLBACK=true`**: client can still filter JSON mock on API failure. **Schema Mapper** mutations invalidate **`dataIngestion`** query keys. **Legacy Fastify:** in-memory `state.ingestionDriftAlerts`. |

### User delete vs deactivate (Spring)

- **SPA** uses **`POST /v1/users/:id/deactivate`** for operator deactivate (`users.service.ts`).
- **Spring** implements both **`POST …/deactivate`** (status → **`deactivated`**, Bureau Admin+) and **`DELETE /v1/users/:id`** (soft-delete, **Super Admin** only).

### Contract testing

- Automated checks: **`backend`** `HcbPlatformApplicationTest` (MockMvc); SQLite integration tests (`DashboardCommandCenterSqliteIntegrationTest`, `MonitoringAlertSqliteIntegrationTest`, `SchemaMapperSqliteIntegrationTest`, **`RouteParitySqliteIntegrationTest`**, **`ApprovalQueueSqliteIntegrationTest`** — product + alert-rule enqueue/metadata, approve **204**, reject **204**); legacy Fastify `api.integration.test.ts` removed.
- Heuristic route smoke: **`npm run check:route-parity`** (`scripts/route-parity-check.mjs`) — Fastify string scan vs Spring controller annotations (noisy; see [`Spring-SPA-Route-Inventory.md`](./Spring-SPA-Route-Inventory.md)).
- OpenAPI snapshot syntax / schema validation: **`npm run openapi:validate`** (`swagger-cli validate docs/technical/openapi-hcb-fastify-snapshot.yaml`) — runs in CI (`.github/workflows/ci.yml`).
- E2E (Playwright): `npm run test:e2e` — typically **Spring** on **8090** + Vite on **4173**, `VITE_USE_MOCK_FALLBACK=false` (see `playwright.config.ts`).
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
| GET | `/api/v1/institutions/form-metadata` |
| GET | `/api/v1/institutions/:id` |
| GET | `/api/v1/institutions/:id/overview-charts` |
| POST | `/api/v1/institutions/:id/documents` |
| GET | `/api/v1/institutions/:id/documents/:documentId` |
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
| GET | `/api/v1/products/packet-catalog` |
| GET | `/api/v1/products/:id` |
| POST | `/api/v1/products` |
| PATCH | `/api/v1/products/:id` |
| DELETE | `/api/v1/products/:id` |
| GET | `/api/v1/data-ingestion/drift-alerts` |

*If this appendix drifts from code, treat **`backend/` Spring controllers** as authoritative for the default SPA contract; **`server/src/index.ts`** covers **legacy Fastify** only. Update this table in the same PR.*
