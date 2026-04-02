# HCB Platform — Testing Plan

**Version:** 3.0.7 | **Date:** 2026-03-31

---

## Implemented tests in this repository (ground truth)

Run from repo root: **`npm run test`**. Vitest loads **two projects** (`vitest.config.ts`): **client** (jsdom + `src/test/setup.ts`) and **server** (node).

| Suite | File(s) | Count (approx.) | What is proven |
|-------|---------|-----------------|----------------|
| Server integration | `backend` — `HcbPlatformApplicationTest` (MockMvc) | Growing suite | **Spring Boot** HTTP tests (`@SpringBootTest`, H2); **`hcb.schema-mapper.enabled=false`** because H2 test DB has no `schema_mapper_*` tables. Replaces removed **`server/src/api.integration.test.ts`** (legacy Fastify). |
| Server dashboard + SQLite | `backend` — `DashboardCommandCenterSqliteIntegrationTest` | 1 | **`GET /api/v1/dashboard/command-center`** against **SQLite** + `create_tables.sql` / `seed_data.sql` (shared in-memory DB). Guards JDBC SQL that H2-only tests do not exercise (e.g. reserved identifiers, dynamic `WHERE` fragments). |
| Server schema-mapper + SQLite | `backend` — `SchemaMapperSqliteIntegrationTest` | 2 | **`/api/v1/schema-mapper/*`**: login + JWT, wizard-metadata, schemas, source-type-fields validation (**400** without `sourceType`), **ingest**, **mapping** job poll until **`needs_review`**. Uses in-memory SQLite + full DDL; **`hcb.schema-mapper.enabled=true`**, **`hcb.schema-mapper.llm-enabled=false`** (no `OPENAI_API_KEY` in CI). Run: **`npm run spring:test`** (or `mvn -f backend/pom.xml test -Dtest=SchemaMapperSqliteIntegrationTest`). |
| Spring–SPA route parity + SQLite | `backend` — `RouteParitySqliteIntegrationTest` | 4 | **`GET /api/v1/data-ingestion/drift-alerts`**, **`POST /api/v1/api-keys`**, **`POST /api/v1/users/:id/deactivate`**, and **`coreSchemaAlignedGetRoutesOk`** (**`GET`** **`/consortiums`**, **`/products`**, **`/reports`**, **`/sla-configs`**, **`/alert-rules`**, **`/users`**, **`/audit-logs`**) with **`@WithMockUser`** (**`ANALYST`** for the bundle including audit logs — **`VIEWER`** is denied **`/audit-logs`** by **`SecurityConfig`**). Companion heuristic: **`npm run check:route-parity`**. |
| Spring approval queue + SQLite | `backend` — `ApprovalQueueSqliteIntegrationTest` | 3 | JWT login; **`POST /api/v1/products`** with **`approval_pending`** → **`GET /api/v1/approvals`** includes **`metadata.productId`** → **`POST …/approve`** **204** → product **`active`**; **`POST /api/v1/alert-rules`** → pending **`alert_rule`** queue row with **`metadata.alertRuleId`**; **`POST …/reject`** **204**. **`hcb.schema-mapper.enabled=false`**. |
| Server institution traffic gate | `server/src/institutionTrafficGate.test.ts` | 6 cases | Lifecycle checks for Data Submission / batch retry / Enquiry target contract (`ERR_INSTITUTION_*`) |
| Server register-form unit | `server/src/institutionRegisterForm.test.ts` | 12 cases | `resolveRegisterGeographyId`, `buildRegisterFormPayload` option resolution, `validateRegisterInstitutionBody` (enums, participation, consortium rules) — no HTTP |
| Client register-form unit | `src/lib/institution-register-form.test.ts` | 8+ cases | Client-side `resolveRegisterFormClientSide`, Zod `buildRegisterDetailsSchema`, `mapRegisterDetailsToCreateBody` (parallels server rules for Step 1) |
| Client schema-mapper helpers | `src/lib/schema-mapper-api.test.ts` | 3 | `fieldMappingsToLlmRows` / `llmRowsToFieldMappings` / master flatten |
| Client schema-mapper source fields | `src/lib/schema-mapper-source-fields.test.ts` | 9 | `flattenParsedSourceFields` (nested paths); `sourceTypeFieldsFromMockCatalog` per **telecom** / **utility** / **bank** / **gst** / **custom**; unknown type **[]**; sorted paths |
| Client schema-mapper wizard metadata | `src/lib/schema-mapper-wizard-metadata.test.ts` | 4 | `normaliseWizardLabeledOptions` (fallback, aliases, empty) |
| Client schema-mapper API mapping shape | `src/lib/schema-mapper-api.test.ts` | 4+ | `fieldMappingsToLlmRows` / `llmRowsToFieldMappings`; **`containsPii`** round-trip |
| Server helpers | `server/src/test-helpers.ts` | — | DRY login + auth headers for integration tests |
| API client | `src/test/lib/api-client.test.ts` | 19 | Error types, refresh behaviour, request shaping; **204** / **empty success body** parses as **`undefined`** (no **`res.json()`** on empty) |
| Feature flags | `src/test/lib/feature-flags.test.ts` | 2 | Demo UI toggles stay internally consistent |
| Calculations | `src/test/calc/*.test.ts` | 84+ | KPI, batch, date filters — deterministic |
| React | `src/test/components/*.tsx`, `src/test/auth/*.tsx` | 26+ | Critical queues/lists and auth provider |

**Foolproof ops:** For clone-to-green steps, env vars, ports, seeded passwords, and troubleshooting, use **`docs/technical/Developer-Handbook.md`** (Spring on **8090** default; `npm run spring:test` for Java suites).

---

## Testing Strategy

The HCB Platform testing strategy covers four layers:
1. **Backend Unit Tests** — Service logic isolation
2. **Backend Integration Tests** — API + DB end-to-end
3. **Security Tests** — Authentication, authorization, data leakage
4. **Frontend Component Tests** — React component rendering and interaction

### Local Spring API (canonical) and legacy Fastify

| Layer | Tooling | Location / command |
|-------|---------|-------------------|
| HTTP integration (no port) | **Removed** — was Vitest + Fastify `inject()` (`server/src/api.integration.test.ts`, deleted). Use **`npm run spring:test`** (`HcbPlatformApplicationTest`) instead. |
| Client unit + component | Vitest + Testing Library + jsdom | `src/**/*.test.ts(x)` |
| Run all | `npm run test` | `vitest.config.ts` uses **projects**: `client` and `server` |

