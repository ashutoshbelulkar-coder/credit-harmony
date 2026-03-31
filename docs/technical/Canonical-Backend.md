# Canonical backend for the HCB Admin Portal SPA

**Date:** 2026-03-31 (approval queue Spring parity: metadata, 204 mutations, multi-type enqueue)

## Summary

For local development, the React app targets **Spring Boot** in `backend/` on **port 8090** (override with `SERVER_PORT`). That process is the **contract owner** for `src/services/*.service.ts` and `src/hooks/api/*` when you run `npm run spring:start` and `npm run dev` with `VITE_USE_MOCK_FALLBACK=false` (SQLite file under `backend/data/` by default).

The **Fastify** server in `server/` (**port 8091**) is **legacy** (in-memory); use `npm run server` only for comparison. Route-level parity work is tracked in [SPA-Service-Contract-Drift.md](./SPA-Service-Contract-Drift.md) and [Spring-SPA-Route-Inventory.md](./Spring-SPA-Route-Inventory.md).

## Vite proxy

[`vite.config.ts`](../../vite.config.ts) sets:

```ts
proxy: {
  "/api": {
    target: process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:8090",
    ...
  },
}
```

Set `VITE_API_PROXY_TARGET` in the environment (or `.env.development`) **before** `npm run dev` so the config picks it up.

## Commands

| Goal | Command |
|------|---------|
| SPA + Spring (default) | Terminal 1: `npm run spring:start` — Terminal 2: `VITE_USE_MOCK_FALLBACK=false npm run dev` |
| SPA + legacy Fastify | Terminal 1: `npm run server` — Terminal 2: `VITE_API_PROXY_TARGET=http://127.0.0.1:8091 VITE_USE_MOCK_FALLBACK=false npm run dev` |
| E2E (live API, no mock fallback) | `npm run test:e2e` (starts Spring + Vite on 4173; requires Maven) |

## Health check

Spring exposes **`GET /api/v1/health`** (no auth) for probes and Playwright readiness, plus **`GET /actuator/health`**. Legacy Fastify also served `/api/v1/health` on port 8091.

## Audit log / User Management Activity Log

On startup, Fastify fills `state.auditLog` from `user-management.json` `activityLog`, sample governance rows, and dev-user samples (`server/src/auditSeed.ts`). Mutating handlers in `server/src/index.ts` call **`pushAudit`** (~33 sites), including **login** (success/failure paths), **logout**, **approval** approve/reject/request-changes, **institutions** (create, upload, suspend, PATCH, reactivate, delete, consortium/product/billing/API access/consent), **users**, **roles** CRUD, **batch** retry/cancel, **alert-rule** create, **product** and **consortium** create. **`GET /api/v1/audit-logs`** supports `actionType`, `entityType`, `entityId`, `userId`, `from`, and `to`. The Activity Log page uses **`allowMockFallback: false`** so it never substitutes `mockActivity` when the API errors.

`POST /api/v1/approvals/:id/approve` (and reject / request-changes) also append **`APPROVAL_*`** audit rows (`entityType: APPROVAL`). **`ApprovalQueueController`** returns **204 No Content** for those three routes and updates **`products`**, **`consortiums`**, **`alert_rules`**, **`institutions`**, and schema-mapper JSON state according to **`approval_item_type`** and the decision (**`approved`** \| **`rejected`** \| **`changes_requested`**). **`GET /api/v1/approvals`** adds a **`metadata`** object per row (**`institutionId`**, **`mappingId`**, **`productId`**, **`consortiumId`**, **`alertRuleId`**) derived from **`entity_ref_id`**.

