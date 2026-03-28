# HCB Platform — System Architecture & Network Diagram

**Version:** 3.0.0 | **Date:** 2026-03-28

---

## System Architecture (Mermaid)

```mermaid
graph TB
    subgraph "Client Layer"
        B[Browser / React SPA<br/>Port 8080]
    end

    subgraph "API Gateway / Reverse Proxy"
        RP[Nginx / AWS ALB<br/>TLS 1.3 Termination<br/>Rate Limiting]
    end

    subgraph "Application Layer — Spring Boot"
        AC[Auth Controller<br/>/api/v1/auth/*]
        IC[Institution Controller<br/>/api/v1/institutions/*]
        UC[User Controller<br/>/api/v1/users/*]
        MC[Monitoring Controller<br/>/api/v1/monitoring/*]
        APC[Approval Controller<br/>/api/v1/approvals/*]
        AUC[Audit Controller<br/>/api/v1/audit-logs/*]
        SC[Submission Controller<br/>/api/v1/submission/*]
        INC[Inquiry Controller<br/>/api/v1/inquiry/*]
    end

    subgraph "Security Layer"
        JWTFilter[JWT Auth Filter]
        RBAC[RBAC Enforcement<br/>deny-by-default]
        AuditInterceptor[Audit Interceptor<br/>mandatory logging]
    end

    subgraph "Service Layer"
        AuthSvc[Auth Service<br/>JWT + Refresh Tokens]
        AuditSvc[Audit Service<br/>Append-only Logs]
        SimSvc[Daily Simulation<br/>Scheduled 00:05 UTC]
        PiiSvc[PII Encryption<br/>AES-256-GCM]
    end

    subgraph "Repository Layer"
        UserRepo[UserRepository]
        InstRepo[InstitutionRepository]
        AuditRepo[AuditLogRepository]
        RefreshRepo[RefreshTokenRepository]
    end

    subgraph "Database Layer"
        SQLite[(SQLite 3<br/>Development<br/>WAL Mode)]
        PG[(PostgreSQL 15<br/>Production<br/>Connection Pool)]
    end

    subgraph "Database — 33 Normalized Tables"
        CORE[CORE GROUP<br/>institutions, users, roles,<br/>permissions, api_keys]
        CREDIT[CREDIT GROUP<br/>consumers, tradelines,<br/>enquiries, credit_profiles]
        MONITORING[MONITORING GROUP<br/>api_requests, batch_jobs,<br/>sla_configs, alert_rules]
        SYSTEM[SYSTEM GROUP<br/>audit_logs, approval_queue,<br/>reports]
        GOVERNANCE[GOVERNANCE GROUP<br/>canonical_fields, mapping_pairs,<br/>validation_rules]
    end

    B -->|HTTPS + Bearer JWT| RP
    RP -->|Forward| JWTFilter
    JWTFilter -->|Validate Token| RBAC
    RBAC -->|Authorized| AC
    RBAC -->|Authorized| IC
    RBAC -->|Authorized| UC
    RBAC -->|Authorized| MC
    RBAC -->|Authorized| APC
    RBAC -->|Authorized| AUC
    RBAC -->|Authorized| SC
    RBAC -->|Authorized| INC

    AC --> AuthSvc
    IC --> AuditInterceptor
    UC --> AuditInterceptor

    AuthSvc --> UserRepo
    AuthSvc --> RefreshRepo
    AuditInterceptor --> AuditSvc
    AuditSvc --> AuditRepo

    PiiSvc -.->|Encrypt/Decrypt PII| CREDIT

    UserRepo --> SQLite
    InstRepo --> SQLite
    AuditRepo --> SQLite
    RefreshRepo --> SQLite

    SQLite -.->|Migrate for prod| PG

    SQLite --> CORE
    SQLite --> CREDIT
    SQLite --> MONITORING
    SQLite --> SYSTEM
    SQLite --> GOVERNANCE
```

---

## Network Architecture (Production)

