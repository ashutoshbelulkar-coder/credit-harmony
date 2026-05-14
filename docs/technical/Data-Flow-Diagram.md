# HCB Platform — Data Flow Diagrams

**Version:** 3.0.1 | **Date:** 2026-03-30

---

## Member institution lifecycle gate (Data Submission, batch, Enquiry)

**Rule:** For **Data Submission API** (real-time tradeline / event ingress), **batch file ingestion** (processing member-submitted batches), and **Enquiry API** (subscriber credit pulls), the **member institution** resolved from the API key (or batch ownership) must have **`institutionLifecycleStatus === active`**. If the member is **pending approval**, **suspended**, **draft**, or any other non-active state, the gateway must **reject the request** with **HTTP 403** and a **stable `error` code** plus a safe **`message`** (see [Global-API-Error-Dictionary.md](./Global-API-Error-Dictionary.md) §2.3). This check runs **after** API-key authentication and **before** schema validation or business processing. Operator-only portal actions that do not submit bureau traffic (for example **cancelling** a batch job from the admin UI) may remain allowed when the member is not active, unless product policy says otherwise.

**Fastify dev API:** `POST /api/v1/batch-jobs/:id/retry` enforces the same rule when the job carries an **`institution_id`** (retry re-queues processing). **`POST …/cancel`** does not apply this gate so operators can stop jobs for suspended members.

---

## Data Flow 1: Tradeline Submission (API)

```mermaid
flowchart TD
    START([Institution API Client])

    subgraph Step1 [1. Authentication]
        A1[Send X-API-Key header]
        A2{Validate api_keys.key_hash<br/>via SHA-256 comparison}
        A3[Check api_key_status = 'active']
    end

    subgraph Step1b [1b. Member institution active]
        A4[Resolve institution_id from API key]
        A5{institutionLifecycleStatus<br/>is active?}
    end

    subgraph Step2 [2. Schema Validation]
        B1[Parse request payload]
        B2[Apply validation_rules<br/>per canonical_fields]
        B3{All CRITICAL rules pass?}
    end

    subgraph Step3 [3. Consumer Resolution]
        C1[Hash national_id<br/>SHA-256]
        C2{Consumer exists<br/>in consumers table?}
        C3[UPSERT consumer<br/>with encrypted PII]
    end

    subgraph Step4 [4. Tradeline Insert — TRANSACTIONAL]
        D1[INSERT tradelines<br/>consumer_id FK + institution_id FK]
        D2[Assign batch_job_id FK if batch]
    end

    subgraph Step5 [5. Mandatory Logging — TRANSACTIONAL]
        E1[INSERT api_requests<br/>api_key_id FK + ip_hash]
        E2[INSERT audit_logs<br/>TRADELINE_SUBMITTED]
    end

    subgraph Step6 [6. Response]
        F1[Return 201 Created<br/>tradeline_id]
    end

    START --> A1
    A1 --> A2
    A2 -->|Invalid| FAIL1([Return 401 ERR_AUTH_FAILED])
    A2 -->|Valid| A3
    A3 -->|Revoked| FAIL2([Return 401 ERR_AUTH_REVOKED])
    A3 -->|Active| A4
    A4 --> A5
    A5 -->|pending| FAIL1b([Return 403 ERR_INSTITUTION_PENDING_APPROVAL])
    A5 -->|suspended| FAIL1c([Return 403 ERR_INSTITUTION_SUSPENDED])
    A5 -->|draft| FAIL1d([Return 403 ERR_INSTITUTION_DRAFT])
    A5 -->|other non-active| FAIL1e([Return 403 ERR_INSTITUTION_NOT_ACTIVE])
    A5 -->|active| B1
    B1 --> B2
    B2 --> B3
    B3 -->|Fail| FAIL3([Return 422 ERR_VALIDATION<br/>+ error details])
    B3 -->|Pass| C1
    C1 --> C2
    C2 -->|New consumer| C3
    C2 -->|Existing| D1
    C3 --> D1
    D1 --> D2
    D2 --> E1
    E1 --> E2
    E2 --> F1

    Note1[Transaction boundary:<br/>Steps 3-5 atomic<br/>Rollback on any failure]
```

---

## Data Flow 2: Credit Bureau Inquiry

