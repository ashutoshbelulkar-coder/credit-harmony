# HCB Platform — Technical Decision Log

**Version:** 3.0.5 | **Date:** 2026-03-31

---

## TDL-018: JDBC alignment for list APIs + flat users/audit JSON + `AuthUserPrincipal` in controllers

| Field | Value |
|-------|-------|
| **Decision** | (1) Align **JdbcTemplate** SQL in **`ConsortiumController`**, **`ProductController`**, **`ReportController`**, **`SlaConfigController`**, and **`AlertRuleController`** with **`create_tables.sql`** / **`seed_data.sql`** so SQLite does not throw **no such column** (which surfaced as **`500` / `ERR_INTERNAL`**). (2) Serve **`GET /api/v1/users`** (and related user JSON) via **JdbcTemplate** maps with **`roles[]`**, avoiding Hibernate + Jackson on JPA **`User`**. (3) Serve **`GET /api/v1/audit-logs`** via **JdbcTemplate** with flat **`userId` / `userEmail`** and filters including **`entityType`**. (4) Use **`@AuthenticationPrincipal AuthUserPrincipal`** on mutating controllers and **`AuthController`** **`/me`** + **`logout`**; add **`AuditService.log(AuthUserPrincipal, …)`** delegating to **`UserRepository.getReferenceById`**. (5) Extend **`RouteParitySqliteIntegrationTest`** with **`coreSchemaAlignedGetRoutesOk`** (**`@WithMockUser(roles = "ANALYST")`** — **`VIEWER`** cannot access **`/api/v1/audit-logs`** per **`SecurityConfig`**). |
| **Date** | 2026-03-31 |
| **Status** | Accepted |
| **Alternatives Considered** | Alter SQLite DDL to match legacy stub column names; DTOs only without JDBC |
| **Rationale** | Canonical schema in repo is **`create_tables.sql`**; controllers must query real columns. **`AuthUserPrincipal`** is what the JWT filter installs; JPA **`User`** in **`@AuthenticationPrincipal`** was **`null`**, breaking audits and **`/me`**. |
| **Trade-offs** | Spring report **cancel** maps to **`failed`** (schema CHECK has no **`cancelled`**). Product list **`type`** maps from **`coverage_scope`**, not legacy **`product_type`**. |
| **References** | [SPA-Service-Contract-Drift.md](./SPA-Service-Contract-Drift.md), [Canonical-Backend.md](./Canonical-Backend.md), [Testing-Plan.md](./Testing-Plan.md), `RouteParitySqliteIntegrationTest` |

---

## TDL-017: Institution display labels — legal name before trading name

| Field | Value |
|-------|-------|
| **Decision** | When the product shows **one** string for a member institution (pickers, monitoring resolution, schema-mapper source name, dashboard command-center axes), use **legal `name`** first and **`tradingName`** only as fallback if legal is empty (after trim). **Spring:** `DashboardController` JDBC `COALESCE(NULLIF(TRIM(i.name), ''), i.trading_name)`. **SPA:** `institutionDisplayLabel` in `src/lib/institutions-display.ts`. **Legacy Fastify:** same helper for approval descriptions; **`POST /institutions`** does not copy legal into **`tradingName`**. |
| **Date** | 2026-03-31 |
| **Status** | Accepted |
| **Alternatives Considered** | Prefer trading name (legacy); add new API field `displayName` |
| **Rationale** | Regulatory and operator clarity: the registered legal entity should headline lists and dashboard aggregates; trading name remains optional metadata. |
| **Trade-offs** | Operators who relied on short trading names in command-center rows will see legal names; detail screens still show both where designed. |
| **References** | [API-UI-Parity-Matrix.md](./API-UI-Parity-Matrix.md) § *Institution display labels*, [Canonical-Backend.md](./Canonical-Backend.md), `InstitutionFilterSelect`, `DashboardController` |

---

## TDL-016: Spring–SPA HTTP parity — institution sub-resources, API keys POST, user deactivate, drift list

