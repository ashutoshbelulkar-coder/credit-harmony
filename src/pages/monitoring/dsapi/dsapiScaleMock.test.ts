import { formatCompact, formatDateTime, formatDateTimeFromIso, formatDeltaPct } from "./dsapiScaleMock";

describe("dsapiScaleMock formatters", () => {
  it("uses compact form at 100k+", () => {
    expect(formatCompact(99_999)).toMatch(/99,999|99999/);
    expect(formatCompact(842_100)).toBe("842.1K");
    expect(formatCompact(1_020_000)).toBe("1.02M");
  });

  it("formats signed deltas", () => {
    expect(formatDeltaPct(1.2)).toBe("+1.2%");
    expect(formatDeltaPct(-0.4)).toBe("-0.4%");
  });

  it("formats date along with time", () => {
    const ts = new Date(2026, 7, 19, 14, 32, 5).getTime();
    expect(formatDateTime(ts)).toBe("19 Aug 2026, 14:32:05");
  });

  it("formats API timestamps as date along with time", () => {
    expect(formatDateTimeFromIso("2026-08-19 14:32:05")).toBe("19 Aug 2026, 14:32:05");
    expect(formatDateTimeFromIso("not-a-date")).toBe("not-a-date");
  });
});

