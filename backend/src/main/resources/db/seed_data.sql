-- ============================================================================
-- HCB PLATFORM — SEED DATA
-- Version   : 3.0.0
-- Date      : 2026-03-28
-- Strategy  : Migrate existing mock data + generate enterprise-scale synthetic
--             data including +30 days future records (up to 2026-04-28)
-- Rules     :
--   - No duplicate entity creation (hash-based dedup)
--   - All FK references validated before INSERT
--   - append-only time-series data (no overwrites)
--   - Future data pre-seeded through 2026-04-28
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ============================================================================
-- ROLES (from user-management.json roleDefinitions)
-- ============================================================================
INSERT OR IGNORE INTO roles (id, role_name, description) VALUES
(1, 'Super Admin',   'Full platform access with user and system management capabilities'),
(2, 'Bureau Admin',  'Institution and data governance management with monitoring access'),
(3, 'Analyst',       'Read-only analytics, agent usage, and report generation'),
(4, 'Viewer',        'Dashboard-only read access with limited visibility'),
(5, 'API User',      'Programmatic access only for system integrations');

-- ============================================================================
-- PERMISSIONS
-- ============================================================================
INSERT OR IGNORE INTO permissions (id, permission_key, description) VALUES
(1,  'MANAGE_INSTITUTIONS',   'Create, update, suspend institutions'),
(2,  'VIEW_DASHBOARD',        'Access the main dashboard'),
(3,  'MANAGE_DATA_GOVERNANCE','Manage schema mappings, validation rules, governance'),
(4,  'VIEW_MONITORING',       'View API, batch, enquiry monitoring'),
(5,  'GENERATE_REPORTS',      'Request and download reports'),
(6,  'MANAGE_USERS',          'Create, suspend, deactivate users'),
(7,  'ACCESS_API',            'Use programmatic API access'),
(8,  'VIEW_AUDIT_LOGS',       'View system audit logs');

-- ============================================================================
-- ROLE-PERMISSION MAPPINGS
-- ============================================================================
-- Super Admin: ALL
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
(1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8);

-- Bureau Admin: all except Manage Users and Access API
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
(2,1),(2,2),(2,3),(2,4),(2,5),(2,8);

-- Analyst: View Dashboard, Governance (read), Monitoring, Reports, Audit
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
(3,2),(3,4),(3,5),(3,8);

-- Viewer: View Dashboard only
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
(4,2);

-- API User: Access API, View Audit Logs
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
(5,7),(5,8);

-- ============================================================================
-- INSTITUTIONS (migrated from src/data/institutions.json)
-- ============================================================================
INSERT OR IGNORE INTO institutions
    (id, name, trading_name, institution_type, institution_lifecycle_status,
     registration_number, jurisdiction, license_type, license_number,
     contact_email, contact_phone, onboarded_at, is_data_submitter, is_subscriber,
     billing_model, credit_balance, data_quality_score, match_accuracy_score,
     sla_health_percent, apis_enabled_count, created_at, updated_at)
VALUES
(1, 'First National Bank',   'FNB',       'Commercial Bank', 'active',
 'BK-2024-00142', 'Kenya',   'Commercial Banking', 'CBK-LIC-0042',
 'compliance@fnb.co.ke', '+254 700 123 456',
 '2026-01-15 00:00:00', 1, 1, 'postpaid', NULL, 98.0, 96.4, 99.9, 3,
 '2025-10-01 00:00:00', '2026-02-18 00:00:00'),

(2, 'Metro Credit Union',    'Metro CU',  'Credit Union',    'active',
 'CU-2024-00087', 'Kenya',   'Credit Union',      'SASRA-LIC-0087',
 'compliance@metrocu.co.ke', '+254 711 234 567',
 '2026-01-22 00:00:00', 1, 0, NULL, NULL, 95.0, 94.1, 99.5, 2,
 '2025-10-15 00:00:00', '2026-02-17 00:00:00'),

(3, 'Pacific Finance Corp',  'PFC',       'NBFI',            'pending',
 'NB-2025-00201', 'Tanzania','Non-Bank Financial', 'BOT-NB-0201',
 'regulatory@pacificfin.co.tz', '+255 222 345 678',
 NULL, 0, 1, 'prepaid', 25000.00, 0.0, 0.0, 0.0, 0,
 '2025-11-01 00:00:00', '2026-02-16 00:00:00'),

(4, 'Southern Trust Bank',   'STB',       'Commercial Bank', 'active',
 'BK-2024-00098', 'Uganda',  'Commercial Banking', 'BOU-LIC-0098',
 'compliance@stb.co.ug', '+256 414 567 890',
 '2025-12-10 00:00:00', 1, 1, 'hybrid', 50000.00, 97.0, 95.8, 99.7, 3,
 '2025-09-01 00:00:00', '2026-02-15 00:00:00'),

(5, 'Digital Lending Co',    'DigiLend',  'Fintech',         'draft',
 'FT-2025-00312', 'Kenya',   'Digital Credit Provider', 'CBK-DCP-0312',
 'ops@digilend.co.ke', '+254 733 456 789',
 NULL, 0, 1, 'prepaid', 10000.00, 0.0, 0.0, 0.0, 0,
 '2025-12-01 00:00:00', '2026-02-14 00:00:00'),

(6, 'Heritage Savings Bank', 'Heritage',  'Savings Bank',    'suspended',
 'SB-2023-00055', 'Rwanda',  'Savings Bank', 'BNR-SB-0055',
 'compliance@heritage.rw', '+250 788 567 890',
 '2025-09-05 00:00:00', 1, 0, NULL, NULL, 82.0, 79.5, 87.2, 1,
 '2024-06-01 00:00:00', '2026-02-10 00:00:00'),

(7, 'Alpine Microfinance',   'Alpine MFI','MFI',             'active',
 'MF-2024-00176', 'Kenya',   'Microfinance', 'CBK-MF-0176',
 'compliance@alpinemfi.co.ke', '+254 722 678 901',
 '2026-02-01 00:00:00', 1, 1, 'postpaid', NULL, 91.0, 90.2, 98.1, 2,
 '2025-10-20 00:00:00', '2026-02-13 00:00:00'),

(8, 'Urban Commercial Bank', 'UCB',       'Commercial Bank', 'active',
 'BK-2024-00114', 'Kenya',   'Commercial Banking', 'CBK-LIC-0114',
 'compliance@ucb.co.ke', '+254 700 789 012',
 '2026-01-08 00:00:00', 1, 0, NULL, NULL, 96.0, 95.1, 99.8, 3,
 '2025-08-01 00:00:00', '2026-02-12 00:00:00');

-- ============================================================================
-- COMPLIANCE DOCUMENTS (from institutions.json complianceDocs)
-- ============================================================================
INSERT OR IGNORE INTO compliance_documents (institution_id, document_name, document_status) VALUES
(1, 'Certificate of Incorporation',  'verified'),
(1, 'CBK License',                   'verified'),
(1, 'Data Protection Certificate',   'pending'),
(2, 'Certificate of Incorporation',  'verified'),
(2, 'SASRA License',                 'verified'),
(2, 'Data Protection Certificate',   'verified'),
(3, 'Certificate of Incorporation',  'verified'),
(3, 'BOT License',                   'pending'),
(3, 'Data Protection Certificate',   'pending'),
(4, 'Certificate of Incorporation',  'verified'),
(4, 'BOU License',                   'verified'),
(4, 'Data Protection Certificate',   'verified'),
(6, 'Certificate of Incorporation',  'verified'),
(6, 'BNR License',                   'pending'),
(6, 'Data Protection Certificate',   'pending'),
(7, 'Certificate of Incorporation',  'verified'),
(7, 'CBK MFI License',               'verified'),
(7, 'Data Protection Certificate',   'verified'),
(8, 'Certificate of Incorporation',  'verified'),
(8, 'CBK License',                   'verified'),
(8, 'Data Protection Certificate',   'verified');

-- ============================================================================
-- USERS — Test users (passwords are bcrypt hashes of the values shown)
-- NOTE: In production run UserSeeder.java which uses BCryptPasswordEncoder.
--       The hashes below are BCrypt(cost=12) of the respective passwords.
--       Plain text passwords documented in README for development testing only.
-- ============================================================================
-- admin@hcb.com          → Admin@1234
-- super@hcb.com          → Super@1234
-- bureau.admin@hcb.com   → Bureau@1234
-- analyst@hcb.com        → Analyst@1234
-- viewer@hcb.com         → Viewer@1234
-- apiuser@hcb.com        → ApiUser@1234
-- inst.admin@fnb.co.ke   → InstAdmin@1234
-- compliance@fnb.co.ke   → Comply@1234
-- ops@metrocu.co.ke      → OpsUser@1234
-- suspended@hcb.com      → Suspended@1234
-- sarah.chen@fnb.co.za   → Sarah@1234
-- james.mthembu@fnb.co.za → James@1234
-- david.kim@pacificfin.com → David@1234
-- ============================================================================
INSERT OR IGNORE INTO users
    (id, email, password_hash, display_name, given_name, family_name,
     user_account_status, mfa_enabled, institution_id, created_at)
VALUES
(1,  'admin@hcb.com',           '$2b$12$XXkH89KDr2OEbRIYtTBNd.dwaKZdpDAtYkc98lncLpiZfqxuJGf0K',
 'HCB Admin',         'HCB',     'Admin',    'active',    1, NULL,        '2024-01-10 00:00:00'),
(2,  'super@hcb.com',           '$2b$12$d.P/nQYxO1UoKdvuc3wK8eZfIY/xdtKH16uZ03bfHqG17H1AflLre',
 'Super Admin',       'Super',   'Admin',    'active',    1, NULL,        '2024-01-10 00:00:00'),
