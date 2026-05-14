# Code ↔ Docs Alignment Audit (Hybrid Credit Bureau Admin Portal)

**Date:** 2026-04-15  
**Scope:** `src/` (React SPA) + `backend/` (Spring Boot) + `/docs` (PRD/BRD/epics/OpenAPI/technical/design guidelines)  
**Source-of-truth rule:** **Code wins**; docs are updated to match observed behavior.

---

## Output 1 — Feature inventory (from code)

### Navigation / routing / shell
- **Routes**: `src/App.tsx`
- **Layouts**: `DashboardLayout` + section layouts (Data Governance, Monitoring, Reporting, User Management, Agents)
- **Cross-cutting**: `CommandPalette`, route protection via `ProtectedRoute` (waits for silent restore).

### Modules (high-level)
| Module | Route(s) | Primary page(s) | Primary data dependencies |
|---|---|---|---|
| Authentication + MFA | `/login` | `src/pages/Login.tsx` | `AuthContext`, `api-client.ts` (`/api/v1/auth/*`) |
| Dashboard + Command Center | `/` | `src/pages/Dashboard.tsx` | `dashboard.service.ts` (`/v1/dashboard/*`) |
| Institutions (Member Management) | `/institutions`, `/institutions/register`, `/institutions/:id` | `InstitutionList`, `RegisterInstitution`, `InstitutionDetail` | `institutions.service.ts` (`/v1/institutions/*`) + API keys + audit logs + monitoring summaries |
| Consortiums | `/consortiums/*` | `ConsortiumListPage`, `ConsortiumWizardPage`, `ConsortiumDetailPage` | `consortiums.service.ts` (`/v1/consortiums/*`), `dataPolicy.service.ts` (`/v1/data-policy`), CBS catalog (`/v1/cbs-member-catalog`) |
| Data Products | `/data-products/products/*` | `ProductListPage`, `ProductFormPage`, `ProductDetailPage` | `products.service.ts` (`/v1/products/*`) + packet catalog (`/v1/products/packet-catalog`) + schema-mapper source type fields |
| Enquiry Simulation | `/data-products/enquiry-simulation` | `src/pages/agents/EnquirySimulationPage.tsx` | **UI-only simulation** (mock payload generation; no API call) |
| Approval Queue | `/approval-queue` | `ApprovalQueuePage` | `approvals.service.ts` (`/v1/approvals`) |
| Data Governance (core) | `/data-governance/*` | dashboard, schema mapper review, master schema, rules, match review, drift monitoring, governance audit logs | `schema-mapper.service.ts` (`/v1/schema-mapper/*`), `data-ingestion.service.ts` (`/v1/data-ingestion/drift-alerts`), `auditLogs.service.ts` (`/v1/audit-logs`) |
| Monitoring | `/monitoring/*` | data-submission-api, batch, inquiry-api, sla-config, alert-engine | `monitoring.service.ts` (`/v1/monitoring/*`), `batchJobs.service.ts` (`/v1/batch-jobs/*`), `alerts.service.ts` (`/v1/alert-*`, `/v1/sla-configs`) |
| Reporting | `/reporting`, `/reporting/new` | `ReportListPage`, `NewReportRequestPage` | `reports.service.ts` (`/v1/reports/*`) |
| User Management | `/user-management/*` | `UsersListPage`, `RolesPermissionsPage`, `ActivityLogPage` | `users.service.ts` (`/v1/users/*`), `roles.service.ts` (`/v1/roles`), `auditLogs.service.ts` (`/v1/audit-logs`) |
| Agents workspace | `/agents/*` | `AgentsLandingPage`, `AgentDetailPage`, `AgentConfigurationPage` | **Mock-first** (`src/data/agents-mock.ts`); no agents API client present |
| Placeholders | `/api-access`, `/cbs-integration`, `/audit-logs` | `PlaceholderPage` | none |

---

## Output 1A — Route→Page→Service→API traceability (SPA truth)

**Note:** SPA service paths are `/v1/*` and are called against `BASE_URL = "/api"` by default, yielding **`/api/v1/*`** on the wire (`src/lib/api-client.ts`).

