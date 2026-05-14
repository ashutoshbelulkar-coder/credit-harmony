/**
 * Chart data transformation utilities.
 *
 * Converts raw API/mock data arrays into Recharts-compatible shapes.
 * All chart data preparation must go through these functions —
 * no inline array transforms inside component render/useMemo.
 */

// ─── Shared Types ────────────────────────────────────────────────────────────

export interface PieSlice {
  name: string;
  value: number;
}

export interface TrendPoint {
  day: string;
  [key: string]: string | number;
}

export interface BarPoint {
  label: string;
  value: number;
}

// ─── Pie / Donut Charts ──────────────────────────────────────────────────────

/**
 * Build a two-slice success/failure pie dataset.
 * Handles zero-total gracefully (both slices = 0).
 */
export function toSuccessFailurePie(success: number, total: number): PieSlice[] {
  const failure = Math.max(0, total - success);
  return [
    { name: "Success", value: success },
    { name: "Failure", value: failure },
  ];
}

/**
 * Build a donut chart from a severity distribution.
 * Input: [{ name: "Critical", value: 5 }, ...]
 * Output: same shape (pass-through, normalised).
 */
export function toSeverityPie(
  distribution: { name: string; value: number }[]
): PieSlice[] {
  return distribution.map((d) => ({ name: d.name, value: d.value }));
}

// ─── Bar Charts ───────────────────────────────────────────────────────────────

/**
 * Return the top N items from an array, sorted by `valueKey` descending.
 * If `n` >= array.length, all items are returned.
 */
export function toTopNBarData<T extends Record<string, unknown>>(
  rows: T[],
  labelKey: keyof T,
  valueKey: keyof T,
  n: number
): BarPoint[] {
  return [...rows]
    .sort((a, b) => (Number(b[valueKey]) || 0) - (Number(a[valueKey]) || 0))
    .slice(0, n)
    .map((r) => ({
      label: String(r[labelKey] ?? ""),
      value: Number(r[valueKey]) || 0,
    }));
}

// ─── Trend / Line Charts ──────────────────────────────────────────────────────

/**
 * Re-key a trend array so chart series use a consistent `day` field
 * and arbitrary additional value keys are passed through.
 */
export function toTrendSeries(
  rows: Record<string, unknown>[],
  ...valueKeys: string[]
): TrendPoint[] {
  return rows.map((r) => {
    const point: TrendPoint = { day: String(r.day ?? r.period ?? "") };
    for (const key of valueKeys) {
      point[key] = Number(r[key]) || 0;
    }
    return point;
  });
}

// ─── Product Usage Chart ─────────────────────────────────────────────────────

export interface ProductUsagePoint {
  productId: string;
  productName: string;
  standard: number;
  alternate: number;
}

export interface EnquiryForChart {
  product_id?: string;
  product_name?: string;
  enquiry_type?: string;
  type?: string;
}

/**
 * Aggregate enquiry records into a per-product usage chart.
 * An enquiry is "alternate" if its type contains "alternate" (case-insensitive).
 */
export function computeUsageByProduct(enquiries: EnquiryForChart[]): ProductUsagePoint[] {
  const map = new Map<string, ProductUsagePoint>();

  for (const e of enquiries) {
    const id = e.product_id ?? "unknown";
    const name = e.product_name ?? id;
    const isAlt = /alternate/i.test(e.enquiry_type ?? e.type ?? "");

    if (!map.has(id)) {
      map.set(id, { productId: id, productName: name, standard: 0, alternate: 0 });
    }
    const entry = map.get(id)!;
    if (isAlt) entry.alternate++;
    else entry.standard++;
  }

  return Array.from(map.values());
}

// ─── Batch Volume Chart ───────────────────────────────────────────────────────

export interface BatchVolRow {
  day: string;
  batches: number;
  success: number;
  failed: number;
}

/**
 * Pass-through formatter to ensure type safety for batch volume chart data.
 */
export function toBatchVolumeSeries(rows: BatchVolRow[]): BatchVolRow[] {
  return rows.map((r) => ({
    day: r.day,
    batches: r.batches,
    success: r.success,
    failed: r.failed,
  }));
}

// ─── Alert Charts ─────────────────────────────────────────────────────────────

/**
 * Aggregate active alerts into a per-domain count bar chart.
 */
export function toAlertsByDomain(
  alerts: { domain: string }[]
): BarPoint[] {
  const counts = new Map<string, number>();
  for (const a of alerts) {
    counts.set(a.domain, (counts.get(a.domain) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Aggregate active alerts into a severity distribution pie.
 */
export function toAlertSeverityPie(
  alerts: { severity: string }[]
): PieSlice[] {
  const counts = new Map<string, number>();
  for (const a of alerts) {
    counts.set(a.severity, (counts.get(a.severity) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
}
