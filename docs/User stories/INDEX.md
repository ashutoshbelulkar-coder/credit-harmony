# HCB Platform — Epic & User Story Master Index

> **Version:** 1.0.2 | **Last Updated:** 2026-04-02 | **Status:** Living Document
>
> This index is the single source of truth for all epics and user stories in the HCB (Hybrid Credit Bureau) Admin Portal. Use it as a sprint-planning input, QA coverage checklist, and compliance audit reference.

---

## Platform Overview

The **Hybrid Credit Bureau (HCB) Admin Portal** is a React 18 SPA (Vite + TypeScript + Tailwind + shadcn/ui) backed by a Spring Boot API (port 8090) with SQLite in development and PostgreSQL in production. The platform is the **control plane** for a multi-institution credit bureau network, enabling bureau administrators to onboard member financial institutions, manage data products and consortiums, govern data quality, monitor API traffic, process batch credit data submissions, and run AI-powered schema mapping and identity resolution agents.

**Cross-cutting UI:** Platform-wide design tokens, accessibility, and badge conventions are tracked in **[EPIC-00 — Design System](./EPIC-00-Design-System-Cross-Cutting.md)** and [Design Guidelines](../design-guidelines.md).

| Epic | Purpose in One Sentence |
|------|------------------------|
| EPIC-00 Design System | Shared UI consistency: controls, badges, layout accessibility, and alignment with internal design guidelines (not a standalone product module). |
| EPIC-01 Authentication | Secure JWT-based login (optional Turnstile + email OTP MFA), token refresh, and role-gated access for all portal users. |
| EPIC-02 Institution Management | Full lifecycle management of member financial institutions from draft through active, including geography-driven registration, compliance documents, API keys, and billing. |
| EPIC-03 Consortium Management | Create and govern data-sharing consortiums, manage institutional and external CBS member references, and control data visibility policy. |
| EPIC-04 Data Products & Enquiry Simulation | Define, configure, and publish credit data products with packet-level field configuration, manage subscriptions, and simulate enquiry scoring against live products. |
| EPIC-05 Schema Mapper Agent | AI-assisted wizard for ingesting source schemas, mapping fields to the HCB canonical model, validating, versioning, and submitting mappings for governance approval. |
| EPIC-06 Data Governance | Operational data quality: monitor drift alerts, review auto-mapping suggestions, resolve consumer identity matches, maintain master schemas, and maintain the canonical field registry. |
| EPIC-07 Data Validation | Define and execute the rule engine that validates incoming data against FORMAT, RANGE, MANDATORY, CROSS_FIELD, DUPLICATE, and ENUM rules before storage. |
| EPIC-08 Approval Queue | Multi-type human-in-the-loop approval workflow for institutions, products, consortiums, alert rules, and schema mappings. |
| EPIC-09 Monitoring | Real-time operational observability: API request logs, enquiry logs, KPI snapshots, throughput/latency charts, and institution-scoped filtering. |
| EPIC-10 Alert Engine & SLA | Rule-driven alert creation, SLA threshold configuration, breach detection, incident lifecycle management, and auto-remediation stubs. |
| EPIC-11 Reporting | On-demand report generation (PDF/CSV/XLSX), status lifecycle management, and export for regulatory and operational reporting. |
| EPIC-12 User Management & RBAC | User invitation, role assignment, permissions matrix, account lifecycle, and platform activity log. |
| EPIC-13 Dashboard & Command Center | Executive KPI dashboard with API usage charts, data quality trends, active batch pipeline table, processing throughput, and anomaly feed. |
| EPIC-14 Batch Pipeline | Schemaless SFTP + HTTP bulk data ingestion pipeline: institutions drop files (CSV/JSON/XML/fixed-width) in their designated SFTP folder; auto-format detection, schema auto-mapping, all pipeline stages, full KPI tracking, and monitoring integration. |
| EPIC-15 Data Submission API | External-facing API-first platform for real-time tradeline submission by member institutions using API keys. |
| EPIC-16 Enquiry API | External-facing API-first platform for credit enquiry requests with consent validation, consumer profile fetch, product-level enrichment, and optional CBS `memberId` attribution. |
| EPIC-17 Agents | AI agent platform: agent catalogue, chat workspace, bureau operator tools, bank statement upload, and agent fleet monitoring. |
| EPIC-18 Identity Resolution Agent | Dedicated agent for cross-institution consumer identity deduplication via hash matching, confidence scoring, and resolution workflow. |

---

## Epic Summary Table

| Epic | Code | Module Name | Brief Description | Stories | Story Range | Doc Link | UI | API | DB |
|------|------|-------------|-------------------|---------|-------------|----------|----|-----|-----|
| EPIC-00 | DSYS | Design System (cross-cutting) | Tokens, badges, shell a11y, guideline remediation | — | — | [EPIC-00](./EPIC-00-Design-System-Cross-Cutting.md) | ✅ Partial | N/A | N/A |
| EPIC-01 | AUTH | Authentication & Session | JWT login, refresh, logout, /me, RBAC | 5 | AUTH-US-001–005 | [EPIC-01](./EPIC-01-Authentication-Session.md) | ✅ Implemented | ✅ Implemented | ✅ Implemented |
| EPIC-02 | INST | Institution / Member Management | Registration wizard, lifecycle, sub-tabs | 12 | INST-US-001–012 | [EPIC-02](./EPIC-02-Institution-Member-Management.md) | ✅ Implemented | ✅ Implemented | ✅ Implemented |
| EPIC-03 | CONS | Consortium Management | Create wizard, membership, governance | 7 | CONS-US-001–007 | [EPIC-03](./EPIC-03-Consortium-Management.md) | ✅ Implemented | ✅ Implemented | ✅ Implemented |
| EPIC-04 | PROD | Data Products & Enquiry Simulation | Catalog, configure, approve, simulate | 10 | PROD-US-001–010 | [EPIC-04](./EPIC-04-Data-Products-Packet-Configurator-Enquiry-Simulation.md) | ⚠️ Partial | ✅ Implemented | ✅ Implemented |
| EPIC-05 | SMAP | Schema Mapper Agent | AI wizard, registry, LLM, approval | 10 | SMAP-US-001–010 | [EPIC-05](./EPIC-05-Schema-Mapper-Agent.md) | ✅ Implemented | ✅ Implemented | ✅ Implemented |
| EPIC-06 | GOV | Data Governance | Drift, match review, canonical fields | 6 | GOV-US-001–006 | [EPIC-06](./EPIC-06-Data-Governance.md) | ✅ Implemented | ⚠️ Partial | ✅ Implemented |
| EPIC-07 | DVAL | Data Validation | Rule engine, FORMAT/RANGE/ENUM types | 6 | DVAL-US-001–006 | [EPIC-07](./EPIC-07-Data-Validation.md) | ⚠️ Partial | ⚠️ Partial | ✅ Implemented |
| EPIC-08 | APPQ | Approval Queue Workflow | Approve/reject/change-request, routing | 6 | APPQ-US-001–006 | [EPIC-08](./EPIC-08-Approval-Queue-Workflow.md) | ✅ Implemented | ✅ Implemented | ✅ Implemented |
| EPIC-09 | MON | Monitoring | KPIs, API log, enquiry log, charts | 7 | MON-US-001–007 | [EPIC-09](./EPIC-09-Monitoring.md) | ✅ Implemented | ✅ Implemented | ✅ Implemented |
| EPIC-10 | ALRT | Alert Engine & SLA | Alert rules, SLA, breach, incidents | 7 | ALRT-US-001–007 | [EPIC-10](./EPIC-10-Alert-Engine-SLA.md) | ⚠️ Partial | ✅ Implemented | ✅ Implemented |
| EPIC-11 | RPT | Reporting | Report request, queue, export | 5 | RPT-US-001–005 | [EPIC-11](./EPIC-11-Reporting.md) | ✅ Implemented | ✅ Implemented | ✅ Implemented |
| EPIC-12 | USR | User Management & RBAC | Invite, roles, permissions, activity log | 7 | USR-US-001–007 | [EPIC-12](./EPIC-12-User-Management-RBAC.md) | ✅ Implemented | ✅ Implemented | ✅ Implemented |
| EPIC-13 | DASH | Dashboard & Command Center | KPI row, charts, pipeline, anomaly feed | 6 | DASH-US-001–006 | [EPIC-13](./EPIC-13-Dashboard-Command-Center.md) | ⚠️ Partial | ✅ Implemented | ✅ Implemented |
| EPIC-14 | BATCH | Batch Pipeline (non-UI) | Schemaless SFTP + HTTP intake → format detection → schema auto-mapping → all stages → KPI tracking | 13 | BATCH-US-001–013 | [EPIC-14](./EPIC-14-Batch-Pipeline.md) | N/A | ⚠️ Partial | ⚠️ Partial |
| EPIC-15 | DSAPI | Data Submission API | API-first real-time tradeline submission | 7 | DSAPI-US-001–007 | [EPIC-15](./EPIC-15-Data-Submission-API.md) | N/A | ❌ Missing | ✅ Implemented |
| EPIC-16 | ENQ | Enquiry API | API-first credit enquiry with consent | 7 | ENQ-US-001–007 | [EPIC-16](./EPIC-16-Enquiry-API.md) | N/A | ❌ Missing | ✅ Implemented |
| EPIC-17 | AGNT | Agents | Agent catalogue, workspace, bureau ops | 8 | AGNT-US-001–008 | [EPIC-17](./EPIC-17-Agents.md) | ⚠️ Partial | ❌ Missing | ❌ Missing |
| EPIC-18 | IDRES | Identity Resolution Agent | Dedup, hash matching, resolution | 7 | IDRES-US-001–007 | [EPIC-18](./EPIC-18-Identity-Resolution-Agent.md) | ⚠️ Partial | ❌ Missing | ⚠️ Partial |