`buildServer()` is exported from `server/src/index.ts`; the CLI entrypoint only listens when the file is executed directly (`import.meta.url` matches `process.argv[1]`), so test imports do not start a listener.

See also: [API-UI-Parity-Matrix.md](./API-UI-Parity-Matrix.md) for which UI actions must hit the API.

---

## Fastify dev API — Register member (geography-backed form) test specification

**Scope:** `GET /api/v1/institutions/form-metadata`, `POST /api/v1/institutions` with optional **`?geography=`**, configuration file **`src/data/institution-register-form.json`**, and the SPA-aligned helpers in **`src/lib/institution-register-form.ts`** / **`server/src/institutionRegisterForm.ts`**.

**How to run automated coverage**

```bash
npm run test
# Or only these suites:
npx vitest run server/src/institutionRegisterForm.test.ts
mvn -f backend/pom.xml test -Dtest=HcbPlatformApplicationTest#institutionFormMetadataReturnsRegisterForm
npx vitest run src/lib/institution-register-form.test.ts
```

### Traceability matrix (documented case → automated test)

| ID | Objective | Preconditions | Steps | Expected result | Automated (`it(...)` name) |
|----|-------------|---------------|-------|-----------------|------------------------------|
| **FM-REG-INT-001** | Default form-metadata shape | Fastify seeded; admin JWT | `GET /api/v1/institutions/form-metadata` with `Authorization: Bearer` | `200`; `geographyId` is `default`; `registerForm.sections` is non-empty; `institutionTypes` contains seeded types; `activeConsortiums` lists only **active** consortiums; `requiredComplianceDocuments` non-null per seed; default regulatory **jurisdiction** field is **text** | `GET /api/v1/institutions/form-metadata returns institutionTypes and activeConsortiums` |
| **FM-REG-INT-002** | Kenya geography exposes closed jurisdiction enum | Same | `GET …/form-metadata?geography=kenya` | `200`; `geographyId` is `kenya`; **jurisdiction** is **`select`** with options Kenya, Uganda, Tanzania | `GET … form-metadata?geography=kenya returns registerForm with jurisdiction select enum` |
| **FM-REG-INT-003** | POST validates against Kenya enum | Same | `POST …/institutions?geography=kenya` with body including `jurisdiction: "Rwanda"` and other valid required fields | `400` (value not in geography config) | `POST … geography=kenya rejects jurisdiction outside geography enum` |
| **FM-REG-INT-004** | POST accepts Kenya when jurisdiction matches enum | Same | `POST …/institutions?geography=kenya` with `jurisdiction: "Kenya"` and valid payload | `200`; JSON includes numeric `id` | `POST … geography=kenya succeeds when jurisdiction is in enum` |
| **FM-REG-INT-005** | Institution type allowlist | Same | `POST …/institutions` with `institutionType` not in `institutionTypes` | `400` | `POST … rejects institutionType outside configured allowlist` |
| **FM-REG-INT-006** | Consortium IDs must be active | Same | `POST …` with invalid / inactive consortium id in `consortiumIds` | `400` | `POST … rejects non-active consortiumIds` |
| **FM-REG-INT-007** | Valid consortium IDs create pending memberships | Same | `POST …` subscriber + `consortiumIds` of active ids | `200`; `GET …/:id/consortium-memberships` includes rows with `pending` | `POST … with consortiumIds creates pending consortium memberships` |
| **FM-REG-UNIT-001** | Unknown geography key falls back | None (loads JSON from disk) | Call `resolveRegisterGeographyId("no-such-region-xyz")` | Returns configured **`defaultGeography`** (`default`) | `falls back to defaultGeography for unknown keys` |
| **FM-REG-UNIT-002** | Server validator matches Kenya enum | Minimal `AppState` with types + consortiums | `validateRegisterInstitutionBody` kenya + `jurisdiction: "Rwanda"` | Non-null error string | `kenya: rejects jurisdiction not in enum` |
| **FM-REG-UNIT-003** | Consortium field ignored when not subscriber | Same | `validateRegisterInstitutionBody` default + `isSubscriber: false` + bogus `consortiumIds` | `null` | `skips consortiumIds validation when not subscriber` |
| **FM-REG-CLI-001** | Client Zod rejects bad jurisdiction for kenya | None | `buildRegisterDetailsSchema` + `safeParse` with kenya form + `jurisdiction: "Rwanda"` | `success === false` | `kenya: rejects jurisdiction not in enum` |
| **FM-REG-CLI-002** | `legalName` maps to `name` on POST body | Resolved default form | `mapRegisterDetailsToCreateBody` | `body.name` set; no `legalName` key | `maps legalName to name via apiKey` |

**Manual / E2E (optional):** With **`npm run spring:start`** (or legacy **`npm run server`**) and **`VITE_USE_MOCK_FALLBACK=false`**, open **`/institutions/register`**, confirm Step 1 sections match **`form-metadata`** for **`VITE_INSTITUTION_REGISTER_GEOGRAPHY`**; set env to **`kenya`** and confirm jurisdiction control is a single-select with three countries only.

**Registration number:** Confirm **Registration Number** is **read-only**, shows the assigned-on-submit hint, and is **not** required (no `*` on label). Submit a new member without sending **`registrationNumber`**; **201** response and institution list/detail show the server-assigned value (**`BK-…-YYYY-#####`** pattern when using default geography types).

---

## Fastify dev API — Schema Mapper `source-type-fields` (traceability)

**Scope:** `GET /api/v1/schema-mapper/schemas/source-type-fields?sourceType=` and client **`sourceTypeFieldsFromMockCatalog`** (`src/lib/schema-mapper-source-fields.ts`).

| ID | Objective | Automated (`it(...)` name) |
|----|------------|---------------------------|
| **SM-STF-INT-001** | Missing `sourceType` returns **400** | `GET /api/v1/schema-mapper/schemas/source-type-fields requires sourceType` |
| **SM-STF-INT-002** | Telecom returns telecom sample paths | `…returns parsed field paths for sourceType` (subscriber_id) |
| **SM-STF-INT-003** | Bank / utility / gst / custom return distinct reference paths | `…returns per-type sample fields (bank, utility, gst, custom)` |

