# Business Requirements Document (BRD)
# Hybrid Credit Bureau (HCB) Admin Portal

**Document Type:** Business Requirements Document (BRD)  
**Classification:** Internal – Board & Audit Ready  
**Version:** 1.0  
**Status:** Draft for Review  
**Last Updated:** [Date]  
**Author:** Enterprise Business Analysis  
**Stakeholder Approval:** [To be completed]

---

## Document Control

| Version | Date       | Author/Role        | Description of Changes        | Approved By |
|---------|------------|--------------------|------------------------------|-------------|
| 1.0     | [Date]     | Business Analyst   | Initial BRD                  | —           |

**Distribution List:** Product Owner, Engineering Lead, Compliance Officer, Risk Manager, QA Lead, Project Sponsor.

**References:**  
- HCB Product Vision Document  
- Data Governance Policy (internal)  
- Regulatory requirements (CBK, SASRA, data protection)

---

## 1. Executive Summary

The **Hybrid Credit Bureau (HCB) Admin Portal** is an enterprise web application that enables centralized administration of a hybrid credit bureau ecosystem. The portal supports two primary institution participation types—**Data Submission Institutions** (supplying credit data) and **Subscriber Institutions** (consuming credit and alternate data)—with institutions able to hold one or both roles. The system provides institution onboarding, configuration governance, API and access management, consent and billing configuration for subscribers, data governance (schema mapping, validation rules, match review, data quality monitoring), monitoring and reporting, and full auditability of actions. This BRD defines business context, objectives, in-scope and out-of-scope capabilities, stakeholders, current vs. future state, detailed functional and non-functional requirements, data and integration needs, user roles, workflows, exception scenarios, compliance considerations, risks, assumptions, dependencies, and testable acceptance criteria to ensure the solution is board-ready, audit-ready, and engineering-actionable.

---

## 2. Business Context and Objectives

### 2.1 Business Context

- **Industry:** Fintech / Credit Bureau / Financial Data Services  
- **Domain:** Central admin platform for a hybrid credit bureau that aggregates data from multiple institutions and provides credit and alternate data services to subscribers.  
- **Problem Statement:** Regulated institutions (banks, NBFIs, credit unions) need a single, secure, auditable portal to onboard, configure, and operate as either data submitters or data subscribers (or both), while the bureau operator needs governance, monitoring, and compliance controls.  
- **Strategic Alignment:** The portal is the primary control plane for HCB operations, supporting regulatory compliance, SLA management, and revenue (billing) for subscriber usage.

### 2.2 Business Objectives

| ID   | Objective                                                                 | Success Measure / KPI                          |
|------|---------------------------------------------------------------------------|-----------------------------------------------|
| BO-1 | Enable dual-role institution lifecycle (Data Submitter and/or Subscriber)  | % of institutions onboarded with correct role(s) |
| BO-2 | Centralize configuration and API access management per institution       | Reduction in manual config errors; audit coverage |
| BO-3 | Support consent and billing configuration for subscriber institutions     | Consent policy adherence; billing dispute rate |
| BO-4 | Provide data governance (mapping, validation, match review, quality)       | Mapping approval cycle time; data quality score |
| BO-5 | Deliver operational visibility (monitoring, reports, audit trail)         | Time to detect incidents; audit log completeness |
| BO-6 | Ensure auditability and compliance readiness                              | Audit findings; regulatory exam readiness     |

---

## 3. Scope

### 3.1 In Scope

| Area                         | Description |
|------------------------------|-------------|
| **Authentication**          | Login (email/password); session handling; protected routes; logout. |
| **Dashboard**                | Executive KPIs (API volume, error rate, SLA health, data quality); API usage trend; success vs failure; mapping accuracy; match confidence; SLA latency; rejection/override; recent activity; top institutions. |
| **Institution Management**  | List (all / Data Submitters / Subscribers); filters (status, search); registration wizard (corporate details, participation type, compliance documents, review); institution detail with role-based tabs. |
| **Institution Detail – Common** | Overview (corporate details, compliance docs, role-based KPIs and charts); API & Access (type-based APIs, keys, rate limits, IP whitelist); Monitoring (type-specific); Reports (type-specific); Audit Trail (filtered by role); Users (table, Add User drawer, roles, MFA). |
| **Institution Detail – Subscriber-only** | Alternate Data (source cards, enable, rate, consent, usage); Consent Configuration (policy, expiry, scope, capture mode, failure metrics); Billing (model, pricing table, usage charts, export reports). |
| **Data Governance**          | Dashboard; Schema Mapper / Auto-Mapping Review; Validation Rules; Match Review; Data Quality Monitoring; Governance Audit Logs (filters, detail). |
| **Navigation & UX**          | Sidebar (Dashboard, Institution Management with sub-nav, Data Governance with sub-nav, Monitoring, Reporting, Audit Logs, User Management); responsive layout; consistent typography and theme. |
| **Audit & Compliance**       | Institution-level audit trail (submission/subscriber events); governance audit logs; immutable event records. |

