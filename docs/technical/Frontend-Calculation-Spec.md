# Frontend Calculation Specification

**Version:** 2.0  
**Status:** Authoritative  
**Scope:** All KPI tiles, chart data, filter logic, and derived metrics rendered in the HCB Admin Portal frontend

---

## 1. Purpose

This document is the **single source of truth** for every numeric calculation, aggregation, and date comparison performed in the React frontend. No component file may contain inline math or date arithmetic — all such logic must use the utilities defined in `src/lib/calc/`.

Dual validation principle: the backend (`MonitoringController`, `DashboardController`, etc.) computes the same formulas. Discrepancies between frontend-displayed and backend-API values must be treated as bugs.

---

## 2. Canonical Utility Files

| File | Responsibility |
|------|---------------|
| `src/lib/calc/dateFilter.ts` | Date parsing, range checks, relative window checks, month comparisons |
| `src/lib/calc/kpiCalc.ts` | KPI aggregation (rates, latencies, approval counts, filter count) |
| `src/lib/calc/batchCalc.ts` | Batch job quality scores, elapsed time, pipeline sort order |
| `src/lib/calc/chartTransform.ts` | Chart data shape conversions (pie, bar, trend) |

---

## 3. Date Filter Specification

### 3.1 Timestamp Normalisation

All timestamps entering the filter functions MUST be normalised via `parseTimestamp()`:

```
parseTimestamp("2026-03-15 14:30:00")  → Date (space format — DB native)
parseTimestamp("2026-03-15T14:30:00Z") → Date (ISO 8601)
parseTimestamp("")                     → null
parseTimestamp("garbage")             → null
```

**Rule:** Null/invalid timestamps are treated as "does not match any filter".

### 3.2 Relative Time Window Filter

Used in Monitoring pages (Data Submission API, Inquiry API).

```
isWithinRelativeWindow(ts, WINDOW_MS["24h"])
```

- `WINDOW_MS` constants are the authoritative window sizes (5m, 1h, 6h, 24h, 7d, 30d).
- Future timestamps (ts > now) are always included.
- The `now` reference is `Date.now()` — no component should store a static "now" value.

### 3.3 Absolute Date Range Filter

Used in Monitoring, Reports, Breach History pages.

```
isWithinDateRange(ts, dateFrom, dateTo)
```

- `dateFrom` and `dateTo` are `"yyyy-MM-dd"` strings (calendar date only).
- Lower bound is inclusive from `T00:00:00`.
- Upper bound is inclusive to `T23:59:59.999`.
- Empty `dateFrom` = no lower bound.
- Empty `dateTo` = no upper bound.
- If `dateFrom > dateTo` (string comparison), returns `false` for all rows.

**FORBIDDEN pattern:**
```typescript
// ❌ Never compare raw date strings lexicographically against timestamps
r.timestamp >= "2026-03" // WRONG — year/month only, lexicographic, misses edge cases
```

**CORRECT pattern:**
```typescript
// ✅ Always use isWithinDateRange from src/lib/calc/dateFilter.ts
isWithinDateRange(r.timestamp, filters.dateFrom, filters.dateTo)
```

### 3.4 Calendar Month Comparison ("Approved This Month")

```
isSameMonth(isoDate, ref?)
```

- `ref` defaults to `new Date()` (current system time).
- Returns true if `isoDate` falls in the same year-month as `ref`.
- `calcApprovedThisMonth(items, ref?)` in `kpiCalc.ts` uses this — **do not use any hardcoded string prefix**.

**FORBIDDEN pattern:**
```typescript
// ❌ Hardcoded date prefix — breaks as soon as the month changes
items.filter(i => i.reviewedAt?.startsWith("2026-03-"))
```

**CORRECT pattern:**
```typescript
// ✅ Dynamic month comparison
calcApprovedThisMonth(items) // uses isSameMonth() internally
```

---

## 4. KPI Calculation Specification

### 4.1 Success Rate

```
calcSuccessRate(success: number, total: number): number
```

- Formula: `round(success / total * 100, 1 decimal)`
- Returns `0` when `total === 0`.
- Used in: Monitoring KPI tiles, batch success rate.

### 4.2 P95 / P99 Latency

```
calcP95Latency(latenciesMs: number[]): number
calcP99Latency(latenciesMs: number[]): number
```

- Algorithm: Sort ascending, pick item at `ceil(percentile * n) - 1`.
- Returns `0` for empty arrays.
- Input array is NOT mutated (sorted copy).

### 4.3 Average Latency