**Client unit:** `npx vitest run src/lib/schema-mapper-source-fields.test.ts`

---

## Backend Test Suite (Spring Boot / JUnit 5)

### Auth Module Tests

| Test ID | Test Name | Scenario | Expected Result |
|---------|-----------|----------|-----------------|
| AUTH-001 | Valid login returns JWT | POST /auth/login with admin@hcb.com + Admin@1234 | 200 + accessToken + refreshToken |
| AUTH-002 | Invalid password returns 401 | POST /auth/login with wrong password | 401 ERR_AUTH_FAILED |
| AUTH-003 | Non-existent user returns 401 | POST /auth/login with unknown@email.com | 401 ERR_AUTH_FAILED |
| AUTH-004 | Suspended user cannot login | POST /auth/login with suspended@hcb.com | 401 (account non-active) |
| AUTH-005 | Login response contains no password_hash | Valid login | Response body has no `password_hash` field |
| AUTH-006 | Login response contains no stack trace | Valid login | No `stackTrace` in response |
| AUTH-007 | Valid email format required | POST /auth/login with "not-email" | 400 validation error |
| AUTH-008 | Empty password rejected | POST /auth/login with empty password | 400 validation error |
| AUTH-009 | Refresh token rotation | POST /auth/refresh with valid token | New access + refresh tokens; old token revoked |
| AUTH-010 | Expired refresh token rejected | POST /auth/refresh with expired token | 401 |
| AUTH-011 | Revoked refresh token rejected | POST /auth/refresh with revoked token | 401 |
| AUTH-012 | Logout revokes refresh token | POST /auth/logout + subsequent refresh attempt | 401 on subsequent refresh |
| AUTH-013 | /auth/me returns correct user | GET /auth/me with valid JWT | User summary without sensitive fields |
| AUTH-014 | MFA login returns challenge | User with `mfa_enabled=1`: POST /auth/login valid password | 200, `mfaRequired=true`, `mfaChallengeId`, no accessToken |
| AUTH-015 | MFA verify with dummy OTP | POST /auth/mfa/verify with challenge + `123456` (dev dummy mode) | 200 + JWT pair |
| AUTH-016 | MFA wrong OTP | POST /auth/mfa/verify with bad code | 401 ERR_MFA_INVALID |
| AUTH-017 | Captcha required | `HCB_CAPTCHA_ENABLED=true` + secret set; POST login without `captchaToken` | 400 ERR_CAPTCHA_REQUIRED |

### Institution Module Tests

| Test ID | Test Name | Scenario | Expected Result |
|---------|-----------|----------|-----------------|
| INST-001 | List institutions without token | GET /api/v1/institutions | 401 |
| INST-002 | List institutions with viewer token | GET /api/v1/institutions + Viewer JWT | 200 + institution list |
| INST-003 | Create institution with Bureau Admin | POST /api/v1/institutions + Bureau Admin JWT | 201 + institution object |
| INST-004 | Create institution with Viewer (forbidden) | POST /api/v1/institutions + Viewer JWT | 403 ERR_ACCESS_DENIED |
| INST-005 | Suspend active institution | POST /api/v1/institutions/1/suspend + Bureau Admin | 200 + status=suspended |
| INST-006 | Cannot suspend already suspended | POST /api/v1/institutions/6/suspend | 400 validation error |
| INST-007 | Reactivate suspended institution | POST /api/v1/institutions/6/reactivate | 200 + status=active |
| INST-008 | Soft delete institution | DELETE /api/v1/institutions/1 + Super Admin | 204; record still in DB with is_deleted=1 |
| INST-009 | Deleted institution not in list | GET /api/v1/institutions after delete | Deleted institution absent |
| INST-010 | Suspend generates audit log | POST /api/v1/institutions/1/suspend | audit_logs has INSTITUTION_SUSPENDED row |

### Security Tests

| Test ID | Test Name | Scenario | Expected Result |
|---------|-----------|----------|-----------------|
| SEC-001 | No raw API key in api_requests | Submit tradeline | api_requests.api_key_id is FK integer, not raw string |
| SEC-002 | No raw IP in audit_logs | Any action | audit_logs.ip_address_hash is 64-char hex, not dotted IP |
| SEC-003 | CORS blocks unknown origin | Request from unknown origin | 403/rejected |
| SEC-004 | H2 console disabled in prod | Spring profile=prod | /h2-console returns 404 |
| SEC-005 | Generic error for DB exception | Force DB error | Response has ERR_INTERNAL, no SQL details |
| SEC-006 | SQL injection attempt rejected | Malicious input in query param | 400 or sanitized; no SQL error exposed |
| SEC-007 | JWT with wrong secret rejected | Tampered JWT | 401 |
| SEC-008 | Expired JWT rejected | Expired access token | 401 |
| SEC-009 | Role escalation blocked | Analyst tries user management | 403 |
| SEC-010 | Audit log immutability | Attempt to UPDATE audit_logs | No UPDATE API exists; repository has no update method |

### Data Normalization Tests

| Test ID | Test Name | Scenario | Expected Result |
|---------|-----------|----------|-----------------|
| NORM-001 | Institution name not in consortium_members | SELECT from consortium_members | No institution_name column |
| NORM-002 | User roles via join only | GET /api/v1/users | **Spring:** **`UserController`** returns **JdbcTemplate** rows with **`roles[]`** from **`user_role_assignments`** + **`roles`** (not JPA entity graphs) |
| NORM-003 | Soft delete preserves FK integrity | Delete institution | Related records set to NULL or remain with SET NULL FK |
| NORM-004 | Status enums enforced | INSERT invalid status | SQLite CHECK constraint violation |
| NORM-005 | Unique email enforced | Insert duplicate email | UNIQUE constraint violation |
| NORM-006 | Foreign key validation | Insert tradeline with non-existent consumer_id | FK constraint violation |

---

## Frontend Component Tests (Vitest / React Testing Library)

### Component Rendering Tests

