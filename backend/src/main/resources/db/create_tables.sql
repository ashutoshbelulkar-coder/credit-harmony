-- ============================================================================
-- HCB PLATFORM — NORMALIZED DATABASE SCHEMA
-- Version   : 3.0.0
-- Date      : 2026-03-28
-- Engine    : SQLite 3 (development) / PostgreSQL 15 (production)
-- Standard  : 3NF Strict · Zero Duplication · FK-Only Cross-References
-- ============================================================================
-- HARD RULES:
--   NR-001  No duplicate attributes across tables
--   NR-002  Single owner per entity
--   NR-003  Foreign keys for all cross-table references
--   NR-004  No denormalized shortcuts
--   NR-005  Domain-scoped status fields with CHECK constraints
--   NR-006  Soft delete on all mutable entities
--   NR-007  UTC ISO-8601 timestamps
-- ============================================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- ============================================================================
-- DROP ORDER (reverse FK dependency)
-- ============================================================================
DROP TABLE IF EXISTS batch_records;
DROP TABLE IF EXISTS batch_jobs;
DROP TABLE IF EXISTS sla_breaches;
DROP TABLE IF EXISTS sla_configs;
DROP TABLE IF EXISTS alert_incidents;
DROP TABLE IF EXISTS alert_rules;
DROP TABLE IF EXISTS api_requests;
DROP TABLE IF EXISTS enquiries;
DROP TABLE IF EXISTS tradelines;
DROP TABLE IF EXISTS credit_profiles;
DROP TABLE IF EXISTS consumers;
DROP TABLE IF EXISTS mapping_pairs;
DROP TABLE IF EXISTS mapping_versions;
DROP TABLE IF EXISTS source_schema_fields;
DROP TABLE IF EXISTS source_schemas;
DROP TABLE IF EXISTS validation_rules;
DROP TABLE IF EXISTS canonical_fields;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS approval_queue;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS consortium_members;
DROP TABLE IF EXISTS consortiums;
DROP TABLE IF EXISTS product_subscriptions;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS compliance_documents;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS user_role_assignments;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS institutions;

-- ============================================================================
-- GROUP: CORE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- institutions
-- Owner of: name, trading_name, institution_type, institution_lifecycle_status,
--           registration_number, jurisdiction, license_*, contact_*, billing_*,
--           data_quality_score, match_accuracy_score, sla_health_percent
-- ----------------------------------------------------------------------------
CREATE TABLE institutions (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    name                        VARCHAR(255) NOT NULL,
    trading_name                VARCHAR(100),
    institution_type            VARCHAR(50)  NOT NULL
                                    CHECK (institution_type IN (
                                        'Commercial Bank','Credit Union','NBFI',
                                        'Fintech','Savings Bank','MFI')),
    institution_lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'draft'
                                    CHECK (institution_lifecycle_status IN (
                                        'draft','pending','active','suspended','deactivated')),
    registration_number         VARCHAR(100) NOT NULL,
    jurisdiction                VARCHAR(100) NOT NULL,
    license_type                VARCHAR(100),
    license_number              VARCHAR(100),
    contact_email               VARCHAR(255),
    contact_phone               VARCHAR(50),
    onboarded_at                DATETIME,
    is_data_submitter           INTEGER      NOT NULL DEFAULT 0
                                    CHECK (is_data_submitter IN (0,1)),
    is_subscriber               INTEGER      NOT NULL DEFAULT 0
                                    CHECK (is_subscriber IN (0,1)),
    billing_model               VARCHAR(20)
                                    CHECK (billing_model IN ('prepaid','postpaid','hybrid')),
    credit_balance              DECIMAL(15,2),
    data_quality_score          DECIMAL(5,2),
    match_accuracy_score        DECIMAL(5,2),
    sla_health_percent          DECIMAL(5,2),
    apis_enabled_count          INTEGER      NOT NULL DEFAULT 0,
    created_at                  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted                  INTEGER      NOT NULL DEFAULT 0
                                    CHECK (is_deleted IN (0,1)),
    deleted_at                  DATETIME,
    CONSTRAINT uq_institutions_registration UNIQUE (registration_number)
);

CREATE INDEX idx_institutions_status       ON institutions (institution_lifecycle_status);
CREATE INDEX idx_institutions_jurisdiction ON institutions (jurisdiction);
CREATE INDEX idx_institutions_type         ON institutions (institution_type);

