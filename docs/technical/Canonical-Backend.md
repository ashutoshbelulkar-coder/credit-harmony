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

The **Create / Edit product** form loads the packet picker from **`GET /api/v1/products/packet-catalog`**, which returns **`productCatalogPacketOptions`** read from **`src/data/data-products.json`** (Schema Mapper **`sourceType`**, **`category`**, and **`derivedFields`** per packet—the same contract the Schema Mapper agent uses for source typing). On Spring **`backend/`**, **`GET /api/v1/products/packet-catalog`** serves **`catalog/product-packet-catalog.json`** from the classpath; keep it aligned with the SPA file when editing the catalogue.

**Packet configuration modal (per source-type row, multiple catalogue packets):** The product form opens **`PacketConfigModal`** with the **list of packet ids** selected for that **Schema Mapper `sourceType`** (catalogue order). The SPA loads **raw field paths** from **`GET /api/v1/schema-mapper/schemas/source-type-fields?sourceType=<shared>`** (union of `parsedFields` for all registry rows of that type, current schema version per row) and merges **packet-only** paths from the **active** catalogue entry. **Sources** in the modal header lists **registry source names** from **`GET /api/v1/schema-mapper/schemas?sourceType=<same>&page=0&size=500`**. When **several** catalogue packets share the type, the modal exposes a **Packet** switcher; **Derived** checklists are **per packet id** from each catalogue entry’s **`derivedFields`** (same payload as **`GET /api/v1/products/packet-catalog`**; the modal uses the form’s resolved **`catalogOptions`**). **Save configuration** updates **`packetConfigs`** for **every** packet id in the open group. Calls use **`useSourceTypeFields`** and **`useSchemaRegistryList`** in `src/hooks/api/useSchemaMapper.ts`; mock fallback applies only when **`VITE_USE_MOCK_FALLBACK=true`** in dev and the API errors.

When the SPA saves a new catalogue product with `status: approval_pending` (the default on **Create product**), Fastify:

1. Appends the product to in-memory `state.products` (with optional `packetIds`, `packetConfigs`, `enquiryConfig` from the form).
2. Prepends an approval item to `state.approvals` with `type: "product"` and `metadata: { productId: "<id>" }`.
3. Writes an audit row (`PRODUCT_CREATE`).

`POST /api/v1/approvals/:id/approve` sets the linked product’s `status` to **`active`** and records **`pushAudit`** (`APPROVAL_APPROVE`). Reject and request-changes update linked entities and record **`APPROVAL_REJECT`** / **`APPROVAL_REQUEST_CHANGES`**. The React app invalidates both **products** and **approvals** query keys after create/update and after queue actions so lists stay in sync.

This behaviour is implemented in `server/src/index.ts` (not in the Spring Boot `backend/` track unless separately ported).

## Consortiums → approval queue (dev API)

When the SPA completes **Create consortium** (`POST /api/v1/consortiums` with `status: approval_pending`, the default when the field is omitted), Fastify:

1. Inserts the consortium into `state.consortiums` (and persists optional **`dataPolicy`** as **`{ dataVisibility }`** only — **`shareLoanData`**, **`shareRepaymentHistory`**, and **`allowAggregation`** are **stripped on write**). **`type`**, **`purpose`**, and **`governanceModel`** in a request body are **ignored**; **`GET /api/v1/consortiums`** and **`GET …/:id`** return **`id`**, **`name`**, **`status`**, **`membersCount`**, **`dataVolume`**, **`description`**, **`createdAt`** only.
2. Applies `members` via `state.consortiumMembers`: each item is **`{ institutionId }`** only (no per-member role in the API). **`GET /api/v1/consortiums/:id/members`** returns **`id`**, **`institutionId`**, **`institutionName`**, **`joinedAt`**.
3. Prepends an approval item with `type: "consortium"` and `metadata: { consortiumId: "<id>" }`.
4. Writes an audit row (`CONSORTIUM_CREATE`).

Approval **approve** sets the linked consortium’s `status` to **`active`**. **Reject** and **request-changes** set it to **`pending`** (UI lists non-`active` as “Draft”). React Query invalidates **consortiums** and **approvals** after create/update and after queue actions.

The consortium wizard **Add member** control uses **`GET /api/v1/institutions`** with **`role=subscriber`** and **`size=200`** (and **`allowMockFallback: false`** in the SPA) so only subscriber institutions—including dual-role submitter+subscriber—appear in the picker.

To create a consortium **without** an approval item (e.g. automation), send an explicit `status` other than `approval_pending` / `pending`, such as `active`.