| Route | Page/component | Primary SPA hooks/services | Backend/OpenAPI path(s) (canonical) | Doc anchor |
|---|---|---|---|---|
| `/login` | `src/pages/Login.tsx` | `AuthContext` | `/api/v1/auth/login`, `/api/v1/auth/mfa/*`, `/api/v1/auth/refresh`, `/api/v1/auth/me` | PRD Module 1; BRD Auth FRs; OpenAPI Auth |
| `/` | `src/pages/Dashboard.tsx` | `dashboard.service.ts`, `useDashboard*` hooks | `/api/v1/dashboard/*`, `/api/v1/monitoring/kpis` (as referenced by widgets) | PRD Module 2; EPIC-13; OpenAPI Dashboard |
| `/institutions` | `src/pages/InstitutionList.tsx` | `useInstitutions`, `institutions.service.ts` | `/api/v1/institutions` | PRD Module 3; EPIC-02; OpenAPI Institutions |
| `/institutions/register` | `src/pages/RegisterInstitution.tsx` | `institutions.service.ts` (form-metadata + create + docs upload) | `/api/v1/institutions/form-metadata`, `/api/v1/institutions` (+ `?geography=`), `/api/v1/institutions/{id}/documents` | PRD Registration wizard; EPIC-02; OpenAPI Institutions |
| `/institutions/:id` | `src/pages/InstitutionDetail.tsx` + `src/pages/institution-tabs/*` | `institutions.service.ts`, `apiKeys.service.ts`, `auditLogs.service.ts`, `monitoring.service.ts` | `/api/v1/institutions/{id}` + sub-resources | PRD Institution Detail; EPIC-02; OpenAPI Institutions + API Keys + Audit |
| `/consortiums` | `src/pages/consortiums/ConsortiumListPage.tsx` | `consortiums.service.ts` | `/api/v1/consortiums` | PRD Consortium; EPIC-03; OpenAPI Consortiums |
| `/consortiums/create` `/consortiums/:id/edit` | `ConsortiumWizardPage.tsx` | `consortiums.service.ts`, `dataPolicy.service.ts`, `useInstitutions` (subscribers; allowMockFallback false) | `/api/v1/consortiums`, `/api/v1/data-policy`, `/api/v1/cbs-member-catalog` | EPIC-03; OpenAPI Consortiums/Data Policy |
| `/data-products/products` | `ProductListPage.tsx` | `products.service.ts` | `/api/v1/products` | PRD Data Products; EPIC-04; OpenAPI Products |
| `/data-products/products/create` `/edit` | `ProductFormPage.tsx` | `products.service.ts` + packet catalog + schema mapper lookups | `/api/v1/products`, `/api/v1/products/packet-catalog`, `/api/v1/schema-mapper/*` | EPIC-04; Canonical-Backend PacketConfigModal section |
| `/data-products/enquiry-simulation` | `src/pages/agents/EnquirySimulationPage.tsx` | `useProducts` + **mock simulation** | None (UI-only) | PRD Module 12; BRD Enquiry simulation notes |
| `/approval-queue` | `ApprovalQueuePage.tsx` | `approvals.service.ts` | `/api/v1/approvals` + mutations | PRD Approval Queue; EPIC-08; OpenAPI Approvals |
| `/data-governance/*` | `src/pages/data-governance/*` | `schema-mapper.service.ts`, `data-ingestion.service.ts`, `auditLogs.service.ts`, `master-schema.service.ts` | `/api/v1/schema-mapper/*`, `/api/v1/data-ingestion/drift-alerts`, `/api/v1/audit-logs` (**master-schemas: not implemented**) | EPIC-06/05; OpenAPI Schema Mapper + Data Ingestion + Audit |
| `/monitoring/*` | `src/pages/monitoring/*` | `monitoring.service.ts`, `batchJobs.service.ts`, `alerts.service.ts` | `/api/v1/monitoring/*`, `/api/v1/batch-jobs/*`, `/api/v1/alert-*`, `/api/v1/sla-configs` | EPIC-09/14/10; OpenAPI Monitoring/Batch/Alerts |
| `/reporting` `/reporting/new` | `src/pages/reporting/*` | `reports.service.ts` | `/api/v1/reports/*` | EPIC-11; OpenAPI Reports |
| `/user-management/*` | `src/pages/user-management/*` | `users.service.ts`, `roles.service.ts`, `auditLogs.service.ts` | `/api/v1/users/*`, `/api/v1/roles/*`, `/api/v1/audit-logs` | EPIC-12; OpenAPI Users/Roles/Audit |
| `/agents/*` | `src/pages/agents/*` | `mockAgents` + agent components | None (mock-first) | EPIC-17; PRD Module 6 |
| `/api-access` `/cbs-integration` `/audit-logs` | `PlaceholderPage` | none | none | PRD route appendix (should label as placeholder) |

