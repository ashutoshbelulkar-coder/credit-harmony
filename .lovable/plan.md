
# Business Requirements Document (BRD)
## HCB -- Institution Customer Onboarding and Management Module

---

### Document Control

| Field | Value |
|---|---|
| Module | Institution Customer Onboarding and Management |
| Version | 1.1 |
| Status | Draft |
| System | Hybrid Credit Bureau (HCB) Admin Portal |
| Date | 2026-02-19 |

---

## 1. Executive Summary

The Institution Onboarding and Management module enables HCB administrators to register, manage, and govern financial institutions that participate in the credit bureau network. The module covers the full lifecycle: discovery (institution list), registration (3-step wizard), post-onboarding configuration (tabbed detail view), and ongoing operational monitoring. All screens are protected behind authentication and rendered within a consistent enterprise dashboard layout.

---

## 2. Business Objectives

1. Provide a centralized registry of all participating financial institutions.
2. Standardize the institution onboarding process through a guided, auditable workflow.
3. Ensure regulatory compliance by mandating document uploads before submission.
4. Enable granular post-onboarding configuration (API keys, access control, data mapping, validation, monitoring).
5. Support lifecycle state management (Draft, Pending, Active, Suspended).

---

## 3. Actors / User Roles

| Actor | Description |
|---|---|
| Super Admin | Full access to all modules. Can register, approve, suspend institutions. |
| Authenticated User | Any logged-in user; all institution screens are behind a `ProtectedRoute` guard. |

Authentication is managed via `AuthContext` with a simple email/password login. Session state (`user: { email }`) is held in React context (no persistent tokens currently).

---

## 4. Module Architecture

### 4.1 Navigation and Entry Points

The module is accessible via:
- **Sidebar**: "Institution Management" link at path `/institutions`
- **Header**: Institution Selector dropdown (top bar) lists: "All Institutions", "First National Bank", "Metro Credit Union", "Pacific Finance Corp", "Southern Trust Bank"

### 4.2 Route Map

| Route | Component | Purpose |
|---|---|---|
| `/institutions` | `InstitutionList` | Searchable list of all institutions |
| `/institutions/register` | `RegisterInstitution` | 3-step registration wizard |
| `/institutions/:id` | `InstitutionDetail` | Tabbed detail/configuration view |

All routes are wrapped in `ProtectedRoute`, which redirects unauthenticated users to `/login`.

### 4.3 Layout Structure

Every page uses `DashboardLayout`, which composes:
- `AppSidebar` -- collapsible left navigation (264px expanded, 64px collapsed)
- `AppHeader` -- sticky top bar (64px height) with institution selector, global search, notifications, user profile
- `<main>` content area with responsive padding

---

## 5. Screen Specifications

### 5.1 Institution List (`/institutions`)

**Purpose**: Central registry view for all onboarded and in-progress institutions.

#### 5.1.1 Page Header

| Element | Detail |
|---|---|
| Title | "Institutions" (text-h2, font-semibold) |
| Subtitle | "Manage onboarded institutions and their configurations" |
| Primary Action | "Register Institution" button (navigates to `/institutions/register`) |

#### 5.1.2 Filter Bar

| Control | Type | Behavior |
|---|---|---|
| Search | Text input with Search icon | Filters by institution name (case-insensitive substring match) |
| Status Filter | Dropdown button | Options: All Statuses, Active, Pending, Suspended, Draft |

#### 5.1.3 Data Table

**Data Model** (`Institution` interface):

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier |
| `name` | `string` | Institution display name |
| `type` | `string` | Category (Commercial Bank, Credit Union, NBFI, Fintech, Savings Bank, MFI) |
| `status` | `InstitutionStatus` | Enum: `"active"`, `"pending"`, `"suspended"`, `"draft"` |
| `apisEnabled` | `number` | Count of enabled APIs (out of 3) |
| `slaHealth` | `number` | SLA compliance percentage (0-100) |
| `lastUpdated` | `string` | ISO date string |

**Table Columns**:

| Column | Alignment | Rendering |
|---|---|---|
| Institution Name | Left | Bold text, font-medium |
| Type | Left | Muted text |
| Status | Left | Colored badge pill (see status styles below) |
| APIs Enabled | Right | Format: `{n}/3` |
| SLA Health | Right | Progress bar + percentage (color-coded: green >= 99%, yellow >= 95%, red < 95%). Shows dash for 0. |
| Last Updated | Left | Date string |
| Actions | -- | Three-dot (MoreHorizontal) menu button (click stops row propagation) |