**Spring (canonical SQLite / Postgres):** **`GET /api/v1/audit-logs`** is implemented in **`AuditLogController`** with **JdbcTemplate** — each row is a flat map (**`userId`**, **`userEmail`**, **`actionType`**, **`entityType`**, **`entityId`**, **`occurredAt`**, …). Query params include **`entityType`**, **`entityId`**, **`userId`**, **`actionType`**, **`from`**, **`to`**; response body **`{ content, totalElements, totalPages, page, size }`**. **`SecurityConfig`** allows **`GET /api/v1/audit-logs/**`** for **`SUPER_ADMIN`**, **`BUREAU_ADMIN`**, **`ANALYST`**, and **`API_USER`** only — not **`VIEWER`**. **`GET /api/v1/users`** (and invite/patch responses that return the user row) use **JdbcTemplate** projections with **`roles[]`** assembled from **`user_role_assignments`** / **`roles`**, avoiding Jackson serialization of JPA **`User`** + lazy **`roleAssignments`** / **`UserDetails.getAuthorities()`** on SQLite. **`ConsortiumController`**, **`ProductController`**, **`ReportController`**, **`SlaConfigController`**, and **`AlertRuleController`** list/detail/mutate SQL matches **`backend/src/main/resources/db/create_tables.sql`** (e.g. **`consortium_name`**, **`coverage_scope`** as product list **`type`**, report **`date_range_*`**, **`sla_configs.is_active`**, **`alert_rules.rule_name`** / **`alert_rule_status`**). Mutating handlers and **`AuthController`** **`/me`** + **`logout`** take **`@AuthenticationPrincipal AuthUserPrincipal`**; **`AuditService.log(AuthUserPrincipal, …)`** uses **`UserRepository.getReferenceById`** for the audit FK.

## Data products → approval queue (dev API)

The **Create / Edit product** form loads the packet picker from **`GET /api/v1/products/packet-catalog`**, which returns **`productCatalogPacketOptions`** read from **`src/data/data-products.json`** (Schema Mapper **`sourceType`**, **`category`**, and **`derivedFields`** per packet—the same contract the Schema Mapper agent uses for source typing). On Spring **`backend/`**, **`GET /api/v1/products/packet-catalog`** serves **`catalog/product-packet-catalog.json`** from the classpath; keep it aligned with the SPA file when editing the catalogue.

**Packet configuration modal (per source-type row, multiple catalogue packets):** The product form opens **`PacketConfigModal`** with the **list of packet ids** selected for that **Schema Mapper `sourceType`** (catalogue order). The SPA loads **raw field paths** from **`GET /api/v1/schema-mapper/schemas/source-type-fields?sourceType=<shared>`** (union of `parsedFields` for all registry rows of that type, current schema version per row) and merges **packet-only** paths from the **active** catalogue entry. **Sources** in the modal header lists **registry source names** from **`GET /api/v1/schema-mapper/schemas?sourceType=<same>&page=0&size=500`**. When **several** catalogue packets share the type, the modal exposes a **Packet** switcher; **Derived** checklists are **per packet id** from each catalogue entry’s **`derivedFields`** (same payload as **`GET /api/v1/products/packet-catalog`**; the modal uses the form’s resolved **`catalogOptions`**). **Save configuration** updates **`packetConfigs`** for **every** packet id in the open group. Calls use **`useSourceTypeFields`** and **`useSchemaRegistryList`** in `src/hooks/api/useSchemaMapper.ts`; mock fallback applies only when **`VITE_USE_MOCK_FALLBACK=true`** in dev and the API errors.

When the SPA saves a new catalogue product with `status: approval_pending` (the default on **Create product**), Fastify:

1. Appends the product to in-memory `state.products` (with optional `packetIds`, `packetConfigs`, `enquiryConfig` from the form).
2. Prepends an approval item to `state.approvals` with `type: "product"` and `metadata: { productId: "<id>" }`.
3. Writes an audit row (`PRODUCT_CREATE`).

`POST /api/v1/approvals/:id/approve` sets the linked product’s `status` to **`active`** and records **`pushAudit`** (`APPROVAL_APPROVE`). Reject and request-changes update linked entities and record **`APPROVAL_REJECT`** / **`APPROVAL_REQUEST_CHANGES`**. The React app invalidates both **products** and **approvals** query keys after create/update and after queue actions so lists stay in sync.