### 3.2 Out of Scope (Explicit Exclusions)

| Item | Rationale |
|------|------------|
| Real-time backend APIs and persistence | BRD covers portal capabilities; backend implementation is a separate deliverable. |
| Production SSO/LDAP/MFA integration | Login is in scope; enterprise IdP integration is a future phase. |
| Full Monitoring/Reporting/Audit Logs/User Management backend | Placeholder or partial UI may exist; full backend and feature parity are out of scope for this BRD phase. |
| CBS Integration module | Referenced in navigation; detailed requirements are out of scope. |
| Mobile native applications | Web-only; responsive web is in scope. |
| Consumer-facing credit report or dispute portal | Admin portal only. |
| Automated credit scoring or decision engines | Not part of admin portal. |

---

## 4. Stakeholders

| Role | Description | Interests / Concerns |
|------|-------------|----------------------|
| **Product Owner** | Owns backlog and priorities | Scope clarity; acceptance criteria; release readiness. |
| **HCB Operations** | Day-to-day use of portal | Institution onboarding; API/config; incident visibility. |
| **Compliance / Legal** | Regulatory and policy adherence | Consent, data handling, audit trail, document retention. |
| **Risk Manager** | Operational and reputational risk | Access control; audit; exception handling. |
| **Engineering / DevOps** | Build and operate system | Clear, testable requirements; NFRs; integrations. |
| **Data Governance Team** | Schema, validation, match, quality | Mapping workflow; validation rules; quality metrics. |
| **Institution Users** | (Future) Institution-level users | Clarity on institution vs bureau admin boundaries. |
| **Regulators (e.g. CBK)** | Oversight | Auditability; compliance evidence. |

---

## 5. Current State vs. Future State

### 5.1 Current State (As-Is)

- **Authentication:** Simple email-based login; no RBAC; session in memory.  
- **Institution Management:** List with optional role filter (Data Submitters / Subscribers); multi-step registration with participation type (Data Submitter / Subscriber), dynamic compliance documents, review; institution detail with dynamic tabs (Overview, Alternate Data*, API & Access, Consent*, Billing*, Monitoring, Reports, Audit Trail, Users).  
- **Overview:** Role-based KPIs in horizontal strip; corporate details; compliance documents; role-based charts (submission volume, success/rejected, rejection reasons, processing time; or enquiry volume, success/failed, usage by source, response time).  
- **API & Access:** Type-based API cards (Submission, Bulk, SFTP for submitters; Enquiry for subscribers); API keys table (Rotate/Revoke); rate limit edit modal.  
- **Alternate Data / Consent / Billing:** Subscriber-only tabs with config and edit/save patterns; export reports; date inputs with Inter font.  
- **Data Governance:** Dedicated section with dashboard, schema mapper, validation rules, match review, data quality monitoring, governance audit logs.  
- **Monitoring / Reporting / Audit Logs / User Management:** Placeholder or partial pages; not fully implemented.  
- **Data:** Mock data (institutions, governance, audit); no persistent backend.

### 5.2 Future State (To-Be)

- **Authentication:** Enterprise IdP (SSO), role-based access control (RBAC), optional MFA.  
- **Institution Management:** Same dual-role model with full lifecycle (approval workflows, status transitions, document verification workflow).  
- **Institution Detail:** All tabs backed by real APIs; real-time KPIs and charts; config changes persisted and audited.  
- **Data Governance:** End-to-end workflow with approval, versioning, and rollback; integration with ingestion pipeline.  
- **Monitoring / Reporting / Audit Logs:** Full backend; alerting; scheduled reports; export to SIEM.  
- **User Management:** Bureau-level and institution-level users; role assignment; MFA enforcement.  
- **Integrations:** CBS, core bureau engine, billing engine, document vault, identity provider.  
- **Compliance:** Full audit log retention; regulatory report generation; consent and data protection by design.

---

## 6. Functional Requirements

### 6.1 Authentication and Session

| ID     | Requirement | Priority | Testable Acceptance Criteria |
|--------|-------------|----------|------------------------------|
| FR-A1 | The system shall provide a login page with email and password fields and a submit action. | Must | User can enter email and password and submit; invalid credentials are rejected; valid credentials grant access. |
| FR-A2 | The system shall restrict access to all routes except `/login` for unauthenticated users and redirect them to `/login`. | Must | Unauthenticated access to `/`, `/institutions`, etc. results in redirect to `/login`. |
| FR-A3 | The system shall persist session state for the duration of the browser session (or until logout). | Must | After login, user remains authenticated across page navigation; refresh keeps session. |
| FR-A4 | The system shall provide a logout mechanism that clears session and redirects to login. | Must | Logout clears user state and redirects to `/login`. |
| FR-A5 | The system shall display a consistent header and sidebar when the user is authenticated. | Should | Header and sidebar are visible on all protected pages. |