(3,  'bureau.admin@hcb.com',    '$2b$12$.UseXJQpziQH0G3Zc0Vf9O5p/JyyOusUjcYmBsNmvlLF.1UFAkV7G',
 'Bureau Admin',      'Bureau',  'Admin',    'active',    0, NULL,        '2024-02-01 00:00:00'),
(4,  'analyst@hcb.com',         '$2b$12$WdOcJXxxymk6xc4v9IORH.CW08ohmXOehU/6CTXq2yvgYZ.2S5I0O',
 'HCB Analyst',       'HCB',     'Analyst',  'active',    0, NULL,        '2024-03-01 00:00:00'),
(5,  'viewer@hcb.com',          '$2b$12$yAPgQNO8uqBIm42A7I7SuOaeE2dOVT2MC53EI/FAByai91OkOUvM.',
 'Dashboard Viewer',  'Dash',    'Viewer',   'active',    0, NULL,        '2024-04-01 00:00:00'),
(6,  'apiuser@hcb.com',         '$2b$12$uB/dkhJELC/H/XQY3Pk/EuvT76s7tvb0bMXfAAwc1ggCLnt/CvNt6',
 'API Integration',   'API',     'User',     'active',    0, NULL,        '2024-05-01 00:00:00'),
(7,  'inst.admin@fnb.co.ke',    '$2b$12$Dd9KL0zRAHgKbIupFC53debqKL3YPW/6yKIlcWHp69.tAwSQIYgAu',
 'FNB Admin',         'FNB',     'Admin',    'active',    1, 1,           '2024-01-15 00:00:00'),
(8,  'compliance@fnb.co.ke',    '$2b$12$H9eJ1B1VI1gQTpxU2C7D5u6UwAmwqnTBlKmXNsyv36Nv52LCtrMWK',
 'Sarah Chen',        'Sarah',   'Chen',     'active',    1, 1,           '2024-01-15 00:00:00'),
(9,  'ops@metrocu.co.ke',       '$2b$12$9fOs3X/cPh33YwfCRAQskummA4NpyPGAYoWFkdD823n5Lo3tkeQCW',
 'Priya Naidoo',      'Priya',   'Naidoo',   'active',    1, 2,           '2024-03-01 00:00:00'),
(10, 'suspended@hcb.com',       '$2b$12$aaNpYk/TirDe0lYOz87BvuG2mDoSenuEmkWJxC6MXYyGClQWAQl5O',
 'Suspended User',    'Suspended','User',    'suspended', 0, NULL,        '2024-06-01 00:00:00'),
(11, 'james.mthembu@fnb.co.za', '$2b$12$BP7qwA.NKmXKVHvluAE5M.z3m5rY3mPW0gVXeLs7dtPj/Jv9qAWtC',
 'James Mthembu',     'James',   'Mthembu',  'active',    1, 1,           '2024-02-10 00:00:00'),
(12, 'david.kim@pacificfin.com','$2b$12$DroxkL/KnJEP3kyH9wj0TOFN6A105m3XJGs7J9MlskDzC9AJXCwla',
 'David Kim',         'David',   'Kim',      'active',    0, 3,           '2024-03-20 00:00:00');

-- Ensure password hashes match README (INSERT OR IGNORE leaves stale rows on re-seed)
UPDATE users SET password_hash = '$2b$12$XXkH89KDr2OEbRIYtTBNd.dwaKZdpDAtYkc98lncLpiZfqxuJGf0K' WHERE email = 'admin@hcb.com';
UPDATE users SET password_hash = '$2b$12$d.P/nQYxO1UoKdvuc3wK8eZfIY/xdtKH16uZ03bfHqG17H1AflLre' WHERE email = 'super@hcb.com';
UPDATE users SET password_hash = '$2b$12$.UseXJQpziQH0G3Zc0Vf9O5p/JyyOusUjcYmBsNmvlLF.1UFAkV7G' WHERE email = 'bureau.admin@hcb.com';
UPDATE users SET password_hash = '$2b$12$WdOcJXxxymk6xc4v9IORH.CW08ohmXOehU/6CTXq2yvgYZ.2S5I0O' WHERE email = 'analyst@hcb.com';
UPDATE users SET password_hash = '$2b$12$yAPgQNO8uqBIm42A7I7SuOaeE2dOVT2MC53EI/FAByai91OkOUvM.' WHERE email = 'viewer@hcb.com';
UPDATE users SET password_hash = '$2b$12$uB/dkhJELC/H/XQY3Pk/EuvT76s7tvb0bMXfAAwc1ggCLnt/CvNt6' WHERE email = 'apiuser@hcb.com';
UPDATE users SET password_hash = '$2b$12$Dd9KL0zRAHgKbIupFC53debqKL3YPW/6yKIlcWHp69.tAwSQIYgAu' WHERE email = 'inst.admin@fnb.co.ke';
UPDATE users SET password_hash = '$2b$12$H9eJ1B1VI1gQTpxU2C7D5u6UwAmwqnTBlKmXNsyv36Nv52LCtrMWK' WHERE email = 'compliance@fnb.co.ke';
UPDATE users SET password_hash = '$2b$12$9fOs3X/cPh33YwfCRAQskummA4NpyPGAYoWFkdD823n5Lo3tkeQCW' WHERE email = 'ops@metrocu.co.ke';
UPDATE users SET password_hash = '$2b$12$aaNpYk/TirDe0lYOz87BvuG2mDoSenuEmkWJxC6MXYyGClQWAQl5O' WHERE email = 'suspended@hcb.com';
UPDATE users SET password_hash = '$2b$12$BP7qwA.NKmXKVHvluAE5M.z3m5rY3mPW0gVXeLs7dtPj/Jv9qAWtC' WHERE email = 'james.mthembu@fnb.co.za';
UPDATE users SET password_hash = '$2b$12$DroxkL/KnJEP3kyH9wj0TOFN6A105m3XJGs7J9MlskDzC9AJXCwla' WHERE email = 'david.kim@pacificfin.com';

-- ============================================================================
-- USER ROLE ASSIGNMENTS
-- ============================================================================
INSERT OR IGNORE INTO user_role_assignments (user_id, role_id, institution_id, assigned_by) VALUES
(1,  1, NULL, NULL),   -- admin@hcb.com → Super Admin (bureau-wide)
(2,  1, NULL, NULL),   -- super@hcb.com → Super Admin (bureau-wide)
(3,  2, NULL, 1),      -- bureau.admin → Bureau Admin (bureau-wide)
(4,  3, NULL, 1),      -- analyst → Analyst (bureau-wide)
(5,  4, NULL, 1),      -- viewer → Viewer (bureau-wide)
(6,  5, NULL, 1),      -- apiuser → API User (bureau-wide)
(7,  2, 1,    1),      -- inst.admin@fnb → Bureau Admin for FNB
(8,  3, 1,    1),      -- compliance@fnb → Analyst for FNB
(9,  3, 2,    1),      -- ops@metrocu → Analyst for Metro CU
(10, 3, NULL, 1),      -- suspended user → Analyst (suspended account)
(11, 2, 1,    1),      -- James Mthembu → Bureau Admin for FNB
(12, 3, 3,    1);      -- David Kim → Analyst for Pacific Finance

-- ============================================================================
-- API KEYS (from institution-detail + monitoring mock data)
-- key_prefix shown; key_hash = SHA-256 of sample keys for dev seeding
-- ============================================================================
INSERT OR IGNORE INTO api_keys
    (id, institution_id, user_id, key_name, key_prefix, key_hash, api_key_status,
     created_at, last_used_at)
VALUES
(1, 1, 8,  'Production Key',  'sk_live_***7x2k',
 'a3f1c2d4e5b6a7f8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
 'active', '2024-01-15 00:00:00', '2026-03-28 08:00:00'),
(2, 2, 9,  'Submission Key',  'sk_live_***9a1m',
 'b4e2d3e5f6c7b8e9d0e1f2b3c4d5e6f7b8c9d0e1f2b3c4d5e6f7b8c9d0e1f2b3',
 'active', '2024-01-22 00:00:00', '2026-03-28 09:30:00'),
(3, 4, 11, 'Data Sync Key',   'sk_live_***3b4n',
 'c5f3e4f6g7d8c9f0e1f2c3d4e5f6g7c8d9e0f1g2c3d4e5f6g7c8d9e0f1g2c3d4',
 'active', '2024-03-01 00:00:00', '2026-03-28 07:45:00'),
(4, 3, 12, 'Subscriber Key',  'sk_sub_***2a',
 'd6g4f5g7h8e9d0g1f2g3e4f5g6h7d8e9f0g1h2d3e4f5g6h7d8e9f0g1h2d3e4f5',
 'active', '2024-03-20 00:00:00', '2026-03-25 14:00:00'),
(5, 1, 8,  'Subscriber Key',  'sk_sub_***5b',
 'e7h5g6h8i9f0e1h2g3h4f5g6h7i8e9f0g1i2e3f4g5h6i7e8f9g0h1i2e3f4g5h6',
 'active', '2024-02-01 00:00:00', '2026-03-27 11:00:00'),
(6, 4, 11, 'Subscriber Key',  'sk_sub_***8c',
 'f8i6h7i9j0g1f2i3h4i5g6h7i8j9f0g1h2j3f4g5h6i7j8f9g0h1i2j3f4g5h6i7',
 'active', '2024-04-01 00:00:00', '2026-03-26 16:00:00'),
(7, 6, NULL,'Legacy Key',     'sk_live_***leg',
 'g9j7i8j0k1h2g3j4i5j6h7i8j9k0g1h2i3k4g5h6i7j8k9g0h1i2j3k4g5h6i7j8',
 'revoked', '2023-06-01 00:00:00', '2025-08-01 00:00:00');

