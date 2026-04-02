# EPIC-13 — Dashboard & Command Center

> **Epic Code:** DASH | **Story Range:** DASH-US-001–006
> **Owner:** Platform Engineering | **Priority:** P0–P2
> **Implementation Status:** ✅ Mostly Implemented (DASH-US-003–005 Partial)
>
> **Cross-cutting UI:** Dashboard CSV export uses the shared `Button` component; charts inherit `ChartContainer` accessibility defaults — [EPIC-00](./EPIC-00-Design-System-Cross-Cutting.md).

---

## 1. Executive Summary

### Purpose
The Dashboard is the first page every user sees after login. It provides an at-a-glance executive view of the HCB platform's operational health: KPI metrics, API usage trends, data quality scores, active batch pipelines, processing throughput, and an anomaly feed. The Command Center sub-components give bureau operators real-time visibility into the most critical platform activities.

### Business Value
- Single pane of glass for platform health reduces time to detect issues
- Time-series charts surface trends that point KPIs alone cannot reveal
- Active batch pipeline table enables operations teams to monitor ingestion in flight
- Processing throughput card shows if the bureau's data pipeline is keeping pace with submissions
- CSV export enables snapshot reporting for management briefings

### Key Capabilities
1. KPI row: total calls, success rate, active members, pending approvals, data quality score
2. API usage line chart (last 30 days)
3. Data quality trend chart
4. Active batch pipeline table (in-flight jobs with stage progress)
5. Processing throughput card (records/hour)
6. Anomaly feed (recent incidents and alerts)
7. CSV export of dashboard snapshot

---

## 2. Scope

### In Scope
- `DashboardController` endpoints
- `Dashboard.tsx` — main page component
- `DashboardKPIRow` — KPI cards
- `ApiUsageChart`, `DataQualityCharts` — time-series charts
- `ActiveBatchPipelineTable` — batch jobs in flight
- `ProcessingThroughputCard` — throughput card
- `AgentFleetCard` — agent status (partial mock)
- `MemberDataQualityCard` — member data quality
- `DashboardDateRangePicker` — date window selector
- CSV export via `exportToCsv`

### Out of Scope
- Alert rule management from dashboard (EPIC-10)
- Real-time WebSocket updates (future)
- Per-institution drill-down dashboard (EPIC-09 handles this)

---

## 3. Personas

| Persona | Role | Needs |
|---------|------|-------|
| Bureau Administrator | BUREAU_ADMIN | Platform health overview, batch monitoring |
| Operations Team | BUREAU_ADMIN | Active batch pipeline, throughput |
| Data Analyst | ANALYST | Data quality trends, API usage charts |
| Viewer | VIEWER | Read-only dashboard view |
| Executive | VIEWER | High-level KPIs and trends |

---

## 4. Features Overview

| Feature | Description | Status |
|---------|-------------|--------|
| KPI Row | 5-7 headline metrics | ✅ Implemented |
| API Usage Chart | 30-day API call volume | ✅ Implemented |
| Data Quality Charts | Quality score trends | ✅ Implemented |
| Active Batch Pipeline Table | In-flight batch jobs | ⚠️ Partial |
| Processing Throughput Card | Records/hour | ⚠️ Partial |
| Anomaly Feed | Recent incidents and alerts | ⚠️ Partial |
| CSV Export | Export dashboard data | ✅ Implemented |

---

## 5. Epic-Level UI Requirements

### Screens

| Screen | Path | Description |
|--------|------|-------------|
| Dashboard | `/` (root) | Main dashboard with all widgets |

### Layout
- Header: "Platform Command Center" title + `DashboardDateRangePicker` + Export CSV button
- Row 1: KPI cards (horizontal scroll on mobile)
- Row 2: `ApiUsageChart` (left 2/3) + `DataQualityCharts` (right 1/3)
- Row 3: `ActiveBatchPipelineTable` (full width)
- Row 4: `ProcessingThroughputCard` (left) + `AgentFleetCard` (right) + `MemberDataQualityCard` (right)
- Row 5: Activity feed / anomaly feed

### Component Behavior
- Date range picker updates all charts simultaneously
- KPI cards show loading skeleton while data fetches
- Charts use Recharts library with consistent color palette
- "No data" state shown gracefully when outside seed window

### State Handling
| State | UI Behavior |
|-------|-------------|
| Loading | Skeleton cards and chart placeholders |
| No data in date range | Charts show empty axes, KPIs show 0 |
| API error | `ApiErrorCard` component with retry |
| Partial data (some widgets fail) | Individual widget error states |

---

## 6. Epic-Level UI Test Cases

| Test ID | Screen | Scenario | Steps | Expected Result |
|---------|--------|----------|-------|----------------|
| DASH-UI-TC-01 | Dashboard | Page loads | Navigate to / | All widget areas rendered |
| DASH-UI-TC-02 | Dashboard | KPI cards load | Wait for data fetch | KPI values shown in cards |
| DASH-UI-TC-03 | Dashboard | Date range filter | Change date range | Charts update for new window |
| DASH-UI-TC-04 | Dashboard | Export CSV | Click Export | CSV downloaded with current data |
| DASH-UI-TC-05 | Dashboard | No data state | Select future date range | Empty charts shown gracefully |