---

## Per-Epic Story Roster

### EPIC-01 — Authentication & Session (AUTH)

> Bureau administrators, analysts, and API users authenticate via JWT. Access tokens are stored in memory; refresh tokens in sessionStorage. All protected routes check role via Spring `@PreAuthorize`.

| Story ID | Title | As a… I want to… So that… | API Endpoint | Primary Table | Priority | Status |
|----------|-------|---------------------------|--------------|---------------|----------|--------|
| AUTH-US-001 | Log In with Email and Password | As a bureau admin, I want to log in with my credentials so that I can access the portal. | `POST /api/v1/auth/login` | `users`, `refresh_tokens` | P0 | ✅ Implemented |
| AUTH-US-002 | Silent Token Refresh | As a logged-in user, I want my session to refresh silently so that I am not interrupted during active work. | `POST /api/v1/auth/refresh` | `refresh_tokens` | P0 | ✅ Implemented |
| AUTH-US-003 | Logout and Session Termination | As a user, I want to log out so that my session is securely terminated and refresh token revoked. | `POST /api/v1/auth/logout` | `refresh_tokens` | P0 | ✅ Implemented |
| AUTH-US-004 | Get Current User Profile | As a logged-in user, I want to retrieve my profile and roles so that the UI can personalize my experience. | `GET /api/v1/auth/me` | `users`, `user_role_assignments` | P0 | ✅ Implemented |
| AUTH-US-005 | Role-Based Access Control Gate | As a bureau admin, I want unauthorized users to be blocked from restricted pages so that data security is enforced. | All protected endpoints | `roles`, `permissions`, `role_permissions` | P0 | ✅ Implemented |
| AUTH-US-006 | CAPTCHA + Email OTP (MFA) | As a security-conscious operator, I want bot resistance and a second factor for high-privilege accounts so that portal access is harder to abuse. | `POST /api/v1/auth/login`, `POST …/mfa/verify`, `POST …/mfa/resend` | `users.mfa_enabled`, `mfa_login_challenges` | P0 | ✅ Implemented (dummy OTP + log stub in dev) |

---

### EPIC-02 — Institution / Member Management (INST)

> The longest epic. Covers the full lifecycle of a member institution from draft registration through active participation, including the geography-driven wizard, compliance documents, and all detail sub-tabs.

| Story ID | Title | As a… I want to… So that… | API Endpoint | Primary Table | Priority | Status |
|----------|-------|---------------------------|--------------|---------------|----------|--------|
| INST-US-001 | Register New Member Institution (Wizard Steps 1–3) | As a bureau admin, I want to complete a multi-step registration form so that a new institution is onboarded. | `POST /api/v1/institutions` | `institutions` | P0 | ✅ Implemented |
| INST-US-002 | Geography-Driven Form Configuration | As a bureau admin, I want the registration form fields to adapt to the selected geography so that only relevant data is collected. | `GET /api/v1/institutions/form-metadata?geography=` | `institutions` | P0 | ✅ Implemented |
| INST-US-003 | Upload Compliance Documents | As a bureau admin, I want to upload required compliance documents so that the institution meets regulatory requirements. | `POST /api/v1/institutions/:id/documents` | `compliance_documents` | P0 | ✅ Implemented |
| INST-US-004 | View and Search Institution List | As a bureau admin, I want to browse and filter the member list so that I can quickly find and manage institutions. | `GET /api/v1/institutions` | `institutions` | P0 | ✅ Implemented |
| INST-US-005 | View Institution Detail and Overview Charts | As a bureau admin, I want to see an institution's activity charts so that I understand its API usage and data quality. | `GET /api/v1/institutions/:id`, `GET /api/v1/institutions/:id/overview-charts` | `institutions`, `api_requests` | P1 | ✅ Implemented |
| INST-US-006 | Manage Institution Lifecycle (Activate / Suspend / Deactivate) | As a bureau admin, I want to change an institution's lifecycle status so that access is controlled appropriately. | `PATCH /api/v1/institutions/:id/status` | `institutions` | P0 | ✅ Implemented |
| INST-US-007 | Manage API Access Configuration | As a bureau admin, I want to enable or disable API access for an institution so that only authorized institutions submit data. | `GET/PATCH /api/v1/institutions/:id/api-access` | `institutions`, `api_keys` | P1 | ✅ Implemented |
| INST-US-008 | Manage Consent Configuration | As a bureau admin, I want to configure consent settings for an institution so that AA-compliant data sharing is enforced. | `GET/PATCH /api/v1/institutions/:id/consent` | `institutions` | P1 | ✅ Implemented |
| INST-US-009 | View Product Subscriptions Tab | As a bureau admin, I want to see which products an institution subscribes to so that I can manage entitlements. | `GET /api/v1/institutions/:id/product-subscriptions` | `product_subscriptions` | P1 | ✅ Implemented |
| INST-US-010 | View Consortium Memberships Tab | As a bureau admin, I want to see consortium memberships for an institution so that I understand its data-sharing relationships. | `GET /api/v1/institutions/:id/consortium-memberships` | `consortium_members` | P1 | ✅ Implemented |
| INST-US-011 | View Monitoring Tab for Institution | As a bureau admin, I want to see API and batch activity for a specific institution so that I can identify issues. | `GET /api/v1/institutions/:id/monitoring-summary` | `api_requests`, `batch_jobs` | P1 | ✅ Implemented |
| INST-US-012 | View Billing Tab | As a bureau admin, I want to see an institution's credit balance and billing model so that I can manage financial relationships. | `GET /api/v1/institutions/:id/billing` | `institutions` | P2 | ⚠️ Partial |