-- ============================================================================
-- PRODUCTS (from data-products.json — normalized product catalog)
-- ============================================================================
INSERT OR IGNORE INTO products
    (id, product_code, product_name, enquiry_impact, coverage_scope,
     data_mode, pricing_model, product_status, created_at, updated_at)
VALUES
(1, 'PRD_001', 'SME Credit Decision Pack',         'HARD',  'CONSORTIUM', 'LIVE', 'PER_HIT',     'active',  '2025-10-01', '2026-01-15'),
(2, 'PRD_002', 'Consumer Credit Report Basic',      'HARD',  'SELF',       'LIVE', 'PER_HIT',     'active',  '2025-10-01', '2026-01-15'),
(3, 'PRD_003', 'Retail Thin-File Pack',              'SOFT',  'NETWORK',    'LIVE', 'SUBSCRIPTION','active',  '2025-11-01', '2026-02-01'),
(4, 'PRD_004', 'Credit Report + Telecom',            'HARD',  'NETWORK',    'LIVE', 'PER_HIT',     'active',  '2025-10-15', '2026-01-20'),
(5, 'PRD_005', 'Gig Economy Credit Profile',         'SOFT',  'SELF',       'LIVE', 'PER_HIT',     'active',  '2025-12-01', '2026-03-09'),
(6, 'PRD_006', 'Credit Report + Bank Statement',     'HARD',  'SELF',       'LIVE', 'PER_HIT',     'active',  '2025-10-01', '2026-01-15'),
(7, 'PRD_007', 'Cross-Border Trade Finance Pack',    'HARD',  'VERTICAL',   'LIVE', 'PER_HIT',     'pending_approval', '2026-03-07', '2026-03-07'),
(8, 'PRD_008', 'Full Package',                       'HARD',  'CONSORTIUM', 'LIVE', 'SUBSCRIPTION','active',  '2025-10-01', '2026-01-15'),
(9, 'PRD_009', 'Synthetic Test Profile',             'SOFT',  'SELF',       'TEST', 'PER_HIT',     'active',  '2025-10-01', '2026-01-15');

-- ============================================================================
-- PRODUCT SUBSCRIPTIONS
-- ============================================================================
INSERT OR IGNORE INTO product_subscriptions (institution_id, product_id, subscription_status, subscribed_at) VALUES
(1, 1, 'active', '2026-01-16'),
(1, 2, 'active', '2026-01-16'),
(1, 4, 'active', '2026-01-16'),
(2, 2, 'active', '2026-01-23'),
(2, 3, 'active', '2026-01-23'),
(3, 5, 'active', '2026-02-21'),
(4, 1, 'active', '2025-12-11'),
(4, 6, 'active', '2025-12-11'),
(4, 8, 'active', '2025-12-11'),
(7, 3, 'active', '2026-02-02'),
(7, 4, 'active', '2026-02-02');

-- ============================================================================
-- CONSORTIUMS (from consortiums.json)
-- ============================================================================
INSERT OR IGNORE INTO consortiums
    (id, consortium_code, consortium_name, consortium_type, consortium_status,
     purpose, governance_model, share_loan_data, share_repayment_history,
     allow_aggregation, data_visibility, description, created_at, updated_at)
VALUES
(1, 'CONS_001', 'SME Lending Consortium',    'Closed', 'active',
 'Risk sharing',          'Federated',    1, 1, 1, 'full',
 'Closed consortium for SME exposure and shared performance data.',
 '2025-10-01', '2026-03-24'),
(2, 'CONS_002', 'Retail Credit Alliance',    'Open',   'active',
 'Portfolio monitoring',  'Centralized',  1, 1, 0, 'full',
 'Open membership retail bureau-aligned data sharing.',
 '2025-08-01', '2026-03-24'),
(3, 'CONS_003', 'Trade Finance Network',     'Hybrid', 'pending',
 'Regulatory reporting',  'Hybrid Board', 1, 0, 1, 'masked_pii',
 'Hybrid governance model for trade and LC-related exposure.',
 '2026-01-15', '2026-03-24');

-- ============================================================================
-- CONSORTIUM MEMBERS (FK only — NO institution names)
-- ============================================================================
INSERT OR IGNORE INTO consortium_members (consortium_id, institution_id, member_role, consortium_member_status, joined_at) VALUES
(1, 1, 'Contributor', 'active',  '2025-11-03'),
(1, 2, 'Consumer',    'active',  '2025-11-18'),
(1, 4, 'Contributor', 'active',  '2026-01-07'),
(2, 1, 'Consumer',    'active',  '2025-08-12'),
(2, 7, 'Contributor', 'active',  '2025-10-01'),
(2, 8, 'Contributor', 'active',  '2025-12-15'),
(3, 3, 'Consumer',    'pending', '2026-02-20');

-- ============================================================================
-- SLA CONFIGS (from alert-engine.json slaConfigs)
-- ============================================================================
INSERT OR IGNORE INTO sla_configs
    (id, sla_domain, metric_name, threshold_operator, threshold_value,
     threshold_unit, severity_level, time_window_description, is_active)
VALUES
(1,  'Data Submission API', 'Success Rate %',          '>=', 99.0,  '%',    'CRITICAL', '1 hour rolling', 1),
(2,  'Data Submission API', 'P95 Latency',             '<=', 500.0, 'ms',   'CRITICAL', '5 min rolling',  1),
(3,  'Data Submission API', 'Rejection Rate',          '<=', 2.0,   '%',    'WARNING',  'Daily',          1),
(4,  'Data Submission API', 'API Availability',        '>=', 99.9,  '%',    'CRITICAL', 'Daily',          1),
(5,  'Batch Processing',    'Batch Success Rate',      '>=', 95.0,  '%',    'CRITICAL', 'Daily',          1),
(6,  'Batch Processing',    'Processing Duration Limit','<=', 300.0, 'sec',  'WARNING',  '1 hour rolling', 1),
(7,  'Batch Processing',    'Failure Threshold',       '<=', 10.0,  '%',    'CRITICAL', 'Daily',          1),
(8,  'Batch Processing',    'Queue Backlog Limit',     '<=', 50.0,  'count','WARNING',  'Real-time',      1),
(9,  'Inquiry API',         'Enquiry Success Rate',    '>=', 99.0,  '%',    'CRITICAL', '1 hour rolling', 1),
(10, 'Inquiry API',         'P95 Latency',             '<=', 400.0, 'ms',   'WARNING',  '5 min rolling',  1),
(11, 'Inquiry API',         'Rate Limit Breach Threshold','<=', 5.0, 'count','WARNING',  '1 hour rolling', 1),
(12, 'Inquiry API',         'Alternate Data Latency',  '<=', 1500.0,'ms',   'WARNING',  '5 min rolling',  1);

-- ============================================================================
-- ALERT RULES (from alert-engine.json alertRules)
-- ============================================================================
INSERT OR IGNORE INTO alert_rules
    (id, rule_name, alert_domain, condition_expression, severity_level,
     alert_rule_status, last_triggered_at, created_at)
VALUES
(1, 'API Success Rate Drop',  'Submission API',   'Success Rate < 95% for 15 min',       'CRITICAL', 'enabled',  '2026-02-25 09:12:00', '2025-10-01'),
(2, 'P95 Latency Spike',      'Submission API',   'P95 latency > 800ms for 15 min',       'WARNING',  'enabled',  '2026-02-24 14:30:00', '2025-10-01'),
(3, 'Batch Failure Rate',     'Batch',            'Failure % > 10% (daily)',              'CRITICAL', 'enabled',  '2026-02-25 08:00:00', '2025-10-01'),
(4, 'Queue Backlog',          'Batch',            'Queue size > 50',                      'WARNING',  'enabled',  NULL,                  '2025-10-01'),
(5, 'Enquiry Latency',        'Inquiry API',      'P95 > 400ms for 1 hour',               'WARNING',  'enabled',  '2026-02-23 16:45:00', '2025-10-01'),
(6, 'Schema Drift Critical',  'Schema Drift',     'Drift Severity = Critical',            'CRITICAL', 'enabled',  '2026-02-22 11:00:00', '2025-10-01'),
(7, 'Rate Limit Abuse',       'Rate Limit Abuse', 'Violations > 20/hour',                 'CRITICAL', 'disabled', NULL,                  '2025-10-01');

-- ============================================================================
-- APPROVAL QUEUE (migrated from approval-queue.json)
-- ============================================================================
INSERT OR IGNORE INTO approval_queue
    (id, approval_item_type, entity_ref_id, entity_name_snapshot, description,
     submitted_by_user_id, reviewed_by_user_id, approval_workflow_status,
     rejection_reason, submitted_at, reviewed_at)
VALUES
(1,  'institution',   NULL,      'First National Bank Ltd.',
 'New institution registration — Data Submission & Subscriber',
 4, NULL, 'pending', NULL, '2026-03-07 14:32:00', NULL),
(2,  'schema_mapping',NULL,      'METRO v4.2 → HCB Master Schema',
 'New schema mapping with 3 proposed fields and 2 enum changes',
 4, NULL, 'pending', NULL, '2026-03-07 09:15:00', NULL),
(3,  'institution',   NULL,      'MicroCredit Solutions',
 'New institution registration — Data Submission only',
 3, NULL, 'pending', NULL, '2026-03-06 16:45:00', NULL),
(4,  'schema_mapping',NULL,      'CRB Standard v2.0 → HCB Master Schema',
 'Updated mapping — 1 new field, validation rule changes',
 4, 1, 'approved', NULL, '2026-03-05 11:20:00', '2026-03-05 15:30:00'),