```
calcAvgLatency(latenciesMs: number[]): number
```

- Returns integer (rounded to nearest ms).

### 4.4 API Request KPIs (from filtered dataset)

```
calcApiRequestKpis(requests: ApiRequest[]): {
  totalCalls, successRate, errorRate, p95LatencyMs, avgLatencyMs
}
```

- **KPI cards must recompute from the currently-filtered row set.**
- Never show static KPIs from the full unfiltered dataset when a filter is active.
- `status === "Success"` → success bucket.
- `status === "Failed" | "Partial"` → error bucket.

### 4.5 Approval Queue KPIs

| KPI | Formula |
|-----|---------|
| Pending Approval | `items.filter(i => i.status === "pending").length` |
| Approved This Month | `calcApprovedThisMonth(items)` — dynamic month |
| Changes Requested | `items.filter(i => i.status === "changes_requested").length` |
| Total Items | `items.length` |

### 4.6 Batch KPIs

```
calcBatchKpis(jobs: BatchJob[]): {
  totalBatches, totalRecordsProcessed, avgBatchSuccessRate, failedBatchesCount
}
```

- Failed batch = `success_rate < 95`.
- `avgBatchSuccessRate` = mean of all jobs' `success_rate` fields.

---

## 5. Chart Data Specification

### 5.1 Success/Failure Pie

```
toSuccessFailurePie(success, total) → [{ name: "Success", value }, { name: "Failure", value }]
```

### 5.2 Top-N Bar Chart

```
toTopNBarData(rows, labelKey, valueKey, n) → BarPoint[]
```

- Sorted by `valueKey` descending.
- Truncated to top N.

### 5.3 API Usage Trend

```
toTrendSeries(rows, "volume") → TrendPoint[]
```

- Row data comes from the API / mock; the transformer normalises the `day` key.

### 5.4 Product Usage (Enquiry by Product)

```
computeUsageByProduct(enquiries) → ProductUsagePoint[]
```

- Classifies enquiry as "alternate" if `enquiry_type` contains "alternate" (case-insensitive).

---

## 6. Active Filter Counter

```
calcActiveFilterCount(filters, defaults) → number
```

- Counts filters where the current value differs from the default (empty/all) value.
- Drives the filter badge count in toolbar.
- **Correct implementation prevents the badge showing "1" when no real filter is applied.**

---

## 7. Batch Pipeline

### 7.1 Sort Order

```
sortBatchJobsForPipeline(jobs)
```

Priority: `Processing → Failed → Queued → Suspended → Completed`.  
Within same status: most recent `uploaded` timestamp first.

### 7.2 Progress / Quality

```
computeProgress({ business_ok, system_ko, business_ko, total_records }) → number (%)
computeQuality({ business_ok, total_records }) → number (%)
```

---

## 8. Bug Log — Fixed in v2.0

| Bug | Location | Root Cause | Fix |
|-----|----------|-----------|-----|
| "Approved This Month" always shows 0 after month boundary | `ApprovalQueuePage.tsx` | Hardcoded `"2026-03-"` prefix | Use `calcApprovedThisMonth(items)` |
| KPI cards show stale totals when filters active | `DataSubmissionApiSection.tsx` | Read from static `apiSubmissionKpis` object | Derive from filtered array via `calcApiRequestKpis` |
| Institution filter has no effect on alert table | `AlertMonitoringDashboard.tsx` | Filter guard never checked `institution_id` | Added institution_id check in `filteredAlerts` |
| Time range filter uses copied inline logic | Multiple pages | `isWithinTimeRange()` duplicated per file | Centralised in `dateFilter.ts / WINDOW_MS` |
| Lexicographic date comparison on raw timestamps | `DataSubmissionApiSection.tsx` | `ts >= "from"` without parsing | Use `isWithinDateRange(ts, from, to)` |
| "No institution" total counted as filtered count | `DataSubmissionApiSection.tsx` | `Set(filtered.map(r => r.api_key)).size` was applied to full set | Apply to filtered set only |

---

## 9. Testing Coverage Requirements

Every function in `src/lib/calc/` must have corresponding unit tests in `src/test/calc/`:

| Test File | Covers |
|-----------|--------|
| `dateFilter.test.ts` | All `dateFilter.ts` exports — 36 tests |
| `kpiCalc.test.ts` | All `kpiCalc.ts` exports — 27 tests |
| `batchCalc.test.ts` | All `batchCalc.ts` exports — 21 tests |