---

## 7. Story-Centric Requirements

---

### DASH-US-001 — View Platform KPI Row

#### 1. Description
> As a bureau administrator,
> I want to see headline KPIs at a glance,
> So that I can immediately assess if the platform is healthy.

#### 2. API Requirements

`GET /api/v1/dashboard/snapshot`

**Response:**
```json
{
  "totalApiCalls": 45672,
  "successRate": 98.7,
  "activeMembers": 24,
  "pendingApprovals": 3,
  "dataQualityScore": 94.2,
  "activeBatchJobs": 2,
  "pendingAlerts": 1,
  "calculatedAt": "2026-03-31T14:00:00Z"
}
```

#### 3. KPI Cards

| KPI | Source | Format |
|-----|--------|--------|
| Total API Calls | `api_requests` count | Number with comma separator |
| Success Rate | `api_requests` success% | Percentage with 1 decimal |
| Active Members | `institutions` where status=active | Integer |
| Pending Approvals | `approval_queue` where status=pending | Integer with badge if >0 |
| Data Quality Score | Average across institutions | Percentage with color coding |

#### 4. Database Query (DashboardController)

```sql
SELECT
  COUNT(*) as total_api_calls,
  ROUND(100.0 * SUM(CASE WHEN request_status='success' THEN 1 ELSE 0 END)/COUNT(*),1) as success_rate,
  (SELECT COUNT(*) FROM institutions WHERE institution_lifecycle_status='active') as active_members,
  (SELECT COUNT(*) FROM approval_queue WHERE approval_workflow_status='pending') as pending_approvals
FROM api_requests
WHERE occurred_at >= ?;
```

#### 5. Definition of Done
- [ ] Snapshot endpoint returns all KPI fields
- [ ] KPI cards render with correct values
- [ ] Pending approvals badge visible when count > 0

---

### DASH-US-002 — View API Usage and Data Quality Charts

#### 1. Description
> As a bureau administrator,
> I want time-series charts of API volume and data quality trends,
> So that I can spot deterioration before it impacts service.

#### 2. API Requirements

`GET /api/v1/dashboard/charts?dateFrom=&dateTo=`

**Response:**
```json
{
  "apiUsageByDay": [
    {"date": "2026-03-25", "totalCalls": 1245, "successCalls": 1232, "failedCalls": 13},
    {"date": "2026-03-26", "totalCalls": 1380, "successCalls": 1367, "failedCalls": 13}
  ],
  "dataQualityByDay": [
    {"date": "2026-03-25", "avgScore": 94.5, "institutionCount": 24},
    {"date": "2026-03-26", "avgScore": 93.8, "institutionCount": 24}
  ]
}
```

#### 3. Chart Components

**ApiUsageChart:** Recharts `AreaChart` with two series: `successCalls` (green fill) and `failedCalls` (red fill)

**DataQualityCharts:** Recharts `LineChart` with `avgScore` and threshold line at 90%

#### 4. Definition of Done
- [ ] Charts render with real data
- [ ] Date range selection updates both charts simultaneously
- [ ] Success vs failed series clearly distinguishable

---

### DASH-US-003 — View Active Batch Pipeline Table

#### 1. Description
> As a bureau administrator,
> I want to see all currently running batch jobs and their stage progress,
> So that I can monitor ingestion health in real time.

#### 2. Status: ⚠️ Partial

The `ActiveBatchPipelineTable` component exists but the batch pipeline stages depend on `batch_phase_logs` data. The component may partially use mock data from `monitoring-mock.ts`.

#### 3. API Requirements

`GET /api/v1/batch-jobs?status=processing&page=0&size=10`

**Response includes:** `batchJobId`, `institutionName`, `currentPhase`, `completedStages`, `totalStages`, `recordsProcessed`, `recordsTotal`, `startedAt`

#### 4. UI Component

`ActiveBatchPipelineTable.tsx`:
- Columns: Job ID, Institution, Phase, Stage Progress, Records, Started At, Actions
- Stage progress bar: `completedStages / totalStages * 100%`
- "Cancel" button for admin role

#### 5. Definition of Done
- [ ] Table shows only in-flight (processing) batch jobs
- [ ] Stage progress calculated from batch_phase_logs
- [ ] Replace mock data with real API data

---

### DASH-US-004 — View Processing Throughput Card

#### 1. Description
> As a bureau administrator,
> I want to see records processed per hour,
> So that I know if the platform's data pipeline is keeping pace with submissions.

#### 2. Status: ⚠️ Partial

`ProcessingThroughputCard.tsx` exists but partially uses mock data.

#### 3. API Requirements

`GET /api/v1/dashboard/throughput`

**Response (planned):**
```json
{
  "recordsPerHour": 8500,
  "peakThroughput": 15000,
  "activePipelines": 2,
  "throughputTrend": [
    {"hour": "2026-03-31T12:00:00Z", "recordsProcessed": 8200},
    {"hour": "2026-03-31T13:00:00Z", "recordsProcessed": 8500}
  ]
}
```