### Notable “code-truth” behaviors that docs must match
- **API base**: SPA calls `BASE_URL = VITE_API_BASE_URL ?? "/api"` and uses `/v1/*` paths (example: `/api/v1/approvals`). (`src/lib/api-client.ts`)
- **204 / empty body success**: API client handles 204/205 and empty 200 bodies safely (docs should not promise JSON bodies for these). (`api-client.ts`)
- **Mock fallback is conditional**: centralized `clientMockFallbackEnabled` + many services “network/server error” fallbacks; some flows intentionally set `allowMockFallback: false` for correctness. (services + hooks)
- **Master Schema is mock-first**: SPA has `master-schema.service.ts` calling `/v1/master-schemas/*` but no Spring controller/OpenAPI paths exist; service explicitly treats 401/403 as mockable and hydrates from `src/data/master-schemas-mock`. (See Gap Analysis.)

---

## Output 2 — Document coverage map (docs → modules)

| Module | Covered in docs? | Feature description | User flows | API specs | Data models | UI specs |
|---|---|---:|---:|---:|---:|---:|
| Auth + MFA | Yes | Yes | Yes | Yes | Partial | Yes |
| Dashboard | Yes | Yes | Yes | Yes | Partial | Yes |
| Institutions | Yes | Yes | Yes | Yes | Yes | Yes |
| Consortiums + Data Policy | Yes | Yes | Yes | Yes | Yes | Yes |
| Data Products | Yes | Yes | Yes | Yes | Yes | Yes |
| Enquiry Simulation | Partial | Yes | Yes | **Partial** | Partial | Yes |
| Approval Queue | Yes | Yes | Yes | Yes | Partial | Yes |
| Schema Mapper | Yes | Yes | Yes | Yes | Yes | Yes |
| Master Schema (UI exists) | **Partial** | Yes | Partial | **No (canonical)** | Partial | Yes |
| Monitoring + Batch Console | Yes | Yes | Yes | Yes | Partial | Yes |
| Reporting | Yes | Yes | Yes | Yes | Yes | Yes |
| User Mgmt + Activity Log | Yes | Yes | Yes | Yes | Yes | Yes |
| Agents | **Partial** | Yes | Yes | **No (canonical)** | Partial | Partial |
| Placeholder routes | Yes (route appendix) | Partial | No | No | No | Partial |

Primary doc sources used:
- PRD/BRD: `docs/PRD-BRD-HCB-Admin-Portal.md`
- API: `docs/openapi/hcb-platform-api.yaml`
- Parity: `docs/technical/API-UI-Parity-Matrix.md`, `docs/technical/Spring-SPA-Route-Inventory.md`, `docs/technical/Canonical-Backend.md`
- Design: `docs/design-guidelines.md` (canonical links in epics)

---

## Output 3 — Gap analysis table (code vs docs)

| Module / Feature | Exists in Code? | Exists in Docs? | Gap type | Severity | Evidence (code) | Evidence (docs) |
|---|---:|---:|---|---|---|---|
| PRD `§14 API Specification` previously mixed legacy `/api/*` examples | Yes | Yes | Outdated logic | **P0** | SPA uses `/api/v1/*` via `/api` base + `/v1/...` services | **Fixed**: PRD `§14` now points to OpenAPI and lists canonical `/api/v1/*` routes; mock-first/UI-only modules are explicitly labeled |
| Agents API (`/api/v1/agents`) not implemented (UI is mock-first) | Yes (UI) | Yes | Missing API Spec | **P0** | Agents uses `mockAgents` + `mockRecentActivity`, no API | PRD `§14.11 Agents` now states “mock-first; no agents API invoked” |
| Master Schemas API documented/assumed but not in OpenAPI/Spring | Yes (UI) | Partial | Missing API Spec / Flow mismatch | **P0** | `master-schema.service.ts` uses `/v1/master-schemas` with mock hydration | OpenAPI has no `master-schemas`; backend has no controller |
| Enquiry Simulation API vs UI-only implementation | Yes | Partial | Missing API Spec alignment | **P1** | `EnquirySimulationPage` runs `setTimeout(600)` and builds response locally | EPICs mention planned simulate endpoints in places; PRD UI spec aligns |
| Audit logs top-level route is placeholder while real audit logs live elsewhere | Yes | Yes | UI mismatch / IA mismatch | **P1** | `/audit-logs` is `PlaceholderPage`; real screens: `/user-management/activity`, `/data-governance/governance-audit-logs` | PRD includes `/audit-logs` in route table; needs explicit “placeholder” semantics |
| Design Guidelines duplicated file path/casing | N/A | Yes | Duplicate / conflicting doc definitions risk | **P1** | Repo contained both `docs/Design-Guidelines.md` and `docs/design-guidelines.md` | **Fixed**: canonicalize to `docs/design-guidelines.md` and delete duplicate casing file |