```mermaid
flowchart TD
    START([Subscriber API Client])

    subgraph Auth [1. Authentication + Subscription Check]
        A1[Validate X-API-Key]
        A1b[Resolve member institution<br/>institutionLifecycleStatus must be active]
        A2{Check product_subscriptions<br/>institution has product access?}
    end

    subgraph Consent [2. Consent Verification]
        B1[Extract consent_reference<br/>from request]
        B2{consent_reference valid<br/>for hard pull?}
    end

    subgraph Resolve [3. Consumer Lookup]
        C1[Hash national_id → SHA-256]
        C2{consumer found<br/>by national_id_hash?}
    end

    subgraph Assemble [4. Join-Based Response Assembly]
        D1[JOIN consumers + credit_profiles]
        D2[JOIN tradelines<br/>filtered by product data scope]
        D3[Decrypt PII fields for<br/>authorized requester only]
    end

    subgraph Log [5. Mandatory Logging — TRANSACTIONAL]
        E1[INSERT enquiries<br/>type=HARD/SOFT<br/>consumer_id FK + api_key_id FK]
        E2[INSERT api_requests]
        E3[INSERT audit_logs<br/>ENQUIRY_PERFORMED]
    end

    subgraph Response [6. Assembled Response]
        F1[Return credit profile + tradelines<br/>No raw PII unless authorized]
    end

    START --> A1
    A1 -->|Invalid| FAIL1([401 ERR_AUTH_FAILED])
    A1 -->|Valid| A1b
    A1b -->|pending / suspended / draft / not active| FAIL1b([403 ERR_INSTITUTION_*<br/>see error dictionary])
    A1b -->|active| A2
    A2 -->|No subscription| FAIL2([403 ERR_NO_PRODUCT_SUBSCRIPTION])
    A2 -->|Subscribed| B1
    B1 --> B2
    B2 -->|Missing for hard pull| FAIL3([422 ERR_CONSENT_MISSING])
    B2 -->|Present| C1
    C1 --> C2
    C2 -->|Not found| FAIL4([404 ERR_SUBJECT_NOT_FOUND<br/>still logs enquiry attempt])
    C2 -->|Found| D1
    D1 --> D2
    D2 --> D3
    D3 --> E1
    E1 --> E2
    E2 --> E3
    E3 --> F1
```

---

## Data Flow 3: Approval Workflow

**Fastify dev API (in-memory):** **Register member** (`POST /api/v1/institutions`) prepends `type: institution` with `metadata.institutionId` and keeps the row in `GET /api/v1/institutions` (typically **pending** until **approve** → **active**). New **data products** use `POST /api/v1/products` with `approval_pending` → `type: product` / `metadata.productId`. New **consortia** use `POST /api/v1/consortiums` with `approval_pending` → `type: consortium` / `metadata.consortiumId`. **Schema Mapper:** `POST /api/v1/schema-mapper/ingest` stores a versioned schema; `POST /api/v1/schema-mapper/mappings` runs an async mapping job; `POST …/mappings/:id/submit-approval` prepends `type: schema_mapping` with `metadata.mappingId` — **approve** sets the mapping to **active** (see `server/src/schemaMapper.ts`). **Validation Rules (portal):** operators read **data submitter** members via `GET /api/v1/institutions?role=dataSubmitter` and **field paths per source type** via `GET /api/v1/schema-mapper/schemas/source-type-fields?sourceType=` (read-only for rule authoring in dev). **Schema Mapper wizard Step 1** reads **Source Type** / **Data Category** lists via `GET /api/v1/schema-mapper/wizard-metadata` (seeded from `schema-mapper.json`).

```mermaid
flowchart TD
    SUBMIT([Bureau Operator submits entity])

    subgraph Submit [1. Entity Creation + Queue Entry]
        A1[Create entity with status='draft']
        A2[INSERT approval_queue<br/>type=institution/product/consortium/schema_mapping]
        A3[INSERT audit_logs ENTITY_SUBMITTED]
    end

    subgraph Review [2. Reviewer Loads Queue]
        B1[GET /api/v1/approvals<br/>approval_workflow_status=pending]
        B2[JOIN target entity for full context]
    end

    subgraph Decision [3. Review Decision — TRANSACTIONAL]
        C1{Decision?}
        C2[APPROVE:<br/>UPDATE approval_queue status=approved<br/>UPDATE target entity status=active]
        C3[REJECT:<br/>UPDATE approval_queue status=rejected<br/>Store rejection_reason]
        C4[REQUEST CHANGES:<br/>UPDATE status=changes_requested<br/>Store requested_changes]
    end

    subgraph Audit [4. Audit Trail]
        D1[INSERT audit_logs<br/>APPROVAL_APPROVED / REJECTED / CHANGES_REQUESTED]
    end

    SUBMIT --> A1
    A1 --> A2
    A2 --> A3
    A3 -.->|Reviewer notified| Review
    Review --> B1
    B1 --> B2
    B2 --> C1
    C1 -->|Approve| C2
    C1 -->|Reject| C3
    C1 -->|Changes needed| C4
    C2 --> D1
    C3 --> D1
    C4 --> D1
```

---

## Data Flow 4: Daily Simulation (Append-Only)