```mermaid
graph LR
    subgraph "Public Internet"
        Client[API Client / Browser]
    end

    subgraph "DMZ"
        WAF[Web Application Firewall<br/>OWASP Rule Set]
        LB[Load Balancer<br/>TLS Termination]
    end

    subgraph "Private Subnet — Application"
        APP1[App Server 1<br/>Spring Boot]
        APP2[App Server 2<br/>Spring Boot]
    end

    subgraph "Private Subnet — Database"
        PG_PRIMARY[(PostgreSQL Primary)]
        PG_REPLICA[(PostgreSQL Replica<br/>Read-only)]
    end

    subgraph "Security Services"
        KMS[Key Management Service<br/>JWT Secret / PII Keys]
        AUDIT_STORE[Audit Log Store<br/>Immutable / S3]
        SECRETS[Secrets Manager<br/>DB Creds / API Secrets]
    end

    Client -->|HTTPS| WAF
    WAF -->|Filtered traffic| LB
    LB -->|Internal HTTP| APP1
    LB -->|Internal HTTP| APP2
    APP1 -->|Read/Write| PG_PRIMARY
    APP2 -->|Read/Write| PG_PRIMARY
    APP1 -->|Read-only| PG_REPLICA
    APP1 -->|Retrieve keys| KMS
    APP1 -->|Retrieve secrets| SECRETS
    APP1 -->|Ship audit logs| AUDIT_STORE
    PG_PRIMARY -->|Replication| PG_REPLICA
```

---

## JWT Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Spring Boot API
    participant JWT as JwtService
    participant DB as Database

    C->>API: POST /api/v1/auth/login {email, password}
    API->>DB: SELECT user WHERE email=? AND is_deleted=0
    DB-->>API: User record
    API->>API: BCrypt.verify(password, password_hash)
    API->>JWT: generateAccessToken(user) — HS256, 15min
    API->>DB: INSERT refresh_tokens (SHA-256 hash of raw token)
    API->>DB: INSERT audit_logs (AUTH_LOGIN, ip_hash)
    API-->>C: {accessToken, refreshToken, user summary}

    Note over C,API: Subsequent requests

    C->>API: GET /api/v1/institutions (Bearer: accessToken)
    API->>JWT: validateToken(accessToken)
    JWT-->>API: Valid, extract email + roles
    API->>DB: SELECT institutions (role-filtered query)
    DB-->>API: Data
    API-->>C: Institutions list (no PII, no raw keys)

    Note over C,API: Token refresh

    C->>API: POST /api/v1/auth/refresh {refresh_token}
    API->>API: SHA-256 hash incoming token
    API->>DB: SELECT refresh_tokens WHERE token_hash=? AND is_revoked=0
    API->>DB: UPDATE SET is_revoked=1 (old token revoked)
    API->>JWT: generateAccessToken(user) — new access token
    API->>DB: INSERT new refresh_token (rotated)
    API-->>C: {new accessToken, new refreshToken}
```

---

## Data Protection Architecture

```mermaid
graph TD
    subgraph "Application Layer"
        API_REQ[Incoming API Request]
        PII_ENC[PII Encryption Service<br/>AES-256-GCM]
        HASH_SVC[Hash Service<br/>SHA-256 + HMAC]
    end

    subgraph "Storage Layer"
        CONSUMERS_TABLE[consumers table<br/>full_name_encrypted TEXT<br/>national_id_hash VARCHAR]
        AUDIT_TABLE[audit_logs table<br/>ip_address_hash VARCHAR<br/>user_id FK only]
        API_REQ_TABLE[api_requests table<br/>client_ip_hash VARCHAR<br/>api_key_id FK only]
    end

    subgraph "Key Management"
        HCB_PII_KEY[HCB_PII_KEY env var<br/>AES-256 key]
        HCB_HMAC_PEPPER[HCB_HMAC_PEPPER env var<br/>HMAC pepper]
        HCB_JWT_SECRET[HCB_JWT_SECRET env var<br/>HS256 key]
    end

    API_REQ -->|Consumer name, DOB| PII_ENC
    PII_ENC -->|Encrypted ciphertext| CONSUMERS_TABLE
    HCB_PII_KEY -->|Key for encryption| PII_ENC

    API_REQ -->|National ID, phone| HASH_SVC
    HASH_SVC -->|One-way hash| CONSUMERS_TABLE
    HCB_HMAC_PEPPER -->|Pepper for HMAC| HASH_SVC

    API_REQ -->|IP Address| HASH_SVC
    HASH_SVC -->|SHA-256 hash| AUDIT_TABLE
    HASH_SVC -->|SHA-256 hash| API_REQ_TABLE

    API_REQ -->|Raw API key| HASH_SVC
    HASH_SVC -->|SHA-256 hash stored| API_REQ_TABLE