| Field | Value |
|-------|-------|
| **Decision** | Close high-traffic **404/405** gaps between **`src/services/*.ts`** and **`backend/`** by implementing on Spring: **institution** consortium memberships / product subscriptions / billing / api-access / consent (plus camelCase JDBC where needed); **`POST /api/v1/api-keys`**; **`POST /api/v1/users/:id/deactivate`** with **`user_account_status=deactivated`**; **`GET /api/v1/data-ingestion/drift-alerts`** backed by **`ingestion_drift_alerts`**. Narrow **`SecurityConfig`** **`/api/v1/users/**`** matchers to **GET/PATCH/POST** so **`@PreAuthorize`** controls fine-grained roles (global **DELETE** still **SUPER_ADMIN**). Add **`scripts/route-parity-check.mjs`** (`npm run check:route-parity`) and **`RouteParitySqliteIntegrationTest`**. |
| **Date** | 2026-03-31 |
| **Status** | Accepted |
| **Alternatives Considered** | Point SPA at legacy Fastify only; generate OpenAPI-first contract before coding |
| **Rationale** | Default Vite proxy targets **8090**; operators must not see “route only on Fastify” failures when **`VITE_USE_MOCK_FALLBACK=false`**. |
| **Trade-offs** | Heuristic route script is noisy (`:id` vs `:param`); some user statuses are **lowercase** in DB — UI may need label normalisation. |
| **References** | [Spring-SPA-Route-Inventory.md](./Spring-SPA-Route-Inventory.md), [SPA-Service-Contract-Drift.md](./SPA-Service-Contract-Drift.md), `ApiKeyController`, `DataIngestionController`, `UserController`, `SecurityConfig` |

---

## TDL-015: Schema Mapper on Spring — JSON document tables

| Field | Value |
|-------|-------|
| **Decision** | Implement **`/api/v1/schema-mapper/*`** on Spring with **SQLite/Postgres tables** (`schema_mapper_registry`, `schema_mapper_schema_version`, `schema_mapper_mapping`, etc.) storing **JSON payloads** per row (Fastify-shaped documents), rather than normalising immediately into fine-grained relational `source_schemas` / mapping-pair tables. |
| **Date** | 2026-03-31 |
| **Status** | Accepted |
| **Alternatives Considered** | Full relational normalisation first; BFF-only delegating to Fastify |
| **Rationale** | **Parity speed:** port behaviour and shapes from `server/src/schemaMapper.ts` with minimal translation. **Single-writer JSON** per aggregate matches how the SPA and legacy API think about registry rows, versions, and mapping jobs. |
| **Trade-offs** | Weaker ad hoc SQL over nested fields; future reporting may need views or extract. Easier to drift document shape vs strict columns — mitigate with integration tests and shared seed JSON. |
| **References** | `SchemaMapperController`, `com.hcb.platform.schemamapper`, `create_tables.sql`, `config/schema-mapper.json`, [Canonical-Backend.md](./Canonical-Backend.md) |

---

## TDL-014: Spring-first developer handbook + SQLite-safe dashboard SQL + JDBC login principal

| Field | Value |
|-------|-------|
| **Decision** | (1) **`Developer-Handbook.md` v2.0** describes **Spring Boot 8090** as the default local API; Fastify **8091** as legacy. (2) **`DashboardController`** member-quality SQL must separate static `AND` from dynamic `batchWhere` (`+ " " + batchWhere`); avoid SQLite reserved alias **`member`** (use **`institution_label`** → JSON **`member`**). (3) **`DashboardCommandCenterSqliteIntegrationTest`** runs **`GET /api/v1/dashboard/command-center`** on SQLite + `create_tables.sql` / `seed_data.sql`. (4) **Login** uses **`AuthAccountService`** / **`AuthUserPrincipal`** (JDBC `UserDetails`) to avoid Hibernate/SQLite role-graph bugs; **refresh** reads **`user_id` before token rotation**. |
| **Date** | 2026-03-31 |
| **Status** | Accepted |
| **Rationale** | Removes “Fastify is canonical” drift in ops docs; prevents **`ANDbj`** parse errors and reserved-word failures on modern SQLite; gives CI a faithful SQLite path for dashboard JDBC. |
| **References** | [Developer-Handbook.md](./Developer-Handbook.md), [Canonical-Backend.md](./Canonical-Backend.md), [Testing-Plan.md](./Testing-Plan.md) |

---

## TDL-001: Database Engine Selection — SQLite for Development, PostgreSQL for Production

| Field | Value |
|-------|-------|
| **Decision** | Use SQLite 3 (WAL mode) for development; PostgreSQL 15 for production |
| **Date** | 2026-03-28 |
| **Status** | Accepted |
| **Alternatives Considered** | H2 in-memory, MySQL, MongoDB |
| **Rationale** | SQLite provides zero-configuration local development with file-based portability. PostgreSQL is the industry standard for production OLTP workloads in financial systems. Hibernate community dialect bridges the gap. ANSI-compatible DDL ensures schema portability. |
| **Trade-offs** | SQLite lacks row-level locking (WAL mode partially mitigates); no native `TIMESTAMPTZ` (stored as DATETIME/TEXT). |
| **Migration Path** | Flyway for production schema migrations; seed scripts for dev. |

