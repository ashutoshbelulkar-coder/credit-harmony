# HCB — Hybrid Credit Bureau Admin Portal

**Version 3.0.0** | React 18 SPA + **Fastify dev API (default)** | JWT | Optional Spring Boot track

This repository is a **Hybrid Credit Bureau (HCB) admin portal**: a React 18 + TypeScript SPA (Vite) that talks to an **in-repo Fastify server** on **port 8091** by default — the **canonical contract** for local development (`npm run server` + `npm run dev`). That API uses **JWT auth** and **in-memory state** seeded from `src/data/*.json` (restart clears mutations).

An optional **Spring Boot** application under `backend/` (port **8090**, SQLite dev / PostgreSQL prod) provides a **separate** normalized persistence and RBAC model; the SPA does **not** proxy to it unless you set `VITE_API_PROXY_TARGET` when starting Vite. Contracts differ — see `docs/technical/SPA-Service-Contract-Drift.md`.

**First-time engineers:** read `docs/technical/Developer-Handbook.md` and `AGENTS.md`. **Product / compliance:** `docs/PRD-BRD-HCB-Admin-Portal.md`, `docs/BRD-Hybrid-Credit-Bureau-Admin-Portal.md`.

---

## Table of Contents

1. [Quick Start (Frontend)](#1-quick-start-frontend)
2. [Quick Start (Backend)](#2-quick-start-backend)
3. [Database Setup & Schema](#3-database-setup--schema)
4. [Authentication & Test Users](#4-authentication--test-users)
5. [H2 Console Access](#5-h2-console-access)
6. [API Reference](#6-api-reference)
7. [Seed Data & Future Data](#7-seed-data--future-data)
8. [Daily Data Simulation](#8-daily-data-simulation)
9. [Backend Architecture](#9-backend-architecture)
10. [Security Architecture](#10-security-architecture)
11. [Testing](#11-testing)
12. [Environment Variables](#12-environment-variables)
13. [Database Relationship Overview](#13-database-relationship-overview)

---

---

## Overview

The HCB Admin Portal is the primary control plane for bureau operators, compliance officers, and analysts. With **`npm run server`** + **`VITE_USE_MOCK_FALLBACK=false`**, core flows hit the **Fastify** JWT API; otherwise the SPA can fall back to static JSON mocks. It provides:

- **Member Management** — dual-role onboarding (data submitters + subscribers), registration wizard, institution detail with tabbed views
- **Data Governance** — AI-assisted schema mapper, validation rules, match review, data quality monitoring, governance audit logs
- **Monitoring** — real-time API monitoring, batch job tracking, SLA configuration, alert engine with auto-remediation
- **Consortium Management** — multi-institution data sharing agreements, member management, policy configuration
- **Data Products** — configurable product catalogue backed by bureau and consortium data packets
- **Enquiry Simulation** — mock-only pre-production testing tool for subscriber API validation
- **Reporting** — self-service report generation (10 report types, status tracking, export)
- **User Management** — users list, roles & permissions (5 roles, 9 permission categories), activity log
- **AI Agents** — 10 specialized credit analysis agents with chat workspace and bureau enquiry integration
- **Approval Queue** — centralized governance approval workflow (institutions, schema mappings, consortiums, **data products** when using the in-repo Fastify dev API)

### Canonical backend for the SPA (local development)

| Role | Code | Default port | Persistence |
|------|------|--------------|-------------|
| **Default API for the React app** | `server/` (Fastify) | **8091** | In-memory, seeded from `src/data/*.json` |
| Optional Java API | `backend/` (Spring Boot) | **8090** | SQLite (dev) / PostgreSQL (prod) |

Vite proxies `/api` to `process.env.VITE_API_PROXY_TARGET` or **`http://127.0.0.1:8091`**. To point the SPA at Spring (experimental; contracts differ), set `VITE_API_PROXY_TARGET=http://127.0.0.1:8090` when starting Vite and read `docs/technical/SPA-Service-Contract-Drift.md`.

Full write-up: **`docs/technical/Canonical-Backend.md`**.

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool and dev server (port 8080; proxies `/api` → dev API, default `127.0.0.1:8091`) |
| Tailwind CSS | 3.x | Utility-first styling |
| shadcn/ui + Radix UI | — | Accessible headless component system |
| Recharts | 2.x | Chart visualizations |
| React Router | 6.x | Client-side routing with lazy-loaded routes |
| TanStack Query | 5.x | API caching, mutations, optimistic updates |
| date-fns | 3.x | Date arithmetic and formatting |
| Vitest + Testing Library | — | Unit and component tests |
| Framer Motion | 12.x | Animations and page transitions |
| Zod + React Hook Form | — | Form validation |
| Lucide React | — | Icon system |

---

## Frontend API Integration Layer (v2.0)

The frontend uses a fully wired API integration layer with mock fallback for offline development.

### Architecture

```
Pages → React Query Hooks → Services → api-client.ts → **Fastify dev API (port 8091)** unless `VITE_API_PROXY_TARGET` overrides
                                   ↓ (on error, dev + VITE_USE_MOCK_FALLBACK=true only)
                                Mock data (src/data/*.json)
```

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/api-client.ts` | Centralized HTTP client — JWT Bearer, 401 auto-refresh, ApiError |
| `src/lib/query-client.ts` | TanStack Query config — staleTime, retry policy |
| `src/lib/query-keys.ts` | Type-safe cache key registry (QK.*) |
| `src/services/*.service.ts` | Domain-specific API calls with mock fallback |
| `src/hooks/api/*.ts` | React Query hooks for each domain |
| `src/lib/calc/` | Pure calculation utilities (KPIs, charts, date filters) |
| `.env.development` | `VITE_API_BASE_URL=/api`, `VITE_USE_MOCK_FALLBACK=true` |

### Running with mock data (default)

```sh
# .env.development already sets VITE_USE_MOCK_FALLBACK=true
npm run dev
# All pages render with static mock data — no backend required
```

### Running with live backend (in-repo Fastify API)

```sh
# Terminal 1 — local dev API (in-memory state, seeded from src/data JSON)
npm run server

# Terminal 2 — SPA against real HTTP (disable mock fallback)
VITE_USE_MOCK_FALLBACK=false npm run dev
```

Optional: Spring Boot on port 8090 — set environment variable **`VITE_API_PROXY_TARGET=http://127.0.0.1:8090`** before `npm run dev` (same shell / `.env.development`). Expect client changes for pagination and HTTP verbs until contracts align.

### Vite Proxy

[`vite.config.ts`](vite.config.ts) proxies `/api` to `process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:8091"`:

```
Frontend (8080)  →  /api/v1/...  →  Fastify (8091) by default
```

### Wired Pages (v2.2)

All pages below call their respective React Query hook and fall back to static mock data when the backend is unreachable:

| Page | Hook(s) | Domain |
|------|---------|--------|
| `Dashboard.tsx` | `useDashboardSnapshot` + live `activity`/`commandCenter` APIs | Dashboard |
| `InstitutionList.tsx` | `useInstitutions`, `useSuspendInstitution` | Institutions |
| `InstitutionDetail.tsx` | `useInstitution`, `useApiKeys`, `useApiRequests`, `useEnquiries`, `useBatchJobs` | Institution Detail |
| `ConsortiumMembershipsTab` | `useConsortiumMemberships`, `useConsortiums` | Institution > Memberships |
| `ProductSubscriptionsTab` | `useProductSubscriptions`, `useProducts` | Institution > Products |
| `BillingTab` | `useBillingSummary`, `useProductSubscriptions` | Institution > Billing |
| `MonitoringTab` | `useMonitoringSummary` (live KPI overlay) | Institution > Monitoring |
| `UsersListPage.tsx` | `useUsers`, `useSuspendUser`, `useActivateUser` | Users |
| `ApprovalQueuePage.tsx` | `useApprovals`, `useApproveItem`, `useRejectItem`, `useRequestChanges` | Approvals |
| `ConsortiumListPage.tsx` | `useConsortiums` | Consortiums |
| `ConsortiumDetailPage.tsx` | `useConsortium`, `useConsortiumMembers` | Consortium Detail |
| `ConsortiumWizardPage.tsx` | `useCreateConsortium`, `useUpdateConsortium`, `useInstitutions` | Consortium Create/Edit |
| `ProductListPage.tsx` | `useProducts` | Data Products |
| `ProductDetailPage.tsx` | `useProduct` | Product Detail |
| `ProductFormPage.tsx` | `useProduct`, `useCreateProduct`, `useUpdateProduct` | Product Create/Edit |
| `ReportListPage.tsx` | `useReports`, `useCancelReport`, `useRetryReport` | Reports |
| `NewReportRequestPage.tsx` | `useCreateReport`, `useInstitutions`, `useProducts` | New Report |
| `DataSubmissionBatchSection.tsx` | `useBatchJobs`, `useBatchKpis` | Monitoring / Batch |
| `DataSubmissionApiSection.tsx` | `useApiRequests`, `useMonitoringKpis`, `useMonitoringCharts` | Monitoring / API |
| `InquiryApiSection.tsx` | `useEnquiries` | Monitoring / Enquiry |
| `AlertRulesDashboard.tsx` | `useAlertRules`, `useCreateAlertRule`, `useToggleAlertRule`, `useDeleteAlertRule` | Alerts |
| `AlertMonitoringDashboard.tsx` | `useAlertIncidents`, `useResolveIncident`, `useAcknowledgeIncident`, `useAlertCharts` | Alerts |
| `SlaConfigurationPanel.tsx` | `useSlaConfigs`, `useUpdateSlaConfig` | SLA |
| `SlaBreachHistory.tsx` | `useBreachHistory` | SLA |
| `ActivityLogPage.tsx` | `useAuditLogs` | Audit |
| `GovernanceAuditLogs.tsx` | `useAuditLogs` (entityType=GOVERNANCE) | Governance Audit |
| `AuditTrailTab.tsx` | `useAuditLogs` (entityId=institutionId) | Institution Audit |
| `RolesPermissionsPage.tsx` | `useRoles` (seed) | Roles & Permissions |
| `RegisterInstitution.tsx` | `useCreateInstitution` | Register Institution |
| `InviteUserModal.tsx` | `useInviteUser` | Invite User |
| `UsersTab.tsx` | `useUsers`, `useInviteUser`, `useSuspendUser` | Institution > Users |

---

## Mock Data Architecture

All UI data originates from a single source of truth: **`src/data/*.json` files**. No domain data is hardcoded in component or page files.

```
src/data/
├── institutions.json          # Institution registry
├── agents.json                # AI agent definitions + recent activity
├── user-management.json       # Users, roles, permissions, activity log
├── approval-queue.json        # Pending approval items
├── consortiums.json           # Consortium definitions and members
├── data-products.json         # Product catalogue and data packets
├── alert-engine.json          # SLA configs, alert rules, AI agents, email template
├── institution-extensions.json # Consortium memberships + product subscriptions per institution
├── data-governance.json       # Governance KPIs, schema versions, filter options
├── bureau-operator.json       # Bureau operator dashboard data
├── monitoring.json            # API KPIs, batch jobs, enquiry metrics
├── schema-mapper.json         # Schema registry, parsed fields, AI mapping data
├── dashboard.json             # Dashboard KPIs, activity feed, pipeline agents, throughput config
├── institution-detail.json    # Institution detail page charts and KPI values
├── institution-tabs.json      # Monitoring/Billing/Consent/Users tab data
├── app-notifications.json     # App header notification items
├── simulation-defaults.json   # Enquiry simulation form defaults + agent chat history
├── batch-console.json         # Batch execution console dummy diagnostics
└── reporting.json             # Initial report rows + report type filter options
```

Each JSON file has a corresponding **typed loader** (`src/data/*-mock.ts`) that:
- Imports the JSON
- Re-exports it with TypeScript types
- Contains any dynamic helper functions (e.g. `getInstitutionById()`, `formatDateRange()`)

**Rule:** No `const [...] = [{...}]` domain data array may appear in a component or page file. All such arrays must live in a `.json` file under `src/data/`.

---

## Getting Started

```sh
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

**Default credentials (mock auth):**
- Email: any valid email (e.g. `admin@hcb.com`)
- Password: any non-empty string
- Role is determined by email prefix: `super-admin@` or `admin@` → Super Admin; others → Bureau Admin

---

## Project Structure

```
src/
├── api/                   # Mock API functions (dashboard-mock.ts)
├── components/            # Reusable UI components
│   ├── agents/            # AI agent workspace components
│   ├── dashboard/         # Dashboard cards and charts
│   ├── layout/            # AppHeader, Sidebar, DashboardLayout
│   ├── schema-mapper/     # Schema mapper wizard steps
│   └── ui/                # shadcn/ui primitive components
├── contexts/              # React contexts (AuthContext, CatalogMockContext)
├── data/                  # JSON mock files + typed loader modules
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities (cn, typography constants)
├── pages/                 # Page components organized by module
│   ├── agents/
│   ├── approval-queue/
│   ├── consortiums/
│   ├── data-governance/
│   ├── data-products/
│   ├── institution-tabs/
│   ├── monitoring/
│   └── reporting/
├── types/                 # Shared TypeScript types
├── App.tsx                # Route definitions (lazy-loaded)
└── main.tsx               # Entry point
```

---

## Architecture Decisions

- **JSON-driven mock layer** — all UI data from `src/data/*.json`; zero inline domain data in components
- **Lazy-loaded routes** — every page is code-split via `React.lazy()`; `AppProviders.tsx` contains all provider composition
- **Context-based state** — reporting state lives in `ReportingLayout` context; no module-level mutable arrays
- **Typed loaders** — `*-mock.ts` files export TypeScript types derived from JSON structures; no runtime type casting needed in components
- **Theme** — CRIF blue design system; compact 10px/12px typography scale with explicit `text-[Xpx]` values to prevent browser-default overrides

---

## Roadmap (V2+)

The following features are scoped for backend integration:
- Real authentication (JWT, SSO/OIDC, MFA)
- RBAC/ABAC engine (institution-scoped roles, OPA policies)
- Live enquiry API with consent enforcement
- CBS integration (T24, Mambu, Flexcube adapters)
- Scheduled reporting with email/SFTP delivery
- Multi-bureau comparison (CRIF + Experian + TransUnion)
- Consumer data portal (subject access rights)
- Data lineage and impact analysis

See [`docs/PRD-BRD-HCB-Admin-Portal.md`](docs/PRD-BRD-HCB-Admin-Portal.md) and [`docs/BRD-Hybrid-Credit-Bureau-Admin-Portal.md`](docs/BRD-Hybrid-Credit-Bureau-Admin-Portal.md) for full product and business requirements.

---

## 1. Quick Start (Frontend)

```bash
# Install dependencies
npm install

# Start dev server (port 8080)
npm run dev

# Lint
npm run lint

# Run frontend tests
npm run test
```

Frontend runs at: **http://localhost:8080**

---

## 2. Quick Start (Backend)

### Prerequisites
- Java 17+
- Maven 3.9+

```bash
cd backend

# Build the project
mvn clean package -DskipTests

# Run in dev mode (SQLite + H2 console + seeded data)
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Or run the JAR directly
java -jar target/hcb-platform-backend-3.0.0.jar --spring.profiles.active=dev
```

Backend runs at: **http://localhost:8090**

### First-Run Behavior
On first startup the backend will:
1. Create the SQLite database at `./data/hcb_platform.db`
2. Execute `create_tables.sql` — creates all 28 normalized tables
3. Execute `seed_data.sql` — inserts all institutions, users, products, monitoring data, future data (up to 2026-04-28)

---

## 3. Database Setup & Schema

### Database Location
```
backend/data/hcb_platform.db   (SQLite — development)
```

### Schema Groups
| Group | Tables | Description |
|-------|--------|-------------|
| CORE | institutions, users, roles, permissions, role_permissions, user_role_assignments, refresh_tokens, api_keys, compliance_documents | Platform identity and auth |
| CREDIT | consumers, credit_profiles, tradelines, enquiries | Credit data management |
| CATALOG | products, product_subscriptions, consortiums, consortium_members | Products and consortiums |
| MONITORING | api_requests, batch_jobs, batch_records, sla_configs, sla_breaches, alert_rules, alert_incidents | Operational monitoring |
| SYSTEM | audit_logs, approval_queue, reports | Workflow and reporting |
| GOVERNANCE | source_schemas, source_schema_fields, canonical_fields, mapping_versions, mapping_pairs, validation_rules | Data governance |

### Re-seed the database
```bash
# Delete the DB file and restart (seed runs automatically)
rm backend/data/hcb_platform.db
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### Direct SQLite access
```bash
sqlite3 backend/data/hcb_platform.db

# Sample queries
SELECT name, institution_lifecycle_status FROM institutions;
SELECT email, user_account_status FROM users;
SELECT COUNT(*) FROM api_requests;
SELECT COUNT(*) FROM enquiries WHERE enquired_at > date('now');
```

---

## 4. Authentication & Test Users

### Login Endpoint
```
POST http://localhost:8090/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@hcb.com",
  "password": "Admin@1234"
}
```

### Response
```json
{
  "accessToken": "eyJhbGciOiJIUzI1...",
  "refreshToken": "Kd8xPq...",
  "expiresIn": 900,
  "user": {
    "id": 1,
    "email": "admin@hcb.com",
    "displayName": "HCB Admin",
    "roles": ["ROLE_SUPER_ADMIN"],
    "institutionId": null
  }
}
```

### Seeded Test Users

| Email | Password | Role | Institution | Notes |
|-------|----------|------|-------------|-------|
| `admin@hcb.com` | `Admin@1234` | Super Admin | — | Full platform access |
| `super@hcb.com` | `Super@1234` | Super Admin | — | Secondary super admin |
| `bureau.admin@hcb.com` | `Bureau@1234` | Bureau Admin | — | Institutions + governance |
| `analyst@hcb.com` | `Analyst@1234` | Analyst | — | Read + reports |
| `viewer@hcb.com` | `Viewer@1234` | Viewer | — | Dashboard read-only |
| `apiuser@hcb.com` | `ApiUser@1234` | API User | — | Programmatic access |
| `inst.admin@fnb.co.ke` | `InstAdmin@1234` | Bureau Admin | First National Bank | Institution-scoped |
| `compliance@fnb.co.ke` | `Comply@1234` | Analyst | First National Bank | FNB compliance analyst |
| `ops@metrocu.co.ke` | `OpsUser@1234` | Analyst | Metro Credit Union | Ops analyst |
| `suspended@hcb.com` | `Suspended@1234` | Analyst | — | **Suspended** — login will return 401 |
| `david.kim@pacificfin.com` | `David@1234` | Analyst | Pacific Finance | Extra seed user (see `seed_data.sql`) |

### Using the Token
```bash
# Include in all subsequent requests
curl -H "Authorization: Bearer <access_token>" http://localhost:8090/api/v1/institutions
```

### Refresh Token
```
POST http://localhost:8090/api/v1/refresh
Content-Type: application/json

{ "refresh_token": "<your_refresh_token>" }
```

### Logout
```
POST http://localhost:8090/api/v1/auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json

{ "refresh_token": "<your_refresh_token>" }
```

---

## 5. H2 Console Access

The H2 web console is available in **dev profile only** for database inspection.

> **Note:** The H2 console connects to the in-memory view. For direct SQLite file inspection, use `sqlite3 backend/data/hcb_platform.db` or [DB Browser for SQLite](https://sqlitebrowser.org/).

```
URL:      http://localhost:8090/h2-console
Username: admin
Password: admin123
JDBC URL: jdbc:sqlite:./data/hcb_platform.db
```

The H2 console is **disabled in production profile** (`hcb.h2.console.enabled=false`).

---

## 6. API Reference

### Auth
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/login` | Login, get JWT tokens | No |
| POST | `/api/v1/auth/refresh` | Rotate refresh token | No |
| POST | `/api/v1/auth/logout` | Revoke refresh token | Yes |
| GET | `/api/v1/auth/me` | Get current user | Yes |

### Institutions
| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/v1/institutions` | List all institutions | Any authenticated |
| GET | `/api/v1/institutions/:id` | Get institution detail | Any authenticated |
| POST | `/api/v1/institutions` | Create institution | Bureau Admin+ |
| PUT | `/api/v1/institutions/:id` | Update institution | Bureau Admin+ |
| DELETE | `/api/v1/institutions/:id` | Soft-delete institution | Super Admin |
| POST | `/api/v1/institutions/:id/suspend` | Suspend institution | Bureau Admin+ |
| POST | `/api/v1/institutions/:id/reactivate` | Reactivate institution | Bureau Admin+ |

### Users
| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/v1/users` | List users | Super Admin |
| POST | `/api/v1/users` | Create user | Super Admin |
| PUT | `/api/v1/users/:id` | Update user | Super Admin |
| DELETE | `/api/v1/users/:id` | Soft-delete user | Super Admin |
| POST | `/api/v1/users/:id/suspend` | Suspend user | Super Admin |
| POST | `/api/v1/users/:id/activate` | Activate user | Super Admin |
| POST | `/api/v1/users/:id/assign-role` | Assign role | Super Admin |

### Monitoring
| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/v1/monitoring/api-requests` | API request logs | Analyst+ |
| GET | `/api/v1/monitoring/batch-jobs` | Batch job list | Analyst+ |
| GET | `/api/v1/monitoring/enquiries` | Enquiry logs | Analyst+ |

### Approvals
| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/v1/approvals` | List approval queue | Bureau Admin+ |
| POST | `/api/v1/approvals/:id/approve` | Approve item | Bureau Admin+ |
| POST | `/api/v1/approvals/:id/reject` | Reject item | Bureau Admin+ |
| POST | `/api/v1/approvals/:id/request-changes` | Request changes | Bureau Admin+ |

### Audit
| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/v1/audit-logs` | View audit trail | Analyst+ |

---

## 7. Seed Data & Future Data

The seed script (`seed_data.sql`) populates:

| Entity | Count | Source |
|--------|-------|--------|
| institutions | 8 | Migrated from `src/data/institutions.json` |
| users | 12 | 10 test users + 2 operational users |
| roles | 5 | Super Admin, Bureau Admin, Analyst, Viewer, API User |
| permissions | 8 | All platform permissions |
| products | 9 | Migrated from `src/data/data-products.json` |
| consortiums | 3 | Migrated from `src/data/consortiums.json` |
| approval_queue | 12 | Migrated from `src/data/approval-queue.json` |
| sla_configs | 12 | Migrated from `src/data/alert-engine.json` |
| alert_rules | 7 | Migrated from `src/data/alert-engine.json` |
| batch_jobs | 36 | Historical (30 days) + Future (30 days to 2026-04-28) |
| api_requests | 512+ | Historical + future pre-seeded |
| enquiries | 500+ | Historical + future pre-seeded |
| consumers | 500 | Synthetic (SQL seed); DataSeeder.java generates 10K |
| audit_logs | 12 | From activity log + system events |

### Future Data Coverage
Pre-seeded records extend through **2026-04-28**:
- Batch jobs queued for all institutions (weekly cadence)
- API requests pre-seeded for 30 days
- Enquiries pre-seeded for 30 days
- SLA breaches pre-seeded 1-2 per week
- Alert incidents pre-seeded for future review

---

## 8. Daily Data Simulation

The `DailySimulationService` runs automatically at **00:05 AM daily** and generates:

| Data Type | Daily Volume | Rule |
|-----------|-------------|------|
| api_requests | ~28,000 rows | Append-only |
| enquiries | ~3,800 rows | Append-only |
| batch_jobs | ~5 per institution | Append-only |
| alert_incidents | Evaluated from rules | Append-only |

**Trigger manually** (for testing):
```bash
# Call the simulation endpoint (Super Admin only)
curl -X POST http://localhost:8090/api/v1/admin/simulate-daily \
  -H "Authorization: Bearer <super_admin_token>"
```

---

## 9. Backend Architecture

```
backend/
├── src/main/java/com/hcb/platform/
│   ├── HcbPlatformApplication.java     ← Spring Boot entry point
│   ├── auth/                           ← Auth service layer
│   ├── common/                         ← ApiError, GlobalExceptionHandler
│   ├── config/                         ← SecurityConfig, AsyncConfig
│   ├── controller/                     ← REST controllers
│   ├── model/
│   │   ├── entity/                     ← JPA entities (1:1 with DB tables)
│   │   └── dto/                        ← Request/response DTOs
│   ├── repository/                     ← Spring Data JPA repositories
│   └── service/                        ← Business logic, AuditService, DailySimulationService
└── src/main/resources/
    ├── application.yml                 ← Multi-profile config
    └── db/
        ├── create_tables.sql           ← Normalized DDL (28 tables)
        └── seed_data.sql               ← Initial + future data
```

---

## 10. Security Architecture

### Authentication
- **JWT Access Tokens**: HS256 signed, 15-minute expiry
- **Refresh Tokens**: SHA-256 hashed (never stored plain), 7-day expiry, rotation on use
- **Password Hashing**: BCrypt cost factor 12
- **Rate Limiting**: 5 login attempts/minute per IP

### Data Protection
| Data Type | Protection |
|-----------|------------|
| Consumer PII (name, DOB) | AES-256-GCM encrypted at application layer |
| National IDs | SHA-256 hashed (one-way) |
| Phone/Email | HMAC-SHA256 with server-side pepper |
| API keys (raw value) | Write-once; SHA-256 hash stored; raw never retrievable |
| IP addresses (logs) | SHA-256 hashed before storage |
| Passwords | BCrypt cost-12; never logged |

### Transport Security
- TLS 1.3 minimum (configure in reverse proxy/load balancer)
- HSTS enforced
- CORS configured per environment (no wildcard in production)

### Database Security
- Foreign keys enforced (`PRAGMA foreign_keys = ON`)
- WAL journal mode for data integrity
- Parameterized queries only (no string concatenation)
- H2 console disabled in production

---

## 11. Testing

**This repository:** Run **`npm run test`** (Vitest — client + in-repo Fastify integration) and **`npm run openapi:validate`** (validates `docs/technical/openapi-hcb-fastify-snapshot.yaml`; also run in CI). Step-by-step setup, env vars, ports, and troubleshooting: **`docs/technical/Developer-Handbook.md`**. UI ↔ API mapping: **`docs/technical/API-UI-Parity-Matrix.md`**.

**End-to-end (Playwright):** Install browsers once with **`npx playwright install`**, then **`npm run test:e2e`**. This starts Fastify on 8091 and Vite on **4173** with `VITE_USE_MOCK_FALLBACK=false` and runs critical flows against the live dev API. OpenAPI snapshot (hand-maintained): **`docs/technical/openapi-hcb-fastify-snapshot.yaml`**.

### Run Backend Tests
```bash
cd backend
mvn test
```

### Test Coverage
| Test | Description |
|------|-------------|
| T01 | Context loads successfully |
| T02 | Health endpoint publicly accessible |
| T03 | Protected endpoint returns 401 without token |
| T04 | Login with valid credentials returns JWT |
| T05 | Login with invalid credentials returns 401 |
| T06 | Login response never contains sensitive fields |
| T07 | Auth endpoint requires valid email format |
| T08 | Internal errors return generic error codes |

### Test the Full Auth Flow (in-repo Fastify API — port **8091**)
```bash
# 1. Login
curl -X POST http://127.0.0.1:8091/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hcb.com","password":"Admin@1234"}'

# 2. Use the token
ACCESS_TOKEN="<token from step 1>"
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  http://127.0.0.1:8091/api/v1/institutions

# 3. Refresh the token
curl -X POST http://127.0.0.1:8091/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"<your_refresh_token>"}'

# 4. Test suspended user (should return 401)
curl -X POST http://127.0.0.1:8091/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"suspended@hcb.com","password":"Suspended@1234"}'
```

*If you use a future Spring backend instead, replace host/port with that deployment; this repo’s dev server is Fastify on **8091**.*

# 5. Test role-based access (Viewer cannot manage users)
VIEWER_TOKEN="<viewer token>"
curl -H "Authorization: Bearer $VIEWER_TOKEN" \
  http://localhost:8090/api/v1/users
# Expected: 403 ERR_ACCESS_DENIED
```

### Run Frontend + API integration tests (Vitest)

```bash
npm run test
```

Uses two Vitest projects: **client** (jsdom, `src/**/*.test.*`) and **server** (node, `server/**/*.test.ts`). Server tests call `buildServer()` and `app.inject()` — no listening port required.

### Run Backend Tests (Spring / Java track)

```bash
cd backend
mvn test
```

When the Java backend is not present, rely on the Fastify integration suite above.

---

## 12. Environment Variables

| Variable | Default (dev) | Required in Prod | Description |
|----------|---------------|------------------|-------------|
| `HCB_JWT_SECRET` | dev-only fallback | **YES** | JWT signing secret (min 32 chars) |
| `HCB_DB_PATH` | `./data/hcb_platform.db` | NO (SQLite) | SQLite DB file path |
| `DATABASE_URL` | — | **YES** (prod) | PostgreSQL JDBC URL |
| `DB_USERNAME` | — | **YES** (prod) | DB username |
| `DB_PASSWORD` | — | **YES** (prod) | DB password |
| `HCB_PII_KEY` | dev-only fallback | **YES** | AES-256 key for PII encryption |
| `HCB_HMAC_PEPPER` | dev-only fallback | **YES** | HMAC pepper for hash fields |
| `HCB_CORS_ORIGINS` | `http://localhost:5173,http://localhost:8080` | **YES** | Allowed CORS origins |
| `HCB_H2_USER` | `admin` | NO | H2 console username (dev only) |
| `HCB_H2_PASS` | `admin123` | NO | H2 console password (dev only) |
| `SERVER_PORT` | `8090` | NO | Backend server port |

> **NEVER** commit real values for `HCB_JWT_SECRET`, `HCB_PII_KEY`, or `HCB_HMAC_PEPPER` to version control.

---

## 13. Database Relationship Overview

```
institutions ──────┬──── users (institution_id FK)
                   ├──── api_keys (institution_id FK)
                   ├──── compliance_documents (institution_id FK)
                   ├──── consortium_members (institution_id FK)
                   ├──── product_subscriptions (institution_id FK)
                   ├──── batch_jobs (institution_id FK)
                   ├──── tradelines (institution_id FK)
                   ├──── enquiries (requesting_institution_id FK)
                   ├──── sla_breaches (institution_id FK)
                   └──── alert_incidents (institution_id FK)

users ─────────────┬──── user_role_assignments (user_id FK)
                   ├──── refresh_tokens (user_id FK)
                   ├──── api_keys (user_id FK)
                   ├──── audit_logs (user_id FK)
                   ├──── approval_queue (submitted_by/reviewed_by FK)
                   ├──── reports (requested_by_user_id FK)
                   └──── batch_jobs (uploaded_by_user_id FK)

roles ─────────────┬──── role_permissions (role_id FK)
                   └──── user_role_assignments (role_id FK)

consumers ─────────┬──── credit_profiles (consumer_id FK, 1:1)
                   ├──── tradelines (consumer_id FK)
                   ├──── enquiries (consumer_id FK)
                   └──── batch_records (consumer_id FK)

products ──────────┬──── product_subscriptions (product_id FK)
                   └──── enquiries (product_id FK)

consortiums ───────└──── consortium_members (consortium_id FK)

source_schemas ────┬──── source_schema_fields (source_schema_id FK)
                   └──── mapping_versions (source_schema_id FK)

mapping_versions ──└──── mapping_pairs (mapping_version_id FK)

canonical_fields ──┬──── mapping_pairs (canonical_field_id FK)
                   └──── validation_rules (canonical_field_id FK)
```

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend | React | 18.x | UI framework |
| Frontend | TypeScript | 5.x | Type safety |
| Frontend | Vite | 5.x | Build tool |
| Frontend | Tailwind CSS | 3.x | Styling |
| Frontend | shadcn/ui | latest | Component library |
| Backend | Spring Boot | 3.2.3 | REST API framework |
| Backend | Spring Security | 6.x | Auth + RBAC |
| Backend | Spring Data JPA | 3.x | ORM layer |
| Database | SQLite 3 | 3.45+ | Development database |
| Database | PostgreSQL | 15+ | Production database |
| Auth | JJWT | 0.12.5 | JWT implementation |
| Build | Maven | 3.9+ | Backend build tool |
| Build | npm | 10+ | Frontend build tool |