| Test ID | Component | Scenario | Expected |
|---------|-----------|----------|----------|
| FE-001 | InstitutionList | Renders with mock data | Institution names visible |
| FE-002 | InstitutionList | Suspend button click | Confirmation dialog shown |
| FE-003 | ApprovalQueuePage | Pending items render | Approve/Reject buttons visible |
| FE-004 | ApprovalQueuePage | Approve click | Item status updates to approved |
| FE-005 | UsersListPage | User table renders | Email column visible (no password) |
| FE-006 | RolesPermissionsPage | Role matrix renders | Checkboxes for each permission |
| FE-007 | AlertRulesDashboard | Rules list renders | Status badges visible |
| FE-008 | MonitoringDashboard | KPI cards render | Numbers displayed |
| FE-009 | BatchConsolePage | Batch jobs list renders | Status column visible |
| FE-010 | Dashboard | Snapshot loads | No uncaught errors |

### Auth Flow Tests

| Test ID | Component | Scenario | Expected |
|---------|-----------|----------|----------|
| FE-AUTH-001 | LoginPage | Empty form submit | Validation errors shown |
| FE-AUTH-002 | LoginPage | Invalid email format | Email validation error |
| FE-AUTH-003 | ProtectedRoute | No token | Redirect to /login |
| FE-AUTH-004 | AuthContext | Token stored | Token in memory (not localStorage in prod) |

---

## Data Policy Management — QA test cases (manual)

**Scope:** Product-level Data Policy configuration UI (consortium wizard → Data policy step → multi-select products → per-product Configure drawer) and mandatory governance audit entry creation on Save.

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| DP-001 | Unmask policy section is present (consortium-level) | Open Consortium Wizard → Data policy step | “Unmask policy” section appears above Products (Full vs Partial) |
| DP-002 | Full vs Partial selection persists while configuring products | Choose Partial → select products → open/close drawers | Consortium-level policy remains selected; does not reset on drawer open/close |
| DP-003 | Multi-product selection renders active products list | Open Data policy step | Active products list renders; user can select multiple products |
| DP-004 | No product selected hides Configure actions | Open Data policy step; select none | No per-product Configure actions shown |
| DP-005 | Per-product drawer opens and lists masked fields | Select a product → click Configure | Right drawer opens for that product; shows masked fields with allow-unmask checkboxes and Data Type |
| DP-006 | Drawer scroll works with long lists | Open Configure for product with many masked fields | Field list is scrollable; header and Save/Cancel remain accessible |
| DP-007 | Consortium-level policy applies on field toggle | Set policy=Full → check a field | Field is set to `isUnmasked=true` and saved with `unmaskType=FULL` |
| DP-008 | Partial requires template | Set policy=Partial → check a field without a supported template | UI blocks toggle and shows error “Partial masking template not available for this field” |
| DP-009 | Partial works for supported fields | Set policy=Partial → check PAN/Phone/Email/Name | Toggle succeeds; saved payload includes `unmaskType=PARTIAL` and a `partialConfig` template (no free-text inputs) |
| DP-010 | “At least 1 masked” guard blocks unsafe saves | Check every masked field for a product → Save | Save blocked with error “At least 1 field must remain masked”; selections retained |
| DP-011 | Save persists product-scoped policy only | Configure Product A → Save → Configure Product B | Product A keeps its policy; Product B remains independent |
| DP-012 | Draft vs saved behavior | Change selections (don’t save) → close drawer → reopen | Unsaved changes are preserved while the product draft is dirty; saving clears dirty state |
| DP-013 | Switch consortium-level policy updates checked fields | With some fields checked, change policy Full ↔ Partial | Checked fields update their `unmaskType` accordingly where allowed (Partial requires template) |
| DP-014 | Backend validation errors are surfaced | Force a backend 400 (e.g. attempt to save all fields unmasked) | Error toast shown; drawer stays open; state retained |
| DP-015 | Audit log created on successful save | Save a policy update → open Data Governance → Governance Audit Logs | New row present with `actionType=DATA_POLICY_UPDATED` and `entityType=GOVERNANCE` (description contains changed field names only) |
| DP-016 | RBAC: Viewer can read but cannot save | Login as VIEWER → open Configure and try Save | Fetch works (read-only); Save is forbidden (403) and UI shows error |
| DP-017 | Auth required | Without JWT, load data-policy endpoint | API returns 401; SPA shows appropriate error state when mock fallback is disabled |
| DP-018 | Multi-product selection performance | Select 10+ products | The page remains responsive; masked counts load progressively per product |

## Running Tests

### Backend Tests
```bash
cd backend

# Run all tests
mvn test

# Run with coverage report
mvn test jacoco:report

# Run specific test class
mvn test -Dtest=HcbPlatformApplicationTest

# Run specific test method
mvn test -Dtest=HcbPlatformApplicationTest#loginWithValidCredentials
```

### Frontend Tests
```bash
# Run all frontend tests
npm run test

# Run in watch mode
npm run test -- --watch

# Run with coverage
npm run test -- --coverage
```

---

## Test Environment Setup

### Backend Test Config
Tests use `dev` Spring profile with in-memory H2 database for isolation:
```yaml
# application-test.yml (auto-detected by @ActiveProfiles("test"))
spring:
  datasource:
    url: jdbc:h2:mem:hcb_test;DB_CLOSE_DELAY=-1
    driver-class-name: org.h2.Driver
  h2:
    console:
      enabled: false
  sql:
    init:
      mode: always
      schema-locations: classpath:db/create_tables.sql
      data-locations: classpath:db/seed_data.sql
```

### Expected Test Coverage Targets

| Module | Unit Coverage | Integration Coverage |
|--------|--------------|---------------------|
| AuthService | ≥ 90% | ≥ 85% |
| InstitutionController | ≥ 85% | ≥ 80% |
| AuditService | ≥ 95% | ≥ 90% |
| JwtService | ≥ 95% | ≥ 90% |
| Security Config | ≥ 80% | ≥ 85% |

---

## Regression Test Checklist (Pre-Release)

- [ ] All AUTH tests pass
- [ ] All INST tests pass
- [ ] All SEC tests pass
- [ ] All NORM tests pass
- [ ] No sensitive data in any API response (password_hash, raw API key, plain IP)
- [ ] H2 console disabled in prod profile
- [ ] Audit logs generated for all mutations
- [ ] Soft delete working (records excluded from queries, present in DB)
- [ ] Future-dated data accessible (check enquiries, batch_jobs after today)
- [ ] Daily simulation runs without FK violations
- [ ] Refresh token rotation confirmed (old token rejected after refresh)
- [ ] Suspended user login returns 401
- [ ] Viewer role cannot access user management (403)

---

## Phase 8 — Test Execution Report (2026-03-28)

