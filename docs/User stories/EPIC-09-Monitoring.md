# EPIC-09 — Monitoring

> **Epic Code:** MON | **Story Range:** MON-US-001–007
> **Owner:** Platform Engineering / Operations | **Priority:** P0–P1
> **Implementation Status:** ✅ Fully Implemented

---

## 1. Executive Summary

### Purpose
The Monitoring module provides real-time operational observability over the HCB platform's live API layer. Bureau administrators can view a KPI snapshot, browse paginated API request and enquiry logs with rich filters, inspect individual request/enquiry details, and analyze throughput and latency trends. This module is the "eyes" of the platform — it answers "what is happening right now?"

### Business Value
- Detect API failures, latency spikes, and high rejection rates in real time
- Institution-scoped views enable per-member performance analysis
- Status normalization ensures `success`/`failed` labels are consistent regardless of API version
- Exportable request logs support SLA reporting and compliance audits
- P95 latency metric enables proactive scaling before user impact

### Key Capabilities
1. Real-time KPI snapshot: total calls, success rate, P95 latency, avg processing time, rejection rate, active API keys
2. Paginated API request log with filters (status, institution, date range, method)
3. API request detail drawer with full request/response metadata
4. Paginated enquiry log with filters (type, status, institution, date range)
5. Enquiry detail drawer with consumer, product, and consent details
6. Throughput and latency trend charts
7. Institution-scoped filtering across all monitoring views

---

## 2. Scope

### In Scope
- `MonitoringController` endpoints for KPIs, API requests, enquiries, charts
- `MonitoringFilterBar.tsx` — shared filter component across all monitoring views
- `DataSubmissionApiSection.tsx` — API request log view
- `DataSubmissionBatchSection.tsx` — batch monitoring view
- `InquiryApiSection.tsx` — enquiry log view
- `RequestDetailDrawer.tsx` — API request detail
- `EnquiryDetailDrawer.tsx` — enquiry detail
- Status normalization (`src/lib/status-badges.ts`)

### Out of Scope
- Alert rule creation (EPIC-10)
- SLA configuration and breach tracking (EPIC-10)
- Report generation from monitoring data (EPIC-11)
- Agent-level monitoring (EPIC-17)

---

## 3. Personas

| Persona | Role | Needs |
|---------|------|-------|
| Bureau Administrator | BUREAU_ADMIN | Operational oversight, failure investigation |
| Data Analyst | ANALYST | Trend analysis, per-institution performance |
| Viewer | VIEWER | Read-only dashboard and monitoring views |

---

## 4. Features Overview

| Feature | Description | Status |
|---------|-------------|--------|
| KPI Snapshot | 7 real-time KPIs for last 24h | ✅ Implemented |
| API Request Log | Paginated, filterable request list | ✅ Implemented |
| API Request Detail | Full metadata drawer | ✅ Implemented |
| Enquiry Log | Paginated, filterable enquiry list | ✅ Implemented |
| Enquiry Detail | Consumer/product/consent drawer | ✅ Implemented |
| Throughput Charts | API volume + latency trend | ✅ Implemented |
| Institution Filter | Scope all views to one institution | ✅ Implemented |

---

## 5. Epic-Level UI Requirements

### Screens

| Screen | Path | Description |
|--------|------|-------------|
| Monitoring Overview | `/monitoring` | KPI cards + filter bar |
| Data Submission API | `/monitoring/data-submission-api` | API request log |
| Data Submission Batch | `/monitoring/data-submission-batch` | Batch job log |
| Inquiry API | `/monitoring/inquiry-api` | Enquiry log |

### Component Behavior
- **Status badges:** Normalized via `status-badges.ts` — `success`=green, `failed`=red, `pending`=yellow, `processing`=blue
- **Filter bar:** `MonitoringFilterBar.tsx` — institution select, date range pickers, status select, method select
- **Detail drawers:** Full-width slide-in from right with all request/enquiry attributes
- **Charts:** Recharts line charts with 7-day rolling window

### Status Normalization
Spring returns **lowercase** enum strings. The SPA normalizes for display:

| API Value | Display Label | Badge Color |
|-----------|--------------|-------------|
| `success` | Success | Green |
| `failed` | Failed | Red |
| `pending` | Pending | Yellow |
| `processing` | Processing | Blue |
| `rejected` | Rejected | Red |
| `timeout` | Timeout | Orange |

---

## 6. Epic-Level UI Test Cases