---

## Output 4 — Prioritized doc fix plan (what to update, where, and from what code)

### Phase 1 (P0) — Critical
1) **Full API contract parity (Spring controllers ↔ OpenAPI ↔ PRD/BRD references)**  
   - **Update**: `docs/openapi/hcb-platform-api.yaml`, `docs/PRD-BRD-HCB-Admin-Portal.md`  
   - **Source-of-truth**: `backend/src/main/java/**/**Controller.java`, `src/services/*.service.ts`, `src/lib/api-client.ts`  
   - **Outcome**: PRD/BRD API callouts reference `/api/v1/*` and match controller params and empty-body mutation semantics.

2) **Agents API section: mark as mock-first; move API to “Planned”**  
   - **Update**: PRD section `14.9 Agents` + EPIC-17 + OpenAPI (only if you want to formalize planned endpoints separately)  
   - **Source-of-truth**: `src/pages/agents/*`, `src/data/agents-mock.ts`  
   - **Outcome**: no ghost endpoints; clear separation of current vs future contract.

3) **Master Schema: document as mock-first and/or define planned endpoints**  
   - **Update**: PRD (master schema screens), EPIC-06/EPIC-05 sections that imply backend storage, OpenAPI (planned section)  
   - **Source-of-truth**: `src/pages/data-governance/master-schema/*`, `src/services/master-schema.service.ts`  
   - **Outcome**: docs match what runs today; future backend contract is explicit.

### Phase 2 (P1) — Functional completeness
4) **Enquiry simulation: explicitly “UI-only simulation”**  
   - **Update**: PRD + EPIC-04 references to simulate endpoints  
   - **Source-of-truth**: `src/pages/agents/EnquirySimulationPage.tsx`  

5) **Audit logs information architecture clarity**  
   - **Update**: PRD nav + screen specs to clarify `/audit-logs` placeholder vs real screens  
   - **Source-of-truth**: `src/App.tsx`, `src/pages/user-management/ActivityLogPage.tsx`, `src/pages/data-governance/GovernanceAuditLogs.tsx`  

### Phase 3 (P2) — Enhancements
6) **Placeholder routes explicitly labeled placeholder in PRD screen specs**  
7) **Doc-to-code trace appendix** (per module: routes, services, controllers, OpenAPI paths)

---

## Output 5 — Paste-ready doc drafts (ready to paste into PRD/BRD)