**Spring:** **`ProductController`** maps SPA statuses **`approval_pending`**, **`pending`**, and **`pending_approval`** to DB **`pending_approval`** and calls **`ApprovalQueueService.enqueue("product", …)`** with **`entity_ref_id`** = stringified numeric product id. **`ApprovalQueueController`** sets **`product_status`** to **`active`** on approve and **`draft`** on reject or request-changes. **`POST`** response body includes **`id`**, **`name`**, **`type`**, **`status`**, **`lastUpdated`** for the SPA.

## Consortiums → approval queue (dev API)

When the SPA completes **Create consortium** (`POST /api/v1/consortiums` with `status: approval_pending`, the default when the field is omitted), Fastify:

1. Inserts the consortium into `state.consortiums` (and persists optional **`dataPolicy`** as **`{ dataVisibility }`** only — **`shareLoanData`**, **`shareRepaymentHistory`**, and **`allowAggregation`** are **stripped on write**). **`type`**, **`purpose`**, and **`governanceModel`** in a request body are **ignored**; **`GET /api/v1/consortiums`** and **`GET …/:id`** return **`id`**, **`name`**, **`status`**, **`membersCount`**, **`dataVolume`**, **`description`**, **`createdAt`** only.
2. Applies `members` via `state.consortiumMembers`: each item is **`{ institutionId }`** only (no per-member role in the API). **`GET /api/v1/consortiums/:id/members`** returns **`id`**, **`institutionId`**, **`institutionName`**, **`joinedAt`**.
3. Prepends an approval item with `type: "consortium"` and `metadata: { consortiumId: "<id>" }`.
4. Writes an audit row (`CONSORTIUM_CREATE`).

Approval **approve** sets the linked consortium’s `status` to **`active`**. **Reject** and **request-changes** set it to **`pending`** (UI lists non-`active` as “Draft”). React Query invalidates **consortiums** and **approvals** after create/update and after queue actions.

The consortium wizard **Add member** control uses **`GET /api/v1/institutions`** with **`role=subscriber`** and **`size=200`** (and **`allowMockFallback: false`** in the SPA) so only subscriber institutions—including dual-role submitter+subscriber—appear in the picker.

To create a consortium **without** an approval item (e.g. automation), send an explicit **`status: active`**. **`ConsortiumController`** inserts **`consortium_members`** from **`members[]`** and optional **`dataPolicy.dataVisibility`** into **`data_visibility`**.

## Alert rules → approval queue (Spring)

**Spring:** **`AlertRuleController`** inserts new rules with **`alert_rule_status = pending_approval`**, enqueues **`approval_queue`** with **`approval_item_type = alert_rule`**, and maps list/create JSON to the SPA (**`Pending approval`**, **`Enabled`**, **`Disabled`** display strings). **`POST /api/v1/alert-rules/:id/activate`** rejects **400** **`ERR_INVALID_STATE`** until the rule is approved in the queue (or already **`enabled`** / not pending). Approval actions flip **`enabled`** / **`disabled`** in SQL.

## Member registration → list + approval queue (dev API)

`POST /api/v1/institutions` (used by **Register member**) creates the institution with `institutionLifecycleStatus` defaulting to **`pending`** when omitted, pushes it into `state.institutions`, and prepends an approval item with `type: "institution"` and `metadata: { institutionId: "<numeric id>" }`.

**Register member form-metadata (geography configuration):** Register-member **Step 1** fields, validation rules, enums, and **single vs multi** selection are defined per **geography**. **Spring** serves the same JSON shape from **`backend/src/main/resources/config/institution-register-form.json`** (keep in sync with **`src/data/institution-register-form.json`**). **`GET /api/v1/institutions/form-metadata?geography=<id>`** returns resolved **`registerForm`**, **`institutionTypes`** (distinct from DB), **`activeConsortiums`**, and **`requiredComplianceDocuments`**. **Fastify** historically merged from `institutions.json` and `institutionRegisterForm.ts`; **`POST …?geography=`** validation on Spring may still be narrower until fully aligned. The SPA should use **`VITE_INSTITUTION_REGISTER_GEOGRAPHY`** so **`form-metadata`** and **`POST`** share the same **`geography`**.