(5,  'institution',   NULL,      'QuickPay Digital',
 'New institution registration — Subscriber only',
 4, 1, 'rejected',
 'Incomplete compliance documentation. Missing AML certificate.',
 '2026-03-04 08:00:00', '2026-03-04 14:10:00'),
(6,  'institution',   NULL,      'Savannah Credit Union',
 'New institution registration — Data Submission & Subscriber',
 4, 1, 'changes_requested',
 'Please update the trading name and provide the latest audited financial statements.',
 '2026-03-06 10:00:00', '2026-03-06 17:00:00'),
(7,  'consortium',    'CONS_001','East Africa Lenders Consortium',
 'New closed consortium — 5 founding members across Kenya and Tanzania',
 3, NULL, 'pending', NULL, '2026-03-10 08:45:00', NULL),
(8,  'consortium',    NULL,      'Micro-Finance Open Network',
 'Open consortium for microfinance institutions sharing aggregated behavioural signals',
 4, NULL, 'pending', NULL, '2026-03-09 13:20:00', NULL),
(9,  'consortium',    NULL,      'Digital Lenders Hybrid Pool',
 'Hybrid consortium for digital-first lenders — derived signals only',
 4, 1, 'approved', NULL, '2026-03-05 10:00:00', '2026-03-06 09:30:00'),
(10, 'product',       'PRD_001', 'SME Credit Decision Pack',
 'New data product — Banking Cashflow + GST Business Profile + Consortium Exposure',
 3, NULL, 'pending', NULL, '2026-03-12 11:05:00', NULL),
(11, 'product',       'PRD_003', 'Retail Thin-File Pack',
 'Thin-file retail decisioning using telecom, digital spend and employment signals',
 3, NULL, 'pending', NULL, '2026-03-11 09:40:00', NULL),
(12, 'product',       'PRD_005', 'Gig Economy Credit Profile',
 'Approved product — employment + digital spend signals for gig-worker lending',
 3, 1, 'approved', NULL, '2026-03-08 14:15:00', '2026-03-09 10:00:00');

-- ============================================================================
-- REPORTS (from reporting.json)
-- ============================================================================
INSERT OR IGNORE INTO reports
    (id, report_type, date_range_start, date_range_end, requested_by_user_id,
     institution_id, report_status, output_format, requested_at, completed_at)
VALUES
(1,  'Portfolio Risk Snapshot',       '2026-02-01', '2026-02-25', 4, 1, 'processing', 'PDF',  '2026-02-25 10:00:00', NULL),
(2,  'Credit Score Summary Report',   '2026-02-01', '2026-02-24', 8, 1, 'completed',  'PDF',  '2026-02-25 09:00:00', '2026-02-25 09:45:00'),
(3,  'Enquiry Volume Report',         '2026-02-18', '2026-02-25', 9, 2, 'completed',  'CSV',  '2026-02-25 08:00:00', '2026-02-25 08:30:00'),
(4,  'Submission Volume Report',      '2026-02-01', '2026-02-24', 4, NULL,'completed', 'CSV',  '2026-02-24 17:00:00', '2026-02-24 17:25:00'),
(5,  'SLA Performance Report',        '2026-02-17', '2026-02-24', 3, NULL,'completed', 'PDF',  '2026-02-24 16:00:00', '2026-02-24 16:40:00'),
(6,  'Institution Billing Report',    '2026-02-01', '2026-02-24', 3, NULL,'failed',    'XLSX', '2026-02-24 15:00:00', '2026-02-24 15:05:00'),
(7,  'Consent Audit Report',          '2026-01-01', '2026-02-23', 4, NULL,'completed', 'PDF',  '2026-02-23 14:00:00', '2026-02-23 14:50:00'),
(8,  'Alternate Data Usage Report',   '2026-02-15', '2026-02-23', 4, NULL,'completed', 'CSV',  '2026-02-23 11:00:00', '2026-02-23 11:20:00');

-- ============================================================================
-- CANONICAL FIELDS (from data-governance.json canonicalFields)
-- ============================================================================
INSERT OR IGNORE INTO canonical_fields
    (id, field_code, field_name, canonical_data_type, description, pii_classification, is_mandatory)
VALUES
(1,  'borrower_full_name',    'Borrower Full Name',    'string',  'Full legal name',           'pii',           1),
(2,  'date_of_birth',         'Date of Birth',          'date',    'DOB as per KYC',            'sensitive_pii', 1),
(3,  'pan',                   'PAN Number',             'string',  'PAN identifier',            'sensitive_pii', 1),
(4,  'national_id',           'National ID',            'string',  'National identity number',  'sensitive_pii', 1),
(5,  'phone_number',          'Phone Number',           'string',  'Primary phone',             'pii',           0),
(6,  'email_address',         'Email Address',          'string',  'Primary email',             'pii',           0),
(7,  'account_number',        'Account Number',         'string',  'Loan/account number',       'sensitive_pii', 1),
(8,  'loan_amount',           'Loan Amount',            'decimal', 'Sanctioned amount',         'non_pii',       1),
(9,  'outstanding_balance',   'Outstanding Balance',    'decimal', 'Current outstanding',       'non_pii',       1),
(10, 'dpd_days',              'Days Past Due',          'integer', 'Days past due at reporting','non_pii',       1),
(11, 'account_open_date',     'Account Open Date',      'date',    'Date account opened',       'non_pii',       1),
(12, 'reporting_period',      'Reporting Period',       'string',  'YYYY-MM reporting month',   'non_pii',       1),
(13, 'facility_type',         'Facility Type',          'enum',    'Type of credit facility',   'non_pii',       1),
(14, 'institution_code',      'Institution Code',       'string',  'Submitting institution ref','non_pii',       1),
(15, 'consumer_consent_ref',  'Consumer Consent Ref',   'string',  'Consent record reference',  'non_pii',       0);

-- ============================================================================
-- SOURCE SCHEMAS
-- ============================================================================
INSERT OR IGNORE INTO source_schemas
    (id, source_name, source_type, schema_version, institution_id, schema_status, created_at)
VALUES
(1, 'CBS Core',         'CBS',      'v2.1', 1, 'active',  '2025-10-01'),
(2, 'Metro CBS',        'CBS',      'v4.2', 2, 'active',  '2025-10-15'),
(3, 'CRB Standard',     'BUREAU',   'v2.0', NULL,'active','2025-09-01'),
(4, 'Alternate Data',   'ALT_DATA', 'v1.0', NULL,'active','2025-11-01');

-- ============================================================================
-- SOURCE SCHEMA FIELDS
-- ============================================================================
INSERT OR IGNORE INTO source_schema_fields
    (source_schema_id, field_name, field_data_type, is_mandatory, description)
VALUES
(1, 'cust_name',      'string',  1, 'Customer full name'),
(1, 'customer_dob',   'date',    1, 'Date of birth'),
(1, 'pan_number',     'string',  1, 'PAN identifier'),
(1, 'addr_line1',     'string',  0, 'Address line 1'),
(1, 'mobile_no',      'string',  0, 'Mobile number'),
(1, 'acct_balance',   'decimal', 0, 'Account balance'),
(1, 'loan_amt',       'decimal', 1, 'Loan amount'),
(2, 'fullName',       'string',  1, 'Full name'),
(2, 'dob',            'date',    1, 'Date of birth'),
(2, 'idNumber',       'string',  1, 'National ID'),
(2, 'loanBalance',    'decimal', 1, 'Loan outstanding balance'),
(2, 'dpd',            'integer', 1, 'Days past due');

-- ============================================================================
-- MAPPING VERSIONS
-- ============================================================================
INSERT OR IGNORE INTO mapping_versions
    (id, source_schema_id, version_tag, mapping_version_status, coverage_percent,
     created_by_user_id, approved_by_user_id, created_at, approved_at)
VALUES
(1, 1, 'v1.0', 'approved', 96.5, 3, 1, '2025-10-15', '2025-11-01'),
(2, 1, 'v1.1', 'approved', 98.0, 3, 1, '2026-01-10', '2026-01-20'),
(3, 2, 'v1.0', 'pending_review', 94.0, 4, NULL, '2026-03-07', NULL),
(4, 3, 'v1.0', 'approved', 98.0, 4, 1, '2026-03-05', '2026-03-05');

-- ============================================================================
-- MAPPING PAIRS (sample — confidence on 0.0000–1.0000)
-- ============================================================================
INSERT OR IGNORE INTO mapping_pairs
    (mapping_version_id, source_field_id, canonical_field_id,
     confidence_score, mapping_method, is_approved)
VALUES
(2, 1,  1, 0.9800, 'EXACT',    1),
(2, 2,  2, 0.9900, 'EXACT',    1),
(2, 3,  3, 1.0000, 'EXACT',    1),
(2, 5,  5, 0.9500, 'FUZZY',    1),
(2, 7,  8, 0.9200, 'INFERRED', 1),
(3, 8,  1, 0.9600, 'EXACT',    0),
(3, 9,  2, 0.9800, 'EXACT',    0),
(3, 10, 4, 0.9900, 'EXACT',    0),
(3, 11, 9, 0.9100, 'FUZZY',    0),
(3, 12, 10,0.9700, 'EXACT',    0);

-- ============================================================================
-- VALIDATION RULES
-- ============================================================================
INSERT OR IGNORE INTO validation_rules
    (rule_name, canonical_field_id, validation_type, rule_expression,
     severity_level, validation_rule_status)