---

### EPIC-03 — Consortium Management (CONS)

> Consortiums are groups of institutions that agree to share credit data under defined governance policies. This epic covers creation, membership, and lifecycle management.

| Story ID | Title | As a… I want to… So that… | API Endpoint | Primary Table | Priority | Status |
|----------|-------|---------------------------|--------------|---------------|----------|--------|
| CONS-US-001 | Create Consortium via Wizard | As a bureau admin, I want to create a consortium through a guided wizard so that data-sharing groups are correctly configured. | `POST /api/v1/consortiums` | `consortiums` | P0 | ✅ Implemented |
| CONS-US-002 | View Consortium List | As a bureau admin, I want to browse active and pending consortiums so that I can manage them. | `GET /api/v1/consortiums` | `consortiums` | P0 | ✅ Implemented |
| CONS-US-003 | View Consortium Detail | As a bureau admin, I want to see consortium details and data policy settings so that I understand its configuration. | `GET /api/v1/consortiums/:id` | `consortiums` | P1 | ✅ Implemented |
| CONS-US-004 | Add Member Institution to Consortium | As a bureau admin, I want to add a subscriber institution as a consortium member so that it can participate in data sharing. | `POST /api/v1/consortiums/:id/members` | `consortium_members` | P0 | ✅ Implemented |
| CONS-US-005 | Manage Member Role in Consortium | As a bureau admin, I want to assign Contributor, Consumer, or Observer roles to members so that data access is appropriately restricted. | `PATCH /api/v1/consortiums/:id/members/:memberId` | `consortium_members` | P1 | ✅ Implemented |
| CONS-US-006 | Suspend or Exit a Consortium Member | As a bureau admin, I want to suspend or remove a member from a consortium so that non-compliant institutions are excluded. | `DELETE /api/v1/consortiums/:id/members/:memberId` | `consortium_members` | P1 | ✅ Implemented |
| CONS-US-007 | Dissolve a Consortium | As a bureau admin, I want to dissolve an inactive consortium so that it is cleanly archived. | `PATCH /api/v1/consortiums/:id/status` | `consortiums` | P2 | ✅ Implemented |

---

### EPIC-04 — Data Products, Packet Configurator & Enquiry Simulation (PROD)

> Data products define what credit data can be queried and by whom. This epic covers product creation, packet-level configuration via the PacketConfigModal, approval, subscription management, and simulating an enquiry against a product.

| Story ID | Title | As a… I want to… So that… | API Endpoint | Primary Table | Priority | Status |
|----------|-------|---------------------------|--------------|---------------|----------|--------|
| PROD-US-001 | Browse the Data Product Catalog | As a bureau admin, I want to see all available and pending products so that I can manage the catalogue. | `GET /api/v1/products` | `products` | P0 | ✅ Implemented |
| PROD-US-002 | Create a New Data Product | As a bureau admin, I want to define a new data product with coverage scope and pricing model so that it can be offered to members. | `POST /api/v1/products` | `products` | P0 | ✅ Implemented |
| PROD-US-003 | Browse the Packet Catalogue | As a bureau admin, I want to see available source-type packets so that I can select the right data inputs for a product. | `GET /api/v1/products/packet-catalog` | `products` | P0 | ✅ Implemented |
| PROD-US-004 | Configure Packet for a Data Product | As a bureau admin, I want to configure raw, derived, and source fields for each packet so that the product delivers the right data. | `PacketConfigModal` (UI), `GET /api/v1/schema-mapper/schemas/source-type-fields` | `products` | P0 | ✅ Implemented |
| PROD-US-005 | Submit Product for Approval | As a bureau admin, I want to submit a product for approval so that it goes through the governance workflow before going live. | `POST /api/v1/products` with `approval_pending` | `products`, `approval_queue` | P0 | ✅ Implemented |
| PROD-US-006 | View Product Detail | As a bureau admin, I want to see full product configuration so that I can audit or update it. | `GET /api/v1/products/:id` | `products` | P1 | ✅ Implemented |
| PROD-US-007 | Subscribe an Institution to a Product | As a bureau admin, I want to subscribe a member institution to a product so that it can use it for enquiries. | `POST /api/v1/institutions/:id/product-subscriptions` | `product_subscriptions` | P0 | ✅ Implemented |
| PROD-US-008 | Deprecate or Edit a Product | As a bureau admin, I want to deprecate an outdated product so that members are migrated to newer versions. | `PATCH /api/v1/products/:id` | `products` | P2 | ✅ Implemented |
| PROD-US-009 | Configure Enquiry Simulation Parameters | As a bureau admin, I want to configure simulation parameters (consumer profile, product, institution) so that I can test product behaviour before go-live. | `EnquirySimulationPage.tsx` (UI stub) | `products`, `enquiries` | P1 | ⚠️ Partial |
| PROD-US-010 | Run Enquiry Simulation and View Scored Output | As a bureau admin, I want to execute a simulated enquiry and see the scored response so that I can validate product configuration. | `POST /api/v1/enquiries/simulate` (missing) | `enquiries`, `consumers`, `credit_profiles` | P1 | ❌ Missing |

---

### EPIC-05 — Schema Mapper Agent (SMAP)

> The Schema Mapper Agent is a multi-step wizard that uses heuristics and optional LLM (OpenAI) to map source institution schemas to the HCB canonical model. Mappings go through version control and approval.

| Story ID | Title | As a… I want to… So that… | API Endpoint | Primary Table | Priority | Status |
|----------|-------|---------------------------|--------------|---------------|----------|--------|
| SMAP-US-001 | Ingest Source Schema File | As a bureau admin, I want to upload a source schema so that the mapping wizard can parse its fields. | `POST /api/v1/schema-mapper/ingest` | `schema_mapper_raw_data`, `schema_mapper_registry` | P0 | ✅ Implemented |
| SMAP-US-002 | Define Source in Wizard (Step 1) | As a bureau admin, I want to specify source name, type, and source name (institution picker) so that the schema is correctly attributed. | `GET /api/v1/schema-mapper/wizard-metadata` | `schema_mapper_registry` | P0 | ✅ Implemented |
| SMAP-US-003 | Run AI/LLM Field Mapping (Step 2) | As a bureau admin, I want the system to automatically suggest field mappings using AI so that manual effort is minimised. | `POST /api/v1/schema-mapper/mappings` (async, 202) | `schema_mapper_mapping` | P0 | ✅ Implemented |
| SMAP-US-004 | Review and Edit Field Mappings (Step 3) | As a bureau admin, I want to review AI-suggested mappings and correct any errors so that data quality is maintained. | `GET/PATCH /api/v1/schema-mapper/mappings/:id` | `schema_mapper_mapping` | P0 | ✅ Implemented |
| SMAP-US-005 | LLM Field Intelligence and PII Detection | As a bureau admin, I want the system to flag PII fields automatically so that sensitive data is handled appropriately. | `PATCH /api/v1/schema-mapper/mappings/:id` (`containsPii`) | `schema_mapper_mapping` | P1 | ✅ Implemented |
| SMAP-US-006 | Configure Validation Rules in Wizard (Step 4) | As a bureau admin, I want to attach validation rules to mapped fields so that incoming data is validated on ingestion. | `POST /api/v1/schema-mapper/rules` | `schema_mapper_validation_rule` | P1 | ✅ Implemented |
| SMAP-US-007 | Set Storage Visibility and Categories (Step 5) | As a bureau admin, I want to configure which mapped fields are stored and their visibility level so that data governance is enforced. | `PATCH /api/v1/schema-mapper/mappings/:id/storage` | `schema_mapper_mapping` | P1 | ✅ Implemented |
| SMAP-US-008 | Reconcile Enum Values | As a bureau admin, I want to map source enum values to canonical equivalents so that data is normalised on ingestion. | `EnumReconciliationDrawer` (UI), `PATCH mappings/:id` | `schema_mapper_mapping` | P1 | ✅ Implemented |
| SMAP-US-009 | Submit Schema Mapping for Approval | As a bureau admin, I want to submit a completed mapping for governance review so that it goes through the approval workflow. | `POST /api/v1/schema-mapper/submit-approval` | `approval_queue`, `schema_mapper_mapping` | P0 | ✅ Implemented |
| SMAP-US-010 | View Schema Registry and Monitor Drift | As a bureau admin, I want to browse the schema registry and see drift alerts so that I know when source schemas have changed. | `GET /api/v1/schema-mapper/schemas`, `GET /api/v1/schema-mapper/drift` | `schema_mapper_registry`, `schema_mapper_drift_log` | P1 | ✅ Implemented |

