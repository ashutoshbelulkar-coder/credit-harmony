import { describe, it, expect } from "vitest";
import {
  calcSuccessRate,
  calcErrorRate,
  calcP95Latency,
  calcP99Latency,
  calcAvgLatency,
  calcPendingCount,
  calcApprovedThisMonth,
  calcChangesRequestedCount,
  calcApiRequestKpis,
  calcBatchKpis,
  calcBatchAvgSuccessRate,
  calcBatchTotalRecords,
  calcActiveFilterCount,
  type ApprovalItem,
  type ApiRequest,
  type BatchJob,
} from "@/lib/calc/kpiCalc";

// ─── Rate Calculations ────────────────────────────────────────────────────────

describe("calcSuccessRate", () => {
  it("returns correct percentage", () => {
    expect(calcSuccessRate(9, 10)).toBe(90);
  });

  it("returns 0 when total is 0 (zero-division safe)", () => {
    expect(calcSuccessRate(0, 0)).toBe(0);
  });

  it("returns 100 when all are successful", () => {
    expect(calcSuccessRate(100, 100)).toBe(100);
  });

  it("rounds to 1 decimal place", () => {
    expect(calcSuccessRate(1, 3)).toBe(33.3);
  });
});

describe("calcErrorRate", () => {
  it("calculates correctly", () => {
    expect(calcErrorRate(3, 100)).toBe(3);
  });
});

// ─── Latency ─────────────────────────────────────────────────────────────────

describe("calcP95Latency", () => {
  it("returns correct P95", () => {
    const latencies = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    // P95 → index ceil(0.95*10)-1 = 9 → 1000
    expect(calcP95Latency(latencies)).toBe(1000);
  });

  it("returns 0 for empty array", () => {
    expect(calcP95Latency([])).toBe(0);
  });

  it("handles single-element array", () => {
    expect(calcP95Latency([500])).toBe(500);
  });

  it("sorts before computing (unsorted input)", () => {
    const latencies = [1000, 100, 500, 200];
    // sorted: [100, 200, 500, 1000], P95 → index 3 → 1000
    expect(calcP95Latency(latencies)).toBe(1000);
  });
});

describe("calcP99Latency", () => {
  it("returns correct P99", () => {
    const latencies = Array.from({ length: 100 }, (_, i) => i + 1);
    // P99 → index ceil(0.99*100)-1 = 98 → 99
    expect(calcP99Latency(latencies)).toBe(99);
  });
});

describe("calcAvgLatency", () => {
  it("computes average correctly", () => {
    expect(calcAvgLatency([100, 200, 300])).toBe(200);
  });

  it("rounds to nearest integer", () => {
    expect(calcAvgLatency([100, 101])).toBe(101); // 100.5 rounds to 101
  });

  it("returns 0 for empty array", () => {
    expect(calcAvgLatency([])).toBe(0);
  });
});

// ─── Approval KPIs ────────────────────────────────────────────────────────────

const makeApprovalItems = (): ApprovalItem[] => [
  { status: "pending" },
  { status: "pending" },
  { status: "approved", reviewedAt: new Date().toISOString() },
  { status: "approved", reviewedAt: "2025-01-15T10:00:00Z" }, // previous year
  { status: "changes_requested" },
  { status: "rejected", reviewedAt: new Date().toISOString() },
];

describe("calcPendingCount", () => {
  it("counts only pending items", () => {
    expect(calcPendingCount(makeApprovalItems())).toBe(2);
  });

  it("returns 0 for empty list", () => {
    expect(calcPendingCount([])).toBe(0);
  });
});

describe("calcApprovedThisMonth", () => {
  it("counts only items approved in the current calendar month", () => {
    // The current-month approved item has reviewedAt = now
    // The 2025 item should NOT be counted
    const items = makeApprovalItems();
    const ref = new Date();
    const count = calcApprovedThisMonth(items, ref);
    expect(count).toBe(1); // only 1 approved this month
  });

  it("does NOT use a hardcoded date prefix — changes with month", () => {
    // Use explicit mid-month refs: setMonth(day-31) can overflow (e.g. Mar 31 → "Feb" becomes Mar),
    // which falsely matches "this month" in UTC/local comparisons.
    const febRef = new Date(2026, 1, 15);
    const items: ApprovalItem[] = [
      { status: "approved", reviewedAt: "2026-03-20T12:00:00.000Z" },
    ];
    expect(calcApprovedThisMonth(items, febRef)).toBe(0);
  });
});

describe("calcChangesRequestedCount", () => {
  it("counts changes_requested items", () => {
    expect(calcChangesRequestedCount(makeApprovalItems())).toBe(1);
  });
});

// ─── API Request KPIs ─────────────────────────────────────────────────────────

const makeRequests = (): ApiRequest[] => [
  { status: "Success", response_time_ms: 100 },
  { status: "Success", response_time_ms: 200 },
  { status: "Success", response_time_ms: 300 },
  { status: "Failed", response_time_ms: 50 },
];

describe("calcApiRequestKpis", () => {
  it("computes all KPI fields correctly", () => {
    const kpis = calcApiRequestKpis(makeRequests());
    expect(kpis.totalCalls).toBe(4);
    expect(kpis.successRate).toBe(75);
    expect(kpis.errorRate).toBe(25);
    expect(kpis.avgLatencyMs).toBe(163); // round((100+200+300+50)/4)
  });

  it("returns zero KPIs for empty input", () => {
    const kpis = calcApiRequestKpis([]);
    expect(kpis.totalCalls).toBe(0);
    expect(kpis.successRate).toBe(0);
    expect(kpis.p95LatencyMs).toBe(0);
  });
});

// ─── Batch KPIs ───────────────────────────────────────────────────────────────

const makeBatchJobs = (): BatchJob[] => [
  { success_rate: 99.5, total_records: 1000 },
  { success_rate: 85.0, total_records: 500 },  // below SLA
  { success_rate: 100, total_records: 2000 },
];

describe("calcBatchAvgSuccessRate", () => {
  it("averages success rates correctly", () => {
    expect(calcBatchAvgSuccessRate(makeBatchJobs())).toBe(94.8);
  });

  it("returns 0 for empty list", () => {
    expect(calcBatchAvgSuccessRate([])).toBe(0);
  });
});

describe("calcBatchTotalRecords", () => {
  it("sums total_records across all jobs", () => {
    expect(calcBatchTotalRecords(makeBatchJobs())).toBe(3500);
  });
});

describe("calcBatchKpis", () => {
  it("identifies failed batches (below 95% success rate)", () => {
    const kpis = calcBatchKpis(makeBatchJobs());
    expect(kpis.failedBatchesCount).toBe(1);
    expect(kpis.totalBatches).toBe(3);
    expect(kpis.totalRecordsProcessed).toBe(3500);
  });
});

// ─── Active Filter Count ──────────────────────────────────────────────────────

describe("calcActiveFilterCount", () => {
  const defaults = { status: "all", search: "" };

  it("counts non-default filter values", () => {
    const count = calcActiveFilterCount({ status: "active", search: "" }, defaults);
    expect(count).toBe(1);
  });

  it("returns 0 when all filters are at default", () => {
    const count = calcActiveFilterCount({ status: "all", search: "" }, defaults);
    expect(count).toBe(0);
  });

  it("counts multiple active filters", () => {
    const count = calcActiveFilterCount({ status: "active", search: "acme" }, defaults);
    expect(count).toBe(2);
  });
});