**Optional consortium join at registration:** **`POST /api/v1/institutions`** may include **`consortiumIds: string[]`** (the SPA sends them only when the registration payload indicates the member is a **subscriber**). Each id must exist and be **active**; duplicates are ignored. After the institution row is created, the API appends **`state.institutionConsortiumMemberships`** rows with **`memberRole`** **`Consumer`**, **`consortiumMemberStatus`** **`pending`**, and audit **`INSTITUTION_CONSORTIUM_JOIN`** per consortium.

The SPA **Member Institutions** page loads **`GET /api/v1/institutions?page=0&size=200`** so the full in-memory catalogue (up to the server cap) is available for the table; otherwise the first API page (default 20) can hide newly appended members when the seed set is large.

After registration, the client invalidates **institutions** and **approvals** and navigates to **`/institutions`**. Approving from the queue runs the existing handler that sets the institution to **`active`** and should trigger another **institutions** invalidation from the approval mutation.

## Data Submission API, batch processing, and Enquiry API — member lifecycle (target + dev partial)

**Target behaviour:** Any path where a **member institution** submits bureau traffic — **Data Submission API** (real-time ingest), **batch ingestion** (re-processing / queueing member batch work), or **Enquiry API** (subscriber pulls) — must verify **`institutionLifecycleStatus === active`**. If the member is **pending approval**, **suspended**, **draft**, or otherwise not active, respond with **HTTP 403** and a stable error code (`ERR_INSTITUTION_PENDING_APPROVAL`, `ERR_INSTITUTION_SUSPENDED`, `ERR_INSTITUTION_DRAFT`, `ERR_INSTITUTION_NOT_ACTIVE`, or `ERR_INSTITUTION_NOT_FOUND` when the member cannot be resolved). Exact messages are specified in [Global-API-Error-Dictionary.md](./Global-API-Error-Dictionary.md) §2.3 and summarised in [Data-Flow-Diagram.md](./Data-Flow-Diagram.md).

**Fastify dev API:** `POST /api/v1/batch-jobs/:id/retry` calls **`institutionActiveForTrafficOrError`** (`server/src/institutionTrafficGate.ts`) when the job row includes **`institution_id`**; a **suspended** (or non-active) owner yields **403** and the codes above. **`POST …/batch-jobs/:id/cancel`** does **not** apply this check (operator cleanup). External **X-API-Key** tradeline/enquiry endpoints are not implemented in this repo; when added, they should use the same lifecycle gate after key resolution.

### Batch execution console (Spring)

**Tables:** **`batch_phase_logs`**, **`batch_stage_logs`**, and **`batch_error_samples`** (see `backend/src/main/resources/db/create_tables.sql`). **`batch_stage_logs.phase_log_id`** ties each stage to a phase; **`batch_error_samples.batch_stage_log_id`** optionally links error rows to a stage.

**`GET /api/v1/batch-jobs/:id/detail`** (`BatchJobController`): If the job has **any** **`batch_phase_logs`** rows, the JSON body includes camelCase **`phases`**, **`stages`** (with **`phaseKey`**, **`stageLogId`**, counters, timestamps), **`flowSegments`**, **`logs`**, and **`errorSamples`**. Jobs with **no** phase rows keep the older behaviour: empty **`phases`** / **`flowSegments`** / **`logs`** and JDBC-backed flat **`stages`** plus **`errorSamples`** (for list rows that never received phase/stage seeding).