| Test ID | Screen | Scenario | Steps | Expected Result |
|---------|--------|----------|-------|----------------|
| MON-UI-TC-01 | Overview | KPI cards load | Navigate to /monitoring | 7 KPI cards with real data |
| MON-UI-TC-02 | API Log | Filter by status | Select "failed" in status filter | Only failed requests shown |
| MON-UI-TC-03 | API Log | Filter by institution | Select an institution | Only that institution's requests shown |
| MON-UI-TC-04 | API Log | Open detail drawer | Click a request row | Drawer opens with full metadata |
| MON-UI-TC-05 | Enquiry Log | Filter by date | Select last 7 days | Only recent enquiries shown |
| MON-UI-TC-06 | Enquiry Log | Open detail drawer | Click an enquiry row | Drawer with consumer/product info |

---

## 7. Story-Centric Requirements

---

### MON-US-001 — View Monitoring KPI Snapshot

#### 1. Description
> As a bureau administrator,
> I want a real-time KPI summary for the last 24 hours,
> So that I can assess platform health at a glance without drilling into logs.

#### 2. Acceptance Criteria

```gherkin
  Scenario: KPIs load on page visit
    Given I navigate to /monitoring
    Then I see 7 KPI cards loaded with real data from the last 24h:
      - Total API Calls
      - Success Rate (%)
      - P95 Latency (ms)
      - Average Processing Time (ms)
      - Rejection Rate (%)
      - Active API Keys
      - Pending Alerts count

  Scenario: No traffic in last 24h
    Given no API requests in the last 24h
    Then KPI cards show 0 / N/A values with appropriate messaging
```

#### 3. API Requirements

`GET /api/v1/monitoring/kpis`

**Response:**
```json
{
  "totalCalls": 1247,
  "successRate": 98.4,
  "p95LatencyMs": 234,
  "avgProcessingTimeMs": 89,
  "rejectionRate": 1.6,
  "activeApiKeys": 12,
  "pendingAlerts": 3,
  "calculatedAt": "2026-03-31T14:00:00Z",
  "windowHours": 24
}
```

#### 4. Database Query

```sql
-- Spring MonitoringController KPI calculation
SELECT
  COUNT(*) as total_calls,
  ROUND(100.0 * SUM(CASE WHEN request_status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
  -- P95 latency computed in application layer
  AVG(processing_time_ms) as avg_processing_time,
  ROUND(100.0 * SUM(CASE WHEN request_status = 'rejected' THEN 1 ELSE 0 END) / COUNT(*), 2) as rejection_rate
FROM api_requests
WHERE occurred_at >= datetime('now', '-24 hours');
```

#### 5. Definition of Done
- [ ] KPI endpoint returns all 7 metrics
- [ ] P95 latency calculated correctly
- [ ] Success rate and rejection rate sum validation
- [ ] Cards update on page refresh

---

### MON-US-002 — View and Filter API Request Log

#### 1. Description
> As a bureau administrator,
> I want to browse API requests with rich filters,
> So that I can investigate failures and monitor member behavior.

#### 2. Acceptance Criteria

```gherkin
  Scenario: Default view
    Given I navigate to the API Request log
    Then I see the 20 most recent API requests sorted by occurred_at desc

  Scenario: Filter by status = failed
    When I select "failed" in the status filter
    Then only requests with request_status = 'failed' are shown

  Scenario: Filter by institution
    When I select "First National Bank"
    Then only requests from institution_id = 1 are shown

  Scenario: Filter by date range
    When I select last 7 days
    Then only requests from the last 7 days are shown
```

#### 3. API Requirements

`GET /api/v1/monitoring/api-requests?status=&institutionId=&dateFrom=&dateTo=&method=&page=0&size=20`

**Response:**
```json
{
  "content": [
    {
      "id": "req-uuid-001",
      "institutionId": 1,
      "institutionName": "First National Bank",
      "requestMethod": "POST",
      "endpointPath": "/api/v1/data/submit",
      "requestStatus": "success",
      "processingTimeMs": 127,
      "occurredAt": "2026-03-31T13:45:00Z",
      "correlationId": "COR-2026-001"
    }
  ],
  "totalElements": 1247,
  "page": 0,
  "size": 20
}
```

#### 4. Filter Options

`API_REQUEST_STATUS_FILTER_OPTIONS` (from `status-badges.ts`):
- `all` | `success` | `failed` | `pending` | `processing` | `rejected` | `timeout`