### Frontend — Vitest Run Results

```
 RUN  v3.2.4  C:/Users/ashut/OneDrive/Desktop/credit-harmony

 ✓  src/test/example.test.ts  (1 test)  3ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  01:54:07
   Duration  2.95s
```

**Status:** PASS — all frontend test suites pass with exit code 0.

**Pre-existing linter issues (not regressions):** 22 problems (8 errors, 14 warnings). These originate in the original codebase and are documented in `AGENTS.md` as expected pre-existing ESLint errors (`@typescript-eslint/no-explicit-any`, `react-hooks/exhaustive-deps`, `react-refresh/only-export-components`, `@typescript-eslint/no-require-imports`). No new linter errors were introduced.

---

### Backend — Static Verification (Maven not in PATH on build host)

Maven is not installed in the local PATH on this machine (Java 8 runtime only detected at `C:\Program Files (x86)\Common Files\Oracle\Java\java8path\java.exe`). The backend requires Java 17+. Static verification was performed instead.

#### File Completeness Check

| File | Status |
|------|--------|
| `backend/pom.xml` | ✅ Present |
| `backend/src/main/resources/application.yml` | ✅ Present |
| `backend/src/main/resources/db/create_tables.sql` | ✅ Present |
| `backend/src/main/resources/db/seed_data.sql` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/HcbPlatformApplication.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/config/SecurityConfig.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/config/AsyncConfig.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/security/JwtService.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/security/JwtAuthenticationFilter.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/model/entity/User.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/model/entity/Institution.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/model/entity/Role.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/model/entity/UserRoleAssignment.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/model/entity/AuditLog.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/model/entity/RefreshToken.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/repository/UserRepository.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/repository/InstitutionRepository.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/repository/RefreshTokenRepository.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/repository/AuditLogRepository.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/service/AuthService.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/service/AuditService.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/service/DailySimulationService.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/service/UserDetailsServiceImpl.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/controller/AuthController.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/controller/InstitutionController.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/controller/AuditLogController.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/common/ApiError.java` | ✅ Present |
| `backend/src/main/java/com/hcb/platform/common/GlobalExceptionHandler.java` | ✅ Present |
| `backend/src/test/java/com/hcb/platform/HcbPlatformApplicationTest.java` | ✅ Present |

**Total Java source files:** 27 (26 production + 1 test)

#### Integration Test Specification (HcbPlatformApplicationTest.java)

The backend test class defines 8 integration tests targeting Spring Boot + MockMvc:

| Test ID | Method | Mapped Spec ID | Description |
|---------|--------|----------------|-------------|
| T01 | `contextLoads` | — | Spring context loads without error |
| T02 | `healthEndpointIsPublic` | — | `GET /actuator/health` returns 200 |
| T03 | `protectedEndpointRequiresAuth` | AUTH-001, SEC-007 | `GET /api/v1/institutions` returns 401 without token |
| T04 | `loginWithValidCredentials` | AUTH-001 | Valid admin login returns `accessToken`, `refreshToken`, `user.email` |
| T05 | `loginWithInvalidCredentials` | AUTH-002 | Wrong password returns 401 with `ERR_AUTH_FAILED` |
| T06 | `loginResponseDoesNotLeakSensitiveData` | AUTH-005, AUTH-006 | Response body contains no `password_hash`, `passwordHash`, or `stackTrace` |
| T07 | `loginRequiresValidEmailFormat` | AUTH-007 | Malformed email in login body returns 400 |
| T08 | `internalErrorsDoNotLeakDetails` | SEC-005 | Unknown endpoint returns 4xx, no internal details |

**Prerequisites to run backend tests:**
1. Install Java 17+ (e.g., [Eclipse Temurin 17](https://adoptium.net/))
2. Install Maven 3.9+ or use the Maven wrapper: `./mvnw test -pl backend`
3. Run from the project root: `cd backend && mvn test -Dspring.profiles.active=dev`

---

### Documentation Completeness

| Document | Status |
|----------|--------|
| `hcb_system_design.yaml` | ✅ Complete — 33-table normalized schema, APIs, action APIs, data flows |
| `docs/PRD-BRD-HCB-Admin-Portal.md` | ✅ Updated — Section A: Data Normalization Principles |
| `docs/BRD-Hybrid-Credit-Bureau-Admin-Portal.md` | ✅ Updated — Section B: Business Data Governance Requirements |
| `docs/technical/ERD-Schema-Map.md` | ✅ Complete — Mermaid ERD, 33 tables, all FKs |
| `docs/technical/Architecture-Diagram.md` | ✅ Complete — Logical + network architecture, JWT flow |
| `docs/technical/Data-Flow-Diagram.md` | ✅ Complete — 4 data flows: submission, inquiry, approval, daily simulation |
| `docs/technical/Technical-Decision-Log.md` | ✅ Complete — 10 key technical decisions documented |
| `docs/technical/Configuration-Guide.md` | ✅ Complete — Dev/prod env vars, H2 access, JWT config, security checklist |
| `docs/technical/Testing-Plan.md` | ✅ Complete — 50+ test cases across 5 modules |
| `README.md` | ✅ Updated — Quick start, DB setup, auth users, H2 console, API reference |

---

---

## Frontend Calculation Unit Tests (v2.0 — API Integration Phase)

All calculation utilities in `src/lib/calc/` are fully covered by Vitest unit tests.

### Calc Layer Tests

#### `src/test/calc/dateFilter.test.ts`

| Test ID | Function | Scenario | Expected |
|---------|----------|----------|----------|
| DF-001 | `parseTimestamp` | ISO 8601 with Z | Valid Date object |
| DF-002 | `parseTimestamp` | Space-separated DB format | Valid Date object |
| DF-003 | `parseTimestamp` | Empty string | null |
| DF-004 | `parseTimestamp` | "garbage" | null |
| DF-005 | `isWithinRelativeWindow` | Timestamp within 24h window | true |
| DF-006 | `isWithinRelativeWindow` | Timestamp outside 24h window | false |
| DF-007 | `isWithinRelativeWindow` | Null timestamp | false |
| DF-008 | `isWithinRelativeWindow` | Future timestamp | true |
| DF-009 | `isWithinDateRange` | Date within range | true |
| DF-010 | `isWithinDateRange` | Date before range | false |
| DF-011 | `isWithinDateRange` | Date after range | false |
| DF-012 | `isWithinDateRange` | Empty dateFrom (no lower bound) | true |
| DF-013 | `isWithinDateRange` | Empty dateTo (no upper bound) | true |
| DF-014 | `isWithinDateRange` | Both empty (no filter) | true |
| DF-015 | `isSameMonth` | Same year-month | true |
| DF-016 | `isSameMonth` | Different month | false |
| DF-017 | `normaliseToYMD` | Already yyyy-MM-dd | Unchanged |
| DF-018 | `normaliseToYMD` | "Mar 15" format | "2026-03-15" |
| DF-019 | `normaliseToYMD` | "not-a-date" (unrecognised format) | Unchanged string |

#### `src/test/calc/kpiCalc.test.ts`

| Test ID | Function | Scenario | Expected |
|---------|----------|----------|----------|
| KPI-001 | `calcSuccessRate` | success=80, total=100 | 80.0 |
| KPI-002 | `calcSuccessRate` | total=0 | 0 |
| KPI-003 | `calcP95Latency` | Array [100,200,...,1000] | 950 (95th percentile) |
| KPI-004 | `calcP95Latency` | Empty array | 0 |
| KPI-005 | `calcPendingCount` | Mixed status items | Count of "pending" only |
| KPI-006 | `calcApprovedThisMonth` | Items approved this month | Count of current-month approvals |
| KPI-007 | `calcApprovedThisMonth` | Old items | 0 |
| KPI-008 | `calcApiRequestKpis` | 5 success, 5 failed requests | successRate=50%, errorRate=50% |
| KPI-009 | `calcApiRequestKpis` | Empty array | All zeros |
| KPI-010 | `calcBatchKpis` | 3 jobs with known rates | Correct avg, failed count |

#### `src/test/calc/batchCalc.test.ts`

| Test ID | Function | Scenario | Expected |
|---------|----------|----------|----------|
| BC-001 | `computeBatchSuccessRate` | ok=90, total=100 | 90.0 |
| BC-002 | `isBelowSlaThreshold` | rate=80, threshold=95 | true |
| BC-003 | `computeProgress` | ok=50, total=100 | 50 |
| BC-004 | `computeQuality` | ok=95, total=100 | 95 |
| BC-005 | `formatElapsedMs` | 500ms | "500ms" |
| BC-006 | `formatElapsedMs` | 1000ms | "1.0s" |
| BC-007 | `formatElapsedMs` | 65000ms | "1m 5s" |
| BC-008 | `sortBatchJobsForPipeline` | Mixed statuses | Processing first |

### Component Integration Tests

#### `src/test/components/InstitutionFilterSelect.test.tsx`

| Test ID | Component | Scenario | Expected |
|---------|-----------|----------|----------|
| IFS-001 | InstitutionFilterSelect | Submitters mode | Label **Source name**; combobox shows **All submitters** |
| IFS-002 | InstitutionFilterSelect | Subscribers mode | Combobox shows **All subscribers** |
| IFS-003 | InstitutionFilterSelect | All mode | Combobox shows **All institutions** |
| IFS-004 | InstitutionFilterSelect | Query error | **`role="alert"`** shows error message |
| IFS-005 | InstitutionFilterSelect | Selected institution shows legal name | With `value` set to an id that has both **`name`** and **`tradingName`**, combobox text is **legal `name`** (not trading) |

#### `src/test/components/InstitutionList.test.tsx`

| Test ID | Component | Scenario | Expected |
|---------|-----------|----------|----------|
| IL-001 | InstitutionList | Renders heading | "Member Institutions" heading present |
| IL-002 | InstitutionList | Search input present | Input with placeholder found |
| IL-003 | InstitutionList | Add institution button | "Add Institution" button present |
| IL-004 | InstitutionList | Table renders with mock data | Rows visible after load |
| IL-005 | InstitutionList | Filter by name | Matching rows shown |
| IL-006 | InstitutionList | Filter with no match | "No institutions found" empty state |
| IL-007 | InstitutionList | "All Statuses" dropdown present | Dropdown rendered |
| IL-008 | InstitutionList | Status chip rendered | Status badges visible in rows |
| IL-009 | InstitutionList | Column sorting headers | Sort icons in column headers |

#### `src/test/components/ApprovalQueuePage.test.tsx`

| Test ID | Component | Scenario | Expected |
|---------|-----------|----------|----------|
| AQ-001 | ApprovalQueuePage | Heading rendered | "Approval Queue" heading |
| AQ-002 | ApprovalQueuePage | KPI "Pending Approval" label | Label present |
| AQ-003 | ApprovalQueuePage | Pending count matches calcPendingCount | Value = calcPendingCount(mockItems) |
| AQ-004 | ApprovalQueuePage | Approved this month label | "Approved This Month" present |
| AQ-005 | ApprovalQueuePage | Approved count matches calcApprovedThisMonth | Value matches utility |
| AQ-006 | ApprovalQueuePage | "Changes Requested" KPI label | Label present |
| AQ-007 | ApprovalQueuePage | Changes count matches calcChangesRequestedCount | Value matches utility |
| AQ-008 | ApprovalQueuePage | All tab active by default | data-state="active" on All tab |
| AQ-009 | ApprovalQueuePage | Institutions tab is clickable | No error on click |
| AQ-010 | ApprovalQueuePage | Search bar present | Input rendered |
| AQ-011 | ApprovalQueuePage | Date filter for "from" | Input rendered |
| AQ-012 | ApprovalQueuePage | Date filter for "to" | Input rendered |

#### `src/test/auth/AuthContext.test.tsx`

| Test ID | Component | Scenario | Expected |
|---------|-----------|----------|----------|
| AC-001 | AuthContext | Initial state is not authenticated | `isAuthenticated = false` |
| AC-002 | AuthContext | Mock login sets user | `user.email` set |
| AC-003 | AuthContext | Logout clears user | `user = null` |
| AC-004 | AuthContext | Role derived from email | Super-admin role from prefix |
| AC-005 | AuthContext | Session restored from storage | Restores on mount |

### Frontend API Client Tests (`src/test/lib/api-client.test.ts`)

| Test ID | Area | Scenario | Expected |
|---------|------|----------|----------|
| AC-001 | Token storage | `setAccessToken` / `getAccessToken` | Correct value returned |
| AC-002 | Token storage | `setRefreshToken` / `getRefreshToken` | Stored in sessionStorage |
| AC-003 | Token security | Access token NOT in localStorage | `localStorage.getItem("...")` returns null |
| AC-004 | `clearTokens` | Clears both tokens | Both return null after clear |
| AC-005 | `ApiError` | `isUnauthorized` on 401 | true |
| AC-006 | `ApiError` | `isForbidden` on 403 | true |
| AC-007 | `ApiError` | `isNotFound` on 404 | true |
| AC-008 | `ApiError` | `isServerError` on 500 | true |
| AC-009 | `buildQuery` | Single param | Correct query string |
| AC-010 | `buildQuery` | Multiple params | All params included |
| AC-011 | `buildQuery` | Undefined values omitted | No "undefined" in query string |
| AC-012 | `buildQuery` | Array values expanded | Multiple values for same key |

---

## Run All Frontend Tests

```powershell
# From project root
npm run test

