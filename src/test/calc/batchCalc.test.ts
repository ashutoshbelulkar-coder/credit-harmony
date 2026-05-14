import { describe, it, expect } from "vitest";
import {
  computeBatchSuccessRate,
  isBelowSlaThreshold,
  computeProgress,
  computeQuality,
  formatElapsedMs,
  computeStageElapsed,
  sortBatchJobsForPipeline,
  type BatchJobForPipeline,
} from "@/lib/calc/batchCalc";

describe("computeBatchSuccessRate", () => {
  it("computes rate correctly (1 decimal)", () => {
    expect(computeBatchSuccessRate(950, 1000)).toBe(95);
    expect(computeBatchSuccessRate(1, 3)).toBe(33.3);
  });

  it("returns 0 when total is 0", () => {
    expect(computeBatchSuccessRate(0, 0)).toBe(0);
  });

  it("returns 100 for all success", () => {
    expect(computeBatchSuccessRate(500, 500)).toBe(100);
  });
});

describe("isBelowSlaThreshold", () => {
  it("returns true when below default 95% threshold", () => {
    expect(isBelowSlaThreshold(94.9)).toBe(true);
  });

  it("returns false when above threshold", () => {
    expect(isBelowSlaThreshold(95)).toBe(false);
  });

  it("supports custom threshold", () => {
    expect(isBelowSlaThreshold(98, 99)).toBe(true);
  });
});

describe("computeProgress", () => {
  it("calculates percentage from counters", () => {
    expect(computeProgress({ business_ok: 800, system_ko: 50, business_ko: 50, total_records: 1000 })).toBe(90);
  });

  it("returns 0 when total is 0", () => {
    expect(computeProgress({ business_ok: 0, system_ko: 0, business_ko: 0, total_records: 0 })).toBe(0);
  });

  it("caps at 100 even if counters exceed total", () => {
    expect(computeProgress({ business_ok: 600, system_ko: 300, business_ko: 200, total_records: 1000 })).toBe(100);
  });
});

describe("computeQuality", () => {
  it("computes quality ratio correctly", () => {
    expect(computeQuality({ business_ok: 950, total_records: 1000 })).toBe(95);
  });

  it("returns 0 when total is 0", () => {
    expect(computeQuality({ business_ok: 0, total_records: 0 })).toBe(0);
  });
});

describe("formatElapsedMs", () => {
  it("formats milliseconds under 1s", () => {
    expect(formatElapsedMs(750)).toBe("750ms");
  });

  it("formats seconds under 1 minute", () => {
    expect(formatElapsedMs(1500)).toBe("1.5s");
  });

  it("formats minutes and seconds for long durations", () => {
    expect(formatElapsedMs(90_000)).toBe("1m 30s");
  });
});

describe("computeStageElapsed", () => {
  it("formats duration between two HH:mm:ss timestamps as seconds for >= 1000ms", () => {
    const result = computeStageElapsed("10:00:00", "10:00:01");
    expect(result).toBe("1.0s"); // exactly 1000ms → formatted as seconds
  });

  it("formats sub-second duration as ms", () => {
    const result = computeStageElapsed("10:00:00", "10:00:00"); // 0ms
    expect(result).toBe("0ms");
  });

  it("returns — when start or end is missing", () => {
    expect(computeStageElapsed(undefined, "10:00:01")).toBe("—");
    expect(computeStageElapsed("10:00:00", undefined)).toBe("—");
  });
});

describe("sortBatchJobsForPipeline", () => {
  const makeJob = (status: string, uploaded: string): BatchJobForPipeline => ({
    batch_id: `b-${Math.random()}`,
    status,
    total_records: 100,
    success: 95,
    failed: 5,
    success_rate: 95,
    uploaded,
    file_name: "test.csv",
  });

  it("sorts Processing before Completed", () => {
    const jobs = [makeJob("Completed", "2026-03-01"), makeJob("Processing", "2026-03-02")];
    const sorted = sortBatchJobsForPipeline(jobs);
    expect(sorted[0].status).toBe("Processing");
  });

  it("sorts Failed before Queued", () => {
    const jobs = [makeJob("Queued", "2026-03-01"), makeJob("Failed", "2026-03-02")];
    const sorted = sortBatchJobsForPipeline(jobs);
    expect(sorted[0].status).toBe("Failed");
  });

  it("within the same status, sorts by upload time descending (most recent first)", () => {
    const jobs = [
      makeJob("Completed", "2026-03-01 10:00:00"),
      makeJob("Completed", "2026-03-02 10:00:00"),
    ];
    const sorted = sortBatchJobsForPipeline(jobs);
    expect(sorted[0].uploaded).toBe("2026-03-02 10:00:00");
  });

  it("does not mutate the original array", () => {
    const jobs = [makeJob("Completed", "2026-03-01"), makeJob("Processing", "2026-03-02")];
    const original = [...jobs];
    sortBatchJobsForPipeline(jobs);
    expect(jobs[0].status).toBe(original[0].status);
  });
});