-- ----------------------------------------------------------------------------
-- roles
-- Owner of: role_name, description
-- ----------------------------------------------------------------------------
CREATE TABLE roles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name   VARCHAR(100) NOT NULL,
    description TEXT,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_roles_name UNIQUE (role_name)
);

CREATE INDEX idx_roles_name ON roles (role_name);

-- ----------------------------------------------------------------------------
-- permissions
-- Owner of: permission_key, description
-- ----------------------------------------------------------------------------
CREATE TABLE permissions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    permission_key VARCHAR(100) NOT NULL,
    description    TEXT,
    CONSTRAINT uq_permissions_key UNIQUE (permission_key)
);

-- ----------------------------------------------------------------------------
-- role_permissions (mapping; no descriptive attributes)
-- ----------------------------------------------------------------------------
CREATE TABLE role_permissions (
    role_id       INTEGER NOT NULL REFERENCES roles(id)       ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

-- ----------------------------------------------------------------------------
-- users
-- Owner of: email, password_hash, display_name, given_name, family_name,
--           user_account_status, mfa_enabled, last_login_at
-- NEVER stores: role names, institution names (FK only)
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    email                VARCHAR(255) NOT NULL,
    password_hash        VARCHAR(255) NOT NULL,
    display_name         VARCHAR(150) NOT NULL,
    given_name           VARCHAR(100),
    family_name          VARCHAR(100),
    user_account_status  VARCHAR(20)  NOT NULL DEFAULT 'invited'
                             CHECK (user_account_status IN (
                                 'invited','active','suspended','deactivated')),
    mfa_enabled          INTEGER      NOT NULL DEFAULT 0
                             CHECK (mfa_enabled IN (0,1)),
    institution_id       INTEGER      REFERENCES institutions(id) ON DELETE SET NULL,
    created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at        DATETIME,
    is_deleted           INTEGER      NOT NULL DEFAULT 0
                             CHECK (is_deleted IN (0,1)),
    deleted_at           DATETIME,
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX idx_users_email          ON users (email);
CREATE INDEX idx_users_institution_id ON users (institution_id);
CREATE INDEX idx_users_status         ON users (user_account_status);

-- ----------------------------------------------------------------------------
-- user_role_assignments (mapping; supports institution-scoped role grants)
-- ----------------------------------------------------------------------------
CREATE TABLE user_role_assignments (
    user_id        INTEGER  NOT NULL REFERENCES users(id)        ON DELETE CASCADE,
    role_id        INTEGER  NOT NULL REFERENCES roles(id)        ON DELETE RESTRICT,
    institution_id INTEGER  REFERENCES institutions(id)          ON DELETE CASCADE,
    assigned_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by    INTEGER  REFERENCES users(id)                 ON DELETE SET NULL,
    PRIMARY KEY (user_id, role_id, institution_id)
);

CREATE INDEX idx_ura_user_id ON user_role_assignments (user_id);

-- ----------------------------------------------------------------------------
-- refresh_tokens
-- Owner of: token_hash, issued_at, expires_at, revoked_at, is_revoked
-- ----------------------------------------------------------------------------
CREATE TABLE refresh_tokens (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id            INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash         VARCHAR(512) NOT NULL,
    issued_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at         DATETIME     NOT NULL,
    revoked_at         DATETIME,
    is_revoked         INTEGER      NOT NULL DEFAULT 0
                           CHECK (is_revoked IN (0,1)),
    device_fingerprint VARCHAR(255),
    ip_address         VARCHAR(45),
    CONSTRAINT uq_refresh_tokens_hash UNIQUE (token_hash)
);

CREATE INDEX idx_refresh_tokens_user_id    ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);

-- ----------------------------------------------------------------------------
-- api_keys
-- Owner of: key_name, key_prefix, key_hash, api_key_status
-- Raw key value: write-once, never retrievable after creation
-- NEVER stored in log rows; logs use api_key_id (FK integer)
-- ----------------------------------------------------------------------------
CREATE TABLE api_keys (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    institution_id INTEGER      REFERENCES institutions(id) ON DELETE CASCADE,
    user_id        INTEGER      REFERENCES users(id)        ON DELETE SET NULL,
    key_name       VARCHAR(100) NOT NULL,
    key_prefix     VARCHAR(20)  NOT NULL,
    key_hash       VARCHAR(512) NOT NULL,
    api_key_status VARCHAR(20)  NOT NULL DEFAULT 'active'
                       CHECK (api_key_status IN ('active','revoked','expired')),
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at   DATETIME,
    revoked_at     DATETIME,
    is_deleted     INTEGER      NOT NULL DEFAULT 0
                       CHECK (is_deleted IN (0,1)),
    deleted_at     DATETIME,
    CONSTRAINT uq_api_keys_hash UNIQUE (key_hash)
);

