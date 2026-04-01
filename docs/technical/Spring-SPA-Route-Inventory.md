# Spring ↔ SPA route inventory

**Date:** 2026-03-31 (route parity sweep: institution sub-resources, API keys **POST**, user **POST deactivate**, drift alerts, `check:route-parity` script)  
**Purpose:** Map SPA services to Spring controllers and mark gaps.

**Legend:** ✅ implemented on Spring · ⚠️ partial / DTO drift · ❌ not on Spring (SPA may use mock or fail)

| SPA service (domain) | Representative paths | Spring controller | Priority |
|----------------------|------------------------|-------------------|----------|
| Auth | `/v1/auth/login`, `mfa/verify`, `mfa/resend`, `refresh`, `logout`, `me` | `AuthController` | P0 |
| Institutions list/detail/CRUD | `/v1/institutions` | `InstitutionController` | P0 |
| Institution PATCH | `/v1/institutions/:id` | `InstitutionController` | P0 |
| Institution `role` query | `?role=dataSubmitter\|subscriber` | `InstitutionRepository` | P0 |
| Register form-metadata | `GET …/form-metadata?geography=` | `InstitutionRegisterFormService` | P0 |
| Institution documents (multipart) | `POST/GET …/:id/documents` | `InstitutionController` | P0 |
| Institution overview charts | `GET …/:id/overview-charts` | `InstitutionController` (JDBC aggregates, last 30d) | P1 |
| Institution sub-resources | consortium memberships CRUD, product subs CRUD, billing PATCH, api-access, consent | `InstitutionController` | ✅ |
| Institution monitoring summary | `GET …/:id/monitoring-summary` | `InstitutionController` | P1 |
| Approvals | `/v1/approvals` | `ApprovalQueueController` | P0 |
| Products | `/v1/products`, packet-catalog | `ProductController` | P0 |
| Consortiums | `/v1/consortiums` | `ConsortiumController` | P0 |
| Users | `/v1/users`, invitations, suspend/activate, **POST deactivate** | `UserController` | ✅ |
| API keys | `/v1/api-keys` (incl. **POST** create) | `ApiKeyController` | ✅ |
| Roles | `/v1/roles` | `RoleController` | P1 (matrix parity) |
| Monitoring / batch / alerts / SLA / reports / audit / dashboard | `/v1/monitoring/*`, etc. | `MonitoringController`, `BatchJobController`, … | P1 |
| Schema Mapper | `/v1/schema-mapper/*` | `SchemaMapperController` | P0 |
| Data ingestion drift | `GET /v1/data-ingestion/drift-alerts` | `DataIngestionController` | ✅ |

**Drift guard:** `npm run check:route-parity` — heuristic diff of Fastify route strings vs Spring `@RequestMapping`/`@*Mapping` (see `scripts/route-parity-check.mjs`). Path placeholders differ (`:id` vs `:param`) and class-level `@GetMapping` may not parse as a full path, so treat output as a smoke signal, not a strict contract.

**JDBC vs `create_tables.sql`:** **`ConsortiumController`**, **`ProductController`**, **`ReportController`**, **`SlaConfigController`**, **`AlertRuleController`**, **`UserController`** (list/read user JSON), and **`AuditLogController`** query columns defined in **`backend/src/main/resources/db/create_tables.sql`**. If list endpoints return **`500` / `ERR_INTERNAL`**, re-seed the dev SQLite file or run **`RouteParitySqliteIntegrationTest`** — see [Technical-Decision-Log.md](./Technical-Decision-Log.md) **TDL-018**.

**User account status (Spring + SQLite):** persisted values are lowercase (`active`, `suspended`, `deactivated`, `invited`) per `users.user_account_status` CHECK; align UI labels if you expect Title Case from the API.

**Pagination:** Spring `Page` JSON uses `number` for the current page index; the SPA normalizes `number` → `page` in `fetchInstitutions`.

**JWT roles:** Spring returns `ROLE_*` authorities in the token payload; `AuthContext` normalizes to display names for UI parity.

**Next steps:** Regenerate OpenAPI from Spring when ready; keep this file updated as controllers change.