---

### EPIC-06 — Data Governance (GOV)

> Data governance covers the operational quality layer: monitoring drift in incoming data, reviewing auto-mapping suggestions, resolving consumer identity matches, maintaining canonical field definitions, and viewing the governance audit log.

| Story ID | Title | As a… I want to… So that… | API Endpoint | Primary Table | Priority | Status |
|----------|-------|---------------------------|--------------|---------------|----------|--------|
| GOV-US-001 | View Data Governance Dashboard | As a data analyst, I want an overview of data quality health across members so that I can prioritise governance actions. | `GET /api/v1/data-ingestion/drift-alerts` (aggregated) | `ingestion_drift_alerts` | P0 | ✅ Implemented |
| GOV-US-002 | View and Filter Drift Alerts | As a data analyst, I want to filter drift alerts by source type, date range, and severity so that I can investigate specific issues. | `GET /api/v1/data-ingestion/drift-alerts` | `ingestion_drift_alerts` | P0 | ✅ Implemented |
| GOV-US-003 | Review Auto-Mapping Suggestions | As a data analyst, I want to approve or reject auto-generated field mapping suggestions so that the canonical model stays accurate. | `GET/PATCH /api/v1/schema-mapper/mappings` | `schema_mapper_mapping` | P1 | ✅ Implemented |
| GOV-US-004 | Review Consumer Identity Match Results | As a data analyst, I want to review potential duplicate consumer records so that the bureau database remains deduplicated. | `MatchReview.tsx` (UI stub) | `consumers` | P1 | ⚠️ Partial |
| GOV-US-005 | Manage Canonical Field Registry | As a bureau admin, I want to view and update canonical field definitions so that the master schema reflects business requirements. | `GET /api/v1/schema-mapper/canonical` | `canonical_fields` | P1 | ✅ Implemented |
| GOV-US-006 | View Governance Audit Logs | As a compliance officer, I want to see all data governance actions so that I can produce audit evidence. | `GET /api/v1/audit-logs` | `audit_logs` | P0 | ✅ Implemented |
| GOV-US-007 | Manage Data Policy (Product Masking) | As a bureau admin, I want to configure which masked fields can be unmasked per product so that data exposure is controlled and auditable. | `GET/POST /api/v1/data-policy` | `data_policies`, `audit_logs` | P0 | ✅ Implemented |

---

### EPIC-07 — Data Validation (DVAL)

> Standalone rule engine for validating incoming data. Rules are defined against canonical fields, assigned severity, and executed as data flows through ingestion and batch pipeline stages.

| Story ID | Title | As a… I want to… So that… | API Endpoint | Primary Table | Priority | Status |
|----------|-------|---------------------------|--------------|---------------|----------|--------|
| DVAL-US-001 | View All Validation Rules | As a data analyst, I want to see all active and inactive validation rules so that I can manage the validation configuration. | `GET /api/v1/validation-rules` (missing) | `validation_rules` | P0 | ⚠️ Partial |
| DVAL-US-002 | Create a FORMAT or RANGE Validation Rule | As a data analyst, I want to define format and range constraints on canonical fields so that data quality is enforced at ingestion. | `POST /api/v1/validation-rules` (missing) | `validation_rules` | P0 | ❌ Missing |
| DVAL-US-003 | Create MANDATORY, CROSS_FIELD, DUPLICATE, or ENUM Rule | As a data analyst, I want to define complex validation rules so that structural and referential data quality is enforced. | `POST /api/v1/validation-rules` (missing) | `validation_rules` | P0 | ❌ Missing |
| DVAL-US-004 | Activate or Deactivate a Validation Rule | As a data analyst, I want to toggle rule status so that I can safely test new rules without impacting production ingestion. | `PATCH /api/v1/validation-rules/:id` (missing) | `validation_rules` | P1 | ❌ Missing |
| DVAL-US-005 | Test a Validation Rule Against Sample Data | As a data analyst, I want to dry-run a rule against a sample payload so that I can validate its expression before activating. | `POST /api/v1/validation-rules/:id/test` (missing) | `validation_rules` | P1 | ❌ Missing |
| DVAL-US-006 | View Validation Rule Execution Results | As a data analyst, I want to see which records failed which rules during ingestion so that I can investigate data quality failures. | `GET /api/v1/batch-jobs/:id/validation-results` (missing) | `batch_records`, `validation_rules` | P1 | ❌ Missing |

---

### EPIC-08 — Approval Queue Workflow (APPQ)

> Single queue for all approval-required actions across the platform: institution registration, product creation, consortium creation, schema mapping submission, and alert rule creation. Actions return 204 No Content.

| Story ID | Title | As a… I want to… So that… | API Endpoint | Primary Table | Priority | Status |
|----------|-------|---------------------------|--------------|---------------|----------|--------|
| APPQ-US-001 | View the Approval Queue with Filters | As a bureau admin, I want to see all pending approval items filtered by type and date so that I can prioritise reviews. | `GET /api/v1/approvals` | `approval_queue` | P0 | ✅ Implemented |
| APPQ-US-002 | Approve an Item | As a bureau admin, I want to approve a pending item so that the underlying entity becomes active. | `POST /api/v1/approvals/:id/approve` | `approval_queue` | P0 | ✅ Implemented |
| APPQ-US-003 | Reject an Item with a Reason | As a bureau admin, I want to reject an item with a written reason so that the submitter understands what needs to change. | `POST /api/v1/approvals/:id/reject` | `approval_queue` | P0 | ✅ Implemented |
| APPQ-US-004 | Request Changes on an Item | As a bureau admin, I want to request changes on a pending item so that the submitter can correct it without full rejection. | `POST /api/v1/approvals/:id/request-changes` | `approval_queue` | P1 | ✅ Implemented |
| APPQ-US-005 | Navigate to Entity Detail from Approval Item | As a bureau admin, I want to click through from an approval item to the underlying entity so that I can review full context. | `metadata.institutionId / productId / consortiumId / mappingId / alertRuleId` | `approval_queue` | P1 | ✅ Implemented |
| APPQ-US-006 | View Approval History Timeline | As a compliance officer, I want to see the full approval history for any entity so that I can produce audit evidence. | `GET /api/v1/approvals?entityRefId=` | `approval_queue`, `audit_logs` | P1 | ⚠️ Partial |

---

### EPIC-09 — Monitoring (MON)