## Member registration → list + approval queue (dev API)

`POST /api/v1/institutions` (used by **Register member**) creates the institution with `institutionLifecycleStatus` defaulting to **`pending`** when omitted, pushes it into `state.institutions`, and prepends an approval item with `type: "institution"` and `metadata: { institutionId: "<numeric id>" }`.

**Register member form-metadata (geography configuration):** Register-member **Step 1** fields, validation rules, enums, and **single vs multi** selection are defined per **geography** (tenant / operating region). Dev loads **`src/data/institution-register-form.json`** (`defaultGeography`, **`geographies.<id>.sections`**) via **`server/src/institutionRegisterForm.ts`**. **`GET /api/v1/institutions/form-metadata?geography=<id>`** (authenticated) returns **`geographyId`**, **`geographyLabel`**, **`geographyDescription`**, **`registerForm`** (resolved sections with inline **`options`** or options merged from **`institutionTypes`** / **`activeConsortiums`**), plus **`institutionTypes`**, **`activeConsortiums`**, **`requiredComplianceDocuments`**. Unknown **`geography`** falls back to **`defaultGeography`**. **`POST /api/v1/institutions?geography=<id>`** runs **`validateRegisterInstitutionBody`** against that geography’s form before create. The SPA should use **`VITE_INSTITUTION_REGISTER_GEOGRAPHY`** so **`form-metadata`** and **`POST`** share the same **`geography`**. On load, `state.institutionTypes` and **`requiredComplianceDocuments`** still come from **`institutions.json`**; **`activeConsortiums`** is every consortium with **`status`** **`active`**. Compliance docs are **`null`** when disabled — the SPA skips the upload step. When `institutionTypes` is non-empty, **`POST`/`PATCH`** require **`institutionType`** in that allowlist when the field is present; empty allowlist accepts any string.

**Optional consortium join at registration:** **`POST /api/v1/institutions`** may include **`consortiumIds: string[]`** (the SPA sends them only when the registration payload indicates the member is a **subscriber**). Each id must exist and be **active**; duplicates are ignored. After the institution row is created, the API appends **`state.institutionConsortiumMemberships`** rows with **`memberRole`** **`Consumer`**, **`consortiumMemberStatus`** **`pending`**, and audit **`INSTITUTION_CONSORTIUM_JOIN`** per consortium.

The SPA **Member Institutions** page loads **`GET /api/v1/institutions?page=0&size=200`** so the full in-memory catalogue (up to the server cap) is available for the table; otherwise the first API page (default 20) can hide newly appended members when the seed set is large.

After registration, the client invalidates **institutions** and **approvals** and navigates to **`/institutions`**. Approving from the queue runs the existing handler that sets the institution to **`active`** and should trigger another **institutions** invalidation from the approval mutation.

## Data Submission API, batch processing, and Enquiry API — member lifecycle (target + dev partial)

**Target behaviour:** Any path where a **member institution** submits bureau traffic — **Data Submission API** (real-time ingest), **batch ingestion** (re-processing / queueing member batch work), or **Enquiry API** (subscriber pulls) — must verify **`institutionLifecycleStatus === active`**. If the member is **pending approval**, **suspended**, **draft**, or otherwise not active, respond with **HTTP 403** and a stable error code (`ERR_INSTITUTION_PENDING_APPROVAL`, `ERR_INSTITUTION_SUSPENDED`, `ERR_INSTITUTION_DRAFT`, `ERR_INSTITUTION_NOT_ACTIVE`, or `ERR_INSTITUTION_NOT_FOUND` when the member cannot be resolved). Exact messages are specified in [Global-API-Error-Dictionary.md](./Global-API-Error-Dictionary.md) §2.3 and summarised in [Data-Flow-Diagram.md](./Data-Flow-Diagram.md).

**Fastify dev API:** `POST /api/v1/batch-jobs/:id/retry` calls **`institutionActiveForTrafficOrError`** (`server/src/institutionTrafficGate.ts`) when the job row includes **`institution_id`**; a **suspended** (or non-active) owner yields **403** and the codes above. **`POST …/batch-jobs/:id/cancel`** does **not** apply this check (operator cleanup). External **X-API-Key** tradeline/enquiry endpoints are not implemented in this repo; when added, they should use the same lifecycle gate after key resolution.

## Schema Mapper Agent (dev API)

Implementation: [`server/src/schemaMapper.ts`](../../server/src/schemaMapper.ts) (registered from `server/src/index.ts`). In-memory **NoSQL-shaped** documents under `state.schemaMapper` (raw payloads, schema versions, mapping jobs, validation rules, drift logs).

