# HCB Platform — Entity Relationship Diagram & Schema Map

**Version:** 3.0.1 | **Date:** 2026-03-31 | **Standard:** 3NF Strict · Zero Duplication

**Institution names:** Column **`name`** is the **legal** entity name; **`trading_name`** is optional. APIs and the SPA use **legal first** when collapsing to a single display string (dashboard command-center, pickers); see [API-UI-Parity-Matrix.md](./API-UI-Parity-Matrix.md) § *Institution display labels*.

---

## Entity Relationship Diagram (Mermaid)

```mermaid
erDiagram
    %% ─────────────────────────────────────────────────────────────
    %% CORE GROUP
    %% ─────────────────────────────────────────────────────────────
    institutions {
        int id PK
        varchar name
        varchar trading_name
        varchar institution_type
        varchar institution_lifecycle_status
        varchar registration_number UK
        varchar jurisdiction
        varchar license_type
        varchar license_number
        varchar contact_email
        varchar contact_phone
        datetime onboarded_at
        boolean is_data_submitter
        boolean is_subscriber
        varchar billing_model
        decimal credit_balance
        decimal data_quality_score
        decimal match_accuracy_score
        decimal sla_health_percent
        int apis_enabled_count
        datetime created_at
        datetime updated_at
        boolean is_deleted
        datetime deleted_at
    }

    users {
        int id PK
        varchar email UK
        varchar password_hash
        varchar display_name
        varchar given_name
        varchar family_name
        varchar user_account_status
        boolean mfa_enabled
        int institution_id FK
        datetime created_at
        datetime last_login_at
        boolean is_deleted
        datetime deleted_at
    }

    roles {
        int id PK
        varchar role_name UK
        text description
        datetime created_at
    }

    permissions {
        int id PK
        varchar permission_key UK
        text description
    }

    role_permissions {
        int role_id FK
        int permission_id FK
        datetime granted_at
    }

    user_role_assignments {
        int user_id FK
        int role_id FK
        int institution_id FK
        datetime assigned_at
        int assigned_by FK
    }

    refresh_tokens {
        int id PK
        int user_id FK
        varchar token_hash UK
        datetime issued_at
        datetime expires_at
        datetime revoked_at
        boolean is_revoked
        varchar device_fingerprint
        varchar ip_address
    }

    api_keys {
        int id PK
        int institution_id FK
        int user_id FK
        varchar key_name
        varchar key_prefix
        varchar key_hash UK
        varchar api_key_status
        datetime created_at
        datetime last_used_at
        datetime revoked_at
        boolean is_deleted
    }

    compliance_documents {
        int id PK
        int institution_id FK
        varchar document_name
        varchar document_status
        datetime uploaded_at
        datetime verified_at
    }

    %% ─────────────────────────────────────────────────────────────
    %% CREDIT GROUP
    %% ─────────────────────────────────────────────────────────────
    consumers {
        int id PK
        varchar national_id_type
        varchar national_id_hash UK
        text full_name_encrypted
        text date_of_birth_encrypted
        varchar phone_hash
        varchar email_hash
        varchar consumer_status
        datetime created_at
        boolean is_deleted
    }

    credit_profiles {
        int id PK
        int consumer_id FK UK
        int credit_score
        decimal total_exposure
        int active_accounts
        int delinquent_accounts
        int worst_dpd_days
        datetime profile_computed_at
    }

    tradelines {
        int id PK
        int consumer_id FK
        int institution_id FK
        varchar account_number_hash
        varchar facility_type
        decimal sanctioned_amount
        decimal outstanding_amount
        int dpd_days
        date account_open_date
        varchar tradeline_status
        varchar reporting_period
        int batch_job_id FK
        boolean is_deleted
    }

    enquiries {
        int id PK
        int consumer_id FK
        int api_key_id FK
        int requesting_institution_id FK
        int product_id FK
        varchar enquiry_type
        varchar enquiry_status
        int response_time_ms
        varchar consent_reference
        datetime enquired_at
    }

    %% ─────────────────────────────────────────────────────────────
    %% CATALOG GROUP
    %% ─────────────────────────────────────────────────────────────
    products {
        int id PK
        varchar product_code UK
        varchar product_name
        varchar enquiry_impact
        varchar coverage_scope
        varchar pricing_model
        varchar product_status
        boolean is_deleted
    }

    product_subscriptions {
        int id PK
        int institution_id FK
        int product_id FK
        varchar subscription_status
        datetime subscribed_at
    }

    consortiums {
        int id PK
        varchar consortium_code UK
        varchar consortium_name
        varchar consortium_type
        varchar consortium_status
        varchar governance_model
        boolean share_loan_data
        boolean share_repayment_history
        boolean allow_aggregation
        boolean is_deleted
    }

    consortium_members {
        int id PK
        int consortium_id FK
        int institution_id FK
        varchar member_role
        varchar consortium_member_status
        datetime joined_at
    }

    %% ─────────────────────────────────────────────────────────────
    %% MONITORING GROUP
    %% ─────────────────────────────────────────────────────────────
    api_requests {
        int id PK
        int api_key_id FK
        int institution_id FK
        varchar endpoint
        varchar http_method
        varchar api_request_status
        int response_time_ms
        int records_processed
        varchar error_code
        varchar client_ip_hash
        varchar request_id UK
        datetime occurred_at
    }

    batch_jobs {
        int id PK
        int institution_id FK
        int uploaded_by_user_id FK
        varchar file_name
        varchar batch_job_status
        int total_records
        int success_count
        int failed_count
        decimal success_rate
        datetime uploaded_at
        datetime completed_at
    }

    batch_phase_logs {
        int id PK
        int batch_job_id FK
        int phase_order
        varchar phase_key
        varchar display_name
        varchar phase_status
        varchar system_status
        varchar business_status
        datetime started_at
        datetime completed_at
        varchar flow_uid
        varchar phase_uid
        varchar version
        int to_be_processed
        int processing
        int system_ko
        int business_ko
        int business_ok
        int total_records
    }

    batch_stage_logs {
        int id PK
        int batch_job_id FK
        int phase_log_id FK
        int stage_order
        varchar stage_key
        varchar stage_name
        varchar stage_status
        varchar message
        datetime started_at
        datetime completed_at
        int records_processed
        int error_count
        int skipped_count
        int system_return_code
        int business_return_code
    }

    batch_error_samples {
        int id PK
        int batch_job_id FK
        int batch_stage_log_id FK
        varchar record_id
        varchar field_name
        varchar error_type
        text error_message
        varchar severity
    }

    batch_records {
        int id PK
        int batch_job_id FK
        int row_number
        varchar record_status
        varchar error_code
        int consumer_id FK
    }

    sla_configs {
        int id PK
        varchar sla_domain
        varchar metric_name
        varchar threshold_operator
        decimal threshold_value
        varchar severity_level
        boolean is_active
    }

    sla_breaches {
        int id PK
        int sla_config_id FK
        int institution_id FK
        varchar breach_value_text
        varchar breach_incident_status
        datetime detected_at
        datetime resolved_at
    }

    alert_rules {
        int id PK
        varchar rule_name
        varchar alert_domain
        text condition_expression
        varchar severity_level
        varchar alert_rule_status
        boolean is_deleted
    }

    alert_incidents {
        int id PK
        int alert_rule_id FK
        int institution_id FK
        varchar metric_name
        varchar alert_incident_status
        datetime triggered_at
        datetime resolved_at
    }

    %% ─────────────────────────────────────────────────────────────
    %% SYSTEM GROUP
    %% ─────────────────────────────────────────────────────────────
    audit_logs {
        int id PK
        int user_id FK
        varchar action_type
        varchar entity_type
        varchar entity_id
        text description
        varchar ip_address_hash
        varchar audit_outcome
        datetime occurred_at
    }

    approval_queue {
        int id PK
        varchar approval_item_type
        varchar entity_ref_id
        varchar entity_name_snapshot
        int submitted_by_user_id FK
        int reviewed_by_user_id FK
        varchar approval_workflow_status
        text rejection_reason
        datetime submitted_at
        datetime reviewed_at
    }

    reports {
        int id PK
        varchar report_type
        date date_range_start
        date date_range_end
        int requested_by_user_id FK
        int institution_id FK
        varchar report_status
        varchar output_format
        datetime requested_at
    }

    %% ─────────────────────────────────────────────────────────────
    %% GOVERNANCE GROUP
    %% ─────────────────────────────────────────────────────────────
    canonical_fields {
        int id PK
        varchar field_code UK
        varchar field_name
        varchar pii_classification
    }

    validation_rules {
        int id PK
        varchar rule_name
        int canonical_field_id FK
        varchar validation_type
        text rule_expression
    }

    source_schemas {
        int id PK
        varchar source_name
        varchar schema_version
        int institution_id FK
    }

    source_schema_fields {
        int id PK
        int source_schema_id FK
        varchar field_name
        varchar field_data_type
    }

    mapping_versions {
        int id PK
        int source_schema_id FK
        varchar version_tag
        varchar mapping_version_status
        int created_by_user_id FK
        int approved_by_user_id FK
    }

    mapping_pairs {
        int id PK
        int mapping_version_id FK
        int source_field_id FK
        int canonical_field_id FK
        decimal confidence_score
        varchar mapping_method
        boolean is_approved
    }

    %% ─────────────────────────────────────────────────────────────
    %% RELATIONSHIPS
    %% ─────────────────────────────────────────────────────────────
    institutions ||--o{ users : "has many"
    institutions ||--o{ api_keys : "owns"
    institutions ||--o{ compliance_documents : "has"
    institutions ||--o{ consortium_members : "member of"
    institutions ||--o{ product_subscriptions : "subscribes to"
    institutions ||--o{ batch_jobs : "submits"
    institutions ||--o{ tradelines : "submits"
    institutions ||--o{ enquiries : "requests"
    institutions ||--o{ sla_breaches : "causes"
    institutions ||--o{ alert_incidents : "associated with"
    institutions ||--o{ reports : "scoped to"
    institutions ||--o{ source_schemas : "provides"

    users ||--o{ user_role_assignments : "assigned"
    users ||--o{ refresh_tokens : "has"
    users ||--o{ api_keys : "owns"
    users ||--o{ audit_logs : "generates"
    users ||--o{ approval_queue : "submits/reviews"
    users ||--o{ reports : "requests"
    users ||--o{ batch_jobs : "uploads"

    roles ||--o{ role_permissions : "has"
    roles ||--o{ user_role_assignments : "used in"
    permissions ||--o{ role_permissions : "granted via"

    consumers ||--|| credit_profiles : "has one"
    consumers ||--o{ tradelines : "has many"
    consumers ||--o{ enquiries : "subject of"
    consumers ||--o{ batch_records : "linked to"

    api_keys ||--o{ api_requests : "used in"
    api_keys ||--o{ enquiries : "used for"

    products ||--o{ product_subscriptions : "subscribed via"
    products ||--o{ enquiries : "product of"

    consortiums ||--o{ consortium_members : "has members"

    batch_jobs ||--o{ batch_records : "has records"
    batch_jobs ||--o{ batch_phase_logs : "execution phases"
    batch_phase_logs ||--o{ batch_stage_logs : "stages"
    batch_jobs ||--o{ batch_error_samples : "error samples"
    batch_stage_logs ||--o{ batch_error_samples : "stage-linked samples"
    batch_jobs ||--o{ tradelines : "source of"

    sla_configs ||--o{ sla_breaches : "triggers"

    alert_rules ||--o{ alert_incidents : "fires"

    source_schemas ||--o{ source_schema_fields : "contains"
    source_schemas ||--o{ mapping_versions : "has versions"

    mapping_versions ||--o{ mapping_pairs : "contains"
    source_schema_fields ||--o{ mapping_pairs : "mapped from"
    canonical_fields ||--o{ mapping_pairs : "mapped to"
    canonical_fields ||--o{ validation_rules : "validated by"
```

---

## Table Count by Group

| Group | Tables | Core Purpose |
|-------|--------|-------------|
| CORE | 9 | Identity, auth, access control |
| CREDIT | 4 | Credit data management |
| CATALOG | 4 | Products and consortiums |
| MONITORING | 7 | Operational telemetry |
| SYSTEM | 3 | Workflow and governance |
| GOVERNANCE | 6 | Schema and data quality |
| **TOTAL** | **33** | |

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| No institution_name in consortium_members | Prevents name duplication; resolved via JOIN |
| No role column in users | Roles in separate mapping table (RBAC separation) |
| No raw API key in api_requests | Security — key hash only; logs use FK integer |
| Consumer PII encrypted at app layer | Compliance with GDPR, PDPA, DPDP |
| Soft delete on all mutable entities | Audit and compliance; no data loss |
| Append-only audit_logs | Legal admissibility; tamper-evident trail |
| Credit scores in credit_profiles (batch) | Not derived from UI; always from batch compute |
| Generic confidence 0.0–1.0 scale | Normalized from mixed 0-100 and 0-1 scales in mock data |