CREATE INDEX idx_api_keys_institution_id ON api_keys (institution_id);
CREATE INDEX idx_api_keys_key_hash       ON api_keys (key_hash);

-- ----------------------------------------------------------------------------
-- compliance_documents
-- ----------------------------------------------------------------------------
CREATE TABLE compliance_documents (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    institution_id  INTEGER      NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    document_name   VARCHAR(255) NOT NULL,
    document_status VARCHAR(20)  NOT NULL DEFAULT 'pending'
                        CHECK (document_status IN ('pending','verified','rejected')),
    uploaded_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_at     DATETIME
);

CREATE INDEX idx_compliance_docs_institution_id ON compliance_documents (institution_id);

-- ============================================================================
-- GROUP: CATALOG
-- ============================================================================

-- ----------------------------------------------------------------------------
-- products
-- Owner of: product_code, product_name, description, enquiry_impact, pricing_model
-- NEVER duplicated in enquiries or subscriptions — FK only
-- ----------------------------------------------------------------------------
CREATE TABLE products (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code   VARCHAR(50)  NOT NULL,
    product_name   VARCHAR(255) NOT NULL,
    description    TEXT,
    enquiry_impact VARCHAR(20)
                       CHECK (enquiry_impact IN ('HARD','SOFT')),
    coverage_scope VARCHAR(30)
                       CHECK (coverage_scope IN ('SELF','CONSORTIUM','NETWORK','VERTICAL')),
    data_mode      VARCHAR(20)
                       CHECK (data_mode IN ('LIVE','SANDBOX','TEST')),
    pricing_model  VARCHAR(20)
                       CHECK (pricing_model IN ('PER_HIT','SUBSCRIPTION','HYBRID')),
    product_status VARCHAR(20)  NOT NULL DEFAULT 'draft'
                       CHECK (product_status IN ('draft','pending_approval','active','deprecated')),
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted     INTEGER      NOT NULL DEFAULT 0
                       CHECK (is_deleted IN (0,1)),
    deleted_at     DATETIME,
    CONSTRAINT uq_products_code UNIQUE (product_code)
);

-- ----------------------------------------------------------------------------
-- product_subscriptions (FK-only mapping; no product_name)
-- ----------------------------------------------------------------------------
CREATE TABLE product_subscriptions (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    institution_id      INTEGER      NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    product_id          INTEGER      NOT NULL REFERENCES products(id)     ON DELETE CASCADE,
    subscription_status VARCHAR(20)  NOT NULL DEFAULT 'active'
                            CHECK (subscription_status IN ('active','suspended','expired')),
    subscribed_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at          DATETIME,
    CONSTRAINT uq_product_subscriptions UNIQUE (institution_id, product_id)
);

-- ----------------------------------------------------------------------------
-- consortiums
-- Owner of: consortium_code, consortium_name, consortium_type, data_policy fields
-- NEVER duplicated in consortium_members — FK only
-- ----------------------------------------------------------------------------
CREATE TABLE consortiums (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    consortium_code         VARCHAR(50)  NOT NULL,
    consortium_name         VARCHAR(255) NOT NULL,
    consortium_type         VARCHAR(20)  NOT NULL
                                CHECK (consortium_type IN ('Closed','Open','Hybrid')),
    consortium_status       VARCHAR(20)  NOT NULL DEFAULT 'pending'
                                CHECK (consortium_status IN ('pending','active','suspended','dissolved')),
    purpose                 VARCHAR(100),
    governance_model        VARCHAR(30)
                                CHECK (governance_model IN ('Centralized','Federated','Hybrid Board')),
    share_loan_data         INTEGER      NOT NULL DEFAULT 0 CHECK (share_loan_data IN (0,1)),
    share_repayment_history INTEGER      NOT NULL DEFAULT 0 CHECK (share_repayment_history IN (0,1)),
    allow_aggregation       INTEGER      NOT NULL DEFAULT 0 CHECK (allow_aggregation IN (0,1)),
    data_visibility         VARCHAR(30)
                                CHECK (data_visibility IN ('full','masked_pii','derived')),
    description             TEXT,
    created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted              INTEGER      NOT NULL DEFAULT 0 CHECK (is_deleted IN (0,1)),
    deleted_at              DATETIME,
    CONSTRAINT uq_consortiums_code UNIQUE (consortium_code)
);