### 6.2 Dashboard

| ID     | Requirement | Priority | Testable Acceptance Criteria |
|--------|-------------|----------|------------------------------|
| FR-D1 | The system shall display a Dashboard (home) with a page title and short description. | Must | Title "Hybrid Credit Bureau" and description are visible. |
| FR-D2 | The system shall display KPI cards for API Volume (24h), Error Rate, SLA Health, and Data Quality Score with values and trend indicators. | Must | Four KPI cards present; each shows value and trend (e.g. vs last 24h). |
| FR-D3 | The system shall display an API Usage Trend chart (e.g. 30 days) with volume and error rate. | Must | Chart renders; axes and legend are readable; tooltip on hover. |
| FR-D4 | The system shall display Success vs Failure (or similar) distribution (e.g. pie/donut). | Must | Chart renders; segments match defined metrics. |
| FR-D5 | The system shall display additional charts (e.g. mapping accuracy, match confidence, SLA latency, rejection/override, recent activity, top institutions) as per design. | Should | Each defined chart/section is present and readable. |

### 6.3 Institution Management – List and Navigation

| ID     | Requirement | Priority | Testable Acceptance Criteria |
|--------|-------------|----------|------------------------------|
| FR-I1 | The system shall provide a top-level navigation item "Institution Management" that links to the Data Submission Institutions list by default. | Must | Clicking "Institution Management" opens `/institutions/data-submitters`. |
| FR-I2 | The system shall provide sub-navigation under Institution Management: "Data Submission Institutions" and "Subscriber Institutions" with correct routes. | Must | Sub-items link to `/institutions/data-submitters` and `/institutions/subscribers`; active state is correct. |
| FR-I3 | The system shall display an institution list with columns: Institution Name, Type, Status, APIs Enabled, SLA Health, Last Updated (or equivalent). | Must | Table displays data for each column; sortable where specified. |
| FR-I4 | The system shall filter the list by role when viewing Data Submission Institutions (isDataSubmitter = true) or Subscriber Institutions (isSubscriber = true). | Must | Data Submitters list shows only institutions with isDataSubmitter true; Subscribers list shows only isSubscriber true. |
| FR-I5 | The system shall support search and/or status filter on the institution list. | Should | User can filter by status and/or search by name; results update accordingly. |
| FR-I6 | The system shall provide a "Register Institution" action that navigates to the registration wizard. | Must | Button/link navigates to `/institutions/register`. |
| FR-I7 | The system shall allow navigation from a list row to the institution detail page. | Must | Clicking an institution opens `/institutions/:id`. |

### 6.4 Institution Registration Wizard

| ID     | Requirement | Priority | Testable Acceptance Criteria |
| FR-R1 | The wizard shall have three steps: Corporate Details, Compliance Documents, Review & Submit. | Must | Three steps are visible; user can move Next/Previous. |
| FR-R2 | Step 1 shall collect: Legal Name, Trading Name, Registration Number, Institution Type, Jurisdiction, License Number, Contact Email, Contact Phone. | Must | All fields are present; validation applies (required, email format, max lengths). |
| FR-R3 | Step 1 shall include a "Participation Type" section with two checkboxes: Data Submission Institution, Subscriber Institution. At least one must be selected. | Must | Both checkboxes present; form validation fails if none selected; inline error shown. |
| FR-R4 | Step 2 shall display a dynamic list of required compliance documents. Base list: Certificate of Incorporation, Banking License, Data Protection Certificate, Board Resolution. If Data Submitter: add "Data Sharing Agreement". If Subscriber: add "Subscriber Agreement" and "Permitted Use Declaration". | Must | Document list updates based on participation type; upload area per document. |
| FR-R5 | The system shall allow file upload per document (e.g. PDF, JPG, PNG) with a maximum file size (e.g. 10MB). | Must | Upload accepts specified types; oversized file is rejected with message. |
| FR-R6 | Step 3 shall display a review summary including Participation Summary: Data Submission Yes/No, Subscriber Yes/No, reflecting form state. | Must | Review shows correct participation summary and other entered data. |
| FR-R7 | The system shall support "Save Draft" (e.g. to local storage) and "Submit" on the final step. | Must | Draft saves without validation; Submit validates and completes registration (or shows error). |
| FR-R8 | The system shall validate required fields and participation type before allowing submit. | Must | Submit with missing required fields or no participation type shows error and does not complete. |

### 6.5 Institution Detail – General

