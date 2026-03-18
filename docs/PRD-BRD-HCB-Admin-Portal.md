# Hybrid Credit Bureau (HCB) Admin Portal
## Complete Product Requirement Document (PRD) & Business Requirement Document (BRD)

**Document Version:** 1.1  
**Date:** 2026-03-18  
**Status:** Updated  
**Classification:** Internal – Confidential

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Requirements (BRD)](#2-business-requirements-brd)
3. [Product Requirements (PRD)](#3-product-requirements-prd)
4. [User Personas](#4-user-personas)
5. [User Journey / Workflow](#5-user-journey--workflow)
6. [Screen-Level Product Requirements](#6-screen-level-product-requirements)
7. [Graph / Chart Specifications](#7-graph--chart-specifications)
8. [Data Logic and Calculations](#8-data-logic-and-calculations)
9. [Color Tag Conditions](#9-color-tag-conditions)
10. [Filters and Search](#10-filters-and-search)
11. [Exception Handling / Edge Cases](#11-exception-handling--edge-cases)
12. [Performance Requirements](#12-performance-requirements)
13. [Technical Architecture](#13-technical-architecture)
14. [API Specification](#14-api-specification)
15. [Data Models](#15-data-models)
16. [Security and Access Control](#16-security-and-access-control)
17. [Analytics and Logging](#17-analytics-and-logging)
18. [QA Test Scenarios](#18-qa-test-scenarios)

---

## 1. Executive Summary

### 1.1 Purpose

The Hybrid Credit Bureau (HCB) Admin Portal is a centralized enterprise administration platform for managing a hybrid credit bureau ecosystem. It provides bureau operators, compliance officers, and analysts with a unified interface to manage institutions, govern data quality, monitor API performance, configure AI-powered agents, generate reports, and administer users.

### 1.2 Business Objective

- Establish a single-pane-of-glass for bureau operations management
- Reduce institution onboarding time from weeks to days
- Achieve ≥97% data mapping accuracy through AI-assisted schema governance
- Provide real-time operational visibility with SLA breach detection under 60 seconds
- Enable audit-ready compliance tracking across all platform actions

### 1.3 Key Problems Solved

| Problem | Solution |
|---------|----------|
| Manual institution onboarding with spreadsheets | 3-step registration wizard with validation |
| Inconsistent data formats from multiple submitters | AI-powered schema mapping with governance workflow |
| SLA breaches detected hours after occurrence | Real-time alert engine with auto-remediation |
| Fragmented credit analysis across tools | AI agent workspace with bureau enquiry integration |
| Audit trail gaps for regulatory compliance | Comprehensive governance audit logs with IP tracking |
| No centralized user access management | Role-based user management with MFA support |

### 1.4 Target Users / Personas

| Persona | Role | Primary Use |
|---------|------|-------------|
| Bureau Operator (Super Admin) | Full platform administration | Institution lifecycle, user management, system config |
| Bureau Admin | Institution & governance management | Onboarding, data governance, monitoring |
| Analyst | Read-only analytics & agent usage | Dashboards, AI agents, report generation |
| API User | Programmatic integration | API access, data submission |
| Viewer | Dashboard-only access | Executive overview |

### 1.5 Expected Business Impact

- **40% reduction** in institution onboarding cycle time
- **60% reduction** in manual data mapping effort
- **<5 minute** mean-time-to-detect for SLA breaches
- **100% audit coverage** for regulatory compliance
- **30% improvement** in analyst productivity via AI agents

---

## 2. Business Requirements (BRD)

### 2.1 Business Goals

| ID | Goal | Priority | Success Metric |
|----|------|----------|----------------|
| BG-01 | Manage dual-role institution lifecycle (Data Submitter / Subscriber) | P0 | 100% of institutions registered via portal |
| BG-02 | Centralized configuration for APIs, consent, and billing | P0 | Zero manual configuration outside portal |
| BG-03 | AI-assisted data governance with approval workflows | P0 | ≥97% auto-mapping accuracy |
| BG-04 | Real-time operational monitoring with alerting | P0 | <60s breach detection time |
| BG-05 | Compliance-ready audit logging | P0 | 100% action coverage |
| BG-06 | Role-based user management with MFA | P1 | Zero unauthorized access incidents |
| BG-07 | AI-powered credit analysis agents | P1 | 30% analyst productivity gain |
| BG-08 | Self-service reporting | P1 | 80% of reports generated without engineering |

### 2.2 Business Context

The HCB operates in the East African fintech ecosystem (Kenya, Uganda, Tanzania, Rwanda) as a hybrid credit bureau serving:
- **Data Submitters**: Institutions that submit credit data (loan accounts, repayment history)
- **Subscribers**: Institutions that consume credit reports for lending decisions
- **Dual-role Institutions**: Institutions that both submit and consume data

The platform integrates with CRIF as the primary bureau engine and supports alternate data sources (bank statements, GST, telecom, utility data).

### 2.3 Stakeholders

| Stakeholder | Role | Interest |
|-------------|------|----------|
| Product Owner | Strategic direction | Feature prioritization, roadmap |
| HCB Operations | Day-to-day management | Institution onboarding, monitoring |
| Compliance Team | Regulatory adherence | Audit logs, consent tracking, data protection |
| Risk Team | Credit risk management | Data quality, match accuracy |
| Engineering | Platform development | Technical architecture, API design |
| Data Governance Team | Data quality & mapping | Schema mapping, validation rules |
| Regulators (CBK, BOT, BOU, BNR) | Oversight | Compliance reporting, audit trails |

### 2.4 Key Success Metrics (KPIs)

| KPI | Target | Measurement |
|-----|--------|-------------|
| Institution Onboarding Accuracy | 100% first-time-right | No re-submissions required |
| Configuration Error Rate | <0.5% | Errors in API/consent/billing setup |
| Schema Mapping Cycle Time | <2 hours | From source ingestion to approved mapping |
| SLA Breach Detection Time | <60 seconds | Time from breach to alert |
| Audit Log Completeness | 100% | All user actions logged |
| Data Quality Score | ≥94% | Composite quality metric |
| API Success Rate | ≥98% | Successful API calls / total calls |
| Report Generation Time | <30 seconds | Queue-to-completion for standard reports |

### 2.5 Assumptions

1. V1 operates with a mock data layer; backend APIs will be implemented in V2
2. Bureau operators are the primary users with full platform access
3. CRIF is the sole bureau integration (no multi-bureau comparison)
4. Institutions are pre-validated offline before portal registration
5. All users access the platform via modern browsers (Chrome, Firefox, Safari, Edge)
6. The platform operates in English only for V1

### 2.6 Dependencies

| Dependency | Type | Impact |
|------------|------|--------|
| Backend API Layer | Technical | Required for production data |
| Identity Provider (SSO) | Technical | Required for enterprise authentication |
| CRIF Bureau API | External | Required for bureau enquiries |
| Billing Engine | Technical | Required for credit consumption tracking |
| Email Service | Technical | Required for user invitations |
| Document Storage | Technical | Required for compliance document uploads |

### 2.7 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| No RBAC enforcement in V1 | High | Medium | All routes behind simple auth; RBAC planned for V2 |
| Backend API delays | Medium | High | Mock data layer enables frontend-first development |
| Scope creep in AI agents | Medium | Medium | Fixed agent configurations per release cycle |
| Audit log data integrity | Low | Critical | Immutable append-only log design |
| Multi-jurisdiction compliance | Medium | High | Configurable per-institution consent rules |

---

## 3. Product Requirements (PRD)

### 3.1 Feature Overview

#### Module 1: Authentication

| Attribute | Detail |
|-----------|--------|
| **Feature Name** | User Authentication |
| **Description** | Email/password login with SSO option, form validation, and session management |
| **Business Value** | Secure access control preventing unauthorized bureau data access |
| **User Benefit** | Single sign-on reduces friction; remember-me preserves sessions |

#### Module 2: Dashboard

| Attribute | Detail |
|-----------|--------|
| **Feature Name** | Executive Dashboard |
| **Description** | Real-time KPI cards (API Volume, Error Rate, SLA Health, Data Quality Score), 6 analytical charts, recent activity feed, and top institutions leaderboard |
| **Business Value** | Single view of bureau health enables proactive issue detection |
| **User Benefit** | Instant visibility into operational status without navigating multiple screens |

#### Module 3: Institution Management

| Attribute | Detail |
|-----------|--------|
| **Feature Name** | Institution Lifecycle Management |
| **Description** | Searchable institution registry with status filters, 3-step registration wizard (Corporate Details → Compliance Documents → Review), and detailed institution profiles with 9 tabbed views |
| **Business Value** | Standardized onboarding reduces errors and accelerates time-to-live |
| **User Benefit** | Guided wizard prevents missing information; tabbed detail view provides comprehensive institution context |

#### Module 4: Data Governance

| Attribute | Detail |
|-----------|--------|
| **Feature Name** | Data Governance Suite |
| **Description** | 6 sub-modules: Dashboard (KPIs, trends), Schema Mapper Agent (8-step AI-assisted wizard), Validation Rules (rule builder with versioning), Identity Resolution Agent (match review with dual-approval), Data Quality Monitoring (anomaly detection, drift alerts), Governance Audit Logs |
| **Business Value** | Automated data quality management reduces manual effort by 60% |
| **User Benefit** | AI-suggested mappings with confidence scores; visual rule builder; clear approval workflows |

#### Module 5: Monitoring

| Attribute | Detail |
|-----------|--------|
| **Feature Name** | Operations Monitoring |
| **Description** | 5 sub-modules: Data Submission API (request logs, KPIs, charts), Data Submission Batch (batch jobs, processing timeline, failure analysis), Inquiry API (enquiry logs, product breakdown), SLA Configuration (threshold management), Alert Engine (rules, active alerts, breach history, auto-remediation) |
| **Business Value** | Real-time operational visibility enables sub-minute incident detection |
| **User Benefit** | Filterable request logs with drill-down; configurable SLA thresholds; automated alerting |

#### Module 6: AI Agents

| Attribute | Detail |
|-----------|--------|
| **Feature Name** | AI Agent Workspace |
| **Description** | 10 specialized agents (Banking, Bureau Operations, Real Estate, Insurance, Employment, Utilities, Automotive, B2B Trade, Loan Underwriter, Self), chat workspace with customer context panel, bureau enquiry integration, bank statement upload, sub-agent ecosystem |
| **Business Value** | AI-powered credit analysis accelerates lending decisions by 30% |
| **User Benefit** | Natural language interface for complex credit analysis; suggested actions; structured bureau reports |

#### Module 7: Reporting

| Attribute | Detail |
|-----------|--------|
| **Feature Name** | Report Management |
| **Description** | Report list with filtering (type, status, date range), new report request form (10 report types, date range, format selection), status tracking (Queued → Processing → Completed/Failed) |
| **Business Value** | Self-service reporting reduces dependency on engineering team |
| **User Benefit** | Simple form-based report generation; real-time status tracking |

#### Module 8: User Management

| Attribute | Detail |
|-----------|--------|
| **Feature Name** | User Administration |
| **Description** | 3 sub-modules: Users List (search, filter, invite, detail drawer with API key management), Roles & Permissions (5 roles, 9 permission categories, custom role creation), Activity Log (searchable audit trail with IP tracking) |
| **Business Value** | Granular access control meets regulatory requirements for data protection |
| **User Benefit** | Self-service user management; clear role visibility; complete activity history |

#### Module 9: Approval Queue

| Attribute | Detail |
|-----------|--------|
| **Feature Name** | Super Admin Approval Queue |
| **Description** | Centralized approval workflow for institution registrations and schema mappings. Submissions enter a `pending` state and require explicit Approve, Reject (with mandatory reason), or Request Changes action from a Super Admin. Includes KPI cards (Pending, Approved This Month, Changes Requested, Total Items), tab-based filtering (All/Institutions/Schema Mappings), status filter, detail drawer with metadata display, and inline action buttons. Sidebar displays a badge count for pending items. |
| **Business Value** | Governance-grade approval workflow ensures no institution or schema goes live without explicit Super Admin sign-off |
| **User Benefit** | Single queue for all pending approvals; clear status tracking; mandatory reason for rejections ensures accountability |

---

## 4. User Personas

### 4.1 Super Admin (Bureau Operator)

| Attribute | Detail |
|-----------|--------|
| **Title** | Bureau Operations Manager |
| **Organization** | HCB Head Office |
| **Goals** | Full platform oversight, institution lifecycle management, user administration, SLA monitoring |
| **Pain Points** | Managing multiple institutions across jurisdictions; ensuring compliance across all data submitters; tracking API health across 8+ integrations simultaneously |
| **Usage Behaviour** | Daily login, 4-6 hours active use, monitors dashboard first, then alerts, reviews pending approvals |
| **Permissions** | All 9 permission categories enabled |

### 4.2 Bureau Admin

| Attribute | Detail |
|-----------|--------|
| **Title** | Institution Relationship Manager |
| **Organization** | HCB Regional Office |
| **Goals** | Institution onboarding, data governance management, monitoring, report generation |
| **Pain Points** | Slow onboarding process; inconsistent data formats from institutions; difficulty tracking mapping accuracy across sources |
| **Usage Behaviour** | Daily login, 3-4 hours active use, focuses on institution management and data governance |
| **Permissions** | 7 of 9 categories (excludes Manage Users, Access API) |

### 4.3 Analyst

| Attribute | Detail |
|-----------|--------|
| **Title** | Credit Risk Analyst |
| **Organization** | Partner Institution |
| **Goals** | Credit analysis via AI agents, dashboard monitoring, report generation |
| **Pain Points** | Scattered credit data across multiple systems; manual report compilation; slow bureau enquiry turnaround |
| **Usage Behaviour** | Daily login, 2-3 hours active use, primarily uses AI agents and reporting |
| **Permissions** | 5 of 9 categories (View Dashboard, Use Agents, Generate Reports, View Monitoring, View Audit Logs) |

### 4.4 API User

| Attribute | Detail |
|-----------|--------|
| **Title** | System Integration Account |
| **Organization** | Partner Institution IT |
| **Goals** | Programmatic data submission, API key management |
| **Pain Points** | API key rotation complexity; lack of visibility into submission status |
| **Usage Behaviour** | Automated access, rare manual login for key rotation |
| **Permissions** | 2 of 9 categories (Access API, View Audit Logs) |

### 4.5 Viewer

| Attribute | Detail |
|-----------|--------|
| **Title** | Executive / Board Member |
| **Organization** | HCB / Partner Institution |
| **Goals** | High-level operational overview |
| **Pain Points** | Information overload; need quick visual summary |
| **Usage Behaviour** | Weekly login, <30 minutes, dashboard only |
| **Permissions** | 1 of 9 categories (View Dashboard) |

---

## 5. User Journey / Workflow

### 5.1 Login Flow

```
Step 1: User navigates to /login
  → System renders login form (email, password, SSO button, trust indicators)
  
Step 2: User enters email and password
  → Frontend validates email format (regex) and password presence
  → Decision: Valid? → Proceed | Invalid? → Show inline error messages
  
Step 3: User clicks "Sign In"
  → AuthContext.login(email, password) sets user state
  → Navigate to "/" (Dashboard) with replace
  → ProtectedRoute allows access
  
Step 4 (Alternative): User clicks "Sign in with SSO"
  → Redirect to enterprise SSO provider (future implementation)
  
Step 5: Session active
  → All routes render inside ProtectedRoute
  → Logout clears user state, redirects to /login
```

### 5.2 Institution Registration Wizard

```
Step 1: User clicks "Register New Institution" on Institution List
  → Navigate to /institutions/register
  → System renders 3-step wizard (Corporate Details → Compliance Documents → Review)

Step 2: Corporate Details (Step 1/3)
  → User fills: Legal Name, Trading Name, Registration Number, Institution Type (dropdown),
    Jurisdiction, License Number, Contact Email, Contact Phone
  → User selects participation type: Data Submitter ✓ and/or Subscriber ✓
  → Decision: At least one participation type selected? → Proceed | Neither → Error
  → Frontend validates via Zod schema (all fields required, email format, max lengths)
  → User clicks "Next"

Step 3: Compliance Documents (Step 2/3)
  → System displays document upload area
  → User uploads: Certificate of Incorporation, Regulatory License, Data Protection Certificate
  → User clicks "Next"

Step 4: Review & Submit (Step 3/3)
  → System displays summary of all entered data
  → User reviews and clicks "Submit Registration"
  → System creates institution with status "draft"
  → Toast: "Institution registered successfully"
  → Navigate to institution list

Decision Points:
  - If Subscriber selected → Billing configuration becomes mandatory (future)
  - If Data Submitter selected → API access configuration auto-provisioned (future)
```

### 5.3 Data Governance Schema Mapping Workflow

```
Step 1: User navigates to Data Governance → Schema Mapper Agent
  → System displays Schema Registry table (existing mappings)
  
Step 2: User clicks "New Mapping" or edits existing
  → System launches 7-step wizard:
    1. Source Ingestion (upload/paste source schema, auto-detect category)
    2. Multi-Schema Matching (find similar schemas across system)
    3. LLM Field Intelligence (AI analyzes each field: meaning, PII, canonical match)
    4. Auto Rule Preview (validation rules auto-generated)
    5. Semantic Insights (field clustering, deduplication)
    6. Storage & Visibility (lineage, storage config)
    7. Governance Actions (approval submission, evolution queue)

Step 3: AI processes source fields
  → For each field: confidence score, match type (exact/semantic/contextual/derived)
  → Decision: Confidence ≥90% → auto_accepted | 70-89% → needs_review | <70% → unmapped

Step 4: User reviews mappings
  → Accept, modify, or reject AI suggestions
  → Handle unmapped fields: map to existing, create new master field, or ignore

Step 5: Governance submission
  → Mapping submitted for dual-approval
  → First approver reviews → Second approver confirms
  → Status: draft → under_review → approved → active
```

### 5.4 Agent Chat Workflow

```
Step 1: User navigates to Agents → selects an agent (e.g., Banking & Financial Services)
  → System renders agent detail page with chat workspace and customer context panel

Step 2: User triggers Bureau Enquiry
  → Modal opens: Full Name, PAN, Mobile, DOB, Address, Consent checkbox
  → User fills form and clicks "Pull Bureau Report"
  → System generates mock customer profile and bureau analysis

Step 3: Agent responds with structured bureau report
  → Markdown-formatted analysis: Summary, Key Metrics table, Risk Assessment, Recommendation
  → Suggested actions: Upload Bank Statement, Fetch GST Data, Run Fraud Check, etc.

Step 4: User continues analysis
  → User can type follow-up questions or click suggested action buttons
  → Each action triggers the corresponding tool (modal or inline response)
```

### 5.5 Report Request Workflow

```
Step 1: User navigates to Reporting → clicks "New Report Request"
  → System renders report request form

Step 2: User fills form
  → Report Type (dropdown: 10 types), Date Range (from/to), Output Format, Institution, Product Type
  → User clicks "Submit Request"
  
Step 3: System queues report
  → Report added to store with status "Queued"
  → Report ID generated: HCB-REP-{YYYYMMDD}-{SEQ}
  → Toast: "Report request submitted"
  → Navigate to report list

Step 4: Status progression
  → Queued → Processing → Completed / Failed
  → User can view status on Report List page
```

### 5.6 User Invite Flow

```
Step 1: Admin navigates to User Management → Users → clicks "Invite User"
  → Modal opens with form

Step 2: Admin fills form
  → Full Name, Email, Role (dropdown: 5 roles), Institution (dropdown: 9 institutions)
  → Optional: "Send welcome email" checkbox (default: checked)

Step 3: Admin clicks "Send Invite"
  → Validation: all fields required
  → Toast: "Invitation sent to {email}"
  → Modal closes, form resets
  
Step 4: Invited user appears in Users List
  → Status: "Invited"
  → Last Active: "Never"
```

---

## 6. Screen-Level Product Requirements

### 6.1 Login Screen (`/login`)

**Purpose:** Authenticate users and establish session.

| Element | Type | Location | Description | Data Source | Behaviour | API Dependency |
|---------|------|----------|-------------|-------------|-----------|----------------|
| CRIF Logo | Image | Left panel, center | White logo on dark blue (#0B2E5B) background | Static asset `/crif-logo-white.png` | Decorative only | None |
| Credit Network Canvas | Canvas animation | Left panel, background | Animated network visualization | Component-generated | Subtle node/edge animation; respects reduced motion | None |
| Login Heading | H1 | Right panel, top | "Login" text | Static | N/A | None |
| Email Input | Text Input | Right panel | Email address with Mail icon prefix | User input | Validates on submit (regex), shows inline error | None |
| Password Input | Password Input | Right panel | Password with Lock icon prefix, Eye toggle | User input | Show/hide toggle; validates non-empty on submit | None |
| Remember Me | Checkbox | Right panel, below inputs | "Remember me" label | User preference | Toggles state (no backend persistence in V1) | None |
| Forgot Password | Link | Right panel, beside Remember Me | "Forgot password?" text | Static | No-op in V1 (href="#") | None |
| Sign In Button | Primary Button | Right panel | Full-width "Sign In" | N/A | Validates form → calls AuthContext.login → navigates to "/" | `POST /api/auth/login` (future) |
| SSO Divider | Divider | Right panel | "or" separator line | Static | N/A | None |
| SSO Button | Outline Button | Right panel | "Sign in with SSO" with Building2 icon | N/A | No-op in V1 | SSO Provider (future) |
| Trust Indicators | Icon + Text row | Right panel, bottom | "256-bit Encrypted", "Enterprise Security", "Role-Based Access" | Static | Decorative | None |

### 6.2 Dashboard (`/`)

**Purpose:** Executive overview of API performance, data quality, and SLA health.

#### KPI Cards (Row 1)

| Element | Type | Location | Description | Data Source | Behaviour |
|---------|------|----------|-------------|-------------|-----------|
| API Volume (24h) | Metric Card | Row 1, Col 1 | Value: "1,284,392", Change: "+12.3%" | `kpiStats[0]` | Green up arrow for positive trend |
| Error Rate | Metric Card | Row 1, Col 2 | Value: "0.23%", Change: "-0.05%" | `kpiStats[1]` | Red down arrow (decreasing error = positive) |
| SLA Health | Metric Card | Row 1, Col 3 | Value: "99.7%", Change: "+0.1%" | `kpiStats[2]` | Green up arrow |
| Data Quality Score | Metric Card | Row 1, Col 4 | Value: "94.2%", Change: "+1.8%" | `kpiStats[3]` | Green up arrow |

#### Charts (Rows 2-5)

| Element | Type | Location | Data Source |
|---------|------|----------|-------------|
| API Usage Trend (30 days) | Line Chart (dual axis) | Row 2, 8/12 cols | `apiUsageData` |
| Success vs Failure Rate | Donut Chart | Row 2, 4/12 cols | `successFailureData` |
| Mapping Accuracy Trend | Line Chart | Row 3, 6/12 cols | `mappingAccuracyData` |
| Match Confidence Distribution | Bar Chart | Row 3, 6/12 cols | `matchConfidenceData` |
| SLA Latency Trend (P95/P99) | Line Chart (dual line) | Row 4, full width | `slaLatencyData` |
| Rejection & Override Trends | Stacked Bar Chart | Row 5, full width | `rejectionOverrideData` |

#### Tables (Row 6)

| Element | Type | Location | Data Source |
|---------|------|----------|-------------|
| Recent Activity | Feed List | Row 6, 7/12 cols | `recentActivity` (5 items) |
| Top Institutions | Leaderboard | Row 6, 5/12 cols | `topInstitutions` (4 items) |

### 6.3 Institution List (`/institutions/data-submitters`, `/institutions/subscribers`)

**Purpose:** Browse, search, and manage registered institutions.

| Element | Type | Location | Description | Data Source | Behaviour |
|---------|------|----------|-------------|-------------|-----------|
| Page Title | H1 | Top left | "Data Submission Institutions" or "Subscriber Institutions" | Route-derived | Changes based on `roleFilter` prop |
| Register Button | Primary Button | Top right | "Register New Institution" | N/A | Navigates to `/institutions/register` |
| Search Input | Text Input | Above table | Filter by institution name | User input | Real-time filtering of table rows |
| Status Filter | Select Dropdown | Above table | Filter by status (All, Active, Pending, Suspended, Draft) | Static options | Filters table rows |
| Institution Table | Data Table | Main content | Columns: Name, Type, Status, APIs Enabled, SLA Health, Last Updated, Actions | `institutions` array | Sortable columns; row click navigates to `/institutions/:id` |
| Actions Menu | Dropdown | Table row | View, Edit, Suspend options | N/A | View → navigate to detail; Edit → navigate to detail; Suspend → toast confirmation |

### 6.4 Institution Registration Wizard (`/institutions/register`)

**Purpose:** 3-step guided registration for new institutions.

#### Step 1: Corporate Details

| Element | Type | Description | Validation |
|---------|------|-------------|------------|
| Legal Name | Text Input | Full legal entity name | Required, max 200 chars |
| Trading Name | Text Input | DBA / short name | Required, max 200 chars |
| Registration Number | Text Input | Government registration ID | Required, max 50 chars |
| Institution Type | Select | Commercial Bank, Credit Union, NBFI, Fintech, Savings Bank, MFI | Required |
| Jurisdiction | Text Input | Operating country | Required, max 100 chars |
| License Number | Text Input | Regulatory license ID | Required, max 50 chars |
| Contact Email | Text Input | Primary contact email | Required, valid email format |
| Contact Phone | Text Input | Primary phone number | Required, max 30 chars |
| Data Submitter | Checkbox | Participates as data submitter | At least one checkbox required |
| Subscriber | Checkbox | Participates as subscriber | At least one checkbox required |

#### Step 2: Compliance Documents

| Element | Type | Description |
|---------|------|-------------|
| Document Upload Area | File Upload | Drag-and-drop or click to upload |
| Document List | Table | Name, Status (Verified/Pending) |

#### Step 3: Review & Submit

| Element | Type | Description |
|---------|------|-------------|
| Summary Card | Read-only display | All fields from Steps 1-2 |
| Submit Button | Primary Button | Creates institution record |

### 6.5 Institution Detail (`/institutions/:id`)

**Purpose:** Comprehensive view of a single institution across 9 tabs.

| Tab | Route Segment | Key Elements |
|-----|---------------|--------------|
| Overview | Default | Institution info card, compliance docs, KPI summary |
| Alternate Data | Tab 2 | Alternate data source configuration |
| API & Access | Tab 3 | API key management, rate limits |
| Consent Config | Tab 4 | Consent rules per product type |
| Billing | Tab 5 | Billing model (Prepaid/Postpaid/Hybrid), credit balance |
| Monitoring | Tab 6 | Institution-specific API metrics |
| Reports | Tab 7 | Institution-specific report generation |
| Audit Trail | Tab 8 | Institution-specific activity log |
| Users | Tab 9 | Institution-scoped user list |

### 6.6 Data Governance Dashboard (`/data-governance/dashboard`)

**Purpose:** Aggregated data governance metrics and trends.

| Element | Type | Description | Data Source |
|---------|------|-------------|-------------|
| Mapping Accuracy % | KPI Card | Current: 97.4%, Trend: up | `governanceKpis[0]` |
| Validation Failure Rate % | KPI Card | Current: 2.1%, Trend: down | `governanceKpis[1]` |
| Match Confidence Avg % | KPI Card | Current: 88.2%, Trend: up | `governanceKpis[2]` |
| Override Rate % | KPI Card | Current: 4.3%, Trend: down | `governanceKpis[3]` |
| Active Rule Sets | KPI Card | Current: 12, Trend: neutral | `governanceKpis[4]` |
| Pending Approvals | KPI Card | Current: 7, Trend: neutral | `governanceKpis[5]` |
| Mapping Accuracy Trend | Line Chart | 30/60/90 day toggle | `mappingAccuracyTrend30/60/90` |
| Validation Failure by Source | Bar Chart | Per data source | `validationFailureBySource` |
| Match Confidence Distribution | Bar Chart | Bucket histogram | `matchConfidenceDistribution` |
| Override vs Auto-Accept | Stacked Bar | Weekly trend | `overrideVsAutoAcceptTrend` |
| Data Quality Score Trend | Line Chart | 14-day trend | `dataQualityScoreTrend` |
| Rejection Reasons Breakdown | Pie/Donut Chart | By category | `rejectionReasonsBreakdown` |

### 6.7 Schema Mapper Agent (`/data-governance/auto-mapping-review`)

**Purpose:** AI-assisted field-level schema mapping with governance workflow.

**Views:**
1. **Schema Registry** — Table of existing schema mappings with filters, create/edit/audit actions
2. **Wizard** — 7-step AI mapping flow (see Section 5.3)
3. **Version Diff Viewer** — Side-by-side diff of mapping versions

| Element | Type | Description |
|---------|------|-------------|
| Schema Registry Table | Data Table | Columns: Source Name, Source Type, Master Schema Version, Coverage %, Unmapped Fields, Rule Count, Status, Version, Created By, Actions |
| Registry Filters | Filter Bar | Source type, status, search |
| Schema Detail Dialog | Modal | Detailed view of a single registry entry |
| Wizard Container | Multi-step form | 7-step progressive wizard with step indicator |
| Step Indicator | Progress Bar | Visual step tracker with labels |
| Version Diff Viewer | Split Panel | Old vs New with change highlighting |

### 6.8 Monitoring - Data Submission API (`/monitoring/data-submission-api`)

**Purpose:** API request monitoring for data submission endpoints.

| Element | Type | Description | Data Source |
|---------|------|-------------|-------------|
| Total Calls Today | KPI Card | 28,492 | `apiSubmissionKpis.totalCallsToday` |
| Success Rate % | KPI Card | 98.2% | `apiSubmissionKpis.successRatePercent` |
| P95 Latency | KPI Card | 245ms | `apiSubmissionKpis.p95LatencyMs` |
| Avg Processing Time | KPI Card | 182ms | `apiSubmissionKpis.avgProcessingTimeMs` |
| Rejection Rate % | KPI Card | 1.8% | `apiSubmissionKpis.rejectionRatePercent` |
| Active API Keys | KPI Card | 12 | `apiSubmissionKpis.activeApiKeys` |
| API Call Volume (30 Days) | Line Chart | Daily volume trend | `apiCallVolume30Days` |
| Latency Trend | Line Chart (P95/P99) | Response time trend | `latencyTrendData` |
| Success vs Failure | Donut Chart | Ratio visualization | `successVsFailureData` |
| Top Rejection Reasons | Horizontal Bar | Reason → count | `topRejectionReasonsData` |
| Request Log Table | Data Table | Columns: Request ID, API Key, Endpoint, Status, Response Time, Records, Error Code, Timestamp | `apiSubmissionRequests` |
| Request Detail Drawer | Slide-out Panel | Full request details on row click | Selected request |

### 6.9 Monitoring - Alert Engine (`/monitoring/alert-engine`)

**Purpose:** Alert rules, active alerts, breach history, and auto-remediation.

| Element | Type | Description | Data Source |
|---------|------|-------------|-------------|
| Alert Rules Table | Data Table | Name, Domain, Condition, Severity, Status, Last Triggered | `alertRules` |
| Active Alerts Table | Data Table | Alert ID, Domain, Metric, Current Value, Threshold, Severity, Status | `activeAlerts` |
| Alerts Over Time | Line Chart | 14-day alert count trend | `alertsTriggeredOverTime` |
| Alerts by Domain | Bar Chart | Domain → count | `alertsByDomain` |
| Severity Distribution | Pie Chart | Critical/Warning/Info | `severityDistribution` |
| MTTR Trend | Line Chart | Mean time to resolve (minutes) | `mttrTrendData` |
| SLA Breach History | Data Table | SLA Type, Metric, Threshold, Breach Value, Duration, Status, Severity | `slaBreachHistory` |
| Auto-Remediation Settings | Toggle Panel | Per-domain remediation actions | `defaultRemediationSettings` |

### 6.10 Agents Landing (`/agents`)

**Purpose:** Browse and subscribe to AI agents.

| Element | Type | Description | Data Source |
|---------|------|-------------|-------------|
| Agent Cards | Card Grid | Icon, Name, Description, Tags, Status, Subscribe toggle | `mockAgents` (10 agents) |
| Recent Activity | Activity Feed | Recent agent interactions | `mockRecentActivity` |
| Search/Filter | Text Input + Tag Filter | Filter agents by name or tag | Client-side |

### 6.11 Agent Detail (`/agents/:agentId`)

**Purpose:** Interactive chat workspace with customer context.

| Element | Type | Description |
|---------|------|-------------|
| Chat Panel | Message List | Scrollable chat with user/agent messages |
| Message Input | Textarea + Send | User message composition |
| Suggested Prompts | Chip Row | Pre-defined prompt shortcuts |
| Customer Context Panel | Sidebar | Customer profile, scores, tradelines, documents |
| Bureau Enquiry Modal | Dialog | Form: Full Name, PAN, Mobile, DOB, Address, Consent |
| Bank Statement Upload Modal | Dialog | File upload for bank statement analysis |
| Tool Action Buttons | Button Row | Contextual actions after agent response |

### 6.12 Reporting (`/reporting`)

**Purpose:** Report generation and status tracking.

| Element | Type | Location | Description | Data Source |
|---------|------|----------|-------------|-------------|
| Report Table | Data Table | Main | Columns: Report ID, Type, Date Range, Created By, Status | `getReports()` |
| Status Filters | Select/Chips | Above table | Filter by status (All, Queued, Processing, Completed, Failed) | Static |
| Type Filter | Select | Above table | Filter by report type (10 types) | `getReportTypesForFilter()` |
| New Report Button | Primary Button | Top right | Navigates to `/reporting/new` | N/A |
| Delete Action | Icon Button | Table row | Removes report from list | `removeReport()` |

### 6.13 User Management - Users List (`/user-management/users`)

**Purpose:** Manage platform users.

| Element | Type | Description | Data Source |
|---------|------|-------------|-------------|
| Users Table | Data Table | Columns: Name, Email, Role, Institution, Status, MFA, Last Active | `mockUsers` |
| Search Input | Text Input | Filter by name or email | Client-side |
| Role Filter | Select | Filter by role (5 roles) | Static |
| Status Filter | Select | Filter by status (Active, Invited, Suspended, Deactivated) | Static |
| Invite User Button | Primary Button | Opens InviteUserModal | N/A |
| User Detail Drawer | Slide-out Panel | Full user profile, API keys, MFA status | Selected user |

### 6.14 App Sidebar

**Purpose:** Primary navigation.

| Element | Type | Description |
|---------|------|-------------|
| Logo | Image + Text | "H" logo mark + "Hybrid Credit Bureau" text |
| Dashboard | Nav Link | `/` |
| Institution Management | Nav Group | Sub-items: Data Submission Institutions, Subscriber Institutions |
| Agents | Nav Link | `/agents` |
| Data Governance | Nav Group | Sub-items: Dashboard, Schema Mapper Agent, Validation Rules, Identity Resolution Agent, Data Quality Monitoring, Governance Audit Logs |
| Monitoring | Nav Group | Sub-items: Data Submission API, Data Submission Batch, Inquiry API, SLA Configuration, Alert Engine |
| Reporting | Nav Link | `/reporting` |
| Audit Logs | Nav Link | `/audit-logs` |
| User Management | Nav Group | Sub-items: Users, Roles & Permissions, Activity Log |
| Collapse Toggle | Button | Bottom of sidebar, collapses to icon-only mode (w-16 vs w-64) |

### 6.15 App Header

**Purpose:** Global utilities bar.

| Element | Type | Description |
|---------|------|-------------|
| Mobile Menu Toggle | Icon Button | Hamburger menu (mobile only, md:hidden) |
| Global Search | Text Input | "Search institutions, APIs, logs..." with ⌘K shortcut hint |
| Theme Toggle | Icon Button | Light/Dark/System theme switcher with dropdown |
| Notifications | Popover | Bell icon with unread badge; 6 notification items; "Mark all read" |
| User Profile | Dropdown Menu | Avatar + name + role; Settings link; Log Out (destructive) |

---

## 7. Graph / Chart Specifications

### 7.1 API Usage Trend (Dashboard)

| Attribute | Detail |
|-----------|--------|
| **Chart Type** | Dual-axis Line Chart |
| **Data Source** | `apiUsageData` (7 points, 30-day summary) |
| **X-Axis** | Day labels (D-29, D-24, ..., Today) |
| **Y-Axis Left** | API Volume (formatted as "920k", "1.28M") |
| **Y-Axis Right** | Error Rate % (formatted as "0.23%") |
| **Series** | Volume (primary color, solid line), Errors (danger color, solid line) |
| **Tooltip** | Shows day, volume, error rate |
| **Legend** | Bottom, horizontal: "API Volume", "Error Rate (%)" |
| **Filters** | None (static 30-day window) |
| **Drill-down** | None in V1 |

### 7.2 Success vs Failure Rate (Dashboard)

| Attribute | Detail |
|-----------|--------|
| **Chart Type** | Donut Chart (Pie with innerRadius=60, outerRadius=90) |
| **Data Source** | `successFailureData` [{name: "Success", value: 92}, {name: "Failure", value: 8}] |
| **Colors** | Success: `hsl(var(--success))`, Failure: `hsl(var(--danger))` |
| **Tooltip** | Shows percentage on hover |
| **Legend** | Bottom: "Success", "Failure" |
| **paddingAngle** | 4 (visual separation between segments) |

### 7.3 Mapping Accuracy Trend (Dashboard)

| Attribute | Detail |
|-----------|--------|
| **Chart Type** | Line Chart |
| **Data Source** | `mappingAccuracyData` (5 weekly points) |
| **X-Axis** | Week labels (W1-W5) |
| **Y-Axis** | Accuracy % (domain: 96-100, formatted as "97.4%") |
| **Series** | Single line, primary color, dot markers (r=3) |
| **Tooltip** | Week + accuracy value |

### 7.4 Match Confidence Distribution (Dashboard)

| Attribute | Detail |
|-----------|--------|
| **Chart Type** | Vertical Bar Chart |
| **Data Source** | `matchConfidenceData` (5 buckets) |
| **X-Axis** | Confidence buckets (0-40, 40-60, 60-75, 75-90, 90-100) |
| **Y-Axis** | Count of matches |
| **Bar Style** | Primary color, radius [4,4,0,0], barSize=24 |
| **Tooltip** | Bucket range + count |

### 7.5 SLA Latency Trend (Dashboard)

| Attribute | Detail |
|-----------|--------|
| **Chart Type** | Dual-line Line Chart |
| **Data Source** | `slaLatencyData` (7 daily points) |
| **X-Axis** | Day labels (D-6 to Today) |
| **Y-Axis** | Latency in ms (formatted as "232 ms") |
| **Series** | P95 (primary color), P99 (warning color) |
| **Tooltip** | Day + P95 + P99 values |

### 7.6 Rejection & Override Trends (Dashboard)

| Attribute | Detail |
|-----------|--------|
| **Chart Type** | Stacked Bar Chart |
| **Data Source** | `rejectionOverrideData` (5 weekly points) |
| **X-Axis** | Week labels (W1-W5) |
| **Y-Axis** | Count |
| **Series** | Rejected (danger color), Overridden (warning color), stacked |
| **Tooltip** | Week + rejected count + overridden count |

### 7.7 Monitoring - API Call Volume (30 Days)

| Attribute | Detail |
|-----------|--------|
| **Chart Type** | Line Chart |
| **Data Source** | `apiCallVolume30Days` (30 randomly generated points) |
| **X-Axis** | Day labels (D-29 to D-0) |
| **Y-Axis** | Volume (25K-40K range) |
| **Filters** | Institution filter, time range |

### 7.8 Monitoring - Latency Trend (P95/P99)

| Attribute | Detail |
|-----------|--------|
| **Chart Type** | Dual-line Line Chart |
| **Data Source** | `latencyTrendData` (30 randomly generated points) |
| **X-Axis** | Day labels |
| **Y-Axis** | Milliseconds |
| **Series** | P95 (primary), P99 (warning) |

### 7.9 Alert Engine - Alerts Triggered Over Time

| Attribute | Detail |
|-----------|--------|
| **Chart Type** | Line/Bar Chart |
| **Data Source** | `alertsTriggeredOverTime` (14 daily points) |
| **X-Axis** | Day labels (D-13 to D-0) |
| **Y-Axis** | Alert count |

### 7.10 Alert Engine - Severity Distribution

| Attribute | Detail |
|-----------|--------|
| **Chart Type** | Pie Chart |
| **Data Source** | `severityDistribution` [{Critical: 35}, {Warning: 52}, {Info: 13}] |
| **Colors** | Critical: danger, Warning: warning, Info: info |

### 7.11 Data Governance - Mapping Accuracy Trend

| Attribute | Detail |
|-----------|--------|
| **Chart Type** | Line Chart |
| **Data Source** | `mappingAccuracyTrend30/60/90` (switchable via toggle) |
| **X-Axis** | Period labels |
| **Y-Axis** | Accuracy % |
| **Filters** | Time range toggle: 30d / 60d / 90d |

### 7.12 Data Governance - Data Quality with Anomaly

| Attribute | Detail |
|-----------|--------|
| **Chart Type** | Line Chart with anomaly markers |
| **Data Source** | `dataQualityTrendWithAnomaly` (7 points, 1 anomaly) |
| **Anomaly Indicator** | Red dot or highlight on `isAnomaly: true` points |

---

## 8. Data Logic and Calculations

### 8.1 Error Rate

```
Error Rate (%) = (Failed API Calls / Total API Calls) × 100

Example:
  Total Calls = 1,284,392
  Failed Calls = 2,954
  Error Rate = (2,954 / 1,284,392) × 100 = 0.23%
```

### 8.2 SLA Health

```
SLA Health (%) = (Requests within SLA threshold / Total Requests) × 100

Example:
  Total Requests = 28,492
  Within SLA = 28,407
  SLA Health = (28,407 / 28,492) × 100 = 99.7%
```

### 8.3 Data Quality Score

```
Data Quality Score (%) = 100 - Σ(weighted penalties)

Penalties:
  Missing Field % (weight: 0.3) → 1.2% × 0.3 = 0.36
  Invalid Format % (weight: 0.3) → 2.1% × 0.3 = 0.63
  Duplicate Rate % (weight: 0.2) → 0.4% × 0.2 = 0.08
  Schema Drift Alerts (weight: 0.1) → normalized
  Mapping Drift Alerts (weight: 0.1) → normalized

Example:
  Score = 100 - (0.36 + 0.63 + 0.08 + drift_penalties) ≈ 94.2%
```

### 8.4 Success Rate

```
Success Rate (%) = (Successful Requests / Total Requests) × 100

Data Submission API Example:
  Success = 27,979
  Total = 28,492
  Success Rate = 98.2%

Enquiry API Example:
  Success = 3,731
  Total = 3,842
  Success Rate = 97.1%
```

### 8.5 Rejection Rate

```
Rejection Rate (%) = (Rejected Records / Total Records Submitted) × 100

Example:
  Rejected = 513
  Total = 28,492
  Rejection Rate = 1.8%
```

### 8.6 P95 / P99 Latency

```
P95 Latency = Value at the 95th percentile of response time distribution
P99 Latency = Value at the 99th percentile of response time distribution

Example:
  Sorted response times (ascending): [..., 245ms (P95), ..., 292ms (P99)]
```

### 8.7 Mapping Accuracy

```
Mapping Accuracy (%) = (Correctly Mapped Fields / Total Fields) × 100

Example:
  Correctly Mapped = 487
  Total = 500
  Mapping Accuracy = 97.4%
```

### 8.8 Batch Success Rate

```
Batch Success Rate (%) = (Successful Records / Total Records in Batch) × 100

Example (BATCH-20250919-0001):
  Success = 1,425
  Total = 1,500
  Success Rate = 95.0%
```

### 8.9 Credit Consumption

```
Credit Consumption = Total Enquiries (1 credit per enquiry)

Example:
  Total Enquiries Today = 3,842
  Credit Consumption = 3,842 credits
```

---

## 9. Color Tag Conditions

### 9.1 Institution Status

| Status | Color Token | CSS Classes | Condition |
|--------|-------------|-------------|-----------|
| Active | Success | `bg-success/15 text-success` | Institution fully onboarded and operational |
| Pending | Warning | `bg-warning/15 text-warning` | Registration submitted, awaiting approval |
| Suspended | Danger | `bg-danger-subtle text-danger` | Institution access temporarily revoked |
| Draft | Muted | `bg-muted text-muted-foreground` | Registration started but not submitted |

### 9.2 User Status

| Status | Color | Condition |
|--------|-------|-----------|
| Active | Green (success) | User has logged in and is operational |
| Invited | Blue (primary) | Invitation sent, user has not yet activated |
| Suspended | Red (danger) | Account suspended by admin |
| Deactivated | Gray (muted) | Account permanently disabled |

### 9.3 SLA Metrics

| Condition | Color | Threshold |
|-----------|-------|-----------|
| Within SLA | Green (success) | Metric meets or exceeds threshold |
| Breach | Red (danger) | Metric violates threshold |

### 9.4 Alert Severity

| Severity | Color | Usage |
|----------|-------|-------|
| Critical | Red (danger/destructive) | Immediate action required |
| Warning | Yellow/Orange (warning) | Attention needed |
| Info | Blue (info/primary) | Informational only |

### 9.5 Alert Status

| Status | Color | Description |
|--------|-------|-------------|
| Active | Red | Alert is currently firing |
| Acknowledged | Yellow | Alert has been seen but not resolved |
| Resolved | Green | Alert condition no longer active |

### 9.6 Report Status

| Status | Color | Description |
|--------|-------|-------------|
| Queued | Blue/Primary | Report is in queue waiting to be processed |
| Processing | Yellow/Warning | Report is being generated |
| Completed | Green/Success | Report is ready for download |
| Failed | Red/Destructive | Report generation failed |

### 9.7 API Request Status

| Status | Color | Description |
|--------|-------|-------------|
| Success | Green | Request processed successfully |
| Failed | Red | Request failed with error |
| Partial | Yellow | Partially processed |
| Rate Limited | Orange | Request throttled |

### 9.8 Batch Job Status

| Status | Color | Description |
|--------|-------|-------------|
| Completed | Green | All records processed |
| Processing | Blue | Currently processing |
| Failed | Red | Batch failed |
| Queued | Gray | Waiting in queue |

### 9.9 Mapping Workflow Status

| Status | Color | Description |
|--------|-------|-------------|
| Draft | Gray | Not yet submitted |
| Under Review | Yellow | Pending approval |
| Approved | Green | Approved and active |
| Rolled Back | Red | Reverted to previous version |

### 9.10 Match Confidence

| Range | Color | Description |
|-------|-------|-------------|
| 90-100% | Green | High confidence, auto-accept eligible |
| 75-89% | Yellow | Medium confidence, review recommended |
| 60-74% | Orange | Low-medium confidence, requires review |
| 0-59% | Red | Low confidence, likely mismatch |

### 9.11 Metric Thresholds (Dashboard)

| Metric | Green | Orange | Red |
|--------|-------|--------|-----|
| SLA Health | ≥99% | 95-99% | <95% |
| Error Rate | <0.5% | 0.5-2% | >2% |
| Data Quality | ≥94% | 90-94% | <90% |
| Mapping Accuracy | ≥97% | 94-97% | <94% |

### 9.12 Role Colors

| Role | HSL Color | Usage |
|------|-----------|-------|
| Super Admin | `hsl(0, 72%, 51%)` | Red — indicates highest privilege |
| Bureau Admin | `hsl(214, 78%, 20%)` | Dark Blue — management level |
| Analyst | `hsl(175, 60%, 40%)` | Teal — analytical role |
| Viewer | `hsl(220, 9%, 46%)` | Gray — limited access |
| API User | `hsl(38, 92%, 50%)` | Amber — programmatic access |

### 9.13 Activity Log Status

| Status | Color | Description |
|--------|-------|-------------|
| Success | Green | Action completed successfully |
| Failed | Red | Action failed (e.g., blocked login) |

### 9.14 Notification Categories

| Category | Icon Color | Description |
|----------|------------|-------------|
| SLA Breach Alert | Warning (yellow) | Latency or rate threshold exceeded |
| Schema Approved | Success (green) | Governance action completed |
| Failed Login | Destructive (red) | Security event |
| User Invited | Primary (blue) | Administrative action |
| Batch Complete | Success (green) | Processing milestone |
| Quality Drop | Warning (yellow) | Data quality degradation |

---

## 10. Filters and Search

### 10.1 Institution List

| Filter | Type | Default | Options | Behaviour |
|--------|------|---------|---------|-----------|
| Search | Text Input | Empty | Free text | Filters by institution name (case-insensitive, client-side) |
| Status | Select | "All" | All, Active, Pending, Suspended, Draft | Filters table rows by status |
| Role Filter | Route-based | From URL | Data Submitters (`/institutions/data-submitters`), Subscribers (`/institutions/subscribers`) | Filters by `isDataSubmitter` or `isSubscriber` flag |

### 10.2 Users List

| Filter | Type | Default | Options | Behaviour |
|--------|------|---------|---------|-----------|
| Search | Text Input | Empty | Free text | Filters by name or email |
| Role | Select | "All" | Super Admin, Bureau Admin, Analyst, Viewer, API User | Single-select |
| Status | Select | "All" | Active, Invited, Suspended, Deactivated | Single-select |
| Institution | Select | "All" | 9 institution options | Single-select |

### 10.3 Activity Log

| Filter | Type | Default | Options | Behaviour |
|--------|------|---------|---------|-----------|
| Search | Text Input | Empty | Free text | Filters by user name, action, or details |
| Action Type | Select | "All" | Login, Role Change, Bureau Query, API Key Rotation, Report Generated, User Invited, User Suspended, Data Governance, Agent Usage | Single-select |
| Status | Select | "All" | Success, Failed | Single-select |
| Date Range | Date Picker | Last 30 days | Custom range | Filters by timestamp |

### 10.4 Report List

| Filter | Type | Default | Options | Behaviour |
|--------|------|---------|---------|-----------|
| Search | Text Input | Empty | Free text | Filters by Report ID |
| Report Type | Select | "All" | 10 report types (Credit Score Summary, Enquiry Volume, Submission Volume, etc.) | Single-select |
| Status | Select | "All" | Queued, Processing, Completed, Failed | Single-select |
| Date Range | Date Picker | All time | Custom range | Filters by creation date |

### 10.5 Monitoring (Data Submission API / Inquiry API)

| Filter | Type | Default | Options | Behaviour |
|--------|------|---------|---------|-----------|
| Institution | Select | "All" | Data submitters or subscribers (context-dependent) | Filters by institution linked to API key |
| Time Range | Select | "Last 24h" | Last 1h, Last 24h, Last 7d, Last 30d | Filters request log and refreshes charts |
| Request ID | Text Input | Empty | Free text | Exact match on request/enquiry ID |

### 10.6 Data Governance Audit Logs

| Filter | Type | Default | Options | Behaviour |
|--------|------|---------|---------|-----------|
| Action Type | Select | "All" | mapping_approved, mapping_rejected, rule_created, rule_updated, rule_activated, merge_performed, override_performed, config_changed | Single-select |
| User | Text Input | Empty | Free text | Filters by user name |
| Date Range | Date Picker | All time | Custom range | Filters by timestamp |

### 10.7 Schema Registry

| Filter | Type | Default | Options | Behaviour |
|--------|------|---------|---------|-----------|
| Source Type | Select | "All" | telecom, utility, bank, gst, custom | Single-select |
| Status | Select | "All" | draft, under_review, approved, active, archived | Single-select |
| Search | Text Input | Empty | Free text | Filters by source name |

### 10.8 Global Header Search

| Attribute | Detail |
|-----------|--------|
| Type | Text Input with ⌘K shortcut |
| Placeholder | "Search institutions, APIs, logs..." |
| Behaviour | V1: Visual only (no search execution). Future: Command palette with cross-module search |
| Scope | Institutions, API keys, audit logs, users |

### 10.9 Sorting Rules

| Table | Default Sort | Sortable Columns |
|-------|-------------|------------------|
| Institution List | Last Updated (desc) | Name, Type, Status, SLA Health, Last Updated |
| Users List | Last Active (desc) | Name, Role, Status, Last Active |
| Activity Log | Timestamp (desc) | Timestamp, Action, Status |
| Report List | Created Date (desc) | Report ID, Type, Status |
| Request Log | Timestamp (desc) | Request ID, Status, Response Time |
| Batch Jobs | Upload Time (desc) | Batch ID, Status, Success Rate |

---

## 11. Exception Handling / Edge Cases

### 11.1 Authentication Failures

| Scenario | System Behaviour |
|----------|-----------------|
| Empty email | Inline error: "Email is required" |
| Invalid email format | Inline error: "Enter a valid email address" |
| Empty password | Inline error: "Password is required" |
| Invalid credentials | Toast error: "Invalid email or password" (future API) |
| Session expired | Redirect to `/login` via ProtectedRoute |
| SSO failure | Toast error: "SSO authentication failed. Please try again." (future) |

### 11.2 Empty States

| Scenario | System Behaviour |
|----------|-----------------|
| No institutions match filter | Show empty state: "No institutions found" with clear filter option |
| No reports available | Show empty state: "No reports yet. Create your first report." |
| No users match search | Show empty state: "No users found matching your search" |
| No activity log entries | Show empty state: "No activity recorded yet" |
| Agent chat — no messages | Show suggested prompts as starting point |
| No notifications | Show "You're all caught up" in notification popover |

### 11.3 API Failures (Future - when backend is connected)

| Scenario | System Behaviour |
|----------|-----------------|
| API timeout (>10s) | Show error banner: "Request timed out. Please try again." + Retry button |
| API 500 error | Show error banner: "Something went wrong. Our team has been notified." + Retry button |
| API 401 error | Redirect to `/login` with toast: "Session expired. Please log in again." |
| API 403 error | Show inline error: "You don't have permission to perform this action" |
| API 404 error | Show 404 page for invalid institution ID, report ID, etc. |
| Network offline | Show persistent banner: "You're offline. Changes will sync when connected." |

### 11.4 Form Validation Edge Cases

| Scenario | System Behaviour |
|----------|-----------------|
| Institution registration — no participation type selected | Error: "At least one participation type must be selected" |
| Registration — email exceeds 255 chars | Validation error via Zod schema |
| Invite user — missing required field | Toast error: "Please fill all required fields" |
| Report request — date range end before start | Inline error: "End date must be after start date" |
| Bureau enquiry — PAN format invalid | Inline validation error |
| Bureau enquiry — consent not checked | Disable submit button |

### 11.5 Navigation Edge Cases

| Scenario | System Behaviour |
|----------|-----------------|
| Invalid institution ID in URL | Graceful fallback (undefined check) |
| Invalid agent ID in URL | Show "Agent not found" message |
| Direct URL access without auth | Redirect to `/login` |
| 404 route | Show NotFound page |
| Browser back after logout | ProtectedRoute redirects to `/login` |

### 11.6 File Upload Edge Cases

| Scenario | System Behaviour |
|----------|-----------------|
| File too large (>10MB) | Error: "File size exceeds 10MB limit" |
| Unsupported file format | Error: "Unsupported file type. Please upload CSV, JSON, or XML" |
| Upload interrupted | Show retry option |
| Bank statement — invalid format | Error: "Unable to parse bank statement. Please check the format." |

### 11.7 Concurrent Operations

| Scenario | System Behaviour |
|----------|-----------------|
| Two admins editing same institution | Last-write-wins in V1 (optimistic locking in V2) |
| Dual approval — both approve simultaneously | First approval recorded, second sees updated state |
| Report deleted while viewing | Graceful redirect to report list |

---

## 12. Performance Requirements

### 12.1 Page Load & Navigation

| Metric | Target | Notes |
|--------|--------|-------|
| Initial page load (cold) | <3 seconds | Includes JS bundle download + render |
| SPA navigation (warm) | <300ms | Route transitions within the app |
| Time to Interactive (TTI) | <4 seconds | User can interact with all elements |
| First Contentful Paint (FCP) | <1.5 seconds | First meaningful content visible |

### 12.2 Component Rendering

| Component | Target | Notes |
|-----------|--------|-------|
| Chart rendering | <500ms | Recharts initialization + data binding |
| Table rendering (≤50 rows) | <200ms | Without virtualization |
| Table rendering (>50 rows) | <500ms | With pagination (10 rows per page) |
| Modal/Drawer open | <100ms | Radix UI dialog animation |
| Sidebar collapse/expand | <300ms | CSS transition animation |

### 12.3 Data & Caching

| Requirement | Detail |
|-------------|--------|
| Mock data initialization | <50ms (in-memory JavaScript) |
| API response caching (future) | TanStack Query with 5-minute stale time |
| Theme switching | <100ms (CSS variable swap) |
| Search/filter operations | <100ms (client-side filtering) |

### 12.4 Scalability Expectations

| Dimension | V1 Target | V2 Target |
|-----------|-----------|-----------|
| Concurrent users | 50 | 500 |
| Institutions | 8 (mock) | 1,000+ |
| Users | 12 (mock) | 10,000+ |
| API requests/day | N/A (mock) | 5M+ |
| Report generation | N/A (mock) | 100/hour |

### 12.5 Availability

| Metric | Target |
|--------|--------|
| Uptime | 99.5% |
| Planned maintenance window | <4 hours/month |
| Recovery Time Objective (RTO) | <30 minutes |
| Recovery Point Objective (RPO) | <5 minutes |

---

## 13. Technical Architecture

### 13.1 Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool and dev server |
| Tailwind CSS | 3.x | Utility-first styling |
| tailwindcss-animate | 1.0.7 | Animation utilities |
| React Router | 6.30.1 | Client-side routing |
| TanStack Query | 5.83.0 | Server state management (future API caching) |

### 13.2 UI Component Libraries

| Library | Purpose |
|---------|---------|
| Radix UI | Headless accessible components (Dialog, Select, Popover, Tabs, etc.) |
| shadcn/ui | Pre-styled Radix-based component system |
| Recharts | 2.15.4 — Chart visualizations |
| Framer Motion | 12.34.1 — Animations (login, transitions) |
| Lucide React | 0.462.0 — Icon system |
| cmdk | 1.1.1 — Command palette (future) |
| sonner | 1.7.4 — Toast notifications |

### 13.3 Form & Validation

| Library | Purpose |
|---------|---------|
| React Hook Form | 7.61.1 — Form state management |
| Zod | 3.25.76 — Schema validation |
| @hookform/resolvers | 3.10.0 — Zod-RHF integration |

### 13.4 State Management

| Layer | Technology | Scope |
|-------|-----------|-------|
| Auth State | React Context (`AuthContext`) | Global — user session |
| UI State | React `useState` | Component-local — sidebar collapse, modals, filters |
| Server State | TanStack Query (future) | API response caching |
| Theme State | next-themes | Global — light/dark/system |
| Mock Data | In-memory JS modules (`src/data/`) | Simulated backend |

### 13.5 Project Structure

```
src/
├── App.tsx                    # Route definitions, providers
├── main.tsx                   # Entry point
├── index.css                  # Design tokens (CSS variables)
├── contexts/                  # React Context providers
│   └── AuthContext.tsx
├── components/
│   ├── layout/                # DashboardLayout, AppSidebar, AppHeader
│   ├── ui/                    # shadcn/ui components
│   ├── agents/                # Agent-specific components
│   ├── data-governance/       # Governance workflow components
│   ├── schema-mapper/         # Schema mapping wizard components
│   │   ├── registry/          # Registry table, filters, detail dialog
│   │   ├── wizard/            # 7-step wizard components
│   │   └── shared/            # Reusable schema components
│   └── user-management/       # User management components
├── pages/
│   ├── Dashboard.tsx           # Main dashboard
│   ├── Login.tsx               # Authentication
│   ├── InstitutionList.tsx     # Institution registry
│   ├── InstitutionDetail.tsx   # Institution detail (tabs)
│   ├── RegisterInstitution.tsx # Registration wizard
│   ├── agents/                 # Agent pages
│   ├── data-governance/        # Governance pages
│   ├── monitoring/             # Monitoring pages
│   ├── reporting/              # Reporting pages
│   └── user-management/        # User management pages
├── data/                       # Mock data modules
│   ├── institutions-mock.ts
│   ├── user-management-mock.ts
│   ├── monitoring-mock.ts
│   ├── data-governance-mock.ts
│   ├── agents-mock.ts
│   ├── alert-engine-mock.ts
│   └── bureau-operator-mock.ts
├── types/                      # TypeScript interfaces
│   ├── agents.ts
│   ├── data-governance.ts
│   └── schema-mapper.ts
├── hooks/                      # Custom hooks
│   ├── use-mobile.tsx
│   └── use-toast.ts
└── lib/                        # Utilities
    ├── utils.ts                # cn() helper
    └── typography.ts           # Type scale tokens
```

### 13.6 Routing Architecture

| Route | Component | Layout | Auth |
|-------|-----------|--------|------|
| `/login` | Login | None | Public |
| `/` | Dashboard | DashboardLayout | Protected |
| `/institutions/data-submitters` | InstitutionList | DashboardLayout | Protected |
| `/institutions/subscribers` | InstitutionList | DashboardLayout | Protected |
| `/institutions/register` | RegisterInstitution | DashboardLayout | Protected |
| `/institutions/:id` | InstitutionDetail | DashboardLayout | Protected |
| `/data-governance/*` | DataGovernanceLayout → Outlet | DashboardLayout | Protected |
| `/monitoring/*` | MonitoringLayout → Outlet | DashboardLayout | Protected |
| `/agents` | AgentsLayout → AgentsLandingPage | DashboardLayout | Protected |
| `/agents/:agentId` | AgentsLayout → AgentDetailPage | DashboardLayout | Protected |
| `/agents/configuration` | AgentsLayout → AgentConfigurationPage | DashboardLayout | Protected |
| `/reporting` | ReportingLayout → ReportListPage | DashboardLayout | Protected |
| `/reporting/new` | ReportingLayout → NewReportRequestPage | DashboardLayout | Protected |
| `/user-management/*` | UserManagementLayout → Outlet | DashboardLayout | Protected |
| `*` | NotFound | None | Public |

### 13.7 Theme System

The application uses HSL-based CSS custom properties defined in `index.css` with light and dark mode variants:

```css
:root {
  --background: H S L;
  --foreground: H S L;
  --primary: H S L;
  --secondary: H S L;
  --muted: H S L;
  --accent: H S L;
  --destructive: H S L;
  --success: H S L;
  --warning: H S L;
  --danger: H S L;
  --info: H S L;
  /* ... sidebar, card, popover, chart colors ... */
}

.dark {
  /* Dark mode overrides */
}
```

### 13.8 Future Backend Architecture (V2)

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Backend | Supabase (via Lovable Cloud) | Database, Auth, Edge Functions |
| Database | PostgreSQL | Persistent storage |
| Authentication | Supabase Auth | Email/password, SSO, MFA |
| File Storage | Supabase Storage | Documents, bank statements |
| API Layer | Supabase Edge Functions | Server-side logic |
| Real-time | Supabase Realtime | Live notifications, SLA alerts |

---

## 14. API Specification

> **Note:** V1 uses mock data. The following API contracts define the target backend interface based on existing mock data structures.

### 14.1 Authentication

#### POST /api/auth/login

```json
Request:
{
  "email": "string",
  "password": "string"
}

Response (200):
{
  "user": {
    "id": "string",
    "email": "string",
    "role": "Super Admin | Bureau Admin | Analyst | Viewer | API User"
  },
  "token": "string"
}

Response (401):
{
  "error": "Invalid credentials"
}
```

### 14.2 Dashboard

#### GET /api/dashboard/metrics

```json
Response (200):
{
  "apiVolume24h": 1284392,
  "apiVolumeChange": "+12.3%",
  "errorRate": 0.23,
  "errorRateChange": "-0.05%",
  "slaHealth": 99.7,
  "slaHealthChange": "+0.1%",
  "dataQualityScore": 94.2,
  "dataQualityChange": "+1.8%"
}
```

#### GET /api/dashboard/charts?range=30d

```json
Response (200):
{
  "apiUsageTrend": [
    { "day": "D-29", "volume": 920000, "errors": 0.32 }
  ],
  "successFailure": { "success": 92, "failure": 8 },
  "mappingAccuracy": [
    { "week": "W1", "accuracy": 96.8 }
  ],
  "matchConfidence": [
    { "bucket": "0-40", "count": 6 }
  ],
  "slaLatency": [
    { "day": "D-6", "p95": 280, "p99": 340 }
  ],
  "rejectionOverride": [
    { "week": "W1", "rejected": 120, "overridden": 18 }
  ]
}
```

### 14.3 Institutions

#### GET /api/institutions?status=active&role=dataSubmitter

```json
Response (200):
{
  "data": [
    {
      "id": "string",
      "name": "string",
      "tradingName": "string",
      "type": "Commercial Bank | Credit Union | NBFI | Fintech | Savings Bank | MFI",
      "status": "active | pending | suspended | draft",
      "apisEnabled": 3,
      "slaHealth": 99.9,
      "lastUpdated": "2026-02-18",
      "isDataSubmitter": true,
      "isSubscriber": true,
      "billingModel": "prepaid | postpaid | hybrid",
      "creditBalance": 50000
    }
  ],
  "total": 8
}
```

#### POST /api/institutions

```json
Request:
{
  "legalName": "string",
  "tradingName": "string",
  "registrationNumber": "string",
  "institutionType": "string",
  "jurisdiction": "string",
  "licenseNumber": "string",
  "contactEmail": "string",
  "contactPhone": "string",
  "isDataSubmitter": true,
  "isSubscriber": false,
  "complianceDocs": ["file_id_1", "file_id_2"]
}

Response (201):
{
  "id": "string",
  "status": "draft"
}
```

#### GET /api/institutions/:id

```json
Response (200):
{
  "id": "1",
  "name": "First National Bank",
  "tradingName": "FNB",
  "type": "Commercial Bank",
  "status": "active",
  "registrationNumber": "BK-2024-00142",
  "jurisdiction": "Kenya",
  "licenseType": "Commercial Banking",
  "licenseNumber": "CBK-LIC-0042",
  "contactEmail": "compliance@fnb.co.ke",
  "contactPhone": "+254 700 123 456",
  "onboardedDate": "Jan 15, 2026",
  "dataQuality": 98,
  "matchAccuracy": 96.4,
  "apisEnabled": 3,
  "slaHealth": 99.9,
  "isDataSubmitter": true,
  "isSubscriber": true,
  "billingModel": "postpaid",
  "complianceDocs": [
    { "name": "Certificate of Incorporation", "status": "verified" },
    { "name": "CBK License", "status": "verified" },
    { "name": "Data Protection Certificate", "status": "pending" }
  ]
}
```

### 14.4 Monitoring

#### GET /api/monitoring/submissions?institution=1&range=24h

```json
Response (200):
{
  "kpis": {
    "totalCallsToday": 28492,
    "successRatePercent": 98.2,
    "p95LatencyMs": 245,
    "avgProcessingTimeMs": 182,
    "rejectionRatePercent": 1.8,
    "activeApiKeys": 12
  },
  "requests": [
    {
      "request_id": "REQ-991212",
      "api_key": "sk_live_***7x2k",
      "endpoint": "/submission",
      "status": "Failed",
      "response_time_ms": 210,
      "records": 0,
      "error_code": "INVALID_SCHEMA",
      "timestamp": "2026-02-25 10:32:15"
    }
  ]
}
```

#### GET /api/monitoring/inquiries?institution=1&range=24h

```json
Response (200):
{
  "kpis": {
    "totalEnquiriesToday": 3842,
    "successRatePercent": 97.1,
    "p95LatencyMs": 420,
    "alternateDataCalls": 892,
    "rateLimitBreaches": 3,
    "creditConsumption": 3842
  },
  "enquiries": [
    {
      "enquiry_id": "ENQ-887421",
      "api_key": "sk_sub_***2a",
      "product": "Credit Report + Telecom",
      "status": "Success",
      "response_time_ms": 320,
      "consumer_id": "CON-9912",
      "alternate_data_used": 1,
      "timestamp": "2026-02-25 10:35:22"
    }
  ]
}
```

#### GET /api/monitoring/batches

```json
Response (200):
{
  "kpis": {
    "totalBatchesToday": 4,
    "totalRecordsProcessed": 5200,
    "avgBatchSuccessRate": 65.1,
    "failedBatchesCount": 1,
    "avgProcessingDurationSec": 99,
    "queueBacklogCount": 2
  },
  "batches": [
    {
      "batch_id": "BATCH-20250919-0001",
      "file_name": "loans_september_batch1.csv",
      "status": "Completed",
      "total_records": 1500,
      "success": 1425,
      "failed": 75,
      "success_rate": 95.0,
      "duration_seconds": 142,
      "uploaded": "2026-02-25 08:00:00",
      "uploaded_by": "Sarah Kimani",
      "institution_id": "1"
    }
  ]
}
```

### 14.5 Reports

#### GET /api/reports?type=all&status=all

```json
Response (200):
{
  "data": [
    {
      "reportId": "HCB-REP-20260225-0012",
      "reportType": "Portfolio Risk Snapshot",
      "dateRange": "01 Feb 2026 – 25 Feb 2026",
      "createdBy": "risk.analyst@bank.com",
      "status": "Processing",
      "outputFormat": "PDF",
      "institution": "First National Bank",
      "productType": "All"
    }
  ]
}
```

#### POST /api/reports

```json
Request:
{
  "reportType": "Credit Score Summary Report",
  "dateFrom": "2026-02-01",
  "dateTo": "2026-02-28",
  "outputFormat": "PDF",
  "institution": "First National Bank",
  "productType": "All"
}

Response (201):
{
  "reportId": "HCB-REP-20260308-0013",
  "status": "Queued"
}
```

### 14.6 Users

#### GET /api/users?role=all&status=all

```json
Response (200):
{
  "data": [
    {
      "id": "u1",
      "name": "Sarah Chen",
      "email": "sarah.chen@fnb.co.za",
      "role": "Super Admin",
      "institution": "FNB",
      "status": "Active",
      "mfaEnabled": true,
      "lastActive": "2 minutes ago",
      "createdAt": "2024-01-15"
    }
  ],
  "total": 12
}
```

#### POST /api/users/invite

```json
Request:
{
  "name": "Jane Doe",
  "email": "jane@company.com",
  "role": "Analyst",
  "institution": "FNB",
  "sendWelcomeEmail": true
}

Response (201):
{
  "id": "u13",
  "status": "Invited"
}
```

### 14.7 Activity Log

#### GET /api/activity-log?action=all&status=all

```json
Response (200):
{
  "data": [
    {
      "id": "a1",
      "userId": "u1",
      "userName": "Sarah Chen",
      "action": "Login",
      "details": "Successful login via SSO",
      "ipAddress": "102.134.22.41",
      "status": "Success",
      "timestamp": "2026-03-08T14:32:00Z"
    }
  ]
}
```

### 14.8 Data Governance

#### GET /api/governance/mappings

```json
Response (200):
{
  "kpis": [
    { "label": "Mapping Accuracy %", "value": 97.4, "unit": "%", "trend": "up" }
  ],
  "mappingPairs": [
    {
      "id": "map-1",
      "sourceFieldName": "cust_name",
      "canonicalFieldName": "borrower_full_name",
      "confidence": 98,
      "matchType": "exact",
      "workflowStatus": "approved"
    }
  ]
}
```

### 14.9 Agents

#### GET /api/agents

```json
Response (200):
{
  "agents": [
    {
      "id": "banking",
      "name": "Banking & Financial Services",
      "description": "Comprehensive credit analysis...",
      "status": "active",
      "subscribed": true,
      "tags": ["Bureau", "Risk", "Lending"],
      "toolCount": 7,
      "subAgentCount": 6
    }
  ]
}
```

### 14.10 Alert Engine

#### GET /api/alerts/active

```json
Response (200):
{
  "alerts": [
    {
      "alert_id": "ALT-00921",
      "domain": "Submission API",
      "metric": "Success Rate",
      "current_value": "94.2%",
      "threshold": ">= 99%",
      "severity": "Critical",
      "triggered_at": "2026-02-25 10:45:00",
      "status": "Active"
    }
  ]
}
```

#### GET /api/sla/configs

```json
Response (200):
{
  "configs": [
    {
      "id": "sla-api",
      "name": "Data Submission API SLA",
      "domain": "Data Submission API",
      "metrics": [
        {
          "metric": "Success Rate %",
          "threshold": "≥ 99%",
          "current": "98.2%",
          "status": "Breach",
          "severity": "Warning",
          "timeWindow": "1 hour rolling"
        }
      ]
    }
  ]
}
```

---

## 15. Data Models

### 15.1 Entity Relationship Summary

```
Institution (1) ──── (N) ManagedUser
Institution (1) ──── (N) ApiSubmissionRequest (via API key)
Institution (1) ──── (N) EnquiryLogEntry (via API key)
Institution (1) ──── (N) BatchJob
Institution (1) ──── (N) SlaBreachRecord
ManagedUser (1) ──── (1) RoleDefinition (via role name)
ManagedUser (1) ──── (N) ActivityEntry
Agent (1) ──── (N) SubAgent
Agent (1) ──── (N) AgentTool
Agent (1) ──── (N) SuggestedPrompt
SourceSchemaField (N) ──── (N) CanonicalField (via MappingPair)
MappingPair (1) ──── (N) MappingHistoryEntry
ValidationRule (N) ──── (1) RuleSet
MatchCluster (1) ──── (N) RecordPair
ReportRow (standalone)
AlertRule (standalone)
ActiveAlert (standalone)
GovernanceAuditLogEntry (standalone)
```

### 15.2 Key Tables & Fields

#### Institution

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (UUID) | Yes | Primary key |
| name | string | Yes | Legal entity name |
| tradingName | string | No | DBA / short name |
| type | string | Yes | Institution category |
| status | enum (active, pending, suspended, draft) | Yes | Lifecycle status |
| apisEnabled | number | Yes | Count of active API integrations |
| slaHealth | number | Yes | SLA compliance percentage |
| lastUpdated | string (date) | Yes | Last modification date |
| registrationNumber | string | No | Government registration ID |
| jurisdiction | string | No | Operating country |
| licenseType | string | No | License category |
| licenseNumber | string | No | License identifier |
| contactEmail | string | No | Primary contact email |
| contactPhone | string | No | Primary phone number |
| onboardedDate | string | No | Date institution went live |
| dataQuality | number | No | Data quality score (0-100) |
| matchAccuracy | number | No | Match accuracy percentage |
| isDataSubmitter | boolean | Yes | Submits credit data |
| isSubscriber | boolean | Yes | Consumes credit reports |
| billingModel | enum (prepaid, postpaid, hybrid) | No | Billing arrangement |
| creditBalance | number | No | Prepaid credit balance |
| complianceDocs | array | No | Document name + verification status |

#### ManagedUser

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Primary key |
| name | string | Yes | Full name |
| email | string | Yes | Email address (unique) |
| role | enum (5 roles) | Yes | Access level |
| institution | string | Yes | Associated institution |
| status | enum (Active, Invited, Suspended, Deactivated) | Yes | Account status |
| mfaEnabled | boolean | Yes | Multi-factor authentication |
| lastActive | string | Yes | Last login timestamp |
| createdAt | string | Yes | Account creation date |
| avatar | string | No | Profile image URL |
| apiKeys | array | No | API key management (for API Users) |

#### Agent

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Primary key |
| name | string | Yes | Agent display name |
| description | string | Yes | Agent purpose description |
| instructions | string | Yes | System prompt |
| icon | string | Yes | Lucide icon name |
| tags | string[] | Yes | Category tags |
| status | enum (active, draft) | Yes | Availability status |
| subscribed | boolean | No | User subscription state |
| modelConfig | object | Yes | Model, temperature, maxTokens |
| tools | AgentTool[] | Yes | Available tools |
| capabilities | Record<string, boolean> | Yes | Feature flags |
| sources | Record<string, boolean> | Yes | Data source flags |
| suggestedPrompts | SuggestedPrompt[] | Yes | Pre-defined prompts |
| subAgents | SubAgent[] | No | Child agents |

#### ReportRow

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reportId | string | Yes | Format: HCB-REP-{YYYYMMDD}-{SEQ} |
| reportType | string | Yes | Report category |
| dateRange | string | Yes | Formatted date range |
| createdBy | string | Yes | Requester email |
| status | enum (Queued, Processing, Completed, Failed) | Yes | Generation status |
| outputFormat | string | No | PDF, CSV, Excel |
| institution | string | No | Scope institution |
| productType | string | No | Product filter |

#### AlertRule

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Primary key |
| name | string | Yes | Rule display name |
| domain | enum (5 domains) | Yes | Monitoring domain |
| condition | string | Yes | Human-readable condition |
| severity | enum (Info, Warning, Critical) | Yes | Alert level |
| status | enum (Enabled, Disabled) | Yes | Rule activation |
| lastTriggered | string | No | Last trigger timestamp |

#### ValidationRule

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Primary key |
| name | string | Yes | Rule name |
| ruleSetId | string | Yes | Parent rule set |
| type | enum (format, range, cross_field) | Yes | Rule category |
| severity | enum (warning, error, critical) | Yes | Violation severity |
| status | enum (active, inactive) | Yes | Rule status |
| version | string | Yes | Rule version |
| expressionBlocks | ExpressionBlock[] | Yes | Rule logic blocks |
| errorMessage | string | Yes | Violation message |
| effectiveDate | string | Yes | Rule start date |
| expiryDate | string | No | Rule end date |
| impactPercent | number | No | Estimated data impact |
| testResult | object | No | Test pass/fail counts |

#### MappingPair

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Primary key |
| sourceFieldId | string | Yes | Source field reference |
| sourceFieldName | string | Yes | Source field name |
| canonicalFieldId | string | Yes | Canonical field reference |
| canonicalFieldName | string | Yes | Canonical field name |
| confidence | number | Yes | Match confidence (0-100) |
| matchType | enum (exact, fuzzy, heuristic) | Yes | How match was determined |
| transformationLogic | string | No | Data transformation formula |
| workflowStatus | enum (draft, under_review, approved, rolled_back) | Yes | Approval state |

#### GovernanceAuditLogEntry

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| changeId | string | Yes | Primary key |
| user | string | Yes | User who performed action |
| role | string | Yes | User's role at time of action |
| actionType | enum (8 types) | Yes | Action category |
| entityAffected | string | Yes | What was changed |
| oldValue | string | Yes | Previous value |
| newValue | string | Yes | New value |
| timestamp | string (ISO 8601) | Yes | When action occurred |
| ipAddress | string | Yes | Source IP address |

---

## 16. Security and Access Control

### 16.1 Current Implementation (V1)

| Aspect | Implementation |
|--------|----------------|
| Authentication | Simple email/password via React Context (no backend validation) |
| Authorization | All-or-nothing: logged in = full access |
| Session | In-memory React state (lost on refresh) |
| Route Protection | `ProtectedRoute` component checks `user !== null` |
| Password Storage | Not stored (mock — any password accepted) |
| HTTPS | Enforced at hosting level |

### 16.2 Target Implementation (V2)

#### Role-Permission Matrix

| Permission | Super Admin | Bureau Admin | Analyst | Viewer | API User |
|------------|:-----------:|:------------:|:-------:|:------:|:--------:|
| Manage Institutions | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Dashboard | ✅ | ✅ | ✅ | ✅ | ❌ |
| Use Agents | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage Data Governance | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Monitoring | ✅ | ✅ | ✅ | ❌ | ❌ |
| Generate Reports | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Access API | ✅ | ❌ | ❌ | ❌ | ✅ |
| View Audit Logs | ✅ | ✅ | ✅ | ❌ | ✅ |

#### Authentication Requirements

| Feature | Detail |
|---------|--------|
| Email/Password Login | Bcrypt-hashed passwords, rate limiting (5 attempts/15 min) |
| SSO Integration | SAML 2.0 / OIDC with enterprise IdPs |
| MFA | TOTP-based (per-user toggle, shown in user management) |
| Session Management | JWT with 24-hour expiry, refresh tokens |
| Password Policy | Min 12 chars, 1 uppercase, 1 number, 1 special character |
| Account Lockout | After 5 failed attempts, 15-minute lockout |

#### API Security

| Feature | Detail |
|---------|--------|
| API Key Format | `sk_live_***{last4}` (masked in UI) |
| Key Rotation | Manual rotation via User Detail Drawer |
| Key Revocation | Immediate invalidation |
| Rate Limiting | Per-key rate limits (configurable per institution) |
| IP Allowlisting | Optional per-institution (future) |

#### Data Access Restrictions

| Rule | Detail |
|------|--------|
| Institution Scoping | Users can only access data for their assigned institution(s) |
| PII Masking | PAN numbers partially masked in logs (e.g., `ABCDE****F`) |
| Audit Log Immutability | Append-only, no delete capability |
| Export Controls | Sensitive data exports require elevated permissions |

---

## 17. Analytics and Logging

### 17.1 Page View Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `page_view` | Route change | `path`, `page_title`, `user_role` |
| `dashboard_load` | Dashboard renders | `load_time_ms` |
| `institution_detail_view` | Institution detail opens | `institution_id`, `tab_name` |
| `agent_session_start` | Agent detail page opens | `agent_id`, `agent_name` |

### 17.2 User Action Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `login_success` | Successful authentication | `user_email`, `login_method` (password/SSO) |
| `login_failure` | Failed authentication | `user_email`, `error_reason` |
| `logout` | User logs out | `user_email`, `session_duration_ms` |
| `institution_registered` | Registration wizard completed | `institution_type`, `jurisdiction`, `roles` |
| `user_invited` | Invite modal submitted | `invitee_role`, `institution` |
| `report_requested` | New report submitted | `report_type`, `date_range`, `output_format` |
| `report_deleted` | Report removed | `report_id`, `report_type` |
| `api_key_rotated` | API key rotation | `user_id`, `key_id` |
| `theme_changed` | Theme toggle | `new_theme` (light/dark/system) |
| `sidebar_collapsed` | Sidebar toggle | `collapsed` (true/false) |

### 17.3 Feature Usage Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `bureau_enquiry_initiated` | Bureau enquiry modal submitted | `agent_id`, `customer_pan` (masked) |
| `bank_statement_uploaded` | Bank statement upload completed | `agent_id`, `file_size_kb` |
| `schema_mapping_started` | Wizard opened | `source_type`, `source_name` |
| `schema_mapping_completed` | Wizard completed | `mapping_coverage_pct`, `auto_mapped_count` |
| `validation_rule_created` | New rule saved | `rule_type`, `severity`, `data_source` |
| `match_review_decision` | Match cluster approved/rejected | `cluster_id`, `confidence`, `decision` |
| `alert_acknowledged` | Alert status changed | `alert_id`, `severity`, `domain` |
| `sla_config_updated` | SLA threshold modified | `sla_domain`, `metric`, `old_threshold`, `new_threshold` |
| `filter_applied` | Filter changed on any table | `page`, `filter_type`, `filter_value` |
| `notification_read` | Notification clicked | `notification_id`, `notification_type` |

### 17.4 Error Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `auth_error` | Authentication failure | `error_type`, `user_email` |
| `validation_error` | Form validation failure | `form_name`, `field_name`, `error_message` |
| `api_error` | API call failure (future) | `endpoint`, `status_code`, `error_message` |
| `render_error` | React error boundary triggered | `component`, `error_message` |
| `file_upload_error` | File upload failure | `file_type`, `file_size`, `error_reason` |

---

## 18. QA Test Scenarios

### 18.1 Authentication

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| AUTH-01 | Successful login | Enter valid email + any password → Click Sign In | Redirect to Dashboard, user context set | P0 |
| AUTH-02 | Empty email validation | Leave email empty → Click Sign In | Inline error: "Email is required" | P0 |
| AUTH-03 | Invalid email format | Enter "notanemail" → Click Sign In | Inline error: "Enter a valid email address" | P0 |
| AUTH-04 | Empty password validation | Enter valid email, leave password empty → Click Sign In | Inline error: "Password is required" | P0 |
| AUTH-05 | Password visibility toggle | Click eye icon | Password field toggles between password/text type | P1 |
| AUTH-06 | Remember me checkbox | Toggle checkbox | Checkbox state changes | P2 |
| AUTH-07 | Protected route redirect | Navigate to "/" without login | Redirect to "/login" | P0 |
| AUTH-08 | Logout | Click user menu → Log Out | Redirect to "/login", user context cleared | P0 |
| AUTH-09 | SSO button | Click "Sign in with SSO" | No-op in V1 (button renders, no action) | P2 |
| AUTH-10 | Reduced motion | Enable prefers-reduced-motion → Load login | Animations disabled | P2 |

### 18.2 Dashboard

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| DASH-01 | KPI cards render | Navigate to "/" | 4 KPI cards display with values, trends, and icons | P0 |
| DASH-02 | Charts render | Navigate to "/" | All 6 charts render without errors | P0 |
| DASH-03 | Recent activity feed | Navigate to "/" | 5 activity items with status dots, institution names, and timestamps | P0 |
| DASH-04 | Top institutions | Navigate to "/" | 4 institutions with progress bars and request counts | P0 |
| DASH-05 | Responsive layout | Resize to mobile (375px) | Cards stack vertically, charts fill width, sidebar collapses | P1 |
| DASH-06 | Chart tooltips | Hover over chart data point | Tooltip displays with correct values | P1 |
| DASH-07 | Chart legends | View chart legends | Legends display correct labels and colors | P1 |

### 18.3 Institution Management

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| INST-01 | List renders | Navigate to "/institutions/data-submitters" | Table shows filtered institutions (isDataSubmitter=true) | P0 |
| INST-02 | Subscriber filter | Navigate to "/institutions/subscribers" | Table shows filtered institutions (isSubscriber=true) | P0 |
| INST-03 | Search filter | Type "National" in search | Only "First National Bank" visible | P0 |
| INST-04 | Status filter | Select "Suspended" | Only "Heritage Savings Bank" visible | P0 |
| INST-05 | Navigate to detail | Click institution row | Navigate to "/institutions/:id" with correct data | P0 |
| INST-06 | Registration wizard - Step 1 | Fill all fields with valid data → Click Next | Advances to Step 2 | P0 |
| INST-07 | Registration wizard - validation | Leave required fields empty → Click Next | Inline validation errors shown | P0 |
| INST-08 | Registration wizard - participation | Select neither checkbox → Click Next | Error: "At least one participation type must be selected" | P0 |
| INST-09 | Registration wizard - submit | Complete all 3 steps → Click Submit | Toast: "Institution registered successfully", navigate to list | P0 |
| INST-10 | Detail tabs | Navigate to institution detail → Click each tab | Each tab renders correct content | P1 |

### 18.4 Data Governance

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| GOV-01 | Dashboard KPIs | Navigate to "/data-governance/dashboard" | 6 KPI cards render with correct values | P0 |
| GOV-02 | Schema Registry | Navigate to "/data-governance/auto-mapping-review" | Registry table renders with mock data | P0 |
| GOV-03 | Create mapping | Click "New Mapping" | Wizard opens at Step 1 | P0 |
| GOV-04 | Wizard navigation | Complete Step 1 → Click Next | Advances through all 7 steps | P0 |
| GOV-05 | Validation rules list | Navigate to "/data-governance/validation-rules" | Rules table renders with 3 rules | P0 |
| GOV-06 | Match review clusters | Navigate to "/data-governance/match-review" | 3 match clusters render with confidence scores | P0 |
| GOV-07 | Data quality alerts | Navigate to "/data-governance/data-quality-monitoring" | Quality metrics and drift alerts render | P0 |
| GOV-08 | Audit logs | Navigate to "/data-governance/governance-audit-logs" | 5 audit log entries render | P0 |
| GOV-09 | Version diff viewer | Click "View Audit" on registry entry | Diff viewer renders | P1 |

### 18.5 Monitoring

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| MON-01 | Data Submission API | Navigate to "/monitoring/data-submission-api" | KPIs, charts, and request table render | P0 |
| MON-02 | Batch processing | Navigate to "/monitoring/data-submission-batch" | Batch jobs table renders with 5 entries | P0 |
| MON-03 | Inquiry API | Navigate to "/monitoring/inquiry-api" | Enquiry KPIs, charts, and log table render | P0 |
| MON-04 | SLA configuration | Navigate to "/monitoring/sla-configuration" | 3 SLA configs render with metric tables | P0 |
| MON-05 | Alert engine | Navigate to "/monitoring/alert-engine" | Alert rules, active alerts, and charts render | P0 |
| MON-06 | Alert banner | Data Submission API page with success rate <95% | Warning banner displays | P1 |
| MON-07 | Request detail drawer | Click a request row | Drawer opens with full request details | P1 |
| MON-08 | Filter by institution | Select institution filter | Table and charts update | P1 |

### 18.6 AI Agents

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| AGT-01 | Landing page | Navigate to "/agents" | 10 agent cards render with icons, tags, and subscription status | P0 |
| AGT-02 | Agent detail | Click "Banking & Financial Services" card | Chat workspace renders with suggested prompts | P0 |
| AGT-03 | Bureau enquiry | Click Bureau Enquiry tool → Fill form → Submit | Customer context panel populates, agent responds with bureau report | P0 |
| AGT-04 | Chat interaction | Type message → Press Enter/Send | Message appears in chat, agent responds | P0 |
| AGT-05 | Suggested actions | Click action button on agent response | Corresponding modal/action triggers | P1 |
| AGT-06 | Agent configuration | Navigate to "/agents/configuration" | Configuration page renders | P1 |
| AGT-07 | Sub-agents | View Banking agent sub-agents | 6 sub-agents shown (2 active, 4 coming soon) | P1 |

### 18.7 Reporting

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| RPT-01 | Report list | Navigate to "/reporting" | 12 reports render in table | P0 |
| RPT-02 | New report | Click "New Report" → Fill form → Submit | Report added with "Queued" status, toast shown | P0 |
| RPT-03 | Type filter | Select "Credit Score Summary Report" | Only matching reports shown | P1 |
| RPT-04 | Status filter | Select "Completed" | Only completed reports shown | P1 |
| RPT-05 | Delete report | Click delete on a report | Report removed from list | P1 |

### 18.8 User Management

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| USR-01 | Users list | Navigate to "/user-management/users" | 12 users render in table | P0 |
| USR-02 | Invite user | Click "Invite User" → Fill all fields → Click Send | Toast: "Invitation sent to {email}", modal closes | P0 |
| USR-03 | Invite validation | Submit with empty fields | Toast error: "Please fill all required fields" | P0 |
| USR-04 | Role filter | Select "Analyst" | 4 analysts shown | P1 |
| USR-05 | Search users | Type "Sarah" | 1 user (Sarah Chen) shown | P1 |
| USR-06 | User detail drawer | Click user row | Drawer opens with profile, MFA status, API keys | P1 |
| USR-07 | Roles & permissions | Navigate to "/user-management/roles" | 5 roles with permission matrix | P0 |
| USR-08 | Activity log | Navigate to "/user-management/activity" | 12 activity entries with IP addresses | P0 |

### 18.9 Navigation & Layout

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| NAV-01 | Sidebar navigation | Click each sidebar item | Correct page renders, active state highlights | P0 |
| NAV-02 | Sidebar collapse | Click collapse toggle | Sidebar collapses to icon-only (w-16) | P1 |
| NAV-03 | Sub-navigation | Click Data Governance → Sub-items appear | 6 sub-items render | P0 |
| NAV-04 | Mobile sidebar | Resize to mobile → Click hamburger | Sidebar drawer opens with overlay | P1 |
| NAV-05 | Mobile sidebar close | Click overlay | Sidebar drawer closes | P1 |
| NAV-06 | Theme toggle | Click theme button → Select Dark | Dark theme applies to all pages | P1 |
| NAV-07 | Notifications popover | Click bell icon | Notification list opens, shows 6 items | P1 |
| NAV-08 | Mark all read | Click "Mark all read" | Unread badge disappears | P2 |
| NAV-09 | 404 page | Navigate to "/nonexistent" | NotFound page renders | P0 |
| NAV-10 | Scroll to top | Navigate between pages | Page scrolls to top on route change | P1 |

### 18.10 Cross-Cutting

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| XC-01 | Responsive — tablet (768px) | Resize browser | Layout adapts, sidebar visible | P1 |
| XC-02 | Responsive — mobile (375px) | Resize browser | Sidebar hidden, hamburger shows, cards stack | P1 |
| XC-03 | Dark mode — all pages | Switch to dark mode → Visit each page | All pages render correctly in dark mode | P1 |
| XC-04 | Accessibility — keyboard nav | Tab through login form | All elements focusable, focus rings visible | P1 |
| XC-05 | Accessibility — screen reader | Use screen reader on dashboard | ARIA labels on sections and interactive elements | P2 |
| XC-06 | Performance — initial load | Measure LCP | <3 seconds on standard connection | P1 |
| XC-07 | Browser compat | Test Chrome, Firefox, Safari, Edge | Consistent rendering and functionality | P1 |

---

## Appendix A: Report Types

| Report Type | Description |
|-------------|-------------|
| Credit Score Summary Report | Aggregate credit score distribution across institutions |
| Enquiry Volume Report | Enquiry counts by institution, product, and time period |
| Submission Volume Report | Data submission volumes by institution and API type |
| Utilization Analysis Report | Credit utilization analysis across consumer segments |
| Alternate Data Usage Report | Bank statement, GST, and telecom data usage metrics |
| Consent Audit Report | Consent grant/revoke tracking for compliance |
| SLA Performance Report | SLA compliance across all domains and institutions |
| Institution Billing Report | Credit consumption and billing by institution |
| Portfolio Risk Snapshot | Aggregated risk metrics across lending portfolios |

## Appendix B: Agent Catalog

| Agent ID | Name | Status | Tools | Sub-Agents |
|----------|------|--------|-------|------------|
| banking | Banking & Financial Services | Active | 7 | 6 |
| bureau-operator | Bureau Operations Intelligence | Active | 8 | 0 |
| real-estate | Real Estate & Housing | Active | 0 | 3 |
| insurance | Insurance | Active | 0 | 0 |
| employment | Employment (Sensitive Roles) | Active | 0 | 0 |
| utilities | Utilities & Telecom | Active | 0 | 0 |
| automotive | Automotive Financing | Active | 0 | 0 |
| b2b-trade | Business-to-Business Trade Credit | Active | 0 | 0 |
| loan-underwriter | Loan Underwriter | Active | 0 | 0 |
| self | Self | Active | 0 | 0 |

## Appendix C: Glossary

| Term | Definition |
|------|-----------|
| HCB | Hybrid Credit Bureau |
| DPD | Days Past Due |
| PAN | Permanent Account Number |
| SLA | Service Level Agreement |
| CRIF | Credit bureau engine provider |
| CBS | Core Banking System |
| GST | Goods and Services Tax |
| KYC | Know Your Customer |
| MFA | Multi-Factor Authentication |
| RBAC | Role-Based Access Control |
| DPDP | Digital Personal Data Protection |
| SSO | Single Sign-On |
| MTTR | Mean Time to Resolve |
| P95/P99 | 95th/99th percentile response time |
| LAP | Loan Against Property |
| NBFI | Non-Bank Financial Institution |
| MFI | Microfinance Institution |

---

*End of Document*