-- ----------------------------------------------------------------------------
-- consortium_members
-- NEVER stores consortium_name or institution_name — FK only
-- ----------------------------------------------------------------------------
CREATE TABLE consortium_members (
    id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    consortium_id            INTEGER      NOT NULL REFERENCES consortiums(id)  ON DELETE CASCADE,
    institution_id           INTEGER      NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    member_role              VARCHAR(30)  NOT NULL
                                 CHECK (member_role IN ('Contributor','Consumer','Observer')),
    consortium_member_status VARCHAR(20)  NOT NULL DEFAULT 'pending'
                                 CHECK (consortium_member_status IN (
                                     'pending','active','suspended','exited')),
    joined_at                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_consortium_members UNIQUE (consortium_id, institution_id)
);

CREATE INDEX idx_consortium_members_institution_id ON consortium_members (institution_id);
CREATE INDEX idx_consortium_members_consortium_id  ON consortium_members (consortium_id);

-- ============================================================================
-- GROUP: CREDIT
-- ============================================================================

-- ----------------------------------------------------------------------------
-- consumers
-- PII fields encrypted at application layer before storage
-- Owner of: national_id_hash, full_name_encrypted, date_of_birth_encrypted, etc.
-- ----------------------------------------------------------------------------
CREATE TABLE consumers (
    id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    national_id_type         VARCHAR(30)  NOT NULL
                                 CHECK (national_id_type IN (
                                     'PAN','NIN','PASSPORT','KRA_PIN','OTHER')),
    national_id_hash         VARCHAR(512) NOT NULL,
    full_name_encrypted      TEXT         NOT NULL,
    date_of_birth_encrypted  TEXT,
    phone_hash               VARCHAR(512),
    email_hash               VARCHAR(512),
    consumer_status          VARCHAR(20)  NOT NULL DEFAULT 'active'
                                 CHECK (consumer_status IN (
                                     'active','flagged','frozen','deceased')),
    created_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted               INTEGER      NOT NULL DEFAULT 0 CHECK (is_deleted IN (0,1)),
    deleted_at               DATETIME,
    CONSTRAINT uq_consumers_national_id UNIQUE (national_id_hash)
);

CREATE INDEX idx_consumers_national_id_hash ON consumers (national_id_hash);
CREATE INDEX idx_consumers_phone_hash       ON consumers (phone_hash);

-- ----------------------------------------------------------------------------
-- credit_profiles (computed by batch; one row per consumer)
-- ----------------------------------------------------------------------------
CREATE TABLE credit_profiles (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    consumer_id         INTEGER      NOT NULL REFERENCES consumers(id) ON DELETE CASCADE,
    credit_score        INTEGER,
    total_exposure      DECIMAL(20,2),
    active_accounts     INTEGER      NOT NULL DEFAULT 0,
    delinquent_accounts INTEGER      NOT NULL DEFAULT 0,
    worst_dpd_days      INTEGER      NOT NULL DEFAULT 0,
    profile_computed_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_credit_profiles_consumer UNIQUE (consumer_id)
);

CREATE INDEX idx_credit_profiles_consumer_id ON credit_profiles (consumer_id);

-- ----------------------------------------------------------------------------
-- batch_jobs (defined here, referenced by tradelines)
-- ----------------------------------------------------------------------------
CREATE TABLE batch_jobs (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    institution_id      INTEGER      NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    uploaded_by_user_id INTEGER      REFERENCES users(id)        ON DELETE SET NULL,
    file_name           VARCHAR(255) NOT NULL,
    batch_job_status    VARCHAR(20)  NOT NULL DEFAULT 'queued'
                            CHECK (batch_job_status IN (
                                'queued','processing','completed','failed','partial')),
    total_records       INTEGER      NOT NULL DEFAULT 0,
    success_count       INTEGER      NOT NULL DEFAULT 0,
    failed_count        INTEGER      NOT NULL DEFAULT 0,
    success_rate        DECIMAL(5,2),
    duration_seconds    INTEGER,
    uploaded_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at        DATETIME
);