| Area | Behaviour |
|------|-----------|
| **Ingest** | `POST /api/v1/schema-mapper/ingest` — creates registry row + schema version; returns `schemaVersionId` and parsed fields. |
| **Mapping job** | `POST /api/v1/schema-mapper/mappings` — queues async job (`setTimeout`); worker runs heuristics + optional OpenAI (`OPENAI_API_KEY`, `OPENAI_SCHEMA_MODEL`; disable with `SCHEMA_MAPPER_LLM_ENABLED=false`). |
| **Read / patch** | `GET` / `PATCH /api/v1/schema-mapper/mappings/:id` |
| **Registry fields by type** | `GET /api/v1/schema-mapper/schemas/source-type-fields?sourceType=` — union of `parsedFields` paths (current schema version per registry row) for that Schema Mapper `sourceType`. Used by **Data Governance → Validation Rules** create-rule field picker after the user selects a source type, and by **Data Products → Configure packet → Raw data**. Returns **400** `ERR_VALIDATION` if `sourceType` is missing or `all`. |
| **Sample ingest templates** | Reference **`parsedFields`** / **`fieldStatistics`** per `sourceType` are defined in **`src/data/schema-mapper.json`**: `telecomParsedFields`, `utilityParsedFields`, `bankParsedFields`, `gstParsedFields`, `customParsedFields` (and matching `*FieldStatistics`). **`createSchemaMapperSlice`** and **`POST …/ingest`** (when the body omits `parsedFields`) use the same template map in `server/src/schemaMapper.ts`. |
| **Wizard dropdowns** | `GET /api/v1/schema-mapper/wizard-metadata` returns **`sourceTypeOptions`** and **`dataCategoryOptions`** as `{ value, label }[]`, loaded from **`wizardSourceTypeOptions`** / **`wizardDataCategoryOptions`** in **`schema-mapper.json`** (normalised at seed; SPA Step 1 uses **`fetchWizardMetadata`** / **`useSchemaMapperWizardMetadata`**). |
| **Rules** | `GET/POST/PATCH/DELETE …/mappings/:id/rules` |
| **Governance** | `POST …/mappings/:id/submit-approval` prepends `type: schema_mapping` with `metadata.mappingId`. Approval handlers call **`applySchemaMappingApprovalDecision`** so **approve** → mapping `active`, **reject** → `rejected`, **request-changes** → `needs_review`. |
| **Observability** | `GET /api/v1/schema-mapper/metrics` — in-process counters (mapping jobs, LLM calls/failures, overrides). |

The SPA uses `src/services/schema-mapper.service.ts` and `src/hooks/api/useSchemaMapper.ts` when **`VITE_USE_MOCK_FALLBACK=false`**.

## Data Ingestion Agent — drift alerts (dev API)

Implementation: [`server/src/ingestionDriftAlerts.ts`](../../server/src/ingestionDriftAlerts.ts) (registered from `server/src/index.ts`). Alerts are stored in **`state.ingestionDriftAlerts`**, seeded from **`src/data/data-governance.json`** `driftAlerts`.

| Item | Behaviour |
|------|-----------|
| **List (UI)** | `GET /api/v1/data-ingestion/drift-alerts?dateFrom=&dateTo=&sourceType=` — JWT required. Filters use shared **`isWithinDateRange`** (`src/lib/calc/dateFilter.ts`) and Schema Mapper registry rows to resolve **source type** → source names (same semantics as the former client-only filter). |
| **New schema alert** | `POST /api/v1/schema-mapper/ingest` prepends a **schema** row after a successful ingest. |
| **New mapping alert** | When the async mapping job in `schemaMapper.ts` finishes, a **mapping** row is prepended (severity **medium** if coverage is below 70%). |

The SPA Data Quality Monitoring route loads alerts via **`src/services/data-ingestion.service.ts`** and **`src/hooks/api/useDataIngestion.ts`** (`useDriftAlerts`).

## Related (target contracts)

- [Global-API-Error-Dictionary.md](./Global-API-Error-Dictionary.md) — error envelope and codes for production alignment  
- [Idempotency-And-Retries.md](./Idempotency-And-Retries.md) — write idempotency and async retries  
- [Multi-Tenant-Target-Architecture.md](./Multi-Tenant-Target-Architecture.md) — SaaS isolation model  
- [AI-Governance-Framework.md](./AI-Governance-Framework.md) — agents and LLM governance
