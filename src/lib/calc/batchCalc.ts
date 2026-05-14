/**
 * Batch job specific calculation utilities.
 *
 * Centralises all math used in BatchExecutionConsole and dashboard batch pipeline.
 * Replaces inline Math.round() calls scattered across component files.
 */

// ─── Batch Success / Quality ─────────────────────────────────────────────────

/**
 * Batch success rate as a percentage (0–100, 1 decimal).
 * Formula: (successRecords / totalRecords) * 100
 * Zero-denominator safe.
 */
export function computeBatchSuccessRate(successRecords: number, totalRecords: number): number {
  if (totalRecords === 0) return 0;
  return Math.round((successRecords / totalRecords) * 1000) / 10;
}

/**
 * Returns true if the success rate is below the SLA threshold.
 * Default threshold: 95%.
 */
export function isBelowSlaThreshold(successRate: number, threshold = 95): boolean {
  return successRate < threshold;
}

/**
 * Progress percentage of a batch job from counters.
 * Formula: (business_ok + system_ko + business_ko) / total_records * 100
 */
export function computeProgress(counters: {
  business_ok: number;
  system_ko: number;
  business_ko: number;
  total_records: number;
}): number {
  const { business_ok, system_ko, business_ko, total_records } = counters;
  if (total_records === 0) return 0;
  const processed = business_ok + system_ko + business_ko;
  return Math.min(100, Math.round((processed / total_records) * 100));
}

/**
 * Data quality score as a percentage from a batch job.
 * Formula: (business_ok / total_records) * 100
 */
export function computeQuality(counters: {
  business_ok: number;
  total_records: number;
}): number {
  const { business_ok, total_records } = counters;
  if (total_records === 0) return 0;
  return parseFloat(((business_ok / total_records) * 100).toFixed(1));
}

// ─── Elapsed Time Formatting ─────────────────────────────────────────────────

/**
 * Format elapsed milliseconds as a human-readable string.
 * < 1000ms → "Xms"
 * >= 1000ms → "X.Xs" (1 decimal)
 * >= 60000ms → "Xm Ys"
 */
export function formatElapsedMs(elapsedMs: number): string {
  if (elapsedMs < 1000) return `${elapsedMs}ms`;
  if (elapsedMs < 60_000) return `${(elapsedMs / 1000).toFixed(1)}s`;
  const minutes = Math.floor(elapsedMs / 60_000);
  const seconds = ((elapsedMs % 60_000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

/**
 * Compute elapsed time between two HH:mm:ss strings on a nominal date.
 * Returns a formatted string (e.g. "1.4s") or "—" if either argument is missing.
 */
export function computeStageElapsed(start?: string, end?: string): string {
  if (!start || !end) return "—";
  const toMs = (t: string) => new Date(`1970-01-01T${t}`).getTime();
  const diff = toMs(end) - toMs(start);
  if (isNaN(diff) || diff < 0) return "—";
  return formatElapsedMs(diff);
}

// ─── Dashboard Batch Pipeline ────────────────────────────────────────────────

export interface BatchJobForPipeline {
  batch_id: string;
  status: string;
  total_records: number;
  success: number;
  failed: number;
  success_rate: number;
  uploaded: string;
  file_name: string;
  institution_id?: string;
}

const STATUS_PRIORITY: Record<string, number> = {
  Processing: 0,
  Failed: 1,
  Queued: 2,
  Suspended: 3,
  Completed: 4,
};

/**
 * Parse an uploaded timestamp (supports both ISO and space-separated).
 */
function parseUploaded(ts: string): number {
  return new Date(ts.replace(" ", "T")).getTime() || 0;
}

/**
 * Sort batch jobs for pipeline display:
 * Primary sort: status priority (Processing → Failed → Queued → Suspended → Completed).
 * Secondary sort: upload time descending (most recent first within same status).
 */
export function sortBatchJobsForPipeline<T extends BatchJobForPipeline>(jobs: T[]): T[] {
  return [...jobs].sort((a, b) => {
    const pa = STATUS_PRIORITY[a.status] ?? 99;
    const pb = STATUS_PRIORITY[b.status] ?? 99;
    if (pa !== pb) return pa - pb;
    return parseUploaded(b.uploaded) - parseUploaded(a.uploaded);
  });
}