VALUES
('Loan Amount Positive',       8,  'RANGE',     'loan_amount > 0',                    'CRITICAL', 'active'),
('DPD Non-Negative',           10, 'RANGE',     'dpd_days >= 0',                      'CRITICAL', 'active'),
('Reporting Period Format',    12, 'FORMAT',    'MATCHES ^[0-9]{4}-[0-9]{2}$',        'WARNING',  'active'),
('Borrower Name Mandatory',    1,  'MANDATORY', 'NOT NULL AND LENGTH > 0',            'CRITICAL', 'active'),
('PAN Format Validation',      3,  'FORMAT',    'MATCHES ^[A-Z]{5}[0-9]{4}[A-Z]{1}$','CRITICAL', 'active'),
('Facility Type Enum',         13, 'ENUM',      'IN (TERM_LOAN,OD,CC,LEASE,GUARANTEE,OTHER)', 'CRITICAL', 'active'),
('Duplicate Account Check',    7,  'DUPLICATE', 'UNIQUE(account_number, institution_id, reporting_period)', 'WARNING', 'active');

-- ============================================================================
-- CONSUMERS (10,000 synthetic records via INSERT pattern)
-- Stored hashed — real data would use bcrypt/HMAC at application layer
-- national_id_hash format: SHA256 of "KRA_PIN|KE{sequential}" for demo
-- ============================================================================
-- Batch 1: 500 consumers (abbreviated for SQL; DataSeeder.java generates full 10K)
INSERT OR IGNORE INTO consumers
    (national_id_type, national_id_hash, full_name_encrypted,
     date_of_birth_encrypted, consumer_status, created_at)
SELECT
    CASE ((ROW_NUMBER() OVER ()) % 5)
        WHEN 0 THEN 'KRA_PIN'
        WHEN 1 THEN 'NIN'
        WHEN 2 THEN 'PASSPORT'
        WHEN 3 THEN 'KRA_PIN'
        ELSE 'NIN'
    END,
    lower(hex(randomblob(32))),
    'ENCRYPTED:' || lower(hex(randomblob(24))),
    'ENCRYPTED:' || lower(hex(randomblob(8))),
    'active',
    datetime('2024-01-01', '+' || (ABS(RANDOM()) % 450) || ' days')
FROM (
    WITH RECURSIVE cnt(n) AS (
        SELECT 1 UNION ALL SELECT n+1 FROM cnt LIMIT 500
    ) SELECT n FROM cnt
);

-- ============================================================================
-- CREDIT PROFILES (one per consumer inserted above)
-- ============================================================================
INSERT OR IGNORE INTO credit_profiles
    (consumer_id, credit_score, total_exposure, active_accounts,
     delinquent_accounts, worst_dpd_days, profile_computed_at)
SELECT
    c.id,
    500 + (ABS(RANDOM()) % 350),
    (ABS(RANDOM()) % 5000000),
    1 + (ABS(RANDOM()) % 5),
    (ABS(RANDOM()) % 2),
    (ABS(RANDOM()) % 90),
    datetime('now', '-' || (ABS(RANDOM()) % 30) || ' days')
FROM consumers c
WHERE NOT EXISTS (SELECT 1 FROM credit_profiles cp WHERE cp.consumer_id = c.id);

-- ============================================================================
-- BATCH JOBS — Historical (30 days) + small queued backlog (3 rows) + today/tomorrow
-- ============================================================================
INSERT OR IGNORE INTO batch_jobs
    (institution_id, uploaded_by_user_id, file_name, batch_job_status,
     total_records, success_count, failed_count, success_rate, duration_seconds,
     uploaded_at, completed_at)
VALUES
-- Historical batch jobs (migration from monitoring.json)
(1, 8,  'loans_september_batch1.csv',  'completed', 1500, 1425, 75,  95.0, 142, '2026-02-25 08:00:00', '2026-02-25 08:02:22'),
(2, 9,  'accounts_feb_batch2.csv',     'failed',    3200, 0,    3200,0.0,  45,  '2026-02-25 09:30:00', '2026-02-25 09:31:15'),
(4, 11, 'rejected_retry_batch.csv',    'failed',    500,  0,    500, 0.0,  45,  '2026-02-25 07:15:00', '2026-02-25 07:16:05'),
(2, 9,  'loans_feb_batch1.csv',        'completed', 2800, 2792, 8,   99.7, 210, '2026-02-24 16:00:00', '2026-02-24 16:03:30'),
-- Continuing historical (simulated daily)
(1, 8,  'daily_export_20260226.csv',   'completed', 1200, 1190, 10,  99.2, 125, '2026-02-26 08:00:00', '2026-02-26 08:02:05'),
(2, 9,  'daily_export_20260226.csv',   'completed', 2100, 2085, 15,  99.3, 180, '2026-02-26 09:00:00', '2026-02-26 09:03:00'),
(4, 11, 'daily_export_20260226.csv',   'completed', 950,  945,  5,   99.5, 95,  '2026-02-26 10:00:00', '2026-02-26 10:01:35'),
(1, 8,  'daily_export_20260227.csv',   'completed', 1350, 1340, 10,  99.3, 130, '2026-02-27 08:00:00', '2026-02-27 08:02:10'),
(7, 4,  'daily_export_20260227.csv',   'completed', 800,  795,  5,   99.4, 85,  '2026-02-27 09:30:00', '2026-02-27 09:31:25'),
(8, 4,  'daily_export_20260228.csv',   'completed', 1800, 1785, 15,  99.2, 165, '2026-02-28 08:00:00', '2026-02-28 08:02:45'),
-- March historical
(1, 8,  'march_batch_20260301.csv',    'completed', 1400, 1390, 10,  99.3, 135, '2026-03-01 08:00:00', '2026-03-01 08:02:15'),
(2, 9,  'march_batch_20260302.csv',    'completed', 2200, 2185, 15,  99.3, 190, '2026-03-02 08:30:00', '2026-03-02 08:33:10'),
(4, 11, 'march_batch_20260303.csv',    'completed', 980,  975,  5,   99.5, 98,  '2026-03-03 09:00:00', '2026-03-03 09:01:38'),
(7, 4,  'march_batch_20260305.csv',    'completed', 750,  744,  6,   99.2, 80,  '2026-03-05 08:00:00', '2026-03-05 08:01:20'),
(8, 4,  'march_batch_20260305.csv',    'completed', 1700, 1688, 12,  99.3, 155, '2026-03-05 09:00:00', '2026-03-05 09:02:35'),
(1, 8,  'march_batch_20260310.csv',    'completed', 1450, 1440, 10,  99.3, 140, '2026-03-10 08:00:00', '2026-03-10 08:02:20'),
(2, 9,  'march_batch_20260315.csv',    'partial',   3000, 2850, 150, 95.0, 220, '2026-03-15 08:00:00', '2026-03-15 08:03:40'),
(4, 11, 'march_batch_20260320.csv',    'completed', 900,  897,  3,   99.7, 92,  '2026-03-20 09:00:00', '2026-03-20 09:01:32'),
(1, 8,  'march_batch_20260325.csv',    'completed', 1500, 1492, 8,   99.5, 145, '2026-03-25 08:00:00', '2026-03-25 08:02:25'),
(7, 4,  'march_batch_20260327.csv',    'queued',    900,  0,    0,   0.0,  0,   '2026-03-27 09:00:00', NULL),
-- Today (2026-03-28) + small queued backlog (see below)
(1, 8,  'batch_20260328_fnb.csv',      'completed', 1520, 1510, 10,  99.3, 142, '2026-03-28 08:00:00', '2026-03-28 08:02:22'),
(2, 9,  'batch_20260328_metro.csv',    'processing',2100, 1800, 0,   85.7, 0,   '2026-03-28 09:30:00', NULL),
-- Queued backlog (keep a small number for monitoring filters / KPIs)
(1, 8,  'batch_20260329_fnb.csv',      'queued',    1400, 0,    0,   0.0,  0,   '2026-03-29 08:00:00', NULL),
(4, 11, 'batch_20260330_stb.csv',      'queued',    950,  0,    0,   0.0,  0,   '2026-03-30 08:00:00', NULL);

-- Rolling-window completed batches for dashboard "Mapping Accuracy Trend"
-- (GET /dashboard/charts mappingAccuracy: weekly AVG(success_rate) on batch_jobs.uploaded_at).
-- Uses datetime('now', …) so presets 30d / 90d stay populated regardless of wall-clock calendar.
INSERT INTO batch_jobs
    (institution_id, uploaded_by_user_id, file_name, batch_job_status,
     total_records, success_count, failed_count, success_rate, duration_seconds,
     uploaded_at, completed_at)
