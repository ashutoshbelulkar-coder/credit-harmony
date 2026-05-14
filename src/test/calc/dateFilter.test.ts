import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseTimestamp,
  isWithinRelativeWindow,
  isWithinDateRange,
  isWithinTimePeriod,
  currentMonthKey,
  isSameMonth,
  normaliseToYMD,
  isDateInRange,
  WINDOW_MS,
} from "@/lib/calc/dateFilter";

describe("parseTimestamp", () => {
  it("parses ISO 8601 with T separator", () => {
    const d = parseTimestamp("2026-03-15T14:30:00Z");
    expect(d).not.toBeNull();
    expect(d!.getUTCFullYear()).toBe(2026);
  });

  it("parses space-separated timestamps (DB format)", () => {
    const d = parseTimestamp("2026-03-15 14:30:00");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
  });

  it("returns null for empty string", () => {
    expect(parseTimestamp("")).toBeNull();
  });

  it("returns null for invalid date", () => {
    expect(parseTimestamp("not-a-date")).toBeNull();
  });

  it("handles null/undefined gracefully without throwing", () => {
    expect(parseTimestamp(null as unknown as string)).toBeNull();
    expect(parseTimestamp(undefined as unknown as string)).toBeNull();
  });
});

describe("isWithinRelativeWindow", () => {
  let now: number;

  beforeEach(() => {
    now = Date.now();
    vi.useFakeTimers({ now });
  });

  afterEach(() => vi.useRealTimers());

  it("includes timestamps within the window", () => {
    const ts = new Date(now - 60_000).toISOString(); // 1 min ago
    expect(isWithinRelativeWindow(ts, WINDOW_MS["5m"])).toBe(true);
  });

  it("excludes timestamps outside the window", () => {
    const ts = new Date(now - WINDOW_MS["24h"] - 1000).toISOString(); // just outside 24h
    expect(isWithinRelativeWindow(ts, WINDOW_MS["24h"])).toBe(false);
  });

  it("always includes future timestamps", () => {
    const ts = new Date(now + 10_000).toISOString();
    expect(isWithinRelativeWindow(ts, WINDOW_MS["5m"])).toBe(true);
  });

  it("returns false for invalid timestamp string", () => {
    expect(isWithinRelativeWindow("bad-ts", WINDOW_MS["1h"])).toBe(false);
  });
});

describe("isWithinDateRange", () => {
  it("includes timestamps within the range (inclusive)", () => {
    expect(isWithinDateRange("2026-03-15T12:00:00", "2026-03-01", "2026-03-31")).toBe(true);
  });

  it("excludes timestamps before the lower bound", () => {
    expect(isWithinDateRange("2026-02-28T23:59:59", "2026-03-01", "2026-03-31")).toBe(false);
  });

  it("excludes timestamps after the upper bound (inclusive up to 23:59:59.999)", () => {
    expect(isWithinDateRange("2026-04-01T00:00:00", "2026-03-01", "2026-03-31")).toBe(false);
  });

  it("includes timestamps on the exact lower bound date at T00:00:00", () => {
    expect(isWithinDateRange("2026-03-01T00:00:00", "2026-03-01", "2026-03-31")).toBe(true);
  });

  it("includes timestamps on the exact upper bound date at T23:59:59", () => {
    expect(isWithinDateRange("2026-03-31T23:59:59", "2026-03-01", "2026-03-31")).toBe(true);
  });

  it("accepts all timestamps when both bounds are empty", () => {
    expect(isWithinDateRange("2026-01-01T00:00:00", "", "")).toBe(true);
  });

  it("returns false when from > to", () => {
    expect(isWithinDateRange("2026-03-15T12:00:00", "2026-03-31", "2026-03-01")).toBe(false);
  });

  it("handles space-separated DB timestamp format", () => {
    expect(isWithinDateRange("2026-03-15 12:00:00", "2026-03-01", "2026-03-31")).toBe(true);
  });
});

describe("isWithinTimePeriod", () => {
  it("'all' period always returns true", () => {
    expect(isWithinTimePeriod("2020-01-01T00:00:00Z", "all")).toBe(true);
  });

  it("'24h' period returns true for recent timestamp", () => {
    const recent = new Date(Date.now() - 1_000).toISOString();
    expect(isWithinTimePeriod(recent, "24h")).toBe(true);
  });
});

describe("currentMonthKey", () => {
  it("returns YYYY-MM format", () => {
    const key = currentMonthKey(new Date("2026-03-15"));
    expect(key).toBe("2026-03");
  });

  it("pads single-digit months", () => {
    const key = currentMonthKey(new Date("2026-01-01"));
    expect(key).toBe("2026-01");
  });
});

describe("isSameMonth", () => {
  it("returns true when date matches reference month", () => {
    expect(isSameMonth("2026-03-15", new Date("2026-03-28"))).toBe(true);
  });

  it("returns false when date is in a different month", () => {
    expect(isSameMonth("2026-02-15", new Date("2026-03-28"))).toBe(false);
  });

  it("returns false for null/undefined/empty input", () => {
    expect(isSameMonth(null)).toBe(false);
    expect(isSameMonth(undefined)).toBe(false);
    expect(isSameMonth("")).toBe(false);
  });

  it("handles space-separated timestamps", () => {
    expect(isSameMonth("2026-03-10 09:00:00", new Date("2026-03-15"))).toBe(true);
  });
});

describe("normaliseToYMD", () => {
  it("passes through dates already in yyyy-MM-dd format", () => {
    expect(normaliseToYMD("2026-03-15")).toBe("2026-03-15");
  });

  it("converts 'Mar 15' with a reference year", () => {
    const result = normaliseToYMD("Mar 15", 2026);
    expect(result).toBe("2026-03-15");
  });

  it("returns original string on unparseable input", () => {
    expect(normaliseToYMD("not-a-date")).toBe("not-a-date");
  });
});

describe("isDateInRange (yyyy-MM-dd lexicographic)", () => {
  it("includes date within range", () => {
    expect(isDateInRange("2026-03-15", "2026-03-01", "2026-03-31")).toBe(true);
  });

  it("excludes date before range", () => {
    expect(isDateInRange("2026-02-28", "2026-03-01", "2026-03-31")).toBe(false);
  });

  it("excludes date after range", () => {
    expect(isDateInRange("2026-04-01", "2026-03-01", "2026-03-31")).toBe(false);
  });

  it("includes exact lower bound", () => {
    expect(isDateInRange("2026-03-01", "2026-03-01", "2026-03-31")).toBe(true);
  });

  it("includes exact upper bound", () => {
    expect(isDateInRange("2026-03-31", "2026-03-01", "2026-03-31")).toBe(true);
  });

  it("returns false when from > to", () => {
    expect(isDateInRange("2026-03-15", "2026-03-31", "2026-03-01")).toBe(false);
  });

  it("no lower bound — accepts all before upper bound", () => {
    expect(isDateInRange("2025-01-01", "", "2026-12-31")).toBe(true);
  });

  it("no upper bound — accepts all after lower bound", () => {
    expect(isDateInRange("2028-01-01", "2026-01-01", "")).toBe(true);
  });
});