### Draft 1 — PRD: “API Examples” normalization (replace legacy `/api/*` section framing)
**Feature Name:** API Contracts (Canonical)  
**Description:** The Admin Portal SPA uses the Vite proxy base `/api` and calls versioned API paths under `/api/v1/*` (SPA service paths use `/v1/*` relative to `/api`). All request/response shapes in this document align with `docs/openapi/hcb-platform-api.yaml` and Spring Boot controllers in `backend/`.  
**UI Behavior:** Mutation endpoints that return **204 No Content** (approve/reject/request-changes, logout, revoke key, etc.) are treated as success with an empty body.  
**API Contract:** Replace `/api/*` example blocks with `/api/v1/*` references and link each example to the corresponding OpenAPI path.  
**Edge Cases:** In dev, mock fallback may supply data for some read endpoints when `VITE_USE_MOCK_FALLBACK=true`; API-only screens explicitly disable fallback (e.g., Activity Log).
### Draft 2 — PRD/BRD: Agents (current state + planned contract separation)
**Feature Name:** AI Agent Workspace (current implementation)  
**Description:** Agents are available under `/agents` as a mock-first workspace: agent catalog, recent activity, and service/sub-agent flows are populated from client-side mock data to support UX iteration.  
**User Flow:** `/agents` → select agent → `/agents/:agentId` → choose a service → chat workspace; special case agent `bureau-operator` opens a dedicated operator workspace.  
**API Contract (Current):** No `/api/v1/agents` endpoints are invoked by the SPA today.  
**API Contract (Planned):** If/when backend support is built, define `/api/v1/agents` (catalog, subscriptions, chat history, tool runs) as “Planned APIs” and keep OpenAPI and PRD aligned.  
**Data Model:** TypeScript `Agent` + mock seed (`src/types/agents.ts`, `src/data/agents-mock.ts`).  
**Edge Cases:** Non-subscribed agents show “Request Access” UX (demo flag-gated); “coming soon” sub-agents are disabled.
### Draft 3 — PRD/BRD: Master Schema (mock-first until backend exists)
**Feature Name:** Master Schema Registry (current implementation)  
**Description:** Master schema screens exist under Data Governance and are functional in a mock-first mode. The SPA attempts `/api/v1/master-schemas/*` but will fall back to seeded schemas when the API is unavailable/unauthorized.  
**User Flow:** Registry → detail → edit/new → submit for approval (UI), with derived field lists generated from raw JSON schema where available.  
**API Contract (Current):** Not implemented on Spring Boot; OpenAPI does not expose `master-schemas` paths.  
**Planned:** If persistence is required, add Spring controller + OpenAPI paths and remove “mockable 401/403” behavior.  
**Data Model:** `src/types/master-schema.ts` and `src/data/master-schemas-mock.ts`.

### Draft 4 — Docs: Design Guidelines canonicalization (remove duplication)
**Change:** Use `docs/design-guidelines.md` as the single canonical Design Guidelines document and remove the duplicate casing file (`docs/Design-Guidelines.md`).  
**Rationale:** Avoid two sources of truth drifting on case-insensitive filesystems.  
**Expected outcome:** All epic/index links resolve to the same content; future design updates land in one file only.

---

## Bonus — Documentation governance framework (keep docs at 100% alignment)

### 1) Sources of truth (explicit hierarchy)
- **API contract truth**: `docs/openapi/hcb-platform-api.yaml` (must match Spring controllers under `backend/`).
- **UI behavior truth**: `src/` (routes + services + components), backed by parity notes in `docs/technical/API-UI-Parity-Matrix.md`.
- **Data model truth**: `docs/technical/ERD-Schema-Map.md` (must match `backend/src/main/resources/db/create_tables.sql` for dev SQLite + production DB assumptions).
- **Design system truth**: `docs/design-guidelines.md` (single canonical file).

### 2) Ownership + review gates
- **Module owner triad** (required on every change that touches the module):
  - **Frontend owner**: route + page + service changes
  - **Backend owner**: controller + DTO + SQL changes
  - **Product/Docs owner**: PRD/BRD + epic narrative changes
- **PR checklist gates**:
  - If a PR changes any `backend/**/*Controller.java` → update OpenAPI + PRD/BRD API callouts for impacted screens.
  - If a PR changes `src/App.tsx` routes → update PRD route appendix / nav tables.
  - If a PR changes `src/services/*.service.ts` paths → update OpenAPI or mark as planned; update parity matrix.
  - If a PR changes token primitives (`tailwind.config.ts`, `src/index.css`, `src/components/ui/*`) → update Design Guidelines implementation log.

### 3) Automated consistency checks (low effort, high leverage)
- **OpenAPI vs Spring mapping smoke**: script scans controller annotations and compares to OpenAPI paths; fails CI if missing or extra paths (allow explicit ignore list for planned routes).
- **SPA service path inventory**: parse `src/services/*` for `const BASE="/v1/..."` and verify corresponding OpenAPI tags/paths exist (or are on a “mock-first/planned” allowlist).
- **Route appendix parity**: extract routes from `src/App.tsx` and ensure PRD route table contains the same set (or explicitly labels placeholder routes).
- **Doc duplicate detector**: fail CI if two files differ only by casing (example: `docs/Design-Guidelines.md` vs `docs/design-guidelines.md`).