> Operational observability over the live API layer. Covers KPI snapshots, paginated API request logs, enquiry logs, throughput/latency charts, institution-scoped filters, and status normalization (lowercase from Spring).

| Story ID | Title | As a… I want to… So that… | API Endpoint | Primary Table | Priority | Status |
|----------|-------|---------------------------|--------------|---------------|----------|--------|
| MON-US-001 | View Monitoring KPI Snapshot | As a bureau admin, I want a real-time KPI summary (total calls, success rate, P95 latency, active keys) so that I can assess platform health at a glance. | `GET /api/v1/monitoring/kpis` | `api_requests`, `api_keys` | P0 | ✅ Implemented |
| MON-US-002 | View and Filter API Request Log | As a bureau admin, I want to browse API requests filtered by status, date range, and institution so that I can investigate failures. | `GET /api/v1/monitoring/api-requests` | `api_requests` | P0 | ✅ Implemented |
| MON-US-003 | View API Request Detail Drawer | As a bureau admin, I want to expand a single request and see all its attributes so that I can diagnose specific failures. | `GET /api/v1/monitoring/api-requests/:id` | `api_requests` | P1 | ✅ Implemented |
| MON-US-004 | View and Filter Enquiry Log | As a bureau admin, I want to browse enquiry records filtered by type, status, and date so that I can audit credit queries. | `GET /api/v1/monitoring/enquiries` | `enquiries` | P0 | ✅ Implemented |
| MON-US-005 | View Enquiry Detail Drawer | As a bureau admin, I want to expand a single enquiry and see consumer, product, and consent details so that I can audit it. | `GET /api/v1/monitoring/enquiries/:id` | `enquiries` | P1 | ✅ Implemented |
| MON-US-006 | View Throughput and Latency Charts | As a bureau admin, I want charts of API volume, latency distribution, and success rate over time so that I can spot trends. | `GET /api/v1/monitoring/charts` | `api_requests` | P1 | ✅ Implemented |
| MON-US-007 | Filter Monitoring by Institution and Date Range | As a bureau admin, I want to scope all monitoring views to a specific institution and time window so that per-member performance is visible. | `GET /api/v1/monitoring/api-requests?institutionId=` | `api_requests`, `enquiries` | P1 | ✅ Implemented |

---

### EPIC-10 — Alert Engine & SLA (ALRT)

> Rule-driven alert platform. Alert rules evaluate metrics and fire incidents. SLA thresholds define acceptable performance boundaries. Incidents follow an active → acknowledged → resolved lifecycle.

| Story ID | Title | As a… I want to… So that… | API Endpoint | Primary Table | Priority | Status |
|----------|-------|---------------------------|--------------|---------------|----------|--------|
| ALRT-US-001 | View Alert Monitoring Dashboard | As a bureau admin, I want to see all active incidents, their severity, and recent alert charts so that I can triage issues quickly. | `GET /api/v1/alert-incidents`, `GET /api/v1/alert-rules` | `alert_incidents`, `alert_rules` | P0 | ⚠️ Partial |
| ALRT-US-002 | Create an Alert Rule | As a bureau admin, I want to define a metric condition and severity for a new alert rule so that automatic monitoring is set up. | `POST /api/v1/alert-rules` | `alert_rules` | P0 | ✅ Implemented |
| ALRT-US-003 | Activate or Disable an Alert Rule | As a bureau admin, I want to toggle rule activation so that I can enable monitoring without deleting rules. | `POST /api/v1/alert-rules/:id/activate` | `alert_rules` | P0 | ✅ Implemented |
| ALRT-US-004 | Configure an SLA Threshold | As a bureau admin, I want to define SLA thresholds for metrics like API latency and batch processing time so that breach detection is automated. | `POST /api/v1/sla-configs` | `sla_configs` | P1 | ✅ Implemented |
| ALRT-US-005 | View SLA Breach History | As a bureau admin, I want to see a timeline of past SLA breaches so that I can identify recurring performance issues. | `GET /api/v1/sla-configs/breaches` | `sla_breaches`, `sla_configs` | P1 | ✅ Implemented |
| ALRT-US-006 | Acknowledge and Resolve an Alert Incident | As a bureau admin, I want to acknowledge and then resolve an active incident so that the lifecycle is tracked. | `POST /api/v1/alert-incidents/:id/acknowledge`, `/resolve` | `alert_incidents` | P0 | ✅ Implemented |
| ALRT-US-007 | Configure Auto-Remediation Settings | As a bureau admin, I want to define automated responses to recurring alert conditions so that manual intervention is reduced. | `AutoRemediationSettings.tsx` (UI stub) | `alert_rules` | P2 | ❌ Missing |

---

### EPIC-11 — Reporting (RPT)

> On-demand report generation for operational and regulatory use. Reports are queued, processed asynchronously, and made available for download in PDF, CSV, or XLSX format.

| Story ID | Title | As a… I want to… So that… | API Endpoint | Primary Table | Priority | Status |
|----------|-------|---------------------------|--------------|---------------|----------|--------|
| RPT-US-001 | Request a New Report | As a bureau admin, I want to submit a report request with type, date range, and format so that it is queued for generation. | `POST /api/v1/reports` | `reports` | P0 | ✅ Implemented |
| RPT-US-002 | View Report List with Filters | As a bureau admin, I want to browse submitted reports filtered by type, status, and date so that I can track progress. | `GET /api/v1/reports` | `reports` | P0 | ✅ Implemented |
| RPT-US-003 | Cancel a Queued Report | As a bureau admin, I want to cancel a report that is queued or processing so that unnecessary computation is avoided. | `POST /api/v1/reports/:id/cancel` | `reports` | P1 | ✅ Implemented |
| RPT-US-004 | Retry a Failed Report | As a bureau admin, I want to retry a failed report so that I can recover from transient processing errors. | `POST /api/v1/reports/:id/retry` | `reports` | P1 | ✅ Implemented |
| RPT-US-005 | Download a Completed Report | As a bureau admin, I want to download a completed report in my chosen format so that I can use it for regulatory submission or analysis. | `GET /api/v1/reports/:id/download` | `reports` | P0 | ⚠️ Partial |

---

### EPIC-12 — User Management & RBAC (USR)

> Covers the full user lifecycle from invitation through suspension, role management, and the permissions matrix. The activity log (audit trail) provides compliance evidence for all user actions.

| Story ID | Title | As a… I want to… So that… | API Endpoint | Primary Table | Priority | Status |
|----------|-------|---------------------------|--------------|---------------|----------|--------|
| USR-US-001 | View User List | As a bureau admin, I want to browse all platform users with their status and roles so that I can manage access. | `GET /api/v1/users` | `users` | P0 | ✅ Implemented |
| USR-US-002 | Invite a New User | As a bureau admin, I want to send an invitation to a new user with an assigned role so that they can access the portal. | `POST /api/v1/users/invite` | `users`, `user_role_assignments` | P0 | ✅ Implemented |
| USR-US-003 | View User Detail and Assign Roles | As a bureau admin, I want to view a user's profile and manage their role assignments so that access is correct. | `GET /api/v1/users/:id`, `POST /api/v1/users/:id/roles` | `users`, `user_role_assignments` | P0 | ✅ Implemented |
| USR-US-004 | Suspend or Reactivate a User | As a bureau admin, I want to suspend or reactivate a user account so that access is revoked or restored promptly. | `PATCH /api/v1/users/:id/status` | `users` | P0 | ✅ Implemented |
| USR-US-005 | View Roles and Permissions Matrix | As a bureau admin, I want to see all roles and their permission assignments so that I understand what each role can do. | `GET /api/v1/roles` | `roles`, `permissions`, `role_permissions` | P1 | ✅ Implemented |
| USR-US-006 | View Platform Activity Log | As a compliance officer, I want to see all user actions with timestamps and IP hashes so that I have a complete audit trail. | `GET /api/v1/audit-logs` | `audit_logs` | P0 | ✅ Implemented |
| USR-US-007 | Filter and Search Activity Log | As a compliance officer, I want to filter activity logs by user, action type, entity, and date so that I can investigate specific events. | `GET /api/v1/audit-logs?actionType=&userId=` | `audit_logs` | P1 | ✅ Implemented |