CREATE INDEX idx_batch_jobs_institution_id ON batch_jobs (institution_id);
CREATE INDEX idx_batch_jobs_uploaded_at    ON batch_jobs (uploaded_at);
CREATE INDEX idx_batch_jobs_status         ON batch_jobs (batch_job_status);

-- ----------------------------------------------------------------------------
-- tradelines (append-only credit account records)
-- NEVER stores institution_name or product_name — FK only
-- ----------------------------------------------------------------------------
CREATE TABLE tradelines (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    consumer_id         INTEGER      NOT NULL REFERENCES consumers(id)    ON DELETE RESTRICT,
    institution_id      INTEGER      NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    account_number_hash VARCHAR(512) NOT NULL,
    product_type        VARCHAR(100),
    facility_type       VARCHAR(50)
                            CHECK (facility_type IN (
                                'TERM_LOAN','OD','CC','LEASE','GUARANTEE','OTHER')),
    sanctioned_amount   DECIMAL(20,2),
    outstanding_amount  DECIMAL(20,2),
    dpd_days            INTEGER      NOT NULL DEFAULT 0,
    account_open_date   DATE,
    account_close_date  DATE,
    tradeline_status    VARCHAR(20)  NOT NULL DEFAULT 'active'
                            CHECK (tradeline_status IN (
                                'active','closed','written_off','settled','npa')),
    repayment_frequency VARCHAR(20)
                            CHECK (repayment_frequency IN (
                                'MONTHLY','QUARTERLY','BULLET','OTHER')),
    submitted_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reporting_period    VARCHAR(7),
    batch_job_id        INTEGER      REFERENCES batch_jobs(id) ON DELETE SET NULL,
    is_deleted          INTEGER      NOT NULL DEFAULT 0 CHECK (is_deleted IN (0,1)),
    deleted_at          DATETIME
);

CREATE INDEX idx_tradelines_consumer_id      ON tradelines (consumer_id);
CREATE INDEX idx_tradelines_institution_id   ON tradelines (institution_id);
CREATE INDEX idx_tradelines_submitted_at     ON tradelines (submitted_at);
CREATE INDEX idx_tradelines_reporting_period ON tradelines (reporting_period);