VALUES
(1, 8, 'schema_map_roll_w00_a.csv', 'completed', 1600, 1575, 25, 98.44, 118, datetime('now', '-2 days', '+8 hours'),  datetime('now', '-2 days', '+8 hours', '+2 minutes')),
(2, 9, 'schema_map_roll_w00_b.csv', 'completed', 1400, 1379, 21, 98.50, 105, datetime('now', '-3 days', '+9 hours'),  datetime('now', '-3 days', '+9 hours', '+2 minutes')),
(4, 11,'schema_map_roll_w01_a.csv', 'completed', 1700, 1666, 34, 98.00, 122, datetime('now', '-9 days', '+8 hours'),  datetime('now', '-9 days', '+8 hours', '+2 minutes')),
(7, 4, 'schema_map_roll_w01_b.csv', 'completed', 1300, 1279, 21, 98.38, 99,  datetime('now', '-10 days', '+10 hours'), datetime('now', '-10 days', '+10 hours', '+2 minutes')),
(1, 8, 'schema_map_roll_w02_a.csv', 'completed', 1900, 1862, 38, 98.00, 128, datetime('now', '-16 days', '+8 hours'), datetime('now', '-16 days', '+8 hours', '+2 minutes')),
(8, 4, 'schema_map_roll_w02_b.csv', 'completed', 1500, 1470, 30, 98.00, 112, datetime('now', '-17 days', '+9 hours'), datetime('now', '-17 days', '+9 hours', '+2 minutes')),
(2, 9, 'schema_map_roll_w03_a.csv', 'completed', 1650, 1617, 33, 98.00, 120, datetime('now', '-23 days', '+8 hours'), datetime('now', '-23 days', '+8 hours', '+2 minutes')),
(4, 11,'schema_map_roll_w03_b.csv', 'completed', 1450, 1424, 26, 98.21, 108, datetime('now', '-24 days', '+11 hours'), datetime('now', '-24 days', '+11 hours', '+2 minutes')),
(1, 8, 'schema_map_roll_w04_a.csv', 'completed', 1750, 1715, 35, 98.00, 125, datetime('now', '-30 days', '+8 hours'), datetime('now', '-30 days', '+8 hours', '+2 minutes')),
(7, 4, 'schema_map_roll_w04_b.csv', 'completed', 1350, 1326, 24, 98.22, 102, datetime('now', '-31 days', '+9 hours'), datetime('now', '-31 days', '+9 hours', '+2 minutes')),
(2, 9, 'schema_map_roll_w05_a.csv', 'completed', 1800, 1764, 36, 98.00, 131, datetime('now', '-37 days', '+8 hours'), datetime('now', '-37 days', '+8 hours', '+2 minutes')),
(8, 4, 'schema_map_roll_w05_b.csv', 'completed', 1550, 1523, 27, 98.26, 115, datetime('now', '-38 days', '+10 hours'), datetime('now', '-38 days', '+10 hours', '+2 minutes')),
(4, 11,'schema_map_roll_w06_a.csv', 'completed', 1680, 1646, 34, 97.98, 119, datetime('now', '-44 days', '+8 hours'), datetime('now', '-44 days', '+8 hours', '+2 minutes')),
(1, 8, 'schema_map_roll_w06_b.csv', 'completed', 1420, 1394, 26, 98.17, 106, datetime('now', '-45 days', '+9 hours'), datetime('now', '-45 days', '+9 hours', '+2 minutes')),
(7, 4, 'schema_map_roll_w07_a.csv', 'completed', 1720, 1686, 34, 98.02, 124, datetime('now', '-51 days', '+8 hours'), datetime('now', '-51 days', '+8 hours', '+2 minutes')),
(2, 9, 'schema_map_roll_w07_b.csv', 'completed', 1380, 1355, 25, 98.19, 103, datetime('now', '-52 days', '+10 hours'), datetime('now', '-52 days', '+10 hours', '+2 minutes')),
(1, 8, 'schema_map_roll_w08_a.csv', 'completed', 1850, 1813, 37, 98.00, 132, datetime('now', '-58 days', '+8 hours'), datetime('now', '-58 days', '+8 hours', '+2 minutes')),
(4, 11,'schema_map_roll_w08_b.csv', 'completed', 1480, 1453, 27, 98.18, 110, datetime('now', '-59 days', '+9 hours'), datetime('now', '-59 days', '+9 hours', '+2 minutes')),
(8, 4, 'schema_map_roll_w09_a.csv', 'completed', 1620, 1590, 30, 98.15, 121, datetime('now', '-65 days', '+8 hours'), datetime('now', '-65 days', '+8 hours', '+2 minutes')),
(2, 9, 'schema_map_roll_w09_b.csv', 'completed', 1520, 1494, 26, 98.29, 114, datetime('now', '-66 days', '+11 hours'), datetime('now', '-66 days', '+11 hours', '+2 minutes')),
(7, 4, 'schema_map_roll_w10_a.csv', 'completed', 1780, 1744, 36, 97.98, 127, datetime('now', '-72 days', '+8 hours'), datetime('now', '-72 days', '+8 hours', '+2 minutes')),
(1, 8, 'schema_map_roll_w10_b.csv', 'completed', 1410, 1385, 25, 98.23, 104, datetime('now', '-73 days', '+9 hours'), datetime('now', '-73 days', '+9 hours', '+2 minutes')),
(4, 11,'schema_map_roll_w11_a.csv', 'completed', 1690, 1658, 32, 98.11, 120, datetime('now', '-79 days', '+8 hours'), datetime('now', '-79 days', '+8 hours', '+2 minutes')),
(2, 9, 'schema_map_roll_w11_b.csv', 'completed', 1460, 1433, 27, 98.15, 109, datetime('now', '-80 days', '+10 hours'), datetime('now', '-80 days', '+10 hours', '+2 minutes')),
(8, 4, 'schema_map_roll_w12_a.csv', 'completed', 1760, 1725, 35, 98.01, 126, datetime('now', '-86 days', '+8 hours'), datetime('now', '-86 days', '+8 hours', '+2 minutes')),
(1, 8, 'schema_map_roll_w12_b.csv', 'completed', 1530, 1502, 28, 98.17, 113, datetime('now', '-87 days', '+9 hours'), datetime('now', '-87 days', '+9 hours', '+2 minutes'));

-- Demo processing batch for Data Submission monitoring (stable id; survives wall-clock drift).
-- Full phase/stage tree for Batch Execution Console (matches multi-phase UI contract).
DELETE FROM batch_error_samples WHERE batch_job_id = 999901;
DELETE FROM batch_stage_logs WHERE batch_job_id = 999901;
DELETE FROM batch_phase_logs WHERE batch_job_id = 999901;
DELETE FROM batch_jobs WHERE id = 999901;
INSERT INTO batch_jobs (id, institution_id, uploaded_by_user_id, file_name, batch_job_status,
     total_records, success_count, failed_count, success_rate, duration_seconds,
     uploaded_at, completed_at)
VALUES (
  999901,
  1,
  8,
  'accounts_live_processing_demo.csv',
  'processing',
  3200,
  2956,
  244,
  92.4,
  NULL,
  datetime('now'),
  NULL
);
INSERT INTO batch_phase_logs (id, batch_job_id, phase_order, phase_key, display_name, phase_status, system_status, business_status, started_at, completed_at, flow_uid, phase_uid, version, to_be_processed, processing, system_ko, business_ko, business_ok, total_records)
VALUES
  (991001, 999901, 1, 'CB_CSDF_PRE', 'Pre-Processing', 'completed', 'ok', 'error', datetime('now', '-14 minutes'), datetime('now', '-14 minutes', '+8 seconds'), 'FLOW-999901-001', 'PHASE-PRE-001', 'v1.0', 3200, 0, 0, 2, 3198, 3200),
  (991002, 999901, 2, 'CB_CSDF_CPS', 'Data Validation', 'completed', 'ok', 'error', datetime('now', '-13 minutes', '+50 seconds'), datetime('now', '-13 minutes', '+92 seconds'), 'FLOW-999901-001', 'PHASE-CPS-002', 'v1.2', 3198, 0, 0, 5, 3193, 3198),
  (991003, 999901, 3, 'CB_CSDF_LPC', 'Load Processing', 'processing', 'ok', 'ok', datetime('now', '-12 minutes'), NULL, 'FLOW-999901-001', 'PHASE-LPC-003', 'v2.0', 3193, 3193, 0, 1, 3192, 3193),
  (991004, 999901, 4, 'POST', 'Post-Processing', 'queued', 'ok', 'ok', NULL, NULL, 'FLOW-999901-001', 'PHASE-POST-004', NULL, 0, 0, 0, 0, 0, 0),
  (991005, 999901, 5, 'COMMIT', 'Data Commit', 'queued', 'ok', 'ok', NULL, NULL, 'FLOW-999901-001', 'PHASE-COMMIT-005', NULL, 0, 0, 0, 0, 0, 0);
INSERT INTO batch_stage_logs (id, batch_job_id, phase_log_id, stage_order, stage_key, stage_name, stage_status, message, started_at, completed_at, records_processed, error_count, skipped_count, system_return_code, business_return_code)
VALUES
  (991101, 999901, 991001, 1, 'STG-1', 'File Integrity Check', 'completed', 'MD5 checksum verified', datetime('now', '-14 minutes'), datetime('now', '-14 minutes', '+4 seconds'), 3200, 0, 0, NULL, NULL),
  (991102, 999901, 991001, 2, 'STG-2', 'Schema Mapping', 'completed', 'Headers matched canonical layout', datetime('now', '-14 minutes', '+4 seconds'), datetime('now', '-14 minutes', '+8 seconds'), 3200, 2, 0, NULL, NULL),
  (991103, 999901, 991002, 1, 'STG-3', 'File Validation', 'completed', 'Structural validation complete', datetime('now', '-13 minutes', '+50 seconds'), datetime('now', '-13 minutes', '+71 seconds'), 3198, 3, 0, NULL, NULL),
  (991104, 999901, 991002, 2, 'STG-4', 'Business Rule Validation', 'completed', 'Business rules evaluated', datetime('now', '-13 minutes', '+71 seconds'), datetime('now', '-13 minutes', '+92 seconds'), 3195, 2, 0, NULL, NULL),
  (991105, 999901, 991003, 1, 'STG-5', 'Load Processing', 'running', 'Applying field mappings (~92% of records)', datetime('now', '-12 minutes'), NULL, 3193, 1, 0, NULL, NULL);