**Status Badge Styles**:

| Status | Background | Text Color |
|---|---|---|
| Active | `bg-success/15` | `text-success` |
| Pending | `bg-warning/15` | `text-warning` |
| Suspended | `bg-danger-subtle` | `text-danger` |
| Draft | `bg-muted` | `text-muted-foreground` |

**Row Interaction**: Clicking any row navigates to `/institutions/{id}`.

**Pagination**: Static footer showing "Showing {filtered} of {total} institutions" with page number buttons.

#### 5.1.4 Mock Data (8 institutions)

| ID | Name | Type | Status | APIs | SLA | Updated |
|---|---|---|---|---|---|---|
| 1 | First National Bank | Commercial Bank | Active | 3 | 99.9% | 2026-02-18 |
| 2 | Metro Credit Union | Credit Union | Active | 2 | 99.5% | 2026-02-17 |
| 3 | Pacific Finance Corp | NBFI | Pending | 0 | 0% | 2026-02-16 |
| 4 | Southern Trust Bank | Commercial Bank | Active | 3 | 99.7% | 2026-02-15 |
| 5 | Digital Lending Co | Fintech | Draft | 0 | 0% | 2026-02-14 |
| 6 | Heritage Savings Bank | Savings Bank | Suspended | 1 | 87.2% | 2026-02-10 |
| 7 | Alpine Microfinance | MFI | Active | 2 | 98.1% | 2026-02-13 |
| 8 | Urban Commercial Bank | Commercial Bank | Active | 3 | 99.8% | 2026-02-12 |

---

### 5.2 Register Institution -- 3-Step Wizard (`/institutions/register`)

**Purpose**: Guided workflow to onboard a new institution into the HCB network.

#### 5.2.1 Navigation

- **Back link**: "Back to Institutions" (navigates to `/institutions`)
- **Page title**: "Register Institution"

#### 5.2.2 Step Indicator

A horizontal stepper with 3 steps, each showing:
- **Circle**: Step number (current = primary color, completed = green with checkmark, future = muted)
- **Label**: Step title (hidden on small screens)
- **Connector line**: Between steps (green if completed, border color otherwise)

| Step | Index | Title | Icon |
|---|---|---|---|
| 1 | 0 | Corporate Details | Building2 |
| 2 | 1 | Compliance Documents | FileText |
| 3 | 2 | Review and Submit | Eye |

**State variable**: `currentStep` (integer, 0-indexed, default: 0)

#### 5.2.3 Step 1 -- Corporate Details

**Section heading**: "Corporate Details"

**Form fields** (2-column grid on desktop, single column on mobile):

| # | Field Label | Input Type | Placeholder | Required | Notes |
|---|---|---|---|---|---|
| 1 | Legal Name | Text | "Enter legal entity name" | Yes | Official registered name |
| 2 | Trading Name | Text | "Enter trading name" | Yes | DBA / brand name |
| 3 | Registration Number | Text | "e.g. BK-2024-00142" | Yes | Regulatory registration ID |
| 4 | Institution Type | Select (rendered as text currently) | "Select type" | Yes | Expected values: Commercial Bank, Credit Union, NBFI, Fintech, Savings Bank, MFI |
| 5 | Jurisdiction | Text (intended as select) | "Select country" | Yes | Country of incorporation |
| 6 | License Number | Text | "Enter license number" | Yes | Banking/financial license |
| 7 | Contact Email | Text | "compliance@institution.com" | Yes | Primary compliance contact |
| 8 | Contact Phone | Text | "+254 700 000 000" | Yes | Primary phone number |

**Current state**: All fields are uncontrolled inputs (no form state management or validation).

#### 5.2.4 Step 2 -- Compliance Documents

**Section heading**: "Compliance Documents"
**Description**: "Upload required regulatory documents for verification."

**Required documents** (4 items, each as a dashed-border upload row):

| # | Document Name | Accepted Formats | Max Size |
|---|---|---|---|
| 1 | Certificate of Incorporation | PDF, JPG, PNG | 10MB |
| 2 | Banking License | PDF, JPG, PNG | 10MB |
| 3 | Data Protection Certificate | PDF, JPG, PNG | 10MB |
| 4 | Board Resolution | PDF, JPG, PNG | 10MB |

