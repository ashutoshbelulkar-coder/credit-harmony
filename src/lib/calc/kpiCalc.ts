/**
 * KPI aggregate calculation functions.
 *
 * All formulas used in KPI cards across the platform are defined here.
 * - Pure functions — no React, no side effects.
 * - Zero-denominator safe — never throws.
 * - Consistent precision: rates/percentages to 1 decimal, counts as integers.
 *
 * These functions are also used for server-side validation: backend computes
 * the same formulas so frontend/backend KPI values can be cross-checked.
 */

import { isSameMonth } from "./dateFilter";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ApprovalItem {
  status: string;
  reviewedAt?: string | null;
}

export interface BatchJob {
  success_rate: number;
  total_records?: number;
  success?: number;
  failed?: number;
}

export interface ApiRequest {
  status: string;
  response_time_ms: number;
}

export interface EnquiryRecord {
  status: string;
  response_time_ms?: number;
}

// ─── Rate Calculations ──────────────────────────────────────────────────────

/**
 * Percentage of successes from a total. Returns 0 when total is 0.
 * Result is rounded to 1 decimal place.
 */
export function calcSuccessRate(success: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((success / total) * 1000) / 10;
}

/**
 * Percentage of failures/errors from a total. Returns 0 when total is 0.
 */
export function calcErrorRate(failed: number, total: number): number {
  return calcSuccessRate(failed, total);
}

// ─── Latency Calculations ───────────────────────────────────────────────────

/**
 * 95th-percentile latency from an array of latency measurements (ms).
 * Sorts ascending and picks the item at ceil(0.95 * n) - 1.
 * Returns 0 for empty arrays.
 */
export function calcP95Latency(latenciesMs: number[]): number {
  if (!latenciesMs || latenciesMs.length === 0) return 0;
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const idx = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

/**
 * 99th-percentile latency.
 */
export function calcP99Latency(latenciesMs: number[]): number {
  if (!latenciesMs || latenciesMs.length === 0) return 0;
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const idx = Math.ceil(0.99 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

/**
 * Average latency rounded to the nearest integer ms.
 */
export function calcAvgLatency(latenciesMs: number[]): number {
  if (!latenciesMs || latenciesMs.length === 0) return 0;
  return Math.round(latenciesMs.reduce((a, b) => a + b, 0) / latenciesMs.length);
}

// ─── Batch Calculations ─────────────────────────────────────────────────────

/**
 * Average success rate across all batch jobs.
 * Each job already carries a `success_rate` float (0–100).
 */
export function calcBatchAvgSuccessRate(jobs: BatchJob[]): number {
  if (!jobs || jobs.length === 0) return 0;
  const total = jobs.reduce((sum, j) => sum + j.success_rate, 0);
  return Math.round((total / jobs.length) * 10) / 10;
}

/**
 * Total records across all batch jobs.
 */
export function calcBatchTotalRecords(jobs: BatchJob[]): number {
  return jobs.reduce((sum, j) => sum + (j.total_records ?? 0), 0);
}

// ─── Approval KPIs ──────────────────────────────────────────────────────────

/**
 * Count of items with status === "pending".
 */
export function calcPendingCount(items: ApprovalItem[]): number {
  return items.filter((i) => i.status === "pending").length;
}

/**
 * Count of items approved in the current calendar month.
 * Uses isSameMonth() — NOT a hardcoded date prefix.
 */
export function calcApprovedThisMonth(items: ApprovalItem[], ref?: Date): number {
  return items.filter(
    (i) => i.status === "approved" && isSameMonth(i.reviewedAt, ref)
  ).length;
}

/**
 * Count of items with status === "changes_requested".
 */
export function calcChangesRequestedCount(items: ApprovalItem[]): number {
  return items.filter((i) => i.status === "changes_requested").length;
}

// ─── Monitoring KPIs ────────────────────────────────────────────────────────

/**
 * Compute all key monitoring KPIs from a filtered array of API requests.
 * This replaces the static JSON values shown in KPI cards.
 */
export function calcApiRequestKpis(requests: ApiRequest[]) {
  const total = requests.length;
  const successCount = requests.filter((r) => r.status === "Success").length;
  const failedCount = requests.filter(
    (r) => r.status === "Failed" || r.status === "Partial"
  ).length;
  const latencies = requests.map((r) => r.response_time_ms).filter((v) => v > 0);

  return {
    totalCalls: total,
    successRate: calcSuccessRate(successCount, total),
    errorRate: calcErrorRate(failedCount, total),
    p95LatencyMs: calcP95Latency(latencies),
    avgLatencyMs: calcAvgLatency(latencies),
  };
}

/**
 * Compute batch KPIs from a filtered array of batch jobs.
 */
export function calcBatchKpis(jobs: BatchJob[]) {
  const total = jobs.length;
  const failedCount = jobs.filter((j) => j.success_rate < 95).length;
  const totalRecords = calcBatchTotalRecords(jobs);
  const avgSuccessRate = calcBatchAvgSuccessRate(jobs);

  return {
    totalBatches: total,
    totalRecordsProcessed: totalRecords,
    avgBatchSuccessRate: avgSuccessRate,
    failedBatchesCount: failedCount,
  };
}

// ─── Active Filter Counter ───────────────────────────────────────────────────

/**
 * Counts how many filter values differ from their "empty/all" state.
 * Useful for the active filter badge on filter panels.
 *
 * @param filters  Record of { key: currentValue }
 * @param defaults Record of { key: defaultValue } — values equal to default are not counted
 */
export function calcActiveFilterCount(
  filters: Record<string, string | undefined>,
  defaults: Record<string, string>
): number {
  return Object.entries(filters).filter(([key, val]) => {
    const def = defaults[key] ?? "";
    return (val ?? "") !== def && (val ?? "").trim() !== "";
  }).length;
}