```

---

## Frontend API Integration Architecture (v2.0)

This section documents the layered frontend architecture introduced during the API Integration Phase.

```mermaid
graph TB
    subgraph "UI Layer — React Components"
        PAGES[Page Components<br/>InstitutionList, ApprovalQueue, etc.]
        HOOKS[React Query Hooks<br/>useInstitutions, useApprovals, etc.]
    end

    subgraph "Calculation Layer"
        CALC_DATE[dateFilter.ts<br/>parseTimestamp, isWithinRelativeWindow<br/>isWithinDateRange, isSameMonth]
        CALC_KPI[kpiCalc.ts<br/>calcSuccessRate, calcP95Latency<br/>calcApprovedThisMonth, calcApiRequestKpis]
        CALC_BATCH[batchCalc.ts<br/>computeProgress, computeQuality<br/>sortBatchJobsForPipeline]
        CALC_CHART[chartTransform.ts<br/>toSuccessFailurePie, toTrendSeries<br/>toTopNBarData]
    end

    subgraph "Service Layer"
        INST_SVC[institutions.service.ts]
        USER_SVC[users.service.ts]
        APPROVAL_SVC[approvals.service.ts]
        MON_SVC[monitoring.service.ts]
        BATCH_SVC[batchJobs.service.ts]
        ALERT_SVC[alerts.service.ts]
        OTHER_SVC[... 7 more services]
    end

    subgraph "API Client"
        CLIENT[api-client.ts<br/>JWT Bearer, 401 auto-refresh<br/>ApiError, buildQuery]
        QK[query-keys.ts<br/>Typed cache key registry]
        QC[query-client.ts<br/>QueryClient config<br/>retry logic, staleTime]
    end

    subgraph "Auth"
        AUTH_CTX[AuthContext.tsx<br/>JWT login, refresh, session restore<br/>role from token claims]
        SESSION[sessionStorage<br/>refresh_token only]
        MEMORY[In-memory<br/>access_token]
    end

    subgraph "Mock Fallback"
        MOCK_DATA[src/data/*.json<br/>Static mock JSON]
        FALLBACK[VITE_USE_MOCK_FALLBACK=true<br/>Activates on API error]
    end

    PAGES --> HOOKS
    PAGES --> CALC_DATE
    PAGES --> CALC_KPI
    PAGES --> CALC_BATCH
    PAGES --> CALC_CHART
    HOOKS --> INST_SVC
    HOOKS --> USER_SVC
    HOOKS --> APPROVAL_SVC
    HOOKS --> MON_SVC
    HOOKS --> BATCH_SVC
    HOOKS --> ALERT_SVC
    HOOKS --> OTHER_SVC
    INST_SVC --> CLIENT
    USER_SVC --> CLIENT
    APPROVAL_SVC --> CLIENT
    MON_SVC --> CLIENT
    BATCH_SVC --> CLIENT
    ALERT_SVC --> CLIENT
    OTHER_SVC --> CLIENT
    CLIENT --> AUTH_CTX
    AUTH_CTX --> MEMORY
    AUTH_CTX --> SESSION
    INST_SVC --> FALLBACK
    FALLBACK --> MOCK_DATA
    CLIENT --> QK
    CLIENT --> QC
```

### Frontend Layer Responsibilities

| Layer | Responsibility | Key Files |
|-------|---------------|-----------|
| UI Layer | Render, event handling, layout | `src/pages/**/*.tsx`, `src/components/**/*.tsx` |
| Calculation Layer | Pure functions, no side effects | `src/lib/calc/*.ts` |
| Service Layer | API calls + mock fallback switching | `src/services/*.service.ts` |
| React Query Hooks | Cache management, mutations, toast on success/error | `src/hooks/api/*.ts` |
| API Client | JWT token lifecycle, error normalisation | `src/lib/api-client.ts` |
| Auth Context | Session init, login/logout, role propagation | `src/contexts/AuthContext.tsx` |

### Token Lifecycle (Frontend)

```
Login POST /api/v1/auth/login
  → access_token stored IN MEMORY (never localStorage)
  → refresh_token stored in sessionStorage

API call with Authorization: Bearer <access_token>
  → If 401: auto-enqueue refresh via shared promise
  → Refresh POST /api/v1/auth/refresh
  → On success: rotate both tokens, retry original request
  → On refresh fail: dispatch auth:session-expired event → redirect to /login

Logout POST /api/v1/auth/logout
  → clearTokens() called
  → redirect to /login
```