---

### EPIC-13 — Dashboard & Command Center (DASH)

> Executive operational dashboard providing a real-time view of platform health, data quality trends, active batch pipelines, processing throughput, and an anomaly feed. Viewer role has read-only access.

| Story ID | Title | As a… I want to… So that… | API Endpoint | Primary Table | Priority | Status |
|----------|-------|---------------------------|--------------|---------------|----------|--------|
| DASH-US-001 | View Platform KPI Row | As a bureau admin, I want to see headline KPIs (total calls, success rate, active members, pending approvals) so that I have a real-time health check. | `GET /api/v1/dashboard/snapshot` | `api_requests`, `institutions` | P0 | ✅ Implemented |
| DASH-US-002 | View API Usage and Data Quality Charts | As a bureau admin, I want time-series charts of API volume and data quality scores so that I can identify degrading trends. | `GET /api/v1/dashboard/charts` | `api_requests`, `institutions` | P1 | ✅ Implemented |
| DASH-US-003 | View Active Batch Pipeline Table | As a bureau admin, I want to see all currently running batch jobs and their stage progress so that I can monitor ingestion health. | `GET /api/v1/batch-jobs?status=processing` | `batch_jobs`, `batch_phase_logs` | P0 | ⚠️ Partial |
| DASH-US-004 | View Processing Throughput Card | As a bureau admin, I want to see records processed per hour across all members so that I know if throughput is degrading. | `GET /api/v1/dashboard/throughput` | `batch_jobs`, `api_requests` | P1 | ⚠️ Partial |
| DASH-US-005 | View Anomaly Feed | As a bureau admin, I want to see a real-time feed of detected anomalies so that I can react to unexpected patterns quickly. | `GET /api/v1/dashboard/anomalies` (mock) | `alert_incidents` | P1 | ⚠️ Partial |
| DASH-US-006 | Export Dashboard Data as CSV | As a bureau admin, I want to download the current dashboard data as CSV so that I can share it with stakeholders. | Client-side CSV export | `api_requests`, `institutions` | P2 | ✅ Implemented |

---

### EPIC-14 — Batch Pipeline (BATCH) — Non-UI

> Schemaless SFTP + HTTP bulk data ingestion pipeline. Member institutions drop files (CSV, JSON, JSONL, fixed-width, XML) in their designated SFTP folder; the platform auto-detects the format, resolves the institution's approved schema mapping, processes all pipeline stages, and tracks every tracking point for monitoring KPI visibility.

| Story ID | Title | As a… I want to… So that… | API / Trigger | Primary Table | Priority | Status |
|----------|-------|---------------------------|---------------|---------------|----------|--------|
| BATCH-US-001 | Batch File Arrival and Intake (HTTP) | As a member institution system, I want to submit a batch file via HTTP POST so that the bureau can process my credit data. | `POST /api/v1/batch-jobs` (multipart) | `batch_jobs` | P0 | ✅ Implemented |
| BATCH-US-002 | Schema Detection Stage | As the pipeline, I want to detect the source schema of the submitted file so that the correct field mapping is applied. | Internal pipeline stage | `batch_jobs`, `schema_mapper_registry` | P0 | ⚠️ Partial |
| BATCH-US-003 | Field Validation Stage | As the pipeline, I want to validate every record against the configured validation rules so that only quality data proceeds. | Internal pipeline stage | `batch_phase_logs`, `validation_rules` | P0 | ✅ Implemented |
| BATCH-US-004 | Field Mapping Stage | As the pipeline, I want to map source fields to canonical fields using the approved schema mapping so that data is normalised. | Internal pipeline stage | `batch_phase_logs`, `mapping_pairs` | P0 | ✅ Implemented |
| BATCH-US-005 | Data Transformation Stage | As the pipeline, I want to apply transformations (PII encryption, type casting, normalisation) so that data meets storage standards. | Internal pipeline stage | `batch_stage_logs` | P0 | ⚠️ Partial |
| BATCH-US-006 | Data Load Stage | As the pipeline, I want to insert validated and mapped records into tradelines and consumers so that data is durably stored. | Internal pipeline stage | `tradelines`, `consumers`, `credit_profiles` | P0 | ✅ Implemented |
| BATCH-US-007 | Phase and Stage Logging | As an operations engineer, I want every pipeline phase and stage to be logged with status, timing, and record counts so that the execution console has full visibility. | Internal, writes to DB | `batch_phase_logs`, `batch_stage_logs`, `batch_error_samples` | P0 | ✅ Implemented |
| BATCH-US-008 | Retry a Failed Batch Job | As a member institution operator, I want to retry a failed batch job so that transient failures are recoverable. | `POST /api/v1/batch-jobs/:id/retry` | `batch_jobs` | P1 | ✅ Implemented |
| BATCH-US-009 | Cancel an In-Progress Batch Job | As a bureau admin, I want to cancel an in-progress batch job so that erroneous submissions are stopped before full load. | `POST /api/v1/batch-jobs/:id/cancel` | `batch_jobs` | P1 | ✅ Implemented |
| BATCH-US-010 | SFTP File Drop and Auto-Detection | As a member institution, I want to place a data file in my designated SFTP folder so that the bureau automatically picks it up and begins processing without any API call. | `SftpPollerService` (scheduled) | `batch_sftp_events`, `batch_jobs` | P0 | ❌ Missing |
| BATCH-US-011 | Multi-Format File Parsing | As the pipeline, I want to parse files in CSV, JSON, JSONL, fixed-width, and XML formats so that member institutions can submit in their native format. | Internal pipeline stage | `batch_sftp_events`, `batch_stage_logs` | P0 | ❌ Missing |
| BATCH-US-012 | Schema Auto-Detection and Mapping Resolution | As the pipeline, I want to automatically resolve the correct schema mapping for a submitted file even when no sourceType is provided so that members do not need to tag their files. | Internal pipeline stage | `batch_jobs`, `schema_mapper_registry` | P0 | ❌ Missing |
| BATCH-US-013 | Batch Job Tracking and Monitoring KPI Integration | As an operations engineer, I want every batch job's full lifecycle tracked with granular metrics so that monitoring dashboards have real-time KPI data from batch processing. | Internal, writes to DB | `batch_tracking_snapshots`, `batch_jobs`, `batch_sftp_events` | P0 | ❌ Missing |

---

### EPIC-15 — Data Submission API (DSAPI) — API-First

> External-facing platform API for real-time tradeline submission by authenticated member institutions. No UI. Full lifecycle from API key authentication through record validation, processing, storage, and acknowledgement.