Each row displays:
- FileText icon
- Document name (bold)
- Format/size constraint label
- "Upload" button (non-functional currently)

#### 5.2.5 Step 3 -- Review and Submit

**Section heading**: "Review and Submit"
**Description**: "Please review all information before submitting."

**Summary panel** (muted background card with key-value pairs):

| Field | Default Value |
|---|---|
| Legal Name | -- (dash) |
| Registration No. | -- (dash) |
| Institution Type | -- (dash) |
| Contact Email | -- (dash) |
| Documents Uploaded | 0 / 4 |

**Warning banner**: Yellow-bordered alert stating "Please fill in all required fields and upload documents before submitting."

**Note**: The review step currently shows placeholder dashes because form state is not persisted across steps.

#### 5.2.6 Action Buttons (All Steps)

| Button | Position | Visibility | Behavior |
|---|---|---|---|
| Previous | Bottom-left | Hidden on Step 1 | Decrements `currentStep` |
| Save Draft | Bottom-right | Always visible | No action implemented |
| Next | Bottom-right | Steps 1 and 2 only | Increments `currentStep` |
| Submit for Review | Bottom-right | Step 3 only | No action implemented |

---

### 5.3 Institution Detail (`/institutions/:id`)

**Purpose**: Comprehensive configuration and monitoring view for a single institution.

#### 5.3.1 Header

| Element | Detail |
|---|---|
| Back button | Arrow icon, navigates to `/institutions` |
| Institution icon | Building2 in primary/10 background circle |
| Name | "First National Bank" (hardcoded, text-h2) |
| Metadata | Type badge ("Commercial Bank") + Status pill ("Active", green) |

**Note**: Currently hardcoded to "First National Bank" regardless of route parameter `:id`.

#### 5.3.2 Tab System

Tabs are split into two groups for responsive display:

**Primary tabs** (always visible):

| Tab | Index |
|---|---|
| Overview | 0 |
| API and Access | 1 |
| Alternate Data | 2 |
| Consent Configuration | 3 |
| Mapping | 4 |
| Validation Rules | 5 |

**Secondary tabs** (in "More" dropdown):

| Tab | Index |
|---|---|
| Match Review | 6 |
| Monitoring | 7 |
| Reports | 8 |
| Audit Trail | 9 |

**State variable**: `activeTab` (string, default: "Overview")

Only "Overview" and "API and Access" tabs have implemented content. All other tabs show a placeholder message.

#### 5.3.3 Overview Tab

**Layout**: 3-column grid (2/3 + 1/3 on large screens)

**Left section** (2 cards):

**Card 1 -- Corporate Details** (2-column grid of 6 fields):

| Field | Value |
|---|---|
| Legal Name | First National Bank Ltd. |
| Registration No. | BK-2024-00142 |
| Jurisdiction | Kenya |
| License Type | Commercial Banking |
| Contact Email | compliance@fnb.co.ke |
| Contact Phone | +254 700 123 456 |

**Card 2 -- Compliance Documents** (3 items):

| Document | Status | Icon |
|---|---|---|
| Certificate of Incorporation | Verified | Green checkmark |
| CBK License | Verified | Green checkmark |
| Data Protection Certificate | Pending | Yellow warning |

Each document has a "View" action link.

**Right section** (5 KPI cards, stacked):

| Metric | Value | Color |
|---|---|---|
| APIs Enabled | 3/3 | Green |
| SLA Health | 99.9% | Green |
| Data Quality | 98% | Default |
| Match Accuracy | 96.4% | Default |
| Onboarded | Jan 15, 2026 | Muted |

#### 5.3.4 API and Access Tab

**Environment selector**: 3 toggle buttons

| Environment | Label | Default |
|---|---|---|
| sandbox | SANDBOX | Selected |
| uat | UAT | -- |
| prod | Production | -- |

**API Keys Table**:

| Column | Description |
|---|---|
| Key | Masked key string (e.g., `sb_live_xxxx...xxxx`) |
| Created | Date string |
| Status | Badge ("active", green pill) |
| Actions | "Rotate" (primary text link) + "Revoke" (destructive text link) |

**Action**: "Generate New Key" button in table header.

**API Toggle Cards** (3-column grid):

| API Name | Enabled | Rate Limit | Last Modified |
|---|---|---|---|
| Submission API | Yes (green toggle) | 1000/min | Feb 10, 2026 |
| Enquiry API | Yes (green toggle) | 2000/min | Feb 12, 2026 |
| Bulk API | No (muted toggle) | 100/min | Jan 20, 2026 |

