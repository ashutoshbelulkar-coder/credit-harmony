/**
 * Canonical date/time filtering utilities.
 *
 * ALL date comparisons across the platform must go through these functions.
 * No inline date arithmetic is permitted in page components.
 *
 * Design rules:
 *  - Pure functions — no side effects, no global state.
 *  - Tolerant of both "yyyy-MM-dd HH:mm:ss" and "yyyy-MM-ddTHH:mm:ssZ" timestamp formats.
 *  - All comparisons are done in local time unless the input carries a timezone offset.
 *  - Invalid / empty inputs are handled gracefully (never throw).
 */

/** Milliseconds in common window sizes. */
export const WINDOW_MS = {
  "5m": 5 * 60_000,
  "1h": 60 * 60_000,
  "6h": 6 * 60 * 60_000,
  "24h": 24 * 60 * 60_000,
  "7d": 7 * 24 * 60 * 60_000,
  "30d": 30 * 24 * 60 * 60_000,
} as const;

export type RelativeWindow = keyof typeof WINDOW_MS;
export type TimePeriod = RelativeWindow | "all";

/**
 * Normalise a mixed-format timestamp string to a JS Date.
 * Handles both "2026-03-15 14:00:00" (space) and "2026-03-15T14:00:00Z" (ISO).
 * Returns null if the string is empty or unparseable.
 */
export function parseTimestamp(ts: string): Date | null {
  if (!ts || typeof ts !== "string") return null;
  // Replace space separator with T so the native Date parser can handle it
  const normalised = ts.replace(" ", "T");
  const d = new Date(normalised);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Returns true if `ts` falls within a sliding window from now.
 * Future timestamps (ts > now) are always included.
 *
 * @param ts   ISO timestamp string (with or without timezone)
 * @param windowMs  Window size in milliseconds (use WINDOW_MS constants)
 */
export function isWithinRelativeWindow(ts: string, windowMs: number): boolean {
  const d = parseTimestamp(ts);
  if (!d) return false;
  return Date.now() - d.getTime() <= windowMs;
}

/**
 * Returns true if `ts` falls within [dateFrom T00:00:00, dateTo T23:59:59.999].
 * Empty from/to means "no lower/upper bound".
 * If both are empty → always true.
 * If from > to → always false.
 *
 * @param ts       ISO timestamp string
 * @param dateFrom "yyyy-MM-dd" or "" (no lower bound)
 * @param dateTo   "yyyy-MM-dd" or "" (no upper bound)
 */
export function isWithinDateRange(ts: string, dateFrom: string, dateTo: string): boolean {
  const d = parseTimestamp(ts);
  if (!d) return false;
  const t = d.getTime();

  if (dateFrom && dateTo && dateFrom > dateTo) return false;

  if (dateFrom) {
    const lower = parseTimestamp(`${dateFrom}T00:00:00`)?.getTime();
    if (lower !== undefined && t < lower) return false;
  }
  if (dateTo) {
    const upper = parseTimestamp(`${dateTo}T23:59:59.999`)?.getTime();
    if (upper !== undefined && t > upper) return false;
  }
  return true;
}

/**
 * Returns true if `ts` is within the given period relative to now.
 * "all" always returns true.
 */
export function isWithinTimePeriod(ts: string, period: TimePeriod): boolean {
  if (period === "all") return true;
  return isWithinRelativeWindow(ts, WINDOW_MS[period]);
}

/**
 * Returns a "yyyy-MM" string for the given date (defaults to today).
 * Used for "this month" KPI comparisons.
 */
export function currentMonthKey(ref?: Date): string {
  const d = ref ?? new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Returns true if the date encoded in `isoDate` falls in the same
 * calendar year-month as `ref` (defaults to today).
 * Gracefully returns false for null/invalid inputs.
 */
export function isSameMonth(isoDate: string | null | undefined, ref?: Date): boolean {
  if (!isoDate) return false;
  const d = parseTimestamp(isoDate);
  if (!d) return false;
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return key === currentMonthKey(ref);
}

/**
 * Normalise a "MMM d" day label (e.g. "Mar 15") to "yyyy-MM-dd".
 * The label is interpreted relative to `referenceYear` (defaults to current year).
 * If the string is already "yyyy-MM-dd" it is returned as-is.
 * Returns the original string on parse failure (graceful degradation).
 */
/**
 * Regex for "Mmm d" or "Mmm dd" format (e.g. "Mar 5", "Dec 31").
 * Only strings matching this are attempted for conversion.
 */
const SHORT_DATE_RE = /^[A-Za-z]{3}\s+\d{1,2}$/;

export function normaliseToYMD(dayLabel: string, referenceYear?: number): string {
  if (!dayLabel) return dayLabel;
  // Already yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(dayLabel)) return dayLabel;

  // Only attempt conversion for recognised "Mmm d" / "Mmm dd" format
  if (!SHORT_DATE_RE.test(dayLabel.trim())) return dayLabel;

  const year = referenceYear ?? new Date().getFullYear();
  const attempted = new Date(`${dayLabel} ${year}`);
  if (!isNaN(attempted.getTime())) {
    const y = attempted.getFullYear();
    const m = String(attempted.getMonth() + 1).padStart(2, "0");
    const dd = String(attempted.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  return dayLabel;
}

/**
 * Returns true if `rowDate` (yyyy-MM-dd string) falls between `dateFrom`
 * and `dateTo` (inclusive) using lexicographic comparison.
 * Both bounds are optional (empty string = no bound).
 * Safe to use only when the input is guaranteed to be yyyy-MM-dd format.
 */
export function isDateInRange(rowDate: string, dateFrom: string, dateTo: string): boolean {
  if (dateFrom && dateTo && dateFrom > dateTo) return false;
  if (dateFrom && rowDate < dateFrom) return false;
  if (dateTo && rowDate > dateTo) return false;
  return true;
}