| Story ID | Title | As a… I want to… So that… | API Endpoint | Primary Table | Priority | Status |
|----------|-------|---------------------------|--------------|---------------|----------|--------|
| DSAPI-US-001 | Authenticate with API Key | As a member institution system, I want to authenticate using my API key so that my submissions are authorised and attributed. | Header: `X-API-Key` | `api_keys`, `institutions` | P0 | ✅ Implemented |
| DSAPI-US-002 | Submit a Single Tradeline Record | As a member institution system, I want to POST a single tradeline payload so that it is ingested in real time. | `POST /api/v1/data/submit` (missing) | `api_requests`, `tradelines` | P0 | ❌ Missing |
| DSAPI-US-003 | Validate Submitted Payload | As the API, I want to reject malformed or incomplete payloads with field-level error messages so that submitters can correct their data. | `POST /api/v1/data/submit` validation layer | `validation_rules` | P0 | ❌ Missing |
| DSAPI-US-004 | Process and Store Tradeline | As the API, I want to map and store a validated tradeline so that it is available for future enquiries. | Internal processing | `tradelines`, `consumers`, `credit_profiles` | P0 | ❌ Missing |
| DSAPI-US-005 | Submission Lifecycle States | As a member institution, I want to receive a correlation ID and poll for submission status so that I know when processing completes. | `GET /api/v1/data/submit/:correlationId/status` (missing) | `api_requests` | P0 | ❌ Missing |
| DSAPI-US-006 | Handle Errors with Correlation ID | As a member institution system, I want all error responses to include a correlation ID and structured error code so that I can diagnose failures. | All error responses | `api_requests` | P0 | ❌ Missing |
| DSAPI-US-007 | Enforce Idempotency and Rate Limits | As the API, I want to reject duplicate submissions within the idempotency window and enforce per-key rate limits so that the platform is protected. | Request dedup + rate limiting | `api_requests`, `api_keys` | P0 | ❌ Missing |

---

### EPIC-16 — Enquiry API (ENQ) — API-First

> External-facing platform API for credit enquiry requests. Authenticated institutions submit a consumer identity and product reference; the API validates consent, fetches the credit profile, enriches the response, and returns a scored result.

| Story ID | Title | As a… I want to… So that… | API Endpoint | Primary Table | Priority | Status |
|----------|-------|---------------------------|--------------|---------------|----------|--------|
| ENQ-US-001 | Authenticate Enquiry with API Key | As a subscriber institution system, I want to authenticate using my API key so that my enquiry is authorised. | Header: `X-API-Key` | `api_keys`, `institutions` | P0 | ✅ Implemented |
| ENQ-US-002 | Submit a Credit Enquiry Request | As a subscriber institution, I want to submit a consumer national ID and product reference so that I receive a credit decision. | `POST /api/v1/enquiries` (missing) | `enquiries` | P0 | ❌ Missing |
| ENQ-US-003 | Validate Consent Reference | As the API, I want to verify the consent reference before fetching consumer data so that AA compliance is enforced. | Internal consent check | `enquiries` | P0 | ❌ Missing |
| ENQ-US-004 | Fetch Consumer Credit Profile | As the API, I want to look up the consumer by hashed identity and return their credit profile so that the enquiry is fulfilled. | Internal lookup | `consumers`, `credit_profiles`, `tradelines` | P0 | ❌ Missing |
| ENQ-US-005 | Enrich Enquiry Response with Product Rules | As the API, I want to apply product-level rules and scoring to the credit profile so that the response is product-appropriate. | Internal enrichment | `products`, `product_subscriptions` | P0 | ❌ Missing |
| ENQ-US-006 | Enquiry Lifecycle States | As a subscriber institution, I want the enquiry to transition through INITIATED → FETCHING → ENRICHING → COMPLETED (or FAILED) with a traceable correlation ID. | `GET /api/v1/enquiries/:id/status` (missing) | `enquiries` | P0 | ❌ Missing |
| ENQ-US-007 | Rate Limiting and Audit Logging | As the API, I want to enforce per-key rate limits and log every enquiry with institution, product, and outcome so that the platform is auditable. | Rate limiting + audit | `enquiries`, `api_keys`, `audit_logs` | P0 | ❌ Missing |

---

### EPIC-17 — Agents (AGNT)

> The Agents tab provides an AI-powered workspace for bureau operations, including chat-based agent interaction, bureau enquiry simulation, bank statement analysis, sources configuration, and agent fleet monitoring. Backend APIs are entirely missing in the current implementation.

| Story ID | Title | As a… I want to… So that… | API Endpoint | Primary Table | Priority | Status |
|----------|-------|---------------------------|--------------|---------------|----------|--------|
| AGNT-US-001 | View Agent Catalogue | As a bureau admin, I want to see all available agents with descriptions so that I can select the right agent for my task. | `GET /api/v1/agents` (missing) | No table yet | P1 | ❌ Missing |
| AGNT-US-002 | Configure Agent Sources | As a bureau admin, I want to configure which data sources an agent has access to so that it operates on the right data. | `SourcesConfigTab.tsx` (UI stub) | No table yet | P1 | ❌ Missing |
| AGNT-US-003 | Interact with Agent in Chat Workspace | As a bureau admin, I want to converse with an AI agent through a chat interface so that I can perform complex bureau operations through natural language. | `POST /api/v1/agents/:id/chat` (missing) | No table yet | P1 | ❌ Missing |
| AGNT-US-004 | Bureau Operator Workspace | As a bureau operator, I want a dedicated workspace with bureau-specific tools and panels so that I can perform specialised operations efficiently. | `BureauOperatorWorkspace.tsx` (UI stub) | No table yet | P1 | ❌ Missing |
| AGNT-US-005 | Upload Bank Statement via Agent | As a bureau admin, I want to upload a bank statement so that the agent can extract and map financial data. | `BankStatementUploadModal.tsx` (UI stub) | No table yet | P2 | ❌ Missing |
| AGNT-US-006 | Configure Agent Parameters | As a bureau admin, I want to set agent-specific parameters (model, temperature, max tokens) so that agent behaviour is tuned for accuracy. | `AgentConfigurationPage.tsx` (UI stub) | No table yet | P2 | ❌ Missing |
| AGNT-US-007 | Run Enquiry Simulation from Agent | As a bureau admin, I want to trigger an enquiry simulation from within the agent workspace so that I can validate scoring in context. | `EnquirySimulationPage.tsx` (partial) | `enquiries`, `products` | P1 | ⚠️ Partial |
| AGNT-US-008 | View Agent Fleet Monitoring | As a bureau admin, I want to see the status and utilisation of all running agents so that I can ensure the agent platform is healthy. | `AgentFleetCard.tsx` (mock data) | No table yet | P2 | ⚠️ Partial |

---

### EPIC-18 — Identity Resolution Agent (IDRES)

> Dedicated AI agent for resolving consumer identities across member institutions. Uses cryptographic hash matching (`national_id_hash`, `phone_hash`, `email_hash`) on the `consumers` table, confidence scoring, and a human-in-the-loop review workflow. Backend not yet implemented.