Component integration tests must verify:
1. KPI values match the utility output for the same input data.
2. Date filters do not use hardcoded month prefixes.
3. Institution/entity filters are applied to the rendered row set (not skipped).
4. Empty state renders when filters eliminate all rows.

---

## 10. Monitoring KPI Calculation (v2.1)

### 10.1 Server-Side KPIs (`MonitoringKpis`)

When the backend is reachable, `DataSubmissionApiSection` uses pre-aggregated KPIs from `GET /v1/monitoring/kpis`:

| Field | Description |
|-------|-------------|
| `totalCallsToday` | Count of all API requests with `date(timestamp) = today` |
| `successRatePercent` | `(successCount / totalCount) × 100` rounded to 2 dp |
| `p95LatencyMs` | 95th percentile of `response_time_ms` for today's requests |
| `avgProcessingTimeMs` | Arithmetic mean of `response_time_ms` for today's requests |
| `rejectionRatePercent` | `(failedCount / totalCount) × 100` rounded to 2 dp |
| `activeApiKeys` | Count of distinct `api_key` values seen today |

### 10.2 Local Fallback KPIs

When the backend is unreachable (mock mode), `calcApiRequestKpis` computes the same metrics client-side from the current **page** of data:

```typescript
calcApiRequestKpis(rows: { status: string; response_time_ms: number }[]) → {
  totalCalls: number;
  successRate: number;    // 2dp
  p95LatencyMs: number;
  avgLatencyMs: number;
  errorRate: number;      // 2dp
}
```

Note: client-side P95 is less accurate than server-side when fewer than ~20 records are on the current page.

### 10.3 Success Rate Color Coding

```
>= 99%  → text-success  (green)
>= 95%  → text-warning  (amber)
< 95%   → text-destructive (red)
```

### 10.4 Chart Data Sources

| Chart | Source (API available) | Source (mock fallback) |
|-------|------------------------|------------------------|
| API Call Volume (30d) | `MonitoringCharts.apiCallVolume30Days` | `@/data/monitoring-mock` → `apiCallVolume30Days` |
| Latency Trend (P95/P99) | `MonitoringCharts.latencyTrendData` | `@/data/monitoring-mock` → `latencyTrendData` |
| Success vs Failure Pie | `MonitoringCharts.successVsFailureData` | `@/data/monitoring-mock` → `successVsFailureData` |
| Top Rejection Reasons | `MonitoringCharts.topRejectionReasonsData` | `@/data/monitoring-mock` → `topRejectionReasonsData` |
| Enquiry Volume | Mock only (no endpoint yet) | `enquiryVolumeData` |
| Enquiry Response Time | Mock only (no endpoint yet) | `enquiryResponseTimeTrendData` |
| Enquiry by Product | Mock only (no endpoint yet) | `enquiryByProductData` |

---

## 11. Institution MonitoringTab KPI Override (v2.2)

`MonitoringTab.tsx` receives an `institutionId` prop and calls `useMonitoringSummary(institutionId)` → `GET /api/v1/institutions/{id}/monitoring-summary`.

The hook returns:

```typescript
{
  totalRequests: number;
  successfulRequests: number;
  avgLatencyMs: number;
  successRatePct: number;    // pre-computed server-side: round((successful/total)*1000)/10
  totalBatches: number;
  activeBatches: number;
  totalRecords: number;
}
```

Live values override the static KPI labels from `tabsData` using label-text matching:

| KPI label substring | Live field used |
|---------------------|----------------|
| `total` | `monSummary.totalRequests` |
| `success` | `` `${monSummary.successRatePct}%` `` |
| `batch` | `monSummary.totalBatches` |
| `latency` or `avg` | `` `${monSummary.avgLatencyMs}ms` `` |
| All others | Static value from `tabsData` |

When `monSummary` is undefined (loading or API down), static `tabsData` values are used without change.

---

## 12. Future Work (Not Yet Implemented)

- P99 latency computed server-side and pushed to frontend via dashboard snapshot API.
- Forecast trend line (7-day moving average) for API volume chart.
- SLA health score computed using weighted batch + API success rates (formula TBD with business).
- Enquiry-specific KPI endpoint (`GET /v1/monitoring/enquiry-kpis`) to replace mock `enquiryKpis`.
- Enquiry chart data endpoint (`GET /v1/monitoring/enquiry-charts`) for volume, response time, product breakdown.
- Institution-specific chart data endpoints for MonitoringTab ingestion trend, schema drift, API error trend.
- Product detail page packet/enquiry configuration endpoint (currently displays basic info only).