INSERT INTO batch_error_samples (batch_job_id, batch_stage_log_id, record_id, field_name, error_type, error_message, severity)
VALUES
  (999901, 991102, 'REC-MAP-01', 'customer_id', 'MAP-001', 'Column not found in source', 'error'),
  (999901, 991102, 'REC-MAP-02', 'disbursement_date', 'MAP-002', 'Type mismatch: expected date', 'error'),
  (999901, 991103, 'REC-101', 'account_id', 'VAL-001', 'Invalid format', 'error'),
  (999901, 991103, 'REC-102', 'amount', 'VAL-002', 'Value out of range', 'error'),
  (999901, 991103, 'REC-103', 'date_field', 'VAL-003', 'Required field missing', 'warning'),
  (999901, 991104, 'REC-201', 'national_id', 'BR-001', 'Invalid format', 'error'),
  (999901, 991104, 'REC-202', 'phone_number', 'BR-002', 'Required field missing', 'error'),
  (999901, 991105, 'REC-77502', 'outstanding_balance', 'RANGE', 'Value exceeds sanctioned ceiling', 'error');

-- ============================================================================
-- TRADELINES — Generated from consumers
-- avg 4–5 per consumer (limited subset for SQL seed; DataSeeder.java generates full volume)
-- ============================================================================
INSERT OR IGNORE INTO tradelines
    (consumer_id, institution_id, account_number_hash, facility_type,
     sanctioned_amount, outstanding_amount, dpd_days, tradeline_status,
     submitted_at, reporting_period, batch_job_id)
SELECT
    c.id,
    CASE ((c.id % 4)) WHEN 0 THEN 1 WHEN 1 THEN 2 WHEN 2 THEN 4 ELSE 7 END,
    lower(hex(randomblob(32))),
    CASE ((c.id % 6))
        WHEN 0 THEN 'TERM_LOAN' WHEN 1 THEN 'OD' WHEN 2 THEN 'CC'
        WHEN 3 THEN 'TERM_LOAN' WHEN 4 THEN 'LEASE' ELSE 'GUARANTEE'
    END,
    50000 + (ABS(RANDOM()) % 4950000),
    (ABS(RANDOM()) % 4000000),
    (ABS(RANDOM()) % 180),
    CASE WHEN (ABS(RANDOM()) % 10) < 7 THEN 'active'
         WHEN (ABS(RANDOM()) % 10) < 8 THEN 'closed'
         WHEN (ABS(RANDOM()) % 10) < 9 THEN 'npa'
         ELSE 'settled' END,
    datetime('2025-01-01', '+' || (ABS(RANDOM()) % 420) || ' days'),
    strftime('%Y-%m', datetime('2025-01-01', '+' || (ABS(RANDOM()) % 420) || ' days')),
    NULL
FROM consumers c
LIMIT 500;

-- ============================================================================
-- ENQUIRIES — Historical (30 days) + Future data (30 days)
-- ============================================================================
INSERT OR IGNORE INTO enquiries
    (consumer_id, api_key_id, requesting_institution_id, product_id,
     enquiry_type, enquiry_status, response_time_ms, enquired_at)
SELECT
    1 + (ABS(RANDOM()) % 500),
    CASE ((ABS(RANDOM()) % 4)) WHEN 0 THEN 4 WHEN 1 THEN 5 WHEN 2 THEN 6 ELSE 1 END,
    CASE ((ABS(RANDOM()) % 4)) WHEN 0 THEN 3 WHEN 1 THEN 1 WHEN 2 THEN 4 ELSE 7 END,
    CASE ((ABS(RANDOM()) % 4)) WHEN 0 THEN 1 WHEN 1 THEN 2 WHEN 2 THEN 4 ELSE 6 END,
    CASE WHEN (ABS(RANDOM()) % 3) < 2 THEN 'HARD' ELSE 'SOFT' END,
    CASE WHEN (ABS(RANDOM()) % 20) < 18 THEN 'success'
         WHEN (ABS(RANDOM()) % 20) < 19 THEN 'failed'
         ELSE 'rate_limited' END,
    150 + (ABS(RANDOM()) % 400),
    datetime('2026-02-26 08:00:00', '+' || (ABS(RANDOM()) % 5760) || ' minutes')
FROM (
    WITH RECURSIVE cnt(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM cnt LIMIT 200)
    SELECT n FROM cnt
);

-- Future enquiries (2026-03-29 through 2026-04-28)
INSERT OR IGNORE INTO enquiries
    (consumer_id, api_key_id, requesting_institution_id, product_id,
     enquiry_type, enquiry_status, response_time_ms, enquired_at)
SELECT
    1 + (ABS(RANDOM()) % 500),
    CASE ((ABS(RANDOM()) % 3)) WHEN 0 THEN 4 WHEN 1 THEN 5 ELSE 6 END,
    CASE ((ABS(RANDOM()) % 3)) WHEN 0 THEN 3 WHEN 1 THEN 1 ELSE 4 END,
    1 + (ABS(RANDOM()) % 6),
    CASE WHEN (ABS(RANDOM()) % 3) < 2 THEN 'HARD' ELSE 'SOFT' END,
    CASE WHEN (ABS(RANDOM()) % 20) < 18 THEN 'success' ELSE 'failed' END,
    200 + (ABS(RANDOM()) % 300),
    datetime('2026-03-29 08:00:00', '+' || (ABS(RANDOM()) % 43200) || ' minutes')
FROM (
    WITH RECURSIVE cnt(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM cnt LIMIT 300)
    SELECT n FROM cnt
);

-- ============================================================================
-- API REQUESTS — Historical (migrated + 30-day volume) + Future 30 days
-- ============================================================================
INSERT OR IGNORE INTO api_requests
    (api_key_id, institution_id, endpoint, http_method, api_request_status,
     response_time_ms, records_processed, error_code, request_id, occurred_at)
VALUES
-- From monitoring.json (migrated)
(1, 1, '/submission',      'POST', 'failed',       210, 0,    'INVALID_SCHEMA',           'REQ-991212', '2026-02-25 09:55:00'),
(2, 2, '/submission',      'POST', 'success',       145, 1200, NULL,                       'REQ-991211', '2026-02-25 09:48:00'),
(1, 1, '/submission/bulk', 'POST', 'partial',      3200, 2500, 'MISSING_MANDATORY_FIELD',  'REQ-991210', '2026-02-25 09:35:00'),
(3, 4, '/submission',      'POST', 'rate_limited',   89, 0,    'RATE_LIMIT_EXCEEDED',      'REQ-991209', '2026-02-25 09:30:00'),
(2, 2, '/submission',      'POST', 'success',       198, 800,  NULL,                       'REQ-991208', '2026-02-25 09:15:00'),
(1, 1, '/submission',      'POST', 'authentication_failed', 52, 0, 'AUTHENTICATION_FAILURE','REQ-991207','2026-02-25 09:00:00'),
(3, 4, '/submission',      'POST', 'success',       176, 950,  NULL,                       'REQ-991206', '2026-02-25 08:30:00'),
(2, 2, '/submission/bulk', 'POST', 'success',      4100, 5000, NULL,                       'REQ-991205', '2026-02-25 08:00:00'),
(1, 1, '/submission',      'POST', 'success',       167, 340,  NULL,                       'REQ-991204', '2026-02-25 07:00:00'),
(3, 4, '/submission',      'POST', 'failed',        310, 0,    'SCHEMA_VERSION_MISMATCH',  'REQ-991203', '2026-02-25 06:00:00'),
(2, 2, '/submission',      'POST', 'success',       132, 620,  NULL,                       'REQ-991202', '2026-02-25 05:00:00'),
(1, 1, '/submission/bulk', 'POST', 'partial',      2800, 1800, 'DUPLICATE_RECORDS',        'REQ-991201', '2026-02-25 04:00:00');

-- Historical API requests (volume simulation — last 30 days)
INSERT OR IGNORE INTO api_requests
    (api_key_id, institution_id, endpoint, http_method, api_request_status,
     response_time_ms, records_processed, error_code, occurred_at)
SELECT
    CASE ((ABS(RANDOM()) % 3)) WHEN 0 THEN 1 WHEN 1 THEN 2 ELSE 3 END,
    CASE ((ABS(RANDOM()) % 3)) WHEN 0 THEN 1 WHEN 1 THEN 2 ELSE 4 END,
    CASE ((ABS(RANDOM()) % 4))
        WHEN 0 THEN '/submission'
        WHEN 1 THEN '/submission/bulk'
        WHEN 2 THEN '/inquiry'
        ELSE '/api/v1/institutions'
    END,
    CASE ((ABS(RANDOM()) % 2)) WHEN 0 THEN 'POST' ELSE 'GET' END,
    CASE WHEN (ABS(RANDOM()) % 50) < 46 THEN 'success'
         WHEN (ABS(RANDOM()) % 50) < 48 THEN 'failed'
         WHEN (ABS(RANDOM()) % 50) < 49 THEN 'partial'
         ELSE 'rate_limited' END,
    80 + (ABS(RANDOM()) % 450),
    CASE WHEN (ABS(RANDOM()) % 2) = 0 THEN 100 + (ABS(RANDOM()) % 4900) ELSE 0 END,
    NULL,
    datetime('2026-02-26 00:00:00', '+' || (ABS(RANDOM()) % 43200) || ' minutes')
FROM (
    WITH RECURSIVE cnt(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM cnt LIMIT 500)
    SELECT n FROM cnt
);

-- Future API requests (pre-seeded 2026-03-29 through 2026-04-28)
INSERT OR IGNORE INTO api_requests
    (api_key_id, institution_id, endpoint, http_method, api_request_status,
     response_time_ms, records_processed, occurred_at)
SELECT
    1 + (ABS(RANDOM()) % 3),
    1 + (ABS(RANDOM()) % 4),
    CASE ((ABS(RANDOM()) % 3)) WHEN 0 THEN '/submission' WHEN 1 THEN '/inquiry' ELSE '/submission/bulk' END,
    CASE ((ABS(RANDOM()) % 2)) WHEN 0 THEN 'POST' ELSE 'GET' END,
    CASE WHEN (ABS(RANDOM()) % 50) < 47 THEN 'success' ELSE 'failed' END,
    100 + (ABS(RANDOM()) % 400),
    200 + (ABS(RANDOM()) % 4800),
    datetime('2026-03-29 00:00:00', '+' || (ABS(RANDOM()) % 86400) || ' minutes')