| Story ID | Title | As a… I want to… So that… | API Endpoint | Primary Table | Priority | Status |
|----------|-------|---------------------------|--------------|---------------|----------|--------|
| IDRES-US-001 | Look Up Consumer by National ID | As a bureau analyst, I want to query a consumer record by hashed national ID so that I can verify their existence in the bureau. | `GET /api/v1/identity-resolution/consumers` (missing) | `consumers` | P0 | ❌ Missing |
| IDRES-US-002 | Multi-Source Identity Deduplication | As the identity agent, I want to detect potential duplicate consumers across institutions so that the bureau database remains canonical. | `POST /api/v1/identity-resolution/dedup` (missing) | `consumers` | P0 | ❌ Missing |
| IDRES-US-003 | Review Match Confidence Scores | As a bureau analyst, I want to see confidence scores for potential matches so that I can make informed resolution decisions. | `GET /api/v1/identity-resolution/matches` (missing) | `consumers` | P0 | ⚠️ Partial |
| IDRES-US-004 | Resolve Duplicate Consumer Records | As a bureau analyst, I want to merge or dismiss matched duplicate records so that the canonical consumer is established. | `POST /api/v1/identity-resolution/matches/:id/resolve` (missing) | `consumers`, `tradelines` | P0 | ❌ Missing |
| IDRES-US-005 | Flag or Freeze a Suspicious Consumer Identity | As a bureau analyst, I want to flag or freeze a consumer record so that suspicious identities are quarantined pending investigation. | `PATCH /api/v1/consumers/:id/status` | `consumers` | P1 | ❌ Missing |
| IDRES-US-006 | View Identity Resolution Workflow History | As a compliance officer, I want to see all past resolution decisions with analyst attribution so that I have an audit trail. | `GET /api/v1/identity-resolution/history` (missing) | `consumers`, `audit_logs` | P1 | ❌ Missing |
| IDRES-US-007 | Audit Trail for Resolution Decisions | As a compliance officer, I want every identity resolution action logged with user, timestamp, and decision rationale so that I meet regulatory traceability requirements. | Internal audit write | `audit_logs` | P0 | ❌ Missing |

---

## Gap Summary

| Gap ID | Story IDs Affected | Gap Description | Type | Priority |
|--------|-------------------|-----------------|------|----------|
| GAP-001 | DSAPI-US-002–007 | Data Submission real-time API endpoint `POST /api/v1/data/submit` does not exist in Spring | Missing API | P0 |
| GAP-002 | ENQ-US-002–007 | Enquiry write endpoint `POST /api/v1/enquiries` and all supporting paths not in Spring | Missing API | P0 |
| GAP-003 | AGNT-US-001–006, AGNT-US-008 | All Agent platform backend APIs are missing; no Spring controller exists | Missing API | P1 |
| GAP-004 | IDRES-US-001–007 | Identity Resolution Agent backend entirely absent; no Spring controller or service | Missing API | P0 |
| GAP-005 | DVAL-US-002–006 | Validation Rules CRUD API (`POST/PATCH /api/v1/validation-rules`) missing from Spring | Missing API | P0 |
| GAP-006 | PROD-US-010 | Enquiry simulation execution endpoint `POST /api/v1/enquiries/simulate` missing | Missing API | P1 |
| GAP-007 | ALRT-US-001 | Alert monitoring dashboard uses `alert-engine-mock.ts` for charts; Spring returns incidents but chart aggregation is mock | Mock Data | P1 |
| GAP-008 | DASH-US-003, DASH-US-004, DASH-US-005 | Dashboard command-center cards (throughput, anomaly feed) partially sourced from `monitoring-mock.ts` | Mock Data | P1 |
| GAP-009 | AGNT-US-008 | `AgentFleetCard.tsx` uses mock data; no real agent fleet API | Mock Data | P2 |
| GAP-010 | INST-US-012 | `BillingTab.tsx` is a placeholder stub; billing API not implemented | Stub UI | P2 |
| GAP-011 | AGNT-US-004, AGNT-US-005, AGNT-US-006 | `BureauOperatorWorkspace.tsx`, `BankStatementUploadModal.tsx`, `AgentConfigurationPage.tsx` are stubs | Stub UI | P1 |
| GAP-012 | ALRT-US-007 | `AutoRemediationSettings.tsx` is a placeholder; auto-remediation logic not implemented | Stub UI | P2 |
| GAP-013 | RPT-US-005 | Report download endpoint not fully wired; `file_path_encrypted` exists in DB but download API not confirmed | Partial | P1 |
| GAP-014 | GOV-US-004 | `MatchReview.tsx` is a partial stub; consumer match review API not implemented | Partial | P1 |
| GAP-015 | BATCH-US-002 | Schema detection stage in batch pipeline is not fully implemented; relies on manual schema mapper pre-registration | Partial | P0 |
| GAP-016 | BATCH-US-010 | SFTP file drop intake not implemented; `SftpPollerService`, `batch_sftp_events` table, and SFTP folder lifecycle all missing | Missing API | P0 |
| GAP-017 | BATCH-US-011 | Multi-format file parsers (fixed-width layout, XML SAX) not implemented; JSON/CSV partial only | Missing API | P0 |
| GAP-018 | BATCH-US-012 | Schema auto-detection from file headers (Jaccard similarity) and filename hints not implemented | Missing API | P0 |
| GAP-019 | BATCH-US-013 | `batch_tracking_snapshots` table missing; `batch_jobs` lacks SFTP/schema/mapping quality columns; SFTP monitoring endpoints absent | Missing API + DB | P0 |

---

## Legend

### Implementation Status

| Badge | Meaning |
|-------|---------|
| ✅ Implemented | Feature is fully implemented in Spring backend + SPA frontend with real data |
| ⚠️ Partial | Feature exists but is incomplete — stub UI, mock data, or missing API path |
| ❌ Missing | Feature is not implemented; documented as design intent only |
| N/A | Not applicable (e.g. no UI for API-first epics) |

### Priority Levels

| Level | Meaning |
|-------|---------|
| P0 | Critical — must be implemented for the platform to function as a credit bureau |
| P1 | High — required for full operational capability; affects key user workflows |
| P2 | Medium — enhances the product but can be deferred to a later sprint |

### Epic Codes

| Code | Epic |
|------|------|
| DSYS | EPIC-00 Design System & UI Consistency |
| AUTH | EPIC-01 Authentication & Session |
| INST | EPIC-02 Institution / Member Management |
| CONS | EPIC-03 Consortium Management |
| PROD | EPIC-04 Data Products & Enquiry Simulation |
| SMAP | EPIC-05 Schema Mapper Agent |
| GOV | EPIC-06 Data Governance |
| DVAL | EPIC-07 Data Validation |
| APPQ | EPIC-08 Approval Queue Workflow |
| MON | EPIC-09 Monitoring |
| ALRT | EPIC-10 Alert Engine & SLA |
| RPT | EPIC-11 Reporting |
| USR | EPIC-12 User Management & RBAC |
| DASH | EPIC-13 Dashboard & Command Center |
| BATCH | EPIC-14 Batch Pipeline |
| DSAPI | EPIC-15 Data Submission API |
| ENQ | EPIC-16 Enquiry API |
| AGNT | EPIC-17 Agents |
| IDRES | EPIC-18 Identity Resolution Agent |

---

### Documentation notes (2026-04-02)

- **EPIC-00 / Design Guidelines:** Phase 1 design-guideline remediation (controls, institution/user badges, sortable table a11y, chart labels, skip link + mobile focus trap, consortium wizard RHF+Zod, monitoring alert banner location) — see [EPIC-00](./EPIC-00-Design-System-Cross-Cutting.md) and [Design Guidelines](../design-guidelines.md) implementation log.
- **EPIC-02 / PRD / BRD:** **Register member** is a **Member Management** sidebar sub-item; Member Institutions list no longer shows a header **Register member** button.
- **EPIC-12:** **Roles & Permissions** remains **section-scoped**; **`nav-config`** lists **`/institutions/register`** under Member Management for navigation/RBAC catalogue alignment only.
- **EPIC-02 — Registration number:** Register wizard **Registration Number** is **read-only**; **Spring** assigns **`registrationNumber`** on **`POST /api/v1/institutions`** when omitted (**`PREFIX-Slug3-YYYY-id`**). See **Register-Member-Form-Metadata-Source.md**, **API-UI-Parity-Matrix**, **Testing-Plan**.

---

*This index is maintained alongside the codebase. Update story status as implementation progresses.*