**Dev seed:** `batch_jobs.id = 999901` in **`seed_data.sql`** carries a full multi-phase tree for UI demos. Legacy Fastify **`GET …/detail`** returns **`state.batchDetails[id]`** or **`{ batchId, stages: [] }`** — no SQL-backed phase graph.

The SPA maps Spring responses with **`resolveBatchConsoleData`** in **`src/lib/batch-console-from-api.ts`** and **`useBatchDetail`** in **`src/hooks/api/useBatchJobs.ts`**.

## Schema Mapper Agent (Spring — canonical)

**Implementation:** `com.hcb.platform.controller.SchemaMapperController` + `com.hcb.platform.schemamapper.*` services. **Persistence:** SQLite/Postgres tables `schema_mapper_*` (JSON payloads per registry row, version, mapping, rule, drift, metrics) defined in `backend/src/main/resources/db/create_tables.sql`. **Bootstrap:** when `schema_mapper_registry` is empty, the server hydrates from **`backend/src/main/resources/config/schema-mapper.json`** (keep in sync with **`src/data/schema-mapper.json`**). **Auth:** JWT; **`@PreAuthorize`** mirrors other governance APIs (reads include `VIEWER`; writes `SUPER_ADMIN` / `BUREAU_ADMIN` / `ANALYST`). **Pagination:** list endpoints cap **`size` at 500** (SPA may request up to 500). **Errors:** `SchemaMapperApiException` → JSON `{ error: { code, message, details: [] }, requestId }` (see [Global-API-Error-Dictionary.md](./Global-API-Error-Dictionary.md) §2.2).

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/v1/schema-mapper/metrics` | Counters + `requestId` |
| GET | `/api/v1/schema-mapper/canonical` | Master tree + versions (from seed JSON at runtime) |
| GET | `/api/v1/schema-mapper/wizard-metadata` | `sourceTypeOptions`, `dataCategoryOptions` |
| GET | `/api/v1/schema-mapper/schemas` | `sourceType`, `status`, `page`, `size` |
| GET | `/api/v1/schema-mapper/schemas/source-types` | Distinct types |
| GET | `/api/v1/schema-mapper/schemas/source-type-fields` | **400** if `sourceType` missing or `all` |
| POST | `/api/v1/schema-mapper/ingest` | **201** |
| POST | `/api/v1/schema-mapper/mappings` | **202**; `@Async` worker ~400ms then heuristic + optional LLM |
| GET/PATCH | `/api/v1/schema-mapper/mappings/:id` | **422** `MAPPING_LOCKED` / `CANONICAL_PATH_INVALID` |
| CRUD | `/api/v1/schema-mapper/mappings/:id/rules` | Nested validation rules |
| POST | `/api/v1/schema-mapper/mappings/:id/submit-approval` | **202**; inserts `approval_queue` (`approval_item_type=schema_mapping`, `entity_ref_id=mappingId`); numeric `approvalId` returned as string |
| POST | `/api/v1/schema-mapper/schemas/:versionId/drift-scan` | **202** stub |
| GET | `/api/v1/schema-mapper/drift` | Paged drift logs |

**Config (`application.yml`):** `hcb.schema-mapper.enabled` (default **true**; set **`false`** in tests without `schema_mapper_*` DDL), `hcb.schema-mapper.llm-enabled`, `OPENAI_API_KEY`, `hcb.schema-mapper.openai-model` (`OPENAI_SCHEMA_MODEL`).

**Approvals:** `GET /api/v1/approvals` uses columns **`approval_item_type`**, **`approval_workflow_status`**, **`entity_name_snapshot`** (fixed in Spring). Approve/reject/request-changes updates **`schema_mapping`** JSON rows when the queue item is **`schema_mapping`**.

**Legacy Fastify:** [`server/src/schemaMapper.ts`](../../server/src/schemaMapper.ts) remains a reference in-memory implementation (**port 8091**).

The SPA uses `src/services/schema-mapper.service.ts` and `src/hooks/api/useSchemaMapper.ts` when **`VITE_USE_MOCK_FALLBACK=false`**.

## Data Ingestion Agent — drift alerts

### Spring (canonical)

- **Controller:** `DataIngestionController` — **`GET /api/v1/data-ingestion/drift-alerts`** (`dateFrom`, `dateTo`, `sourceType`).
- **Persistence:** table **`ingestion_drift_alerts`** (`create_tables.sql`); seed rows in **`seed_data.sql`** (aligned with **`src/data/data-governance.json`** drift samples).
- **Filtering:** date window logic mirrors SPA **`isWithinDateRange`** semantics; **`sourceType`** (when not `all`) uses **`schema_mapper_registry`** JSON payloads to match **source names** to **sourceType**, same idea as legacy Fastify.

### Legacy Fastify (`server/`)

Implementation: [`server/src/ingestionDriftAlerts.ts`](../../server/src/ingestionDriftAlerts.ts). Alerts live in **`state.ingestionDriftAlerts`**, seeded from **`data-governance.json`**. **`POST /api/v1/schema-mapper/ingest`** and the mapping worker can prepend rows in memory — compare with Spring Schema Mapper if you need identical append behaviour on Java.

The SPA loads alerts via **`src/services/data-ingestion.service.ts`** and **`src/hooks/api/useDataIngestion.ts`** (`useDriftAlerts`).

## Spring Boot — authentication and dashboard (SQLite dev)

- **Login / JWT filter:** Principals are loaded with **`AuthAccountService`** (**JDBC** `UserDetailsService`) into **`AuthUserPrincipal`**, avoiding Hibernate 6 + SQLite join issues when resolving JPA `User` role graphs during `DaoAuthenticationProvider` authentication. **After login,** the security context holds **`AuthUserPrincipal`** end-to-end — controllers use **`@AuthenticationPrincipal AuthUserPrincipal`**, not the JPA **`User`** entity (see audit-log paragraph above). Refresh tokens still persist via JPA as needed; **`AuthService.refresh`** resolves **`user_id` from the loaded `RefreshToken` entity before rotation** so revocation does not break the lookup.
- **Dev passwords:** **`DevAuthDataBootstrap`** (`@Profile("dev")`) can re-sync known seed passwords with the live **`PasswordEncoder`** (`hcb.dev.sync-seed-passwords`, env **`HCB_DEV_SYNC_SEED_PASSWORDS`**).
- **Dashboard command center:** **`DashboardController.queryMemberQualityGrid`** builds SQL with a dynamic date predicate — there must be a **separator** between the literal `AND` and the `batchWhere` fragment (e.g. `+ " " + batchWhere`) or SQLite parses **`ANDbj`** as a single token. Avoid SQL column aliases **`member`** on SQLite 3.39+ (**`MEMBER`** is reserved for JSON); use e.g. **`institution_label`** and map to JSON **`member`**. **`pendingOnboarding`** counts institutions with **`institution_lifecycle_status = 'pending'`** to match **`create_tables.sql`** CHECK values. **Institution display strings** in command-center JDBC (batch pipeline **`member`**, member-quality **`institution_label`**, anomaly institution suffix, **`memberQualitySubmitters`**) use **`COALESCE(NULLIF(TRIM(i.name), ''), i.trading_name)`** so **legal name** is preferred over **trading name** when both exist.
- **Regression:** **`DashboardCommandCenterSqliteIntegrationTest`** exercises **`GET /api/v1/dashboard/command-center`** on SQLite + seed DDL.

## Related (target contracts)

- [Global-API-Error-Dictionary.md](./Global-API-Error-Dictionary.md) — error envelope and codes for production alignment  
- [Idempotency-And-Retries.md](./Idempotency-And-Retries.md) — write idempotency and async retries  
- [Multi-Tenant-Target-Architecture.md](./Multi-Tenant-Target-Architecture.md) — SaaS isolation model  
- [AI-Governance-Framework.md](./AI-Governance-Framework.md) — agents and LLM governance
