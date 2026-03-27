# HCB — Hybrid Credit Bureau Admin Portal

A production-grade enterprise admin portal for managing a hybrid credit bureau ecosystem. Built as a React SPA with a clean JSON-driven mock data layer for frontend development prior to backend integration.

---

## Overview

The HCB Admin Portal is the primary control plane for bureau operators, compliance officers, and analysts. It provides:

- **Institution Management** — dual-role onboarding (Data Submitters + Subscribers), registration wizard, institution detail with 9 tabbed views
- **Data Governance** — AI-assisted schema mapper, validation rules, match review, data quality monitoring, governance audit logs
- **Monitoring** — real-time API monitoring, batch job tracking, SLA configuration, alert engine with auto-remediation
- **Consortium Management** — multi-institution data sharing agreements, member management, policy configuration
- **Data Products** — configurable product catalogue backed by bureau and consortium data packets
- **Enquiry Simulation** — mock-only pre-production testing tool for subscriber API validation
- **Reporting** — self-service report generation (10 report types, status tracking, export)
- **User Management** — users list, roles & permissions (5 roles, 9 permission categories), activity log
- **AI Agents** — 10 specialized credit analysis agents with chat workspace and bureau enquiry integration
- **Approval Queue** — centralized governance approval workflow for institutions and schema mappings

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool and dev server |
| Tailwind CSS | 3.x | Utility-first styling |
| shadcn/ui + Radix UI | — | Accessible headless component system |
| Recharts | 2.x | Chart visualizations |
| React Router | 6.x | Client-side routing with lazy-loaded routes |
| TanStack Query | 5.x | Server state management (wired for future API caching) |
| Framer Motion | 12.x | Animations and page transitions |
| Zod + React Hook Form | — | Form validation |
| Lucide React | — | Icon system |

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
