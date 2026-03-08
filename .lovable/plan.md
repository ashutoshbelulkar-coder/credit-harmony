

# Complete PRD + BRD: Hybrid Credit Bureau (HCB) Admin Portal

This is a documentation task, not an implementation task. The deliverable is a comprehensive `docs/PRD-BRD-HCB-Admin-Portal.md` file covering all 18 sections requested, based on the existing codebase analysis.

## Plan

Create a single markdown file `docs/PRD-BRD-HCB-Admin-Portal.md` containing the full PRD+BRD document with the following structure derived from the actual codebase:

### Document Outline

**1. Executive Summary** -- HCB Admin Portal is a centralized enterprise admin platform for a hybrid credit bureau. Manages dual-role institutions (Data Submitters / Subscribers), data governance, AI agents, monitoring, reporting, and user management. Target: bureau operators, compliance, analysts. Built on React/Vite/TypeScript SPA with mock data layer.

**2. Business Requirements (BRD)** -- Goals (dual-role institution lifecycle, centralized config, consent/billing for subscribers, data governance, operational visibility, audit/compliance readiness). Context (fintech/credit bureau domain). Stakeholders (Product Owner, HCB Operations, Compliance, Risk, Engineering, Data Governance, Regulators). KPIs (onboarding accuracy, config error reduction, mapping cycle time, incident detection time, audit completeness). Assumptions (mock data for v1, bureau operators as primary users). Dependencies (backend APIs, identity provider, billing engine). Risks (no RBAC in v1, backend delays, scope creep, audit log integrity).

**3. Product Requirements (PRD)** -- Feature-by-feature breakdown of all 8 major modules: Authentication, Dashboard, Institution Management, Data Governance, Monitoring, AI Agents, Reporting, User Management. Each with description, business value, user benefit.

**4. User Personas** -- Super Admin (bureau operator, full access), Bureau Admin (institution/governance management), Analyst (read-only analytics, agents, reports), API User (programmatic integration), Viewer (dashboard-only).

**5. User Journey/Workflow** -- Login flow, institution registration wizard (3-step), institution detail navigation (role-based tabs), consent/billing edit cycle, data governance mapping workflow, agent chat workflow, report request workflow, user invite flow.

**6. Screen-Level Product Requirements** -- Detailed element-by-element specs for every screen:
- Login (email, password, SSO button, trust indicators)
- Dashboard (4 KPI cards, 6 charts, recent activity table, top institutions table)
- Institution List (table with filters, register button)
- Institution Registration Wizard (3 steps: corporate details, compliance docs, review)
- Institution Detail (9 tabs: Overview, Alternate Data, API & Access, Consent, Billing, Monitoring, Reports, Audit Trail, Users)
- Data Governance (6 sub-pages: Dashboard, Schema Mapper, Validation Rules, Match Review, Data Quality, Audit Logs)
- Monitoring (5 sub-pages: Data Submission API, Batch, Inquiry API, SLA Config, Alert Engine)
- Agents (Landing, Detail/Chat, Configuration)
- Reporting (Report List, New Report Request)
- User Management (Users List, Roles & Permissions, Activity Log)
- Header (logo, notifications popover, user dropdown with logout)
- Sidebar (8 top-level items, collapsible, sub-navigation for 4 sections)

**7. Graph/Chart Specifications** -- All charts from Dashboard (API Usage Trend line, Success vs Failure donut, Mapping Accuracy line, Match Confidence bar, SLA Latency line, Rejection/Override bar) plus institution-level charts, monitoring charts, data governance charts. Each with chart type, axes, data source, tooltip, filters.

**8. Data Logic and Calculations** -- Formulas for Error Rate, SLA Health, Data Quality Score, Success Rate, Rejection Rate, P95/P99 latency, credit consumption, mapping accuracy, match confidence distribution.

**9. Color Tag Conditions** -- Status colors (Active=green, Pending=primary, Suspended=warning, Deactivated=destructive, Draft=muted). Metric thresholds (SLA ≥99%=green, 95-99%=warning, <95%=danger). Alert severity (Critical=danger, Warning=warning, Info=info). Role colors from mock data. Agent status, report status colors.

**10. Filters and Search** -- Every filterable view: Institution list (status, search, role filter), Users list (search, role, status, institution), Activity log (action type, status, date range), Report list (date range, report ID, type, status), Monitoring (institution, time range, request ID), Data Governance audit logs (date, user, action, institution).

**11. Exception Handling/Edge Cases** -- Auth failures, empty states, API failures, invalid institution ID, file upload limits, draft corruption, network offline, 404 routes, session expiry, concurrent edits.

**12. Performance Requirements** -- Initial page load <3s, SPA navigation <300ms, chart rendering <500ms, table pagination for >10 rows, 99.5% availability target.

**13. Technical Architecture** -- Frontend: React 18, Vite, TypeScript, Tailwind CSS, Radix UI, Recharts, Framer Motion, React Router v6, TanStack Query. State: React useState/context (AuthContext). Data: Mock data layer (`src/data/`). Theme: next-themes with HSL CSS variables. No backend currently (mock only).

**14. API Specification** -- Define target API contracts based on mock data structures: GET /api/dashboard/metrics, GET /api/institutions, POST /api/institutions, GET /api/institutions/:id, GET /api/monitoring/submissions, GET /api/monitoring/inquiries, GET /api/reports, POST /api/reports, GET /api/users, POST /api/users/invite, GET /api/activity-log, GET /api/governance/mappings, GET /api/agents.

**15. Data Models** -- Entity definitions from mock data: Institution, ManagedUser, RoleDefinition, ActivityEntry, ReportRow, Agent, Customer, ChatMessage, ApiSubmissionRequest, BatchJob, InquiryRequest, GovernanceMapping, ValidationRule, AlertRule.

**16. Security and Access Control** -- Current: simple email auth, all-or-nothing access. Target: 5 roles (Super Admin, Bureau Admin, Analyst, Viewer, API User) with 9 permission categories. MFA support (toggle per user). API key management (rotate/revoke). Session handling.

**17. Analytics and Logging** -- Page views, login/logout events, button clicks (invite user, register institution, export report, rotate API key), feature usage (agent sessions, bureau enquiries, report generation), errors (auth failures, validation errors).

**18. QA Test Scenarios** -- Normal flows (login, navigate dashboard, register institution, invite user, create role, generate report, use agent). Edge cases (empty filters, boundary values, long text inputs). Failure cases (invalid login, missing required fields, file too large, network errors).

### Implementation Approach

Single file creation: `docs/PRD-BRD-HCB-Admin-Portal.md` containing all 18 sections with tables, bullet points, structured numbering, and cross-references to actual source files and mock data structures.