-- ----------------------------------------------------------------------------
-- enquiries (inquiry log; no raw api_key — FK to api_keys)
-- NEVER stores product_name — FK to products
-- ----------------------------------------------------------------------------
CREATE TABLE enquiries (
    id                        INTEGER PRIMARY KEY AUTOINCREMENT,
    consumer_id               INTEGER      NOT NULL REFERENCES consumers(id)    ON DELETE RESTRICT,
    api_key_id                INTEGER      NOT NULL REFERENCES api_keys(id)     ON DELETE RESTRICT,
    requesting_institution_id INTEGER      NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    product_id                INTEGER      REFERENCES products(id)              ON DELETE SET NULL,
    enquiry_type              VARCHAR(20)  NOT NULL
                                  CHECK (enquiry_type IN ('HARD','SOFT')),
    enquiry_purpose           VARCHAR(100),
    enquiry_status            VARCHAR(30)  NOT NULL DEFAULT 'success'
                                  CHECK (enquiry_status IN (
                                      'success','failed','rate_limited',
                                      'consent_missing','subject_not_found')),
    response_time_ms          INTEGER,
    consent_reference         VARCHAR(255),
    enquiry_result_code       VARCHAR(50),
    enquired_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_enquiries_consumer_id    ON enquiries (consumer_id);
CREATE INDEX idx_enquiries_institution_id ON enquiries (requesting_institution_id);
CREATE INDEX idx_enquiries_enquired_at    ON enquiries (enquired_at);
CREATE INDEX idx_enquiries_type           ON enquiries (enquiry_type);

-- ============================================================================
-- GROUP: MONITORING
-- ============================================================================

-- ----------------------------------------------------------------------------
-- api_requests (append-only; raw key never stored; IP hashed)
-- ----------------------------------------------------------------------------
CREATE TABLE api_requests (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key_id         INTEGER      REFERENCES api_keys(id)     ON DELETE SET NULL,
    institution_id     INTEGER      REFERENCES institutions(id) ON DELETE SET NULL,
    endpoint           VARCHAR(255) NOT NULL,
    http_method        VARCHAR(10)  NOT NULL,
    api_request_status VARCHAR(30)  NOT NULL
                           CHECK (api_request_status IN (
                               'success','failed','partial','rate_limited',
                               'authentication_failed')),
    response_time_ms   INTEGER,
    records_processed  INTEGER      NOT NULL DEFAULT 0,
    error_code         VARCHAR(100),
    client_ip_hash     VARCHAR(128),
    request_id         VARCHAR(100),
    occurred_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_api_requests_request_id UNIQUE (request_id)
);

CREATE INDEX idx_api_requests_institution_id ON api_requests (institution_id);
CREATE INDEX idx_api_requests_occurred_at    ON api_requests (occurred_at);
CREATE INDEX idx_api_requests_api_key_id     ON api_requests (api_key_id);
CREATE INDEX idx_api_requests_status         ON api_requests (api_request_status);

-- ----------------------------------------------------------------------------
-- batch_records (record-level outcomes per batch_job)
-- ----------------------------------------------------------------------------
CREATE TABLE batch_records (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_job_id  INTEGER      NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,
    row_number    INTEGER      NOT NULL,
    record_status VARCHAR(20)  NOT NULL
                      CHECK (record_status IN ('success','failed','skipped')),
    error_code    VARCHAR(100),
    error_message TEXT,
    consumer_id   INTEGER      REFERENCES consumers(id) ON DELETE SET NULL
);

CREATE INDEX idx_batch_records_batch_job_id ON batch_records (batch_job_id);

-- ----------------------------------------------------------------------------
-- sla_configs
-- ----------------------------------------------------------------------------
CREATE TABLE sla_configs (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    sla_domain             VARCHAR(100) NOT NULL,
    metric_name            VARCHAR(100) NOT NULL,
    threshold_operator     VARCHAR(5)   NOT NULL
                               CHECK (threshold_operator IN ('>=','<=','>','<','=')),
    threshold_value        DECIMAL(15,4) NOT NULL,
    threshold_unit         VARCHAR(30),
    severity_level         VARCHAR(10)  NOT NULL
                               CHECK (severity_level IN ('INFO','WARNING','CRITICAL')),
    time_window_description VARCHAR(100),
    is_active              INTEGER      NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
    created_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sla_configs_domain_metric UNIQUE (sla_domain, metric_name)
);

-- ----------------------------------------------------------------------------
-- sla_breaches (linked to sla_configs; no duplicate config data)
-- ----------------------------------------------------------------------------
CREATE TABLE sla_breaches (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    sla_config_id           INTEGER      NOT NULL REFERENCES sla_configs(id)   ON DELETE RESTRICT,
    institution_id          INTEGER      REFERENCES institutions(id)           ON DELETE SET NULL,
    breach_value_text       VARCHAR(50),
    breach_duration_seconds INTEGER,
    breach_incident_status  VARCHAR(20)  NOT NULL DEFAULT 'open'
                                CHECK (breach_incident_status IN ('open','acknowledged','resolved')),
    detected_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at             DATETIME
);

CREATE INDEX idx_sla_breaches_detected_at    ON sla_breaches (detected_at);
CREATE INDEX idx_sla_breaches_institution_id ON sla_breaches (institution_id);

-- ----------------------------------------------------------------------------
-- alert_rules
-- ----------------------------------------------------------------------------
CREATE TABLE alert_rules (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_name            VARCHAR(255) NOT NULL,
    alert_domain         VARCHAR(100) NOT NULL,
    condition_expression TEXT         NOT NULL,
    severity_level       VARCHAR(10)  NOT NULL
                             CHECK (severity_level IN ('INFO','WARNING','CRITICAL')),
    alert_rule_status    VARCHAR(20)  NOT NULL DEFAULT 'enabled'
                             CHECK (alert_rule_status IN ('enabled','disabled')),
    last_triggered_at    DATETIME,
    created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted           INTEGER      NOT NULL DEFAULT 0 CHECK (is_deleted IN (0,1)),
    deleted_at           DATETIME
);

-- ----------------------------------------------------------------------------
-- alert_incidents (fired events; no rule condition data duplicated)
-- ----------------------------------------------------------------------------
CREATE TABLE alert_incidents (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_rule_id          INTEGER      NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    institution_id         INTEGER      REFERENCES institutions(id)         ON DELETE SET NULL,
    metric_name            VARCHAR(100),
    current_value_text     VARCHAR(100),
    threshold_text         VARCHAR(100),
    alert_incident_status  VARCHAR(20)  NOT NULL DEFAULT 'active'
                               CHECK (alert_incident_status IN (
                                   'active','acknowledged','resolved')),
    triggered_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at        DATETIME,
    resolved_at            DATETIME
);

CREATE INDEX idx_alert_incidents_triggered_at   ON alert_incidents (triggered_at);
CREATE INDEX idx_alert_incidents_institution_id ON alert_incidents (institution_id);

-- ============================================================================
-- GROUP: SYSTEM
-- ============================================================================

-- ----------------------------------------------------------------------------
-- audit_logs (append-only; immutable; IP hashed; no raw keys or PII)
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    action_type     VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(100) NOT NULL,
    entity_id       VARCHAR(100) NOT NULL,
    description     TEXT,
    ip_address_hash VARCHAR(128),
    audit_outcome   VARCHAR(20)  NOT NULL DEFAULT 'success'
                        CHECK (audit_outcome IN ('success','failure','partial')),
    occurred_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id     ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_occurred_at ON audit_logs (occurred_at);
CREATE INDEX idx_audit_logs_entity      ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs (action_type);

-- ----------------------------------------------------------------------------
-- approval_queue
-- ----------------------------------------------------------------------------
CREATE TABLE approval_queue (
    id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    approval_item_type       VARCHAR(50)  NOT NULL
                                 CHECK (approval_item_type IN (
                                     'institution','schema_mapping','consortium','product')),
    entity_ref_id            VARCHAR(100),
    entity_name_snapshot     VARCHAR(255),
    description              TEXT,
    submitted_by_user_id     INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by_user_id      INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    approval_workflow_status VARCHAR(30)  NOT NULL DEFAULT 'pending'
                                 CHECK (approval_workflow_status IN (
                                     'pending','approved','rejected','changes_requested')),
    rejection_reason         TEXT,
    submitted_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at              DATETIME
);

CREATE INDEX idx_approval_queue_status       ON approval_queue (approval_workflow_status);
CREATE INDEX idx_approval_queue_submitted_at ON approval_queue (submitted_at);
CREATE INDEX idx_approval_queue_type         ON approval_queue (approval_item_type);

-- ----------------------------------------------------------------------------
-- reports
-- file_path_encrypted: output file path encrypted at application layer
-- ----------------------------------------------------------------------------
CREATE TABLE reports (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type           VARCHAR(100) NOT NULL,
    date_range_start      DATE,
    date_range_end        DATE,
    requested_by_user_id  INTEGER      REFERENCES users(id)        ON DELETE SET NULL,
    institution_id        INTEGER      REFERENCES institutions(id) ON DELETE SET NULL,
    report_status         VARCHAR(20)  NOT NULL DEFAULT 'queued'
                              CHECK (report_status IN (
                                  'queued','processing','completed','failed')),
    output_format         VARCHAR(10)
                              CHECK (output_format IN ('PDF','CSV','XLSX')),
    file_path_encrypted   TEXT,
    requested_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at          DATETIME
);

CREATE INDEX idx_reports_user_id      ON reports (requested_by_user_id);
CREATE INDEX idx_reports_requested_at ON reports (requested_at);
CREATE INDEX idx_reports_status       ON reports (report_status);

-- ============================================================================
-- GROUP: GOVERNANCE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- canonical_fields (HCB Master Schema field registry)
-- ----------------------------------------------------------------------------
CREATE TABLE canonical_fields (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    field_code          VARCHAR(100) NOT NULL,
    field_name          VARCHAR(255) NOT NULL,
    canonical_data_type VARCHAR(30)  NOT NULL,
    description         TEXT,
    pii_classification  VARCHAR(20)  NOT NULL DEFAULT 'non_pii'
                            CHECK (pii_classification IN ('non_pii','pii','sensitive_pii')),
    is_mandatory        INTEGER      NOT NULL DEFAULT 0 CHECK (is_mandatory IN (0,1)),
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_canonical_fields_code UNIQUE (field_code)
);

-- ----------------------------------------------------------------------------
-- validation_rules
-- ----------------------------------------------------------------------------
CREATE TABLE validation_rules (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_name              VARCHAR(255) NOT NULL,
    canonical_field_id     INTEGER      REFERENCES canonical_fields(id) ON DELETE SET NULL,
    validation_type        VARCHAR(30)  NOT NULL
                               CHECK (validation_type IN (
                                   'FORMAT','RANGE','MANDATORY','CROSS_FIELD','DUPLICATE','ENUM')),
    rule_expression        TEXT         NOT NULL,
    severity_level         VARCHAR(10)  NOT NULL
                               CHECK (severity_level IN ('INFO','WARNING','CRITICAL')),
    validation_rule_status VARCHAR(20)  NOT NULL DEFAULT 'active'
                               CHECK (validation_rule_status IN ('active','inactive','testing')),
    created_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted             INTEGER      NOT NULL DEFAULT 0 CHECK (is_deleted IN (0,1)),
    deleted_at             DATETIME
);

-- ----------------------------------------------------------------------------
-- source_schemas
-- ----------------------------------------------------------------------------
CREATE TABLE source_schemas (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    source_name    VARCHAR(255) NOT NULL,
    source_type    VARCHAR(50)
                       CHECK (source_type IN ('CBS','ALT_DATA','BUREAU','CUSTOM')),
    schema_version VARCHAR(20)  NOT NULL,
    institution_id INTEGER      REFERENCES institutions(id) ON DELETE SET NULL,
    schema_status  VARCHAR(20)  NOT NULL DEFAULT 'draft'
                       CHECK (schema_status IN ('draft','active','deprecated','archived')),
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted     INTEGER      NOT NULL DEFAULT 0 CHECK (is_deleted IN (0,1)),
    deleted_at     DATETIME
);

-- ----------------------------------------------------------------------------
-- source_schema_fields
-- ----------------------------------------------------------------------------
CREATE TABLE source_schema_fields (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    source_schema_id INTEGER      NOT NULL REFERENCES source_schemas(id) ON DELETE CASCADE,
    field_name       VARCHAR(255) NOT NULL,
    field_data_type  VARCHAR(30)  NOT NULL
                         CHECK (field_data_type IN (
                             'string','integer','decimal','date',
                             'boolean','enum','object','array')),
    is_mandatory     INTEGER      NOT NULL DEFAULT 0 CHECK (is_mandatory IN (0,1)),
    description      TEXT
);

CREATE INDEX idx_source_schema_fields_schema_id ON source_schema_fields (source_schema_id);

-- ----------------------------------------------------------------------------
-- mapping_versions
-- ----------------------------------------------------------------------------
CREATE TABLE mapping_versions (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    source_schema_id       INTEGER      NOT NULL REFERENCES source_schemas(id) ON DELETE CASCADE,
    version_tag            VARCHAR(20)  NOT NULL,
    mapping_version_status VARCHAR(20)  NOT NULL DEFAULT 'draft'
                               CHECK (mapping_version_status IN (
                                   'draft','pending_review','approved','rejected','deprecated')),
    coverage_percent       DECIMAL(5,2),
    created_by_user_id     INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    approved_by_user_id    INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    created_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at            DATETIME,
    CONSTRAINT uq_mapping_versions UNIQUE (source_schema_id, version_tag)
);

-- ----------------------------------------------------------------------------
-- mapping_pairs (confidence on 0.0000–1.0000 scale)
-- ----------------------------------------------------------------------------
CREATE TABLE mapping_pairs (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    mapping_version_id INTEGER        NOT NULL REFERENCES mapping_versions(id)     ON DELETE CASCADE,
    source_field_id    INTEGER        NOT NULL REFERENCES source_schema_fields(id) ON DELETE RESTRICT,
    canonical_field_id INTEGER        NOT NULL REFERENCES canonical_fields(id)     ON DELETE RESTRICT,
    confidence_score   DECIMAL(5,4)   NOT NULL,
    mapping_method     VARCHAR(20)
                           CHECK (mapping_method IN ('EXACT','FUZZY','INFERRED','MANUAL')),
    is_approved        INTEGER        NOT NULL DEFAULT 0 CHECK (is_approved IN (0,1)),
    mapped_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mapping_pairs_mapping_version_id ON mapping_pairs (mapping_version_id);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
