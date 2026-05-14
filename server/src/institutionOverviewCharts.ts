import { parseTimestamp } from "../../src/lib/calc/dateFilter.ts";
import type { AppState } from "./state.js";

const MS_PER_DAY = 86_400_000;
const TOP_REJECTION_REASONS = 8;

function normId(v: string | number | undefined): string {
  return String(v ?? "").replace(/\D/g, "");
}

function dayKeyLocal(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shortDayLabel(iso: string): string {
  const [ys, ms, ds] = iso.split("-");
  if (!ys || !ms || !ds) return iso;
  const dt = new Date(Number(ys), Number(ms) - 1, Number(ds));
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function errorCodeToReason(code: string): string {
  const c = code.trim();
  const map: Record<string, string> = {
    MISSING_MANDATORY_FIELD: "Missing Fields",
    INVALID_SCHEMA: "Format Error",
    DUPLICATE_RECORDS: "Duplicate",
    SCHEMA_VERSION_MISMATCH: "Schema Mismatch",
    RATE_LIMIT_EXCEEDED: "Rate Limited",
    AUTHENTICATION_FAILURE: "Authentication Failure",
  };
  if (map[c]) return map[c];
  return c
    .split("_")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ")
    .trim() || "Other";
}

function isSuccessSubmissionStatus(s: string): boolean {
  return String(s) === "Success";
}

/** API submission rows for a data submitter member (same rule as GET /monitoring/api-requests?institutionId=). */
export function filterApiRequestsForSubmitter(
  state: Pick<AppState, "apiRequests" | "dataSubmitterIdByApiKey">,
  institutionId: number
): any[] {
  const idNorm = normId(institutionId);
  return state.apiRequests.filter((r: any) => {
    const key = String(r.api_key ?? "");
    const sub = normId(state.dataSubmitterIdByApiKey[key] ?? "");
    return sub === idNorm;
  });
}

/** Enquiry rows for a member (matches Fastify monitoring filter). */
export function filterEnquiriesForInstitution(
  institutions: AppState["institutions"],
  enquiries: AppState["enquiries"],
  institutionId: number
): any[] {
  const idNorm = normId(institutionId);
  const inst = institutions.find((i: { id: number }) => normId(i.id) === idNorm);
  return enquiries.filter((e: any) => {
    const eid = e.institution_id;
    if (eid != null && normId(eid) === idNorm) return true;
    if (inst && e.institution === inst.name) return true;
    return false;
  });
}

function inWindow(ts: string, startMs: number, endMs: number): boolean {
  const t = parseTimestamp(ts)?.getTime();
  if (t == null || Number.isNaN(t)) return false;
  return t >= startMs && t <= endMs;
}

export interface InstitutionOverviewChartsResult {
  submissionVolumeData: { day: string; volume: number }[];
  successVsRejectedData: { name: string; value: number }[];
  rejectionReasonsData: { reason: string; count: number }[];
  processingTimeData: { day: string; avgMs: number }[];
  enquiryVolumeData: { day: string; volume: number }[];
  successVsFailedData: { name: string; value: number }[];
  responseTimeData: { day: string; latency: number }[];
}

export function buildInstitutionOverviewCharts(
  state: AppState,
  institutionId: number,
  now: Date = new Date()
): InstitutionOverviewChartsResult {
  const endMs = now.getTime();
  const startMs = endMs - 30 * MS_PER_DAY;

  const submissions = filterApiRequestsForSubmitter(state, institutionId).filter((r: any) =>
    inWindow(String(r.timestamp ?? ""), startMs, endMs)
  );

  const memberEnquiries = filterEnquiriesForInstitution(state.institutions, state.enquiries, institutionId).filter(
    (e: any) => inWindow(String(e.timestamp ?? ""), startMs, endMs)
  );

  // --- Submission: volume + processing time by day ---
  const volByDay = new Map<string, { volume: number; latSum: number; latN: number }>();
  let successRecords = 0;
  let rejectedRecords = 0;
  const reasonCounts = new Map<string, number>();

  for (const r of submissions) {
    const t = parseTimestamp(String(r.timestamp ?? ""))?.getTime();
    if (t == null) continue;
    const key = dayKeyLocal(t);
    const rec = Number(r.records ?? 0) || 0;
    const rt = Number(r.response_time_ms ?? 0) || 0;

    const cell = volByDay.get(key) ?? { volume: 0, latSum: 0, latN: 0 };
    cell.volume += rec;
    cell.latSum += rt;
    cell.latN += 1;
    volByDay.set(key, cell);

    if (isSuccessSubmissionStatus(String(r.status ?? ""))) successRecords += rec;
    else rejectedRecords += rec;

    const ec = r.error_code != null && String(r.error_code).length > 0 ? String(r.error_code) : null;
    if (ec) {
      const label = errorCodeToReason(ec);
      reasonCounts.set(label, (reasonCounts.get(label) ?? 0) + 1);
    }
  }

  const sortedDays = [...volByDay.keys()].sort();
  const submissionVolumeData = sortedDays.map((k) => ({
    day: shortDayLabel(k),
    volume: volByDay.get(k)!.volume,
  }));
  const processingTimeData = sortedDays.map((k) => {
    const c = volByDay.get(k)!;
    return { day: shortDayLabel(k), avgMs: c.latN > 0 ? Math.round(c.latSum / c.latN) : 0 };
  });

  const totalRec = successRecords + rejectedRecords;
  const successVsRejectedData: { name: string; value: number }[] =
    totalRec > 0
      ? [
          { name: "Success", value: Math.round(successRecords * 10) / 10 },
          { name: "Rejected", value: Math.round(rejectedRecords * 10) / 10 },
        ]
      : [];

  const rejectionReasonsData = [...reasonCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_REJECTION_REASONS)
    .map(([reason, count]) => ({ reason, count }));

  // --- Enquiries ---
  const enqByDay = new Map<string, { count: number; latSum: number; latN: number }>();
  let enqSuccess = 0;
  let enqFailed = 0;

  for (const e of memberEnquiries) {
    const t = parseTimestamp(String(e.timestamp ?? ""))?.getTime();
    if (t == null) continue;
    const key = dayKeyLocal(t);
    const st = String(e.status ?? "");
    if (st === "Success") enqSuccess += 1;
    else enqFailed += 1;

    const rt = Number(e.response_time_ms ?? 0) || 0;
    const cell = enqByDay.get(key) ?? { count: 0, latSum: 0, latN: 0 };
    cell.count += 1;
    cell.latSum += rt;
    cell.latN += 1;
    enqByDay.set(key, cell);
  }

  const enqSorted = [...enqByDay.keys()].sort();
  const enquiryVolumeData = enqSorted.map((k) => ({
    day: shortDayLabel(k),
    volume: enqByDay.get(k)!.count,
  }));
  const responseTimeData = enqSorted.map((k) => {
    const c = enqByDay.get(k)!;
    return { day: shortDayLabel(k), latency: c.latN > 0 ? Math.round(c.latSum / c.latN) : 0 };
  });

  const enqTotal = enqSuccess + enqFailed;
  const successVsFailedData: { name: string; value: number }[] =
    enqTotal > 0
      ? [
          { name: "Success", value: enqSuccess },
          { name: "Failed", value: enqFailed },
        ]
      : [];

  return {
    submissionVolumeData,
    successVsRejectedData,
    rejectionReasonsData,
    processingTimeData,
    enquiryVolumeData,
    successVsFailedData,
    responseTimeData,
  };
}