```mermaid
flowchart TD
    TRIGGER([Scheduled: 00:05 AM Daily])

    subgraph Verify [1. Pre-flight Checks]
        A1[Check active institutions exist]
        A2[Check active api_keys exist]
        A3[Check consumers exist]
    end

    subgraph Generate [2. Data Generation — ALL APPEND-ONLY]
        B1[Generate ~28,000 api_requests rows<br/>with today's date]
        B2[Generate ~3,800 enquiries rows]
        B3[Generate batch_jobs rows<br/>per active institution]
        B4[Evaluate alert_rules<br/>INSERT alert_incidents if breach]
    end

    subgraph Commit [3. Transaction Commit]
        C1[Commit all inserts atomically]
        C2[Log DAILY_SIMULATION_RUN to audit_logs]
    end

    subgraph Verify2 [4. Integrity Check]
        D1[Verify all FKs resolved]
        D2[Verify no duplicate request_ids]
    end

    TRIGGER --> A1
    A1 --> A2
    A2 --> A3
    A3 --> B1
    B1 --> B2
    B2 --> B3
    B3 --> B4
    B4 --> C1
    C1 -->|Rollback on failure| FAIL([Log error, retry next day])
    C1 -->|Success| C2
    C2 --> D1
    D1 --> D2

    Note1[RULE: No existing rows modified.<br/>Only INSERT operations allowed.]
```

---

## Data Flow 5: Frontend API Integration (v2.0)

```mermaid
flowchart TD
    subgraph BROWSER [Browser — React SPA]
        PAGE[Page Component<br/>renders UI]
        HOOK[React Query Hook<br/>useQuery / useMutation]
        SVC[Service Layer<br/>*.service.ts]
        CLIENT[api-client.ts<br/>JWT Bearer]
        CALC[Calc Layer<br/>src/lib/calc/]
        CACHE[TanStack Query Cache<br/>staleTime=30s]
    end

    subgraph AUTH [Auth Flow]
        AT[Access Token<br/>in-memory only]
        RT[Refresh Token<br/>sessionStorage]
        REFRESH_EP[POST /api/v1/auth/refresh]
    end

    subgraph BACKEND [Spring Boot Backend — Port 8090]
        PROXY[Vite Proxy<br/>/api → :8090]
        CTRL[REST Controller<br/>@PreAuthorize RBAC]
        DB[(SQLite / PostgreSQL)]
    end

    subgraph MOCK [Mock Fallback]
        JSON[src/data/*.json<br/>Static mock data]
        FLAG[VITE_USE_MOCK_FALLBACK=true]
    end

    PAGE --> HOOK
    PAGE --> CALC
    HOOK --> SVC
    SVC --> CLIENT
    CLIENT --> AT
    AT -->|Bearer header| PROXY
    PROXY --> CTRL
    CTRL --> DB
    DB -->|Response| CTRL
    CTRL -->|JSON| PROXY
    PROXY -->|JSON| CLIENT
    CLIENT --> CACHE
    CACHE --> HOOK
    HOOK --> PAGE

    CLIENT -->|401| REFRESH_EP
    REFRESH_EP --> RT
    RT -->|new tokens| AT
    AT -->|retry request| PROXY

    SVC -->|API error + FLAG=true| JSON
    JSON -->|mock data| CACHE
```

### Frontend API Integration Rules

- All API calls go through `api-client.ts` — direct `fetch()` calls are forbidden in page components.
- Access tokens are stored **in memory only** — never in `localStorage`.
- Refresh tokens are stored in `sessionStorage` — wiped when tab closes.
- All KPI calculations use `src/lib/calc/` pure functions — never inline math in components.
- On API error: if `VITE_USE_MOCK_FALLBACK=true`, service returns mock data silently.
- On 401 Unauthorized: `api-client.ts` auto-retries once after refreshing the token.

---

## Data Flow 6: Approval Queue Action Flow (v2.0)

```mermaid
sequenceDiagram
    actor Admin
    participant Page as ApprovalQueuePage
    participant Hook as useApproveItem
    participant Svc as approvals.service.ts
    participant Client as api-client.ts
    participant API as POST /api/v1/approvals/:id/approve
    participant DB as approval_queue table
    participant Cache as QueryClient Cache

    Admin->>Page: Click "Approve" button
    Page->>Hook: approveItem.mutate({ id, comment })
    Hook->>Svc: approveItem(id, comment)
    Svc->>Client: post("/v1/approvals/{id}/approve", { comment })
    Client->>API: POST with Bearer token
    API->>DB: UPDATE status = 'approved', reviewed_by, reviewed_at
    DB-->>API: rows updated
    API-->>Client: 200 { id, status: "approved" }
    Client-->>Svc: ApprovalResponse
    Svc-->>Hook: resolved
    Hook->>Cache: invalidate QK.approvals.all() + QK.products.all() + QK.consortiums.all()
    Cache-->>Page: refetch triggered
    Page-->>Admin: Updated KPI counts + row status
    Hook->>Admin: toast.success("Item approved")
```