#### 4. Definition of Done
- [ ] Throughput endpoint returns real records/hour from batch_jobs
- [ ] Card shows current and peak throughput
- [ ] Mini sparkline chart visible

---

### DASH-US-005 — View Anomaly Feed

#### 1. Description
> As a bureau administrator,
> I want to see a real-time feed of detected anomalies and recent alerts,
> So that I can react to unexpected patterns quickly.

#### 2. Status: ⚠️ Partial

The anomaly feed widget uses mock data from `monitoring-mock.ts`. A real anomaly detection API is not implemented.

#### 3. API Requirements (Planned)

`GET /api/v1/dashboard/anomalies?limit=10`

**Response (planned):**
```json
[
  {
    "id": "anomaly-001",
    "type": "rejection_rate_spike",
    "institutionId": 3,
    "institutionName": "Finance Corp",
    "severity": "high",
    "description": "Rejection rate jumped from 2% to 18% in last 15 minutes",
    "detectedAt": "2026-03-31T13:45:00Z"
  }
]
```

#### 4. Gap: Anomaly detection API missing. Currently uses mock data.

---

### DASH-US-006 — Export Dashboard Data as CSV

#### 1. Description
> As a bureau administrator,
> I want to download the current dashboard data as CSV,
> So that I can share it with stakeholders and for documentation.

#### 2. Implementation

- Client-side export using `exportToCsv()` utility (`src/lib/csv-export.ts`)
- Exports current `dashboardSnapshot` data as a flat CSV
- Filename: `hcb-dashboard-{date}.csv`
- Button in dashboard header: "Export"

#### 3. CSV Structure

```csv
Metric,Value,Calculated At
Total API Calls,45672,2026-03-31T14:00:00Z
Success Rate,98.7%,2026-03-31T14:00:00Z
Active Members,24,2026-03-31T14:00:00Z
Pending Approvals,3,2026-03-31T14:00:00Z
Data Quality Score,94.2%,2026-03-31T14:00:00Z
```

#### 4. Definition of Done
- [ ] Export button triggers CSV download
- [ ] CSV includes all current KPI values
- [ ] Filename includes current date

---

## 8. Epic API Summary

| Endpoint | Method | Auth | Description | Status |
|----------|--------|------|-------------|--------|
| `GET /api/v1/dashboard/snapshot` | GET | Bearer | Platform KPI snapshot | ✅ |
| `GET /api/v1/dashboard/charts` | GET | Bearer | Usage and quality time-series | ✅ |
| `GET /api/v1/batch-jobs?status=processing` | GET | Bearer | Active batch jobs | ✅ |
| `GET /api/v1/dashboard/throughput` | GET | Bearer | Processing throughput | ⚠️ Partial |
| `GET /api/v1/dashboard/anomalies` | GET | Bearer | Anomaly feed | ❌ Missing |

---

## 9. Database Summary

| Table | Key Fields | Usage |
|-------|------------|-------|
| `api_requests` | `request_status`, `occurred_at` | KPI + chart calculations |
| `institutions` | `institution_lifecycle_status` | Active member count |
| `approval_queue` | `approval_workflow_status` | Pending approvals count |
| `batch_jobs` | `job_status`, `started_at` | Active pipeline table |
| `batch_phase_logs` | `phase_name`, `phase_status` | Stage progress |

---

## 10. Epic Workflows

### Workflow: Morning Platform Health Check
```
Admin logs in → Dashboard loads →
  GET /dashboard/snapshot → KPI cards populate →
  GET /dashboard/charts → API and quality charts render →
  GET /batch-jobs?status=processing → Active pipelines shown →
  Admin spots 2 failed batches → Navigates to Monitoring (EPIC-09) →
  Investigates and resolves → Dashboard refreshed
```

---

## 11. KPIs

| KPI | Target |
|-----|--------|
| Dashboard initial load time | < 2 seconds |
| Chart render time | < 500ms after data received |
| KPI accuracy (vs raw DB) | 100% |

---

## 12. Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Dashboard charts sourced from mock data (partial) | Misleading information | Replace all mock data with real API calls |
| Anomaly feed missing real API | Ops team misses real anomalies | Phase 2 priority: implement anomaly API |
| Seed data time window mismatch | Charts show empty/no data | Document seed time window; provide instructions for re-init |

---

## 13. Gap Analysis

| Gap | Story | Severity |
|-----|-------|----------|
| Throughput endpoint partially implemented | DASH-US-004 | Medium |
| Anomaly detection API missing | DASH-US-005 | High |
| `AgentFleetCard` uses mock data | — | Low |
| Some command-center cards use `monitoring-mock.ts` | DASH-US-003/004 | Medium |

---

## 14. Execution Roadmap

| Phase | Stories | Description |
|-------|---------|-------------|
| Phase 1 | DASH-US-001, 002, 006 | Implemented — production-ready |
| Phase 2 | DASH-US-003, 004 | Replace mock data with real batch API |
| Phase 3 | DASH-US-005 | Implement anomaly detection API |
| Phase 4 | — | Real-time WebSocket updates, configurable widget layout |
