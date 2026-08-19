import { describe, expect, it } from "vitest";
import {
  applyBucketJitter,
  buildEnquirySnapshot,
  ENQUIRY_CONSTANTS,
  formatCompact,
  formatDateTime,
  formatDeltaPct,
  formatPct1,
  getEnquiryCatalog,
  type EnquiryMockFilters,
} from "./enquiryScaleMock";

const base: EnquiryMockFilters = {
  window: "24h",
  type: "all",
  anchor: "all",
  entity: "all",
  productId: "all",
  memberId: "all",
};

describe("enquiryScaleMock", () => {
  it("uses compact form at 100k+", () => {
    expect(formatCompact(99_999)).toMatch(/99,999|99999/);
    expect(formatCompact(842_100)).toBe("842.1K");
    expect(formatCompact(1_020_000)).toBe("1.02M");
  });

  it("formats signed deltas and one-decimal percents", () => {
    expect(formatDeltaPct(1.2)).toBe("+1.2%");
    expect(formatDeltaPct(-0.4)).toBe("-0.4%");
    expect(formatPct1(74.04)).toBe("74.0%");
  });

  it("formats date along with time", () => {
    const ts = new Date(2026, 7, 19, 14, 32, 5).getTime();
    expect(formatDateTime(ts)).toBe("19 Aug 2026, 14:32:05");
  });

  it("seeds 1040 members with CBS first", () => {
    const catalog = getEnquiryCatalog();
    expect(catalog).toHaveLength(ENQUIRY_CONSTANTS.memberCount);
    expect(catalog[0]).toMatchObject({ name: "CBS", code: "CBS" });
  });

  it("reproduces the same KPIs for the same filters", () => {
    const now = 1_724_000_000_000;
    const a = buildEnquirySnapshot(base, now);
    const b = buildEnquirySnapshot(base, now);
    expect(a.kpis.map((k) => k.value)).toEqual(b.kpis.map((k) => k.value));
    expect(a.totals).toEqual(b.totals);
  });

  it("does not use Pareto code in snapshot seed (callers filter after)", () => {
    const now = 1_724_000_000_000;
    const snap = buildEnquirySnapshot(base, now);
    const again = buildEnquirySnapshot(base, now);
    expect(snap.kpis.find((k) => k.id === "success")?.value).toBe(again.kpis.find((k) => k.id === "success")?.value);
  });

  it("shows five simple KPI cards", () => {
    const snap = buildEnquirySnapshot(base, 1_724_000_000_000);
    expect(snap.kpis.map((k) => k.id)).toEqual(["requests", "success", "rejection", "failed", "p95"]);
    expect(snap.kpis.map((k) => k.label)).toEqual([
      "Total requests",
      "Success %",
      "Rejection %",
      "Failed %",
      "P95 latency",
    ]);
    expect(snap.totals.productEnquiries).toBeGreaterThanOrEqual(snap.totals.enquiries);
    expect(snap.kpis.find((k) => k.id === "success")?.slo).toBe("ok");
    expect(snap.kpis.find((k) => k.id === "p95")?.slo).toBe("ok");
    expect(snap.kpis.find((k) => k.id === "requests")?.slo).toBe("na");
  });

  it("keeps P95 as a millisecond value", () => {
    const snap = buildEnquirySnapshot(base, 1_724_000_000_000);
    const p95 = snap.kpis.find((k) => k.id === "p95");
    expect(p95?.value).toMatch(/^\d+ ms$/);
  });

  it("renders 12 curated traces with FAILED HARD footprint", () => {
    const snap = buildEnquirySnapshot(base, 1_724_000_000_000);
    const curated = snap.traces.slice(0, 12);
    expect(curated).toHaveLength(12);
    expect(curated.map((t) => t.status)).toEqual([
      "SUCCESS",
      "SUCCESS",
      "NO_DATA",
      "FAILED",
      "GATED",
      "GATED",
      "GATED",
      "GATED",
      "GATED",
      "ERROR",
      "SUCCESS",
      "SUCCESS",
    ]);
    const failedHard = curated[3];
    expect(failedHard.enquiryType).toBe("HARD");
    expect(failedHard.footprintCreated).toBe(true);
    expect(failedHard.products.every((p) => p.outcome === "FAILED")).toBe(true);
    expect(curated[4].errors[0]?.code).toBe("ERR_PRODUCT_NOT_SUBSCRIBED");
    expect(curated[5].errors.map((e) => e.rule)).toEqual(["VAL_REQUIRED_FIELD_MISSING", "VAL_ENUM_INVALID"]);
    expect(curated.every((t) => t.consentRef === "CNS-****-4411")).toBe(true);
    expect(curated.every((t) => /masked/i.test(t.subjectNote))).toBe(true);
  });

  it("jitters only the latest bucket", () => {
    const snap = buildEnquirySnapshot(base, 1_724_000_000_000);
    const jittered = applyBucketJitter(snap, 1);
    expect(jittered.buckets.slice(0, -1)).toEqual(snap.buckets.slice(0, -1));
    expect(jittered.kpis).toEqual(snap.kpis);
  });

  it("member rejectedPct is gated share of requests", () => {
    const snap = buildEnquirySnapshot(base, 1_724_000_000_000);
    const row = snap.members.find((m) => m.requests > 0);
    expect(row).toBeDefined();
    if (!row) return;
    expect(row.rejectedPct).toBe(+((row.gated / row.requests) * 100).toFixed(1));
  });

  it("24h volume is in a plausible daily band around 320k", () => {
    const snap = buildEnquirySnapshot(base, Date.UTC(2026, 7, 19, 8, 0, 0));
    expect(snap.totals.requests).toBeGreaterThan(80_000);
    expect(snap.totals.requests).toBeLessThan(1_200_000);
  });
});