| ID     | Requirement | Priority | Testable Acceptance Criteria |
|--------|-------------|----------|------------------------------|
| FR-ID1 | The system shall display institution detail header with name, type, status, and role badges (Data Submitter, Subscriber) when applicable. | Must | Header shows name, type, status; badges reflect isDataSubmitter and isSubscriber. |
| FR-ID2 | The system shall provide a back action to return to the institution list (Data Submitters). | Must | Back button navigates to `/institutions/data-submitters`. |
| FR-ID3 | The system shall render tabs dynamically: common tabs (Overview, API & Access, Monitoring, Reports, Audit Trail, Users); subscriber-only tabs (Alternate Data, Consent Configuration, Billing) only when institution is Subscriber. | Must | Subscriber sees all tabs including Alternate Data, Consent, Billing; non-subscriber does not see those three. |
| FR-ID4 | All tabs shall be visible in the tab bar (no "More" overflow) with wrap on smaller screens. | Must | No dropdown for overflow; tabs wrap. |
| FR-ID5 | Tab order shall be: Overview, Alternate Data (if subscriber), API & Access, Consent Configuration (if subscriber), Billing (if subscriber), Monitoring, Reports, Audit Trail, Users. | Should | Order matches specification. |

### 6.6 Institution Detail – Overview Tab

| ID     | Requirement | Priority | Testable Acceptance Criteria |
|--------|-------------|----------|------------------------------|
| FR-OV1 | The Overview tab shall display a horizontal strip of KPI cards at the top (not a sidebar). | Must | KPIs are in a grid (e.g. 2/3/5 columns by breakpoint) above content. |
| FR-OV2 | For Data Submission institutions, KPI cards shall include: Records Submitted Today, File Success Rate, Rejection Rate, Active Submission APIs, Last File Upload. | Must | All five cards present when isDataSubmitter. |
| FR-OV3 | For Subscriber institutions, KPI cards shall include: Total Enquiries Today, P95 Latency, Available Credits (if applicable), Active APIs, Alternate Data Usage Today. | Must | Cards present when isSubscriber; Available Credits only when credit balance is defined. |
| FR-OV4 | For institutions with neither role, the system shall show fallback KPIs (e.g. APIs Enabled, SLA Health, Onboarded). | Must | Fallback cards visible when !isDataSubmitter && !isSubscriber. |
| FR-OV5 | The Overview shall display Corporate Details (legal name, registration number, jurisdiction, license, contact). | Must | Section present with correct labels and values. |
| FR-OV6 | The Overview shall display Compliance Documents with name and status (e.g. verified/pending) and a View action. | Must | List of docs with status; View is available. |
| FR-OV7 | For Data Submitters, charts shall include: Daily Submission Volume (line), Success vs Rejected (donut), Top Rejection Reasons (bar), Avg Processing Time (line). | Must | All four charts render; axes/legends consistent with design. |
| FR-OV8 | For Subscribers, charts shall include: Enquiry Volume Trend (line), Success vs Failed (donut), Usage by Data Source (stacked bar), Response Time Trend (line). | Must | All four charts render. |
| FR-OV9 | Chart cards shall use consistent styling (shadow, axes without tick/axis lines where specified, legend, height ~260px, grid layout). | Should | Matches Dashboard chart theme. |

### 6.7 Institution Detail – API & Access Tab

| ID     | Requirement | Priority | Testable Acceptance Criteria |
|--------|-------------|----------|------------------------------|
| FR-API1 | For Data Submission institutions, the system shall show API cards for Submission API, Bulk API, SFTP Access (enable toggle, rate limit, edit rate limit, IP whitelist, last used). | Must | Three cards; each has toggle, rate limit, Edit opens modal, IP count, last used. |
| FR-API2 | For Subscriber institutions, the system shall show Enquiry API card (enable, rate limit, concurrent limit, credit check config). | Must | Enquiry API card with specified fields. |
| FR-API3 | The system shall display an API Keys table with Key, Created, Status, and Actions (Rotate, Revoke). | Must | Table present; Rotate and Revoke are styled as buttons (pill/border). |
| FR-API4 | Rotate shall be styled as a primary-outline button; Revoke as a destructive-outline button. | Should | Buttons are visually distinct and accessible. |
| FR-API5 | Edit Rate Limit shall open a modal with rate input and Save/Cancel; Edit control shall be a visible button (not tiny text). | Must | Modal opens; Save/Cancel work; Edit is a clear button. |

### 6.8 Institution Detail – Users Tab

| ID     | Requirement | Priority | Testable Acceptance Criteria |
|--------|-------------|----------|------------------------------|
| FR-U1 | The system shall display a Users table with columns: Name, Email, Role, Status, Last Login, Actions. | Must | Table renders with columns. |
| FR-U2 | The system shall provide an "Add User" button that opens a right-side drawer/panel. | Must | Click opens Add User panel. |
| FR-U3 | Add User form shall include: First Name, Last Name, Email, Phone, Role (dropdown), Enable MFA (toggle). Roles: Institution Admin, Operations User, Compliance User, Billing User, Read Only. | Must | All fields present; validation (e.g. email, required). |
| FR-U4 | The system shall support inline validation and same form styling as registration wizard. | Should | Validation messages and styling are consistent. |