Spring uses `lower(request_status) = lower(?)` — case-insensitive match.

#### 5. Database

```sql
SELECT ar.*, i.name as institution_name
FROM api_requests ar
LEFT JOIN institutions i ON i.id = ar.institution_id
WHERE (? IS NULL OR lower(ar.request_status) = lower(?))
  AND (? IS NULL OR ar.institution_id = ?)
  AND (? IS NULL OR ar.occurred_at >= ?)
  AND (? IS NULL OR ar.occurred_at <= ?)
ORDER BY ar.occurred_at DESC
LIMIT ? OFFSET ?;
```

#### 6. Definition of Done
- [ ] Paginated request log loads
- [ ] All filter combinations work
- [ ] Status values are lowercase from API, normalized in SPA for display
- [ ] Institution name displayed alongside institution ID

---

### MON-US-003 — View API Request Detail Drawer

#### 1. Description
> As a bureau administrator,
> I want to expand a single request and see all its attributes,
> So that I can diagnose specific failures.

#### 2. API Requirements

`GET /api/v1/monitoring/api-requests/:id`

**Response:**
```json
{
  "id": "req-uuid-001",
  "institutionId": 1,
  "institutionName": "First National Bank",
  "apiKeyId": 3,
  "requestMethod": "POST",
  "endpointPath": "/api/v1/data/submit",
  "requestStatus": "failed",
  "processingTimeMs": 1245,
  "requestPayloadSize": 2048,
  "errorCode": "ERR_VALIDATION_FORMAT",
  "errorMessage": "Field 'account_number' does not match expected format",
  "correlationId": "COR-2026-001",
  "ipAddressHash": "sha256_hash",
  "occurredAt": "2026-03-31T13:45:00Z"
}
```

#### 3. UI Component
`RequestDetailDrawer.tsx` — renders all fields in a labeled key-value layout.

#### 4. Definition of Done
- [ ] Click on any request row opens detail drawer
- [ ] All fields from API response displayed
- [ ] Error code and message prominently shown for failed requests

---

### MON-US-004 — View and Filter Enquiry Log

#### 1. Description
> As a bureau administrator,
> I want to browse enquiry records with filters,
> So that I can audit credit queries and investigate anomalies.

#### 2. API Requirements

`GET /api/v1/monitoring/enquiries?status=&institutionId=&enquiryType=&dateFrom=&dateTo=&page=0&size=20`

**Response:**
```json
{
  "content": [
    {
      "id": "enq-uuid-001",
      "institutionId": 2,
      "institutionName": "Finance Corp",
      "productId": 1,
      "productName": "Standard Credit Report",
      "enquiryType": "HARD",
      "enquiryStatus": "completed",
      "consentReference": "AA-CONSENT-12345",
      "responseTimeMs": 89,
      "occurredAt": "2026-03-31T12:00:00Z"
    }
  ]
}
```

#### 3. Filter Options

`ENQUIRY_STATUS_FILTER_OPTIONS`:
- `all` | `initiated` | `fetching` | `enriching` | `completed` | `failed`

#### 4. Definition of Done
- [ ] Enquiry log loads with correct data
- [ ] All filter combinations work
- [ ] Status values properly normalized for display

---

### MON-US-005 — View Enquiry Detail Drawer

#### 1. Description
> As a bureau administrator,
> I want to expand a single enquiry and see consumer, product, and consent details,
> So that I can fully audit credit queries.

#### 2. API Requirements

`GET /api/v1/monitoring/enquiries/:id`

**Response includes:** All enquiry fields plus `consumerNationalIdType`, `productConfiguration` summary, consent status

#### 3. UI Component
`EnquiryDetailDrawer.tsx` — tabbed layout: Overview | Consumer | Product | Consent

#### 4. Definition of Done
- [ ] Click on enquiry row opens detail drawer
- [ ] Consumer, product, and consent info displayed

---

### MON-US-006 — View Throughput and Latency Charts

#### 1. Description
> As a bureau administrator,
> I want time-series charts of API volume and latency distribution,
> So that I can identify performance degradation trends.

#### 2. API Requirements

`GET /api/v1/monitoring/charts?dateFrom=&dateTo=&institutionId=`