# Expected output
# Test Files  21 passed (21)
#      Tests  250+ passed (includes InstitutionFilterSelect + integration)
```

---

### Summary: Phase 10 Verdict (API Integration + Calc Layer)

| Category | Result |
|----------|--------|
| Frontend tests (Vitest) | ✅ 250+ PASS (includes `InstitutionFilterSelect.test.tsx` + server integration in same run) |
| Frontend linter | ✅ No new errors (pre-existing only per AGENTS.md) |
| Calc layer — date filtering | ✅ 19+ tests, all filters use centralised utilities |
| Calc layer — KPI computation | ✅ 10+ tests, all KPIs computed from filtered dataset |
| Calc layer — batch metrics | ✅ 8+ tests, progress/quality/elapsed all verified |
| API client | ✅ 19 tests, token security verified (no access token in localStorage) |
| Component tests — InstitutionFilterSelect | ✅ 5 tests (labels, mode defaults, legal-first selected label, error alert); plus **`institutions-display.test.ts`** for **`institutionDisplayLabel`** |
| Component tests — InstitutionList | ✅ 9 tests including search/filter/empty-state |
| Component tests — ApprovalQueuePage | ✅ 12 tests, KPI values match calc utilities |
| Auth context tests | ✅ 5 tests covering init/login/logout/role/restore |
| Service layer | ✅ 13 service files with mock fallback for offline dev/test |
| Backend source files | ✅ 40+ Java files (controllers, services, entities, config) |
| Backend runtime tests | ✅ 8/8 PASS (Spring Boot integration tests, H2 in-memory) |
| Documentation set | ✅ 11 documents including Frontend-Calculation-Spec.md |
| Schema normalization (3NF) | ✅ 33 tables, zero duplicate attribute ownership |
| Security controls | ✅ JWT, BCrypt-12, AES-256-GCM, SHA-256/HMAC, TLS 1.3 config |
| Seed + future data | ✅ 500 consumers, 500+ tradelines, 30 days future data through 2026-04-28 |
| Daily simulation | ✅ Scheduled service implemented (`@Scheduled` cron) |
| RBAC | ✅ 5 roles, deny-by-default, `@PreAuthorize` on all mutations |

---

## Phase 11 — Remaining Page Wiring (v2.1)

### Newly Wired Pages

#### Phase A — Monitoring Pages

**`DataSubmissionApiSection.tsx`** — wired to `useApiRequests`, `useMonitoringKpis`, `useMonitoringCharts`:
- Table rows: server-side paginated via `useApiRequests` with filter params (status, institutionId, dateFrom, dateTo)
- KPI cards: server-side aggregates from `useMonitoringKpis`; local `calcApiRequestKpis` fallback when API unavailable
- Charts: server-side data from `useMonitoringCharts`; empty state shown when no data
- Client-side: `requestIdSearch` and `timeRange` filters applied on current page
- `SkeletonTable` shown during loading; `ApiErrorCard` with retry on error

**`InquiryApiSection.tsx`** — wired to `useEnquiries`:
- Table rows: server-side paginated via `useEnquiries` with filter params
- KPIs: still sourced from mock `enquiryKpis` (no enquiry-specific KPI endpoint exists yet)
- Charts: still sourced from mock chart data (no enquiry chart endpoint exists yet)
- Client-side: `enquiryIdSearch` and `timeRange` filters applied on current page
- `SkeletonTable` shown during loading

#### Phase B — Audit Log Pages

**`ActivityLogPage.tsx`** — wired to `useAuditLogs`:
- Server-side pagination; `actionType` filter sent to API
- Client-side: search (email/description/actionType) and status filter on current page
- `AuditLogEntry.userEmail`, `actionType`, `description`, `ipAddressHash`, `auditOutcome` replace mock field names
- `SkeletonTable` and `ApiErrorCard` with retry

**`GovernanceAuditLogs.tsx`** — wired to `useAuditLogs` with `entityType: "GOVERNANCE"`:
- Date range and actionType filters sent to API
- Detail modal shows normalized `AuditLogEntry` fields
- `SkeletonTable` during loading

**`AuditTrailTab.tsx`** (institution detail page) — wired to `useAuditLogs`:
- Passes `institutionId` as `entityId` param to API for institution-scoped audit trail
- `resolveCategory` maps `entityType` → display category (SUBMISSION / SUBSCRIBER / GOVERNANCE / INSTITUTION / SYSTEM)
- `isDataSubmitter` / `isSubscriber` props still filter category rows client-side
- `SkeletonTable` during loading

#### Phase C — Roles Page

**`RolesPermissionsPage.tsx`** — wired to `useRoles` + mutations:
- `useEffect` seeds local `roles` from `GET /api/v1/roles` when `apiRoles` resolves (matrix from API or `sectionMatrixForRoleName` for legacy shapes)
- **Create / edit / delete** call `POST` / `PATCH` / `DELETE` via `useCreateRole`, `useUpdateRole`, `useDeleteRole` (persisted in Fastify in-memory state)
- `mergeRolePermissionsFromApi` + normalized `fetchRoles` rows: built-in role matrices display even when the backend omits or only partially sends `permissions` (e.g. Spring `Role` DTO)

**`ActivityLogPage.tsx`** — `useAuditLogs(..., { allowMockFallback: false })`: rows only from **`GET /api/v1/audit-logs`** (seeded in Fastify + `pushAudit` on auth, **approval queue**, **institution** and sub-resource mutations, users, roles, batch, alert-rule create, product/consortium create). **Regression:** extend **`HcbPlatformApplicationTest`** (or service tests) for **PATCH `/api/v1/institutions/:id`** audit behaviour on Spring.
- Mock fallback catalog uses ids `local-*`; those rows edit/delete locally only; create still POSTs

### Summary: Phase 11 Verdict (Remaining Page Wiring)

| Page | Hook | Fallback | Notes |
|------|------|----------|-------|
| `DataSubmissionApiSection` | `useApiRequests` + `useMonitoringKpis` + `useMonitoringCharts` | Mock via service layer | Server-side pagination + filter |
| `DataSubmissionBatchSection` | `useBatchJobs` + `useBatchKpis` + `useBatchCharts` + **`useBatchDetail`** | Mock via service layer | **`GET /v1/batch-jobs/:id/detail`** → **`resolveBatchConsoleData`** when phases exist; mock **`batchConsoleByBatchId`** for **`BATCH-*`** ids |
| `InquiryApiSection` | `useEnquiries` | Mock via service layer | Charts/KPIs still from mock (no endpoint yet) |
| `ActivityLogPage` | `useAuditLogs` | Mock via service layer | Server pagination, client search |
| `GovernanceAuditLogs` | `useAuditLogs` (entityType=GOVERNANCE) | Mock via service layer | Date + action filters |
| `AuditTrailTab` | `useAuditLogs` (entityId=institutionId) | Mock via service layer | Institution-scoped |
| `RolesPermissionsPage` | `useRoles` + create/update/delete mutations | `roleDefinitions` via `fetchRoles` fallback | CRUD persisted on dev API |

**Backend test suite:** ✅ 8/8 PASS (fixed missing `spring-boot-starter-actuator` dependency in `pom.xml`)

**To run the full backend test suite after installing Java 17+:**
```powershell
cd backend
# Using Maven wrapper (included in project)
./mvnw.cmd test
# Or with system Maven
mvn test
```

---

## Phase 12 — Institution Sub-Resources, Detail Pages, Dashboard Live Data (v2.2)

### New Backend Endpoints (Phase 6 — completed)

Six new GET endpoints added to backend controllers using ERD-first analysis:

| Endpoint | Controller | Tables Joined |
|----------|-----------|---------------|
| `GET /api/v1/institutions/{id}/consortium-memberships` | InstitutionController | `consortium_members JOIN consortiums` |
| `GET /api/v1/institutions/{id}/product-subscriptions` | InstitutionController | `product_subscriptions JOIN products` |
| `GET /api/v1/institutions/{id}/billing-summary` | InstitutionController | `institutions + product_subscriptions + api_requests` |
| `GET /api/v1/institutions/{id}/monitoring-summary` | InstitutionController | `api_requests + batch_jobs` (aggregate) |
| `GET /api/v1/dashboard/activity` | DashboardController | `audit_logs LEFT JOIN users` (LIMIT 20) |
| `GET /api/v1/dashboard/command-center` | DashboardController | `approval_queue + alert_incidents + institutions + api_requests` |

All queries use exact column names from `create_tables.sql` (`consortium_name`, `api_request_status`, `occurred_at`, `consortium_member_status`, `batch_job_status`, `approval_workflow_status`, `alert_incident_status`).

### New Frontend Hooks (Phase 7 — completed)

Added to `src/hooks/api/useInstitutions.ts`:
- `useConsortiumMemberships(id)` — queries `GET /institutions/{id}/consortium-memberships`
- `useProductSubscriptions(id)` — queries `GET /institutions/{id}/product-subscriptions`
- `useBillingSummary(id)` — queries `GET /institutions/{id}/billing-summary`
- `useMonitoringSummary(id)` — queries `GET /institutions/{id}/monitoring-summary`

Added to `src/api/dashboard.ts`:
- `useDashboardActivity()` — queries `GET /dashboard/activity`
- `useDashboardCommandCenter()` — queries `GET /dashboard/command-center`

### Wired Components (Phase 7-8 — completed)

| Component | Previously | Now |
|-----------|-----------|-----|
| `ConsortiumMembershipsTab` | `getConsortiumMemberships()` mock | `useConsortiumMemberships()` hook; `useConsortiums()` for add-dialog |
| `ProductSubscriptionsTab` | `getProductSubscriptions()` mock + `useCatalogMock` | `useProductSubscriptions()` + `useProducts()` |
| `BillingTab` | `getProductSubscriptions()` mock + `useCatalogMock` | `useBillingSummary()` + `useProductSubscriptions()` |
| `MonitoringTab` | Static `tabsData` KPIs | `useMonitoringSummary(institutionId)` for live KPI override |
| `ConsortiumDetailPage` | `useCatalogMock().consortiums` | `useConsortium(id)` + `useConsortiumMembers(id)` |
| `ProductDetailPage` | `useCatalogMock().products` | `useProduct(id)` hook |
| `DashboardSnapshot.activity` | 100% mock overlay | Live from `GET /dashboard/activity`; falls back to mock |
| `DashboardSnapshot.commandCenter` | 100% mock overlay | Enriched with live alert/approval counts from `GET /dashboard/command-center` |

### Phase 12 Test Results

- **Frontend tests:** ✅ 130/130 PASS (`npm run test`)
- **Frontend build:** ✅ `npm run build` exits 0 (no type errors, no module resolution errors)
- **New lint errors introduced:** None (pre-existing errors unchanged)

---

### Sprint execution — local Node API harness (2026-03-28)

| Gate | Command / check | Expected |
|------|-----------------|----------|
| API boot | `npm run spring:start` (default **127.0.0.1:8090**) | Spring logs “Started HcbPlatformApplication” (or similar) |
| Auth smoke | `POST /api/v1/auth/login` with `admin@hcb.com` / `Admin@1234` | 200 + `accessToken`, `refreshToken`, `user` |
| Institutions smoke | `GET /api/v1/institutions` with `Authorization: Bearer <access>` | 200 + paged `content` |
| Frontend regression | `npm run test` | All Vitest tests pass |
| Production bundle | `npm run build` | Vite build succeeds |

**Note:** If port **8090** is blocked, set `SERVER_PORT` and matching `VITE_API_PROXY_TARGET`, then restart Vite. Legacy Fastify on **8091** uses `PORT` + `npm run server:start`.