### 6.9 Institution Detail – Alternate Data Tab (Subscriber Only)

| ID     | Requirement | Priority | Testable Acceptance Criteria |
|--------|-------------|----------|------------------------------|
| FR-AD1 | The system shall display a grid of data source cards: Bank Statement, GST, Telecom, Utility, Behavioral. | Must | Five cards in responsive grid. |
| FR-AD2 | Each card shall show: Source name, Enable toggle, Rate Per Call (read-only), Consent Required indicator, Usage (30d). | Must | All elements present per card. |
| FR-AD3 | Each card shall have a visible "Edit" button. | Must | Edit button on each card. |

### 6.10 Institution Detail – Consent Configuration Tab (Subscriber Only)

| ID     | Requirement | Priority | Testable Acceptance Criteria |
|--------|-------------|----------|------------------------------|
| FR-C1 | The system shall provide sections: Consent Policy (Explicit / Deemed / Per-Enquiry), Consent Expiry (days), Consent Scope (Credit Report, Alternate Data, Both), Consent Capture Mode (API Header, Upload Artifact, Account Aggregator). | Must | All sections and options present. |
| FR-C2 | The system shall provide an Edit/Save mode: Edit button in header; when editing, controls enabled and Save/Cancel visible; when not editing, controls disabled/read-only. | Must | Toggle works; state is consistent. |
| FR-C3 | The system shall display a Consent Failure Metrics line chart. | Must | Chart renders. |

### 6.11 Institution Detail – Billing Tab (Subscriber Only)

| ID     | Requirement | Priority | Testable Acceptance Criteria |
|--------|-------------|----------|------------------------------|
| FR-B1 | The system shall display Export Reports section at the top (date range From/To, Export CSV, Export PDF). | Must | Export section is first below page header. |
| FR-B2 | Date inputs shall use Inter (font-sans) for consistency. | Should | Date fields use project font. |
| FR-B3 | The system shall display Billing Model (Prepaid / Postpaid / Hybrid); for Prepaid/Hybrid show Current Credit Balance and Low Credit Alert Threshold. | Must | Dropdown and conditional fields work. |
| FR-B4 | The system shall display Pricing Configuration table (Source, Enabled, Rate Per Call). | Must | Table present. |
| FR-B5 | Billing Model and Pricing Configuration shall have Edit/Save mode (Edit in header; when editing, Save/Cancel and enabled controls). | Must | Same pattern as Consent tab. |
| FR-B6 | The system shall display Usage Charts: Credit Consumption Trend (line), Spend by Source (bar). | Must | Both charts render. |

### 6.12 Institution Detail – Monitoring, Reports, Audit Trail

| ID     | Requirement | Priority | Testable Acceptance Criteria |
|--------|-------------|----------|------------------------------|
| FR-M1 | Monitoring tab shall show type-specific KPIs and charts (Data Submission: ingestion, schema drift, duplicate rate, volume; Subscriber: API error rate, rate limit breaches, abuse, alternate data latency). | Should | Content matches institution type. |
| FR-M2 | Reports tab shall show type-specific report tables (Submission: volume, rejection, SLA; Subscriber: enquiry, billing summary, alternate data usage) with export. | Should | Tables and export present. |
| FR-M3 | Audit Trail tab shall display a table of events with Timestamp, User, Action, Category, Details; events filtered by institution role (submission vs subscriber). | Must | Table shows only events relevant to institution's roles. |

### 6.13 Data Governance

| ID     | Requirement | Priority | Testable Acceptance Criteria |
|--------|-------------|----------|------------------------------|
| FR-G1 | The system shall provide a Data Governance section with sub-navigation: Dashboard, Schema Mapper, Validation Rules, Match Review, Data Quality Monitoring, Governance Audit Logs. | Must | All sub-routes accessible; content loads. |
| FR-G2 | Dashboard shall show governance KPIs and charts. | Should | KPIs and charts present. |
| FR-G3 | Schema Mapper (Auto-Mapping Review) shall support source/target mapping workflow. | Should | Mapping UI and workflow available. |
| FR-G4 | Validation Rules shall allow creation and management of rules. | Should | Rules list and actions work. |
| FR-G5 | Match Review shall display match-related data and actions. | Should | Match review UI works. |
| FR-G6 | Data Quality Monitoring shall show quality metrics and trends. | Should | Quality views render. |
| FR-G7 | Governance Audit Logs shall support filters (date, user, action, institution) and display detail. | Should | Filters and table work. |