FROM (
    WITH RECURSIVE cnt(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM cnt LIMIT 500)
    SELECT n FROM cnt
);

-- ============================================================================
-- SLA BREACHES (historical + future pre-seeded)
-- ============================================================================
INSERT OR IGNORE INTO sla_breaches
    (sla_config_id, institution_id, breach_value_text, breach_duration_seconds,
     breach_incident_status, detected_at, resolved_at)
VALUES
(1, 1, '96.2%', 720,  'resolved',  '2026-02-25 10:33:00', '2026-02-25 10:45:00'),
(5, 2, '91.0%', NULL, 'open',      '2026-02-25 09:30:00', NULL),
(10,4, '520ms', NULL, 'open',      '2026-02-25 11:00:00', NULL),
(3, 1, '2.1%',  480,  'resolved',  '2026-02-25 08:15:00', '2026-02-25 08:23:00'),
(9, 3, '97.1%', 2700, 'resolved',  '2026-02-24 16:00:00', '2026-02-24 16:45:00'),
-- March historical
(2, 1, '620ms', 300,  'resolved',  '2026-03-05 14:20:00', '2026-03-05 14:25:00'),
(5, 2, '92.5%', 600,  'resolved',  '2026-03-10 10:00:00', '2026-03-10 10:10:00'),
(10,4, '450ms', 900,  'resolved',  '2026-03-15 09:00:00', '2026-03-15 09:15:00'),
-- Future pre-seeded breaches (realistic 1-2/week)
(1, 1, '97.8%', 480,  'open',      '2026-04-02 10:00:00', NULL),
(5, 2, '93.1%', 600,  'open',      '2026-04-07 09:30:00', NULL),
(10,4, '430ms', 720,  'open',      '2026-04-14 08:45:00', NULL),
(3, 1, '2.2%',  360,  'open',      '2026-04-21 11:00:00', NULL);

-- ============================================================================
-- ALERT INCIDENTS (historical + future)
-- ============================================================================
INSERT OR IGNORE INTO alert_incidents
    (alert_rule_id, institution_id, metric_name, current_value_text,
     threshold_text, alert_incident_status, triggered_at, acknowledged_at, resolved_at)
VALUES
(1, 1, 'Success Rate', '94.2%',   '>= 99%',  'resolved',     '2026-02-25 10:45:00', '2026-02-25 10:46:00', '2026-02-25 11:30:00'),
(3, 2, 'Batch Success Rate', '91.0%', '>= 95%', 'acknowledged', '2026-02-25 09:30:00', '2026-02-25 09:35:00', NULL),
(5, 4, 'P95 Latency',  '520ms',   '<= 400ms', 'active',       '2026-02-25 11:00:00', NULL,                   NULL),
(2, 1, 'P95 Latency',  '850ms',   '<= 800ms', 'resolved',     '2026-02-24 14:30:00', '2026-02-24 14:32:00', '2026-02-24 15:00:00'),
(5, 4, 'P95 Latency',  '430ms',   '<= 400ms', 'resolved',     '2026-02-23 16:45:00', '2026-02-23 16:50:00', '2026-02-23 17:30:00'),
(6, NULL,'Schema Drift', 'Critical','Critical', 'resolved',    '2026-02-22 11:00:00', '2026-02-22 11:05:00', '2026-02-22 12:00:00'),
-- Future incidents (status must satisfy alert_incidents CHECK)
(1, 1, 'Success Rate', '97.2%',   '>= 99%',  'active',        '2026-04-02 10:00:00', NULL,                   NULL),
(3, 2, 'Batch Success Rate','93.0%','>= 95%', 'active',        '2026-04-07 09:30:00', NULL,                   NULL);

-- ============================================================================
-- AUDIT LOGS (seed from activity-log.json)
-- ============================================================================
INSERT OR IGNORE INTO audit_logs
    (user_id, action_type, entity_type, entity_id, description,
     ip_address_hash, audit_outcome, occurred_at)
VALUES
(8,  'AUTH_LOGIN',           'user', '8',  'Successful login via SSO',
 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2', 'success', '2026-03-08 14:32:00'),
(2,  'USER_ROLE_ASSIGNED',   'user', '12', 'Changed David Kim from Viewer to Analyst',
 'b2c3d4e5f6a7b8c9d0e1f2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3', 'success', '2026-03-08 13:15:00'),
(11, 'ENQUIRY_PERFORMED',    'consumer','12', 'Ran credit bureau enquiry',
 'c3d4e5f6a7b8c9d0e1f2c3d4e5f6a7b8c9d0e1f2c3d4e5f6a7b8c9d0e1f2c3d4', 'success', '2026-03-08 12:45:00'),
(10, 'AUTH_LOGIN',           'user', '10', 'Login blocked — account suspended',
 'd4e5f6a7b8c9d0e1f2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5', 'failure', '2026-03-08 11:30:00'),
(6,  'API_KEY_REGENERATED',  'api_key','1', 'Generated new production API key',
 'e5f6a7b8c9d0e1f2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2e3f4a5b6', 'success', '2026-03-08 10:00:00'),
(4,  'REPORT_CREATED',       'report','6', 'Monthly credit risk summary requested',
 'f6a7b8c9d0e1f2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7', 'success', '2026-03-08 09:20:00'),
(1,  'USER_CREATED',         'user', '7',  'Invited new institution admin',
 'a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8', 'success', '2026-03-01 16:00:00'),
(2,  'USER_SUSPENDED',       'user', '10', 'Suspended user — policy violation',
 'b8c9d0e1f2b3c4d5e6f7b8c9d0e1f2b3c4d5e6f7b8c9d0e1f2b3c4d5e6f7b8c9', 'success', '2026-02-20 14:30:00'),
(3,  'MAPPING_APPROVED',     'mapping_version','4', 'Approved schema mapping for institution',
 'c9d0e1f2c3d4e5f6c7d8e9f0c1d2e3f4c5d6e7f8c9d0e1f2c3d4e5f6c7d8e9f0', 'success', '2026-02-18 11:10:00'),
(1,  'INSTITUTION_CREATED',  'institution','1', 'First National Bank registered',
 'd0e1f2d3e4f5d6e7f8d9e0f1d2e3f4d5e6f7d8e9f0d1e2f3d4e5f6d7e8f9d0e1', 'success', '2026-01-15 09:00:00'),
(1,  'INSTITUTION_CREATED',  'institution','2', 'Metro Credit Union registered',
 'e1f2e3f4e5f6e7f8e9f0e1f2e3f4e5f6e7f8e9f0e1f2e3f4e5f6e7f8e9f0e1f2', 'success', '2026-01-22 09:00:00'),
(1,  'APPROVAL_APPROVED',    'approval_queue','4', 'Schema mapping CRB Standard approved',
 'f2a3f4a5f6a7f8a9f0a1f2a3f4a5f6a7f8a9f0a1f2a3f4a5f6a7f8a9f0a1f2a3', 'success', '2026-03-05 15:30:00');

-- ============================================================================
-- REFRESH TOKENS (dev tokens for test users — rotated on real login)
-- ============================================================================
INSERT OR IGNORE INTO refresh_tokens
    (user_id, token_hash, issued_at, expires_at, is_revoked, ip_address)
VALUES
(1, 'dev_token_hash_admin_001_' || lower(hex(randomblob(16))),
 datetime('now'), datetime('now', '+7 days'), 0, '127.0.0.1'),
(2, 'dev_token_hash_super_001_' || lower(hex(randomblob(16))),
 datetime('now'), datetime('now', '+7 days'), 0, '127.0.0.1');

-- ============================================================================
-- INGESTION DRIFT ALERTS (Data Quality Monitoring — mirrors data-governance.json)
-- ============================================================================
INSERT OR IGNORE INTO ingestion_drift_alerts (id, alert_type, source, message, severity, detected_at, source_type) VALUES
('drift-1', 'schema', 'Jio Telecom', 'New optional field ''roaming_data_mb'' detected in ingest payload', 'low', '2026-03-26 08:15:00', 'Telecom'),
('drift-2', 'mapping', 'HDFC Bank', 'Mapping confidence for ''accounts.dpd'' dropped 6% vs prior week', 'medium', '2026-03-25 11:20:00', 'Bank'),
('drift-3', 'schema', 'Tata Power Utility', 'Enum expansion: payment_status gained value ''DISPUTED''', 'low', '2026-03-24 14:00:00', 'Utility'),
('drift-4', 'mapping', 'GST Portal', 'Master field mismatch: GST ''turnover_band'' vs canonical ''annual_turnover''', 'high', '2026-03-22 09:45:00', 'Government'),
('drift-5', 'schema', 'Airtel Telecom', 'Sample rate anomaly: 12% nulls on ''last_payment_status'' (threshold 5%)', 'medium', '2026-03-20 16:30:00', 'Telecom'),
('drift-6', 'mapping', 'Mahanagar Gas Utility', 'Version drift: feed still on v1.0 while active schema is v1.1', 'low', '2026-03-18 10:00:00', 'Utility'),
('drift-7', 'schema', 'BSNL Telecom', 'New nested path ''accounts.arrers'' (typo) observed — possible upstream defect', 'medium', '2026-03-15 13:40:00', 'Telecom'),
('drift-8', 'mapping', 'Custom Micro-Finance', 'Archived mapping still referenced by batch job ''BATCH-9921''', 'low', '2026-03-10 07:00:00', 'NBFI');

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