**Response:**
```json
{
  "throughputByHour": [
    {"hour": "2026-03-31T00:00:00Z", "requestCount": 45, "successCount": 44, "failedCount": 1},
    {"hour": "2026-03-31T01:00:00Z", "requestCount": 62, "successCount": 60, "failedCount": 2}
  ],
  "latencyPercentiles": [
    {"hour": "2026-03-31T00:00:00Z", "p50": 78, "p95": 234, "p99": 456}
  ]
}
```

#### 3. UI Components
- Recharts `LineChart` — throughput over time
- Recharts `AreaChart` — latency percentiles
- `DashboardDateRangePicker` — time window selector

#### 4. Definition of Done
- [ ] Throughput chart shows request volume over selected window
- [ ] Latency chart shows P50/P95/P99 percentiles
- [ ] Charts update when date range or institution filter changes

---

### MON-US-007 — Filter Monitoring by Institution and Export

#### 1. Description
> As a bureau administrator,
> I want to scope all monitoring views to a specific institution and time window,
> So that per-member performance is clearly visible.

#### 2. Implementation

- `MonitoringFilterBar.tsx` is a shared filter component used across all monitoring sub-pages
- `InstitutionFilterSelect` — `GET /api/v1/institutions?role=all` without mock fallback
- Selected filters passed as query params to all monitoring API calls
- URL params updated so filtered views are shareable

#### 3. Export

- CSV export of filtered API request log via client-side `exportToCsv()` utility
- Headers: `ID, Institution, Method, Path, Status, Processing Time, Occurred At, Correlation ID`

#### 4. Definition of Done
- [ ] Institution filter scopes all monitoring views to selected institution
- [ ] Date range filter applied across all monitoring endpoints
- [ ] CSV export includes all visible columns

---

## 8. Epic API Summary

| Endpoint | Method | Auth | Description | Status |
|----------|--------|------|-------------|--------|
| `GET /api/v1/monitoring/kpis` | GET | Bearer | 24h KPI snapshot | ✅ |
| `GET /api/v1/monitoring/api-requests` | GET | Bearer | Paginated API request log | ✅ |
| `GET /api/v1/monitoring/api-requests/:id` | GET | Bearer | API request detail | ✅ |
| `GET /api/v1/monitoring/enquiries` | GET | Bearer | Paginated enquiry log | ✅ |
| `GET /api/v1/monitoring/enquiries/:id` | GET | Bearer | Enquiry detail | ✅ |
| `GET /api/v1/monitoring/charts` | GET | Bearer | Throughput and latency charts | ✅ |

---

## 9. Database Summary

| Table | Key Fields | Notes |
|-------|------------|-------|
| `api_requests` | `id`, `institution_id`, `request_method`, `endpoint_path`, `request_status`, `processing_time_ms`, `occurred_at` | API traffic log |
| `enquiries` | `id`, `institution_id`, `product_id`, `enquiry_type`, `enquiry_status`, `response_time_ms`, `occurred_at` | Credit enquiry log |

---

## 10. Epic Workflows

### Workflow: Failure Investigation
```
Bureau admin receives alert (EPIC-10) →
  Navigate to /monitoring/data-submission-api →
  Filter by institution + status=failed + last 24h →
  Click failed request row →
  RequestDetailDrawer shows error_code: ERR_INSTITUTION_SUSPENDED →
  Admin checks institution status →
  Reactivates institution →
  Monitoring shows success rate recovery
```

---

## 11. KPIs

| KPI | Target |
|-----|--------|
| Platform success rate | > 99% |
| P95 API latency | < 500ms |
| Monitoring page load time | < 1 second |
| Rejection rate | < 2% |

---

## 12. Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| `api_requests` table grows unbounded | DB performance | Partition/archive records older than 90 days |
| KPI calculation too slow for busy bureaus | UX | Cache KPI results for 60 seconds |
| P95 latency computed in application layer | Accuracy | Use DB window function or pre-aggregate |

---

## 13. Gap Analysis

No critical gaps. All monitoring endpoints are implemented in Spring with `MonitoringController`.
Minor: P95 latency computed in application layer rather than DB — consider moving to DB-level percentile aggregation.

---

## 14. Execution Roadmap

| Phase | Stories | Description |
|-------|---------|-------------|
| Phase 1 | MON-US-001–007 | All implemented — production-ready |
| Phase 2 | — | Add real-time WebSocket push for live KPI updates |
| Phase 3 | — | Advanced analytics: anomaly detection, trend forecasting |
| Phase 4 | — | Regulatory-grade audit export with digital signature |