### 6.14 Global Navigation and UX

| ID     | Requirement | Priority | Testable Acceptance Criteria |
|--------|-------------|----------|------------------------------|
| FR-N1 | The system shall provide a sidebar with: Dashboard, Institution Management (with sub-items), Data Governance (with sub-items), Monitoring, Reporting, Audit Logs, User Management. | Must | All items and sub-items present and link correctly. |
| FR-N2 | The system shall use a consistent theme (e.g. primary color CRIF blue #0B2E5B), Inter font, and defined typography scale. | Must | No unauthorized font or primary color change. |
| FR-N3 | The system shall use DashboardLayout for all authenticated pages (header, sidebar, main content). | Must | Layout is consistent. |
| FR-N4 | The system shall be responsive; no horizontal scroll on mobile for main content. | Should | No overflow on standard viewports. |

---

## 7. Non-Functional Requirements

| ID    | Category   | Requirement | Acceptance Criteria |
|-------|------------|-------------|---------------------|
| NFR-1 | Performance | Page load (initial) shall complete within 3 seconds under normal conditions. | Measured with standard tools; no critical blocking. |
| NFR-2 | Performance | Client-side navigation (SPA) shall feel instant (< 300 ms to interactive). | No full-page reload for in-app routes. |
| NFR-3 | Availability | The application shall be designed for 99.5% availability (target; depends on hosting). | Documented SLA and runbook. |
| NFR-4 | Security | All authenticated routes shall require a valid session; session shall timeout after defined inactivity. | Unauthenticated access denied; timeout configurable. |
| NFR-5 | Security | Sensitive data (e.g. API keys, PII) shall not be logged in client or server logs in clear text. | Review of logging and masking. |
| NFR-6 | Usability | The application shall meet WCAG 2.1 Level AA where applicable (focus order, contrast, labels). | Accessibility audit or checklist. |
| NFR-7 | Maintainability | Code shall follow project structure (e.g. components, pages, data, types); key flows shall be testable. | Structure and unit/integration tests. |
| NFR-8 | Browser support | The application shall support current versions of Chrome, Edge, Firefox, Safari. | Test matrix. |

---

## 8. Data Requirements

### 8.1 Entity Summary

| Entity | Key Attributes | Owner / Source |
|--------|----------------|----------------|
| Institution | id, name, tradingName, type, status, apisEnabled, slaHealth, lastUpdated, registrationNumber, jurisdiction, licenseType, licenseNumber, contactEmail, contactPhone, onboardedDate, dataQuality, matchAccuracy, complianceDocs, isDataSubmitter, isSubscriber, billingModel, creditBalance | HCB Admin / Backend |
| User (session) | email (and derived identity) | Auth / IdP |
| Compliance Document | name, status (verified/pending), file reference | Institution onboarding |
| API Key | key (masked), created, status | API & Access |
| Audit Event | id, timestamp, user, action, category, details | Audit service |
| Governance entities | Mappings, Validation Rules, Match results, Quality metrics, Governance audit entries | Data Governance / Backend |

### 8.2 Data Rules

- **Institution status:** active | pending | suspended | draft.  
- **Participation:** At least one of isDataSubmitter or isSubscriber must be true for a registered institution.  
- **Billing model:** prepaid | postpaid | hybrid; creditBalance applicable for prepaid/hybrid.  
- **Audit events:** Immutable; timestamp, user, action, category, and details required.  
- **Compliance documents:** Required set depends on participation type (see FR-R4).

### 8.3 Data Retention (Target – to be confirmed with Legal/Compliance)

- Audit logs: minimum 7 years or per regulation.  
- Institution and configuration data: for lifecycle of institution plus retention period.  
- Draft registration data: configurable (e.g. 30 days if stored server-side).

---

## 9. Integrations

| Integration Point | Direction | Purpose | In-Scope (BRD) |
|-------------------|-----------|---------|----------------|
| Identity / SSO | Inbound | Authentication, user identity | Future phase |
| Institution / Config API | Outbound | CRUD institutions, config | Assumed for future state |
| Billing / Usage API | Outbound | Credit balance, usage, pricing | Assumed for subscriber billing |
| Document Vault | Outbound | Store/retrieve compliance documents | Assumed for onboarding |
| Audit / Logging | Outbound | Write audit events | Assumed for audit trail |
| Data Governance backend | Outbound | Mapping, rules, match, quality | Assumed for governance module |
| CBS | Outbound | Core banking (if applicable) | Out of scope for this BRD |

---

## 10. User Roles and Permissions

### 10.1 Current (Portal)

| Role | Description | Capabilities (Current) |
|------|-------------|-------------------------|
| Authenticated User | Any logged-in user | Full access to all in-scope portal features (no fine-grained RBAC). |

### 10.2 Target (Future)

| Role | Description | Expected Capabilities |
|------|-------------|------------------------|
| Bureau Admin | HCB operator | Full access; institution CRUD; config; governance; audit. |
| Operations User | Day-to-day operations | Institution view/edit; API/config; monitoring; reports. |
| Compliance User | Compliance and audit | Read-heavy; audit logs; document verification. |
| Read Only | View-only | Dashboard; institution list/detail read-only; reports read-only. |
| Institution User | (Future) Institution-scoped | Limited to own institution; scope TBD. |

---

## 11. Workflows

### 11.1 Institution Registration (Happy Path)

1. User navigates to Institution Management → Register Institution.  
2. Step 1: Enter corporate details; select at least one participation type (Data Submitter and/or Subscriber).  
3. Validation passes; user proceeds to Step 2.  
4. Step 2: Required documents list is shown (dynamic); user uploads each document.  
5. User proceeds to Step 3.  
6. Step 3: Review summary is displayed; user submits.  
7. System validates all required fields and documents; submission succeeds; user is redirected or shown success (e.g. to list or detail).

### 11.2 Institution Registration (Save Draft)

1. User fills Step 1 and/or Step 2.  
2. User clicks Save Draft.  
3. System saves draft (e.g. to local storage) and shows confirmation.  
4. User may return later and resume (draft load when applicable).

### 11.3 View Institution Detail (Role-Based Tabs)

1. User opens institution from list.  
2. System loads institution (id); determines isDataSubmitter and isSubscriber.  
3. Tab bar is built: common tabs + subscriber-only tabs if isSubscriber.  
4. User selects tab; corresponding content loads (Overview, API & Access, Users, Alternate Data, Consent, Billing, Monitoring, Reports, Audit Trail).

### 11.4 Edit Consent Configuration

1. User is on Consent Configuration tab.  
2. User clicks Edit; controls become enabled; Save and Cancel appear.  
3. User changes policy, expiry, scope, or capture mode.  
4. User clicks Save → changes persisted (future: API call); view mode restored.  
5. Or user clicks Cancel → changes discarded; view mode restored.

### 11.5 Data Governance – Mapping Workflow (High-Level)

1. User opens Data Governance → Schema Mapper / Auto-Mapping Review.  
2. User defines or selects source and target; system suggests or shows mappings.  
3. User reviews/edits mappings; submits for review (when workflow exists).  
4. Approver approves or rejects; status updated.  
5. Governance audit log records the action.

---

## 12. Exception and Negative Scenarios

### 12.1 Authentication

| Scenario | Expected Behavior | Acceptance |
|----------|-------------------|------------|
| Login with invalid credentials | Error message; no session created; user remains on login page. | Message shown; no redirect to app. |
| Login with empty email or password | Validation error (inline or message). | Submit blocked or error shown. |
| Session expired / invalid | Redirect to login; optional message "Session expired". | Redirect to `/login`. |
| Access protected URL without login | Redirect to `/login`. | No content of protected page shown. |

### 12.2 Institution Registration

| Scenario | Expected Behavior | Acceptance |
|----------|-------------------|------------|
| Step 1: No participation type selected | Validation error; cannot proceed to Step 2. | Error message; Next disabled or validation on Next. |
| Step 1: Invalid email format | Validation error on Contact Email. | Inline or form-level error. |
| Step 1: Required field empty | Validation errors for empty required fields. | User cannot proceed until resolved. |
| Step 2: File over size limit | Error toast/message (e.g. "File size must be under 10MB"); upload rejected. | File not added; message clear. |
| Step 2: Wrong file type | Reject or warn per policy (e.g. PDF, JPG, PNG only). | Documented behavior and test. |
| Step 3: Submit with missing documents | Validation error; list of missing documents or count. | Submit blocked; message clear. |
| Step 3: Submit with incomplete corporate details | Validation error. | Submit blocked. |
| Draft load fails (e.g. corrupt storage) | Graceful degradation; no crash; optional message. | App remains usable. |

### 12.3 Institution List and Detail

| Scenario | Expected Behavior | Acceptance |
|----------|-------------------|------------|
| Institution not found (invalid id) | Message "Institution not found" and link/button back to list. | No blank page; safe navigation. |
| Empty list (no institutions match filter) | Empty state message; no table error. | Message and optional CTA. |
| API/list load failure | Error state with retry or message. | No silent failure. |

### 12.4 Configuration Edits (Consent, Billing)

| Scenario | Expected Behavior | Acceptance |
|----------|-------------------|------------|
| Save fails (e.g. network/API error) | Error message; user remains in edit mode; can retry or cancel. | Message shown; state consistent. |
| Cancel after edit | Changes discarded; view mode restored with original values. | No persisted partial data. |

### 12.5 Data Governance

| Scenario | Expected Behavior | Acceptance |
|----------|-------------------|------------|
| Mapping submit with validation errors | Errors shown; submit blocked. | User can correct and resubmit. |
| Approval rejection | Status updated; user notified (or sees status); optional reason. | Audit log entry. |

### 12.6 General

| Scenario | Expected Behavior | Acceptance |
|----------|-------------------|------------|
| Network offline | Graceful degradation; queue or message "Check connection". | No hard crash. |
| 404 (unknown route) | NotFound page or redirect. | No blank or error stack. |
| Browser back/forward | SPA state and URL in sync. | No broken back button. |

---

## 13. Compliance Considerations

| Area | Requirement | Notes |
|------|-------------|--------|
| **Data protection** | Personal data (e.g. contact email, phone, user names) processed only for stated purposes; access controlled. | Align with data protection law (e.g. Kenya DPA). |
| **Consent** | Subscriber consent policy, expiry, scope, and capture mode configurable and auditable. | Supports consent governance. |
| **Audit trail** | All material actions (config, API keys, consent, billing, governance) logged with who, what, when. | Regulatory and internal audit. |
| **Document retention** | Compliance documents and audit logs retained per policy and regulation. | Legal/compliance to define retention. |
| **Financial regulation** | Institution onboarding and licensing info support regulatory reporting (e.g. CBK, SASRA). | Ensure data points support reporting. |
| **Access control** | Role-based access (future) to limit access to sensitive functions. | RBAC and MFA in future phase. |

---

## 14. Risks, Assumptions, and Dependencies

### 14.1 Risks

| ID  | Risk | Impact | Likelihood | Mitigation |
|-----|------|--------|------------|------------|
| R1  | Backend APIs delayed or incomplete | Portal cannot persist or load real data | Medium | Mock data and clear API contracts; phased integration. |
| R2  | Scope creep (e.g. CBS, full Monitoring) | Timeline and quality impact | Medium | Strict scope (in/out); change control. |
| R3  | Regulatory change affecting consent or data handling | Rework of consent/billing or data flows | Low | Design for configurable policy; compliance review. |
| R4  | Single role (no RBAC) increases misuse risk | Unauthorized access to sensitive actions | Medium | Introduce RBAC and MFA in next phase. |
| R5  | Audit log not persisted or tampered | Compliance and forensics impact | High | Backend audit service with integrity controls. |

### 14.2 Assumptions

| ID  | Assumption |
|-----|------------|
| A1  | Business accepts current scope (no SSO, no full Monitoring/Reporting/User Management backend in v1). |
| A2  | Institution and configuration data will be provided by backend APIs in a later phase. |
| A3  | Mock data is sufficient for UAT and demos until APIs are available. |
| A4  | Primary users are bureau operators (admin); institution-level users are a later phase. |
| A5  | Billing and consent configurations are stored and enforced by backend services. |
| A6  | One primary production environment; browser support as stated in NFR-8. |
| A7  | Theme (CRIF blue, Inter) and layout (DashboardLayout) remain as specified. |

### 14.3 Dependencies

| ID  | Dependency | Owner |
|-----|------------|--------|
| D1  | Backend institution and config API | Backend team |
| D2  | Audit/logging backend | Backend / DevOps |
| D3  | Identity provider (for future SSO/RBAC) | Security / IT |
| D4  | Data governance backend (mapping, rules, quality) | Data / Backend |
| D5  | Hosting and environment (e.g. staging, production) | DevOps |
| D6  | Product and compliance sign-off on scope and consent/billing behavior | Product / Compliance |

---

## 15. Acceptance Criteria (Summary)

- **Authentication:** Login, logout, session, and protected route behavior per FR-A1–FR-A5.  
- **Dashboard:** KPIs and charts per FR-D1–FR-D5.  
- **Institution list and nav:** Default to Data Submitters; filters and role-based lists per FR-I1–FR-I7.  
- **Registration wizard:** Three steps; participation type and dynamic documents per FR-R1–FR-R8.  
- **Institution detail:** Dynamic tabs, order, and content per FR-ID1–FR-ID5 and tab-specific FRs (Overview, API & Access, Users, Alternate Data, Consent, Billing, Monitoring, Reports, Audit Trail).  
- **Data Governance:** Sub-nav and sub-pages per FR-G1–FR-G7.  
- **Global:** Sidebar, theme, layout, responsiveness per FR-N1–FR-N4.  
- **Exceptions:** All negative scenarios in Section 12 handled as specified.  
- **NFRs:** Performance, security, usability, and browser support per Section 7.  
- **Compliance:** Audit trail, consent configuration, and data handling aligned with Section 13.

---

## 16. Approval and Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Engineering Lead | | | |
| Compliance Officer | | | |
| Project Sponsor | | | |

---

*End of BRD.*