---

## TDL-002: Authentication — JWT Access + Refresh Token Architecture

| Field | Value |
|-------|-------|
| **Decision** | Short-lived JWT access tokens (15 min, HS256) + long-lived refresh tokens (7 days, rotation on use) |
| **Date** | 2026-03-28 |
| **Status** | Accepted |
| **Alternatives Considered** | Session-based auth, PASETO, opaque tokens only |
| **Rationale** | JWT enables stateless API authorization without DB lookup on every request (scales horizontally). Short access token lifetime limits breach window. Refresh tokens stored as SHA-256 hashes (never plain text) with rotation-on-use prevents token theft reuse. |
| **Trade-offs** | Cannot immediately revoke access tokens (15-min window); mitigated by refresh token revocation which prevents renewal. |
| **Security Note** | JWT secret minimum 256 bits enforced in code. Dev fallback key clearly marked for replacement. |

---

## TDL-003: Password Hashing — BCrypt Cost Factor 12

| Field | Value |
|-------|-------|
| **Decision** | BCrypt with cost factor 12 for all user passwords |
| **Date** | 2026-03-28 |
| **Status** | Accepted |
| **Alternatives Considered** | Argon2id (preferred for new systems), scrypt, PBKDF2 |
| **Rationale** | BCrypt is the Spring Security default, well-tested, and sufficient for the current threat model. Cost factor 12 provides adequate work factor (~300ms on modern hardware). |
| **Future Consideration** | Migrate to Argon2id when Spring Security adds native support. |

---

## TDL-004: PII Encryption Strategy