Each card shows a visual toggle switch (non-functional, display only).

---

## 6. State Management Summary

| Component | State Variables | Type | Purpose |
|---|---|---|---|
| InstitutionList | `search` | string | Search filter text |
| InstitutionList | `statusFilter` | string | Active status filter value |
| InstitutionList | `showFilters` | boolean | Filter dropdown visibility |
| RegisterInstitution | `currentStep` | number (0-2) | Current wizard step |
| InstitutionDetail | `activeTab` | string | Active tab name |
| InstitutionDetail (API tab) | `envTab` | "sandbox" / "uat" / "prod" | Selected environment |

---

## 7. Data Flow Diagram

```text
+------------------+      Click row       +--------------------+
|                  | -------------------> |                    |
| Institution List |                      | Institution Detail |
|  /institutions   |                      |  /institutions/:id |
|                  | <--- Back button --- |                    |
+------------------+                      +--------------------+
        |                                          |
        | "Register Institution" button            | Tabs:
        v                                          | - Overview
+------------------+                               | - API & Access
| Register Wizard  |                               | - Alternate Data
| /institutions/   |                               | - Consent Config
|    register      |                               | - Mapping
|                  |                               | - Validation Rules
| Step 0: Corp     |                               | - Match Review
| Step 1: Docs     |                               | - Monitoring
| Step 2: Review   |                               | - Reports
+------------------+                               | - Audit Trail
```

---

## 8. Gaps and Recommendations

| # | Gap | Impact | Recommendation |
|---|---|---|---|
| 1 | Registration form has no state management -- field values are not captured or persisted | Review step shows dashes; "Submit" sends nothing | Implement `react-hook-form` with `zod` validation schema |
| 2 | No form validation on any step | Users can proceed through wizard with empty fields | Add required field validation with inline error messages per step |
| 3 | File upload is non-functional | Compliance documents cannot be attached | Implement file upload with drag-and-drop, preview, and size validation |
| 4 | Institution Detail is hardcoded to "First National Bank" | All institution detail pages show the same data | Look up institution by `:id` param from data source |
| 5 | "Save Draft" button has no handler | Draft state is lost on navigation | Implement draft persistence (local storage or backend) |
| 6 | "Submit for Review" button has no handler | Onboarding workflow cannot complete | Implement submission with status transition to "Pending" |
| 7 | API key actions (Rotate/Revoke/Generate) are non-functional | Key lifecycle cannot be managed | Connect to backend API for key management |
| 8 | API toggle switches are display-only | Cannot enable/disable APIs | Add click handlers with confirmation dialogs |
| 9 | Table sorting indicators are visual only | Columns show sort icon but do not sort | Implement column sorting logic |
| 10 | Pagination is static | Only shows page 1 and 2 buttons with no logic | Implement dynamic pagination |
| 11 | No institution type dropdown on registration | "Institution Type" renders as text input despite being marked as select | Replace with proper Select/Dropdown component |
| 12 | No backend integration | All data is hardcoded mock data | Design and connect to Supabase tables |
| 13 | Three-dot actions menu on list rows has no dropdown | Button renders but does nothing | Add dropdown with View/Edit/Suspend actions |

---

## 9. Typography and Design Tokens

| Token | Value | Usage |
|---|---|---|
| `tableHeaderClasses` | `text-[10px] leading-[13px] uppercase tracking-wider text-muted-foreground` | All table headers |
| `badgeTextClasses` | `text-[10px] leading-[14px] font-medium` | Status badges |
| `text-h2` | Heading size | Page titles |
| `text-h4` | Sub-heading size | Card/section titles |
| `text-body` | Body text size | Table cells, labels |
| `text-caption` | Small text size | Metadata, timestamps |

---

## 10. Acceptance Criteria (Future Implementation)

1. A user can complete the 3-step wizard with all mandatory fields validated before advancing.
2. The Review step dynamically reflects all entered data and uploaded documents.
3. "Submit for Review" creates an institution record with status "Pending".
4. "Save Draft" persists partial progress with status "Draft".
5. Institution List reflects newly created institutions immediately.
6. Institution Detail loads data specific to the selected institution ID.
7. API keys can be generated, rotated, and revoked per environment.
8. API toggles can be switched on/off with confirmation.
9. All 10 detail tabs render meaningful content.
10. Table supports sorting by any column and paginated navigation.