| Field | Value |
|-------|-------|
| **Decision** | AES-256-GCM for reversible PII fields (name, DOB); SHA-256/HMAC for irreversible identifiers (national ID hash, phone hash) |
| **Date** | 2026-03-28 |
| **Status** | Accepted |
| **Rationale** | Reversible encryption required for name/DOB (authorized display); one-way hashing for matching (national ID lookup doesn't need plaintext). HMAC with server-side pepper prevents rainbow table attacks on hashed fields. |
| **Key Management** | Keys managed via environment variables (`HCB_PII_KEY`, `HCB_HMAC_PEPPER`). Key rotation requires data re-encryption (documented in operations guide). |

---

## TDL-005: Normalization Level — Strict 3NF

| Field | Value |
|-------|-------|
| **Decision** | Third Normal Form (3NF) strictly enforced; no denormalized shortcuts |
| **Date** | 2026-03-28 |
| **Status** | Accepted |
| **Alternatives Considered** | 2NF (too lax for credit bureau), 4NF/5NF (over-engineering) |
| **Rationale** | Credit bureau data requires single source of truth for regulatory compliance. Denormalized status caches caused 11 identified duplicate attribute issues in the original mock data. 3NF eliminates these without over-complicating the query model. |
| **Trade-offs** | More JOINs per query; mitigated by strategic indexing on all FK columns and frequently filtered fields. |

---

## TDL-006: Soft Delete Strategy

| Field | Value |
|-------|-------|
| **Decision** | Soft delete via `is_deleted` (BOOLEAN) + `deleted_at` (DATETIME) on all mutable entities |
| **Date** | 2026-03-28 |
| **Status** | Accepted |
| **Rationale** | Financial regulatory requirements mandate data retention. Hard deletes remove audit trail. Soft delete preserves history while allowing logical exclusion via WHERE clause. |
| **Implementation** | All queries add `AND is_deleted = 0` filter via JPA. Cascade rules: `CASCADE` for child entities, `SET NULL` for optional references. |

---

## TDL-007: Audit Logging — Append-Only Mandatory Side-Effect

| Field | Value |
|-------|-------|
| **Decision** | Every business action generates an immutable audit_log row as a mandatory transaction side-effect |
| **Date** | 2026-03-28 |
| **Status** | Accepted |
| **Rationale** | Basel, SOX, and local financial regulatory requirements mandate complete audit trails. Making it a mandatory service-layer side-effect (not optional) prevents logging gaps. |
| **Security** | IP addresses hashed (SHA-256) before storage. PII never in log descriptions. User referenced by ID (FK) only. |
| **Retention** | 2,555 days (7 years) minimum per financial services compliance standards. |

---

## TDL-008: API Error Response Design — Generic Codes Only

| Field | Value |
|-------|-------|
| **Decision** | All error responses use generic error codes (e.g., `ERR_AUTH_FAILED`); no stack traces, DB errors, or internal paths exposed |
| **Date** | 2026-03-28 |
| **Status** | Accepted |
| **Rationale** | OWASP A05 (Security Misconfiguration) — exposing internal details aids attackers. Spring `include-message: never` and `include-stacktrace: never` enforced. |

---

## TDL-009: H2 Console — Development Only

| Field | Value |
|-------|-------|
| **Decision** | H2 console enabled only in `dev` profile; disabled via config in `prod` profile |
| **Date** | 2026-03-28 |
| **Status** | Accepted |
| **Rationale** | H2 console provides web-based DB inspection useful for development debugging. In production it would expose a direct database interface — an unacceptable security risk. Profile-based flag prevents accidental enablement. |

---

## TDL-010: Status Field Domain Scoping

| Field | Value |
|-------|-------|
| **Decision** | Status fields use domain-specific names (`institution_lifecycle_status`, `batch_job_status`, etc.) with domain-specific CHECK constraint enums |
| **Date** | 2026-03-28 |
| **Status** | Accepted |
| **Problem Solved** | Original mock data used generic `status` field across 8+ domains with incompatible enum sets, causing filter confusion and type safety violations. |
| **Rationale** | Domain-scoped names enable unambiguous filtering, prevent cross-domain status comparisons, and allow per-domain CHECK constraints. |

---

## TDL-011: Local development API — Node (Fastify) + in-memory seed

| Field | Value |
|-------|-------|
| **Decision** | Ship a `server/` Fastify app on port **8091** (configurable via `PORT`) exposing `/api/v1/*` routes aligned with `src/services/*.ts`; seed data loaded from `src/data/*.json`; in-memory state only (no SQLite/Postgres in this process). |
| **Date** | 2026-03-28 |
| **Status** | Accepted (dev harness) |
| **Rationale** | Unblocks end-to-end UI testing without waiting on Java; historically Vite proxied `/api` to **8091**; **default proxy is now Spring 8090** — use **`VITE_API_PROXY_TARGET=http://127.0.0.1:8091`** only for legacy Fastify. |
| **Trade-offs** | Data resets on server restart; not suitable for production. Replace with TDL-001 PostgreSQL stack when hardening. |
| **Security** | Default `JWT_SECRET` must be overridden outside local dev. |

---

## TDL-012: UI–API parity, Vitest server integration, demo UI flags

| Field | Value |
|-------|-------|
| **Decision** | (1) Align high-impact UI actions with Fastify mutations (users PATCH/deactivate + audit, batch retry/cancel state changes, consortium `members`/`dataPolicy`, alert rule edit). (2) Export `buildServer()` from `server/src/index.ts` for `app.inject` tests; Vitest **projects** split client (jsdom + setup) vs server (node). (3) Gate non-functional login/SSO and clarify agents/dashboard copy via `src/lib/feature-flags.ts` (`VITE_SHOW_DEMO_AUTH_UI`). |
| **Date** | 2026-03-29 |
| **Status** | Accepted |
| **Rationale** | Prevents “success toasts with no persistence”; integration tests catch route regressions without a live port; production builds hide misleading SSO/password-reset affordances unless explicitly enabled. |
| **References** | [API-UI-Parity-Matrix.md](./API-UI-Parity-Matrix.md), [Production-Backend-Roadmap.md](./Production-Backend-Roadmap.md) |

---

## TDL-013: Developer Handbook + expanded Fastify integration coverage

| Field | Value |
|-------|-------|
| **Decision** | (1) Add `docs/technical/Developer-Handbook.md` as the step-by-step operational guide (env, ports, accounts, troubleshooting, doc map). (2) Expand `server/src/api.integration.test.ts` with `describe.sequential`, shared `server/src/test-helpers.ts`, and routes covering refresh, dashboard metrics, approvals, users PATCH, audit filters, alert CRUD, reports, products, batch cancel, institution memberships/subscriptions, roles. (3) Add Fastify **route appendix** to `API-UI-Parity-Matrix.md`. (4) Add `src/test/lib/feature-flags.test.ts` for client flag consistency. |
| **Date** | 2026-03-29 |
| **Status** | Accepted |
| **Rationale** | BRD/PRD QA sections must point to **executable** regression gates and **foolproof** onboarding; a single handbook reduces confusion between Spring-target docs and the shipped Fastify prototype. |
| **References** | [Developer-Handbook.md](./Developer-Handbook.md), [Testing-Plan.md](./Testing-Plan.md) |

*Subsequent update (2026-03-31):* **`server/src/api.integration.test.ts`** was **removed**; use **`npm run spring:test`**. **Developer Handbook v2.0** + **TDL-014** set **Spring 8090** as the default ops narrative.
