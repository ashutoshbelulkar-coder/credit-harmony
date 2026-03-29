import { parseTimestamp } from "../../src/lib/calc/dateFilter.ts";
import type { AppState } from "./state.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type ApiRow = { status: string; timestamp: string; response_time_ms?: number };

export function resolveDashboardWindow(
  q: Record<string, string | undefined>,
  now = new Date()
): { startMs: number; endMs: number; preset: string } {
  const range = String(q.range ?? "30d").toLowerCase().trim();
  const from = q.from?.trim() ?? "";
  const to = q.to?.trim() ?? "";

  if (range === "custom" && ISO_DATE.test(from) && ISO_DATE.test(to)) {
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59.999`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return slidingWindow(now, 30, "30d");
    }
    return { startMs: start.getTime(), endMs: end.getTime(), preset: "custom" };
  }

  if (range === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return { startMs: d.getTime(), endMs: now.getTime(), preset: "today" };
  }

  const days =
    range === "7d" ? 7 : range === "90d" ? 90 : range === "14d" ? 14 : range === "30d" ? 30 : 30;
  return slidingWindow(now, days, range === "7d" || range === "90d" || range === "14d" || range === "30d" ? range : "30d");
}

function slidingWindow(now: Date, days: number, preset: string) {
  const endMs = now.getTime();
  return { startMs: endMs - days * 86_400_000, endMs, preset };
}

function priorWindow(startMs: number, endMs: number, preset: string): { ps: number; pe: number } {
  const len = Math.max(1, endMs - startMs);
  if (preset === "today") {
    return { ps: startMs - len, pe: startMs - 1 };
  }
  return { ps: startMs - len, pe: startMs };
}

function inWindow(ts: string, startMs: number, endMs: number): boolean {
  const t = parseTimestamp(ts)?.getTime();
  if (t == null || Number.isNaN(t)) return false;
  return t >= startMs && t <= endMs;
}

function filterApiRows(rows: ApiRow[], startMs: number, endMs: number): ApiRow[] {
  return rows.filter((r) => inWindow(String(r.timestamp ?? ""), startMs, endMs));
}

function isSuccessStatus(s: string): boolean {
  return String(s).toLowerCase() === "success";
}

function isFailedOrPartial(s: string): boolean {
  const x = String(s).toLowerCase();
  return x === "failed" || x === "partial";
}

function computeApiStats(rows: ApiRow[]) {
  const total = rows.length;
  const success = rows.filter((r) => isSuccessStatus(r.status)).length;
  const failedPartial = rows.filter((r) => isFailedOrPartial(r.status)).length;
  /** Matches Spring dashboard charts: only failed + partial count as “failure” in the pie. */
  const pieFailure = failedPartial;
  const errorRate = total > 0 ? Math.round((failedPartial * 1000) / total) / 10 : 0;
  const slaHealth = total > 0 ? Math.round((success * 1000) / total) / 10 : 0;
  return { total, success, pieFailure, errorRate, slaHealth };
}

function fmtPctChange(curr: number, prev: number): string {
  if (prev <= 0) return curr > 0 ? "+100%" : "0%";
  const pct = Math.round(((curr - prev) / prev) * 1000) / 10;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}%`;
}

/** Delta for percentage-point KPIs (error rate, SLA, data quality). */
function fmtDeltaPP(curr: number, prev: number): string {
  const d = Math.round((curr - prev) * 10) / 10;
  if (d === 0) return "0%";
  const sign = d > 0 ? "+" : "";
  return `${sign}${d}%`;
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
  const dt = new Date(Number(ys), Number(ms) - 1, Number(ds));
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function weekKeyLocal(ms: number): string {
  const d = new Date(ms);
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const n = Math.ceil(((d.getTime() - oneJan.getTime()) / 86_400_000 + oneJan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(Math.min(53, Math.max(1, n))).padStart(2, "0")}`;
}

function buildApiUsageTrend(rows: ApiRow[], startMs: number, endMs: number) {
  const byDay = new Map<string, ApiRow[]>();
  for (const r of rows) {
    const t = parseTimestamp(String(r.timestamp ?? ""))?.getTime();
    if (t == null || t < startMs || t > endMs) continue;
    const key = dayKeyLocal(t);
    const arr = byDay.get(key) ?? [];
    arr.push(r);
    byDay.set(key, arr);
  }
  const keys = [...byDay.keys()].sort();
  return keys.map((k) => {
    const dayRows = byDay.get(k)!;
    const fp = dayRows.filter((r) => isFailedOrPartial(r.status)).length;
    const err = dayRows.length > 0 ? Math.round((fp * 1000) / dayRows.length) / 10 : 0;
    return { day: shortDayLabel(k), volume: dayRows.length, errors: err };
  });
}

function buildSlaLatency(rows: ApiRow[], startMs: number, endMs: number) {
  const byDay = new Map<string, number[]>();
  for (const r of rows) {
    const t = parseTimestamp(String(r.timestamp ?? ""))?.getTime();
    if (t == null || t < startMs || t > endMs) continue;
    const key = dayKeyLocal(t);
    const arr = byDay.get(key) ?? [];
    arr.push(Number(r.response_time_ms ?? 0));
    byDay.set(key, arr);
  }
  const keys = [...byDay.keys()].sort();
  return keys.map((k) => {
    const msArr = byDay.get(k)!.sort((a, b) => a - b);
    const max = msArr[msArr.length - 1] ?? 0;
    const p95i = Math.max(0, Math.floor(msArr.length * 0.95) - 1);
    const p99i = Math.max(0, Math.floor(msArr.length * 0.99) - 1);
    return {
      day: shortDayLabel(k),
      p95: Math.round(msArr[p95i] ?? max),
      p99: Math.round(msArr[p99i] ?? max),
    };
  });
}

function institutionNameById(state: AppState, id: string | number): string {
  const sid = String(id);
  const inst = state.institutions.find((i: { id: number }) => String(i.id) === sid);
  return inst?.name ?? `Member ${sid}`;
}

function buildTopInstitutions(state: AppState, startMs: number, endMs: number) {
  const counts = new Map<string, { n: number; instId?: number }>();
  for (const e of state.enquiries as { timestamp?: string; institution?: string; institution_id?: number | string }[]) {
    if (!inWindow(String(e.timestamp ?? ""), startMs, endMs)) continue;
    const name = String(e.institution ?? "");
    if (!name) continue;
    const prev = counts.get(name) ?? { n: 0 };
    prev.n += 1;
    const rawId = e.institution_id;
    const num = typeof rawId === "number" ? rawId : parseInt(String(rawId).replace(/\D/g, ""), 10);
    if (Number.isFinite(num)) prev.instId = num;
    counts.set(name, prev);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 5);
  return sorted.map(([name, v]) => {
    const inst = state.institutions.find(
      (i: { id: number; name?: string }) => i.name === name || i.id === v.instId
    ) as { dataQualityScore?: number; slaHealthPercent?: number } | undefined;
    return {
      name,
      enquiryCount: v.n,
      requests: v.n,
      quality: Math.round(inst?.dataQualityScore ?? 92),
      sla: Math.round(Number(inst?.slaHealthPercent ?? 99) * 10) / 10,
    };
  });
}

function avgBatchSuccessRate(state: AppState, startMs: number, endMs: number): number | null {
  const vals: number[] = [];
  for (const j of state.batchJobs as { uploaded?: string; total_records?: number; success_rate?: number }[]) {
    const t = parseTimestamp(String(j.uploaded ?? ""))?.getTime();
    if (t == null || t < startMs || t > endMs) continue;
    if (Number(j.total_records ?? 0) <= 0) continue;
    const sr = Number(j.success_rate);
    if (!Number.isFinite(sr)) continue;
    vals.push(sr);
  }
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

function institutionAvgDQ(state: AppState): number {
  const insts = state.institutions.filter((i: { isDeleted?: boolean }) => !i.isDeleted);
  if (insts.length === 0) return 0;
  const sum = insts.reduce((s, i: { dataQualityScore?: number }) => s + Number(i.dataQualityScore ?? 0), 0);
  return Math.round((sum / insts.length) * 10) / 10;
}

function buildMappingAccuracyFromBatches(state: AppState, startMs: number, endMs: number) {
  const buckets = new Map<string, number[]>();
  for (const j of state.batchJobs as { uploaded?: string; total_records?: number; success_rate?: number }[]) {
    const t = parseTimestamp(String(j.uploaded ?? ""))?.getTime();
    if (t == null || t < startMs || t > endMs) continue;
    if (Number(j.total_records ?? 0) <= 0) continue;
    const sr = Number(j.success_rate);
    if (!Number.isFinite(sr)) continue;
    const wk = weekKeyLocal(t);
    const arr = buckets.get(wk) ?? [];
    arr.push(sr);
    buckets.set(wk, arr);
  }
  const keys = [...buckets.keys()].sort();
  return keys.map((week) => {
    const arr = buckets.get(week)!;
    const acc = arr.reduce((a, b) => a + b, 0) / arr.length;
    return { week, accuracy: Math.round(acc * 10) / 10 };
  });
}

function buildRejectionOverride(
  state: AppState,
  startMs: number,
  endMs: number,
  fallback: { week: string; rejected: number; overridden: number }[]
) {
  const map = new Map<string, { rejected: number; overridden: number }>();
  for (const a of state.approvals as {
    status?: string;
    reviewedAt?: string;
    reviewed_at?: string;
  }[]) {
    const raw = a.reviewedAt ?? a.reviewed_at;
    if (!raw) continue;
    const t = new Date(raw).getTime();
    if (Number.isNaN(t) || t < startMs || t > endMs) continue;
    const st = String(a.status ?? "").toLowerCase();
    if (st === "pending") continue;
    const wk = weekKeyLocal(t);
    const cur = map.get(wk) ?? { rejected: 0, overridden: 0 };
    if (st === "rejected") cur.rejected += 1;
    else if (st === "approved" || st === "changes_requested") cur.overridden += 1;
    map.set(wk, cur);
  }
  const keys = [...map.keys()].sort();
  const out = keys.map((week) => ({ week, ...map.get(week)! }));
  if (out.length >= 1) return out;
  const weeks = Math.min(fallback.length, Math.max(3, Math.ceil((endMs - startMs) / (7 * 86_400_000))));
  return fallback.slice(0, weeks);
}

function buildMatchConfidence(state: AppState) {
  const buckets = new Map<string, number>([
    ["0–40", 0],
    ["40–60", 0],
    ["60–75", 0],
    ["75–90", 0],
    ["90–100", 0],
  ]);
  for (const i of state.institutions as { isDeleted?: boolean; isDataSubmitter?: boolean; matchAccuracyScore?: number }[]) {
    if (i.isDeleted || !i.isDataSubmitter) continue;
    const m = Number(i.matchAccuracyScore ?? 0);
    let b = "90–100";
    if (m < 90) b = "0–40";
    else if (m < 95) b = "40–60";
    else if (m < 98) b = "60–75";
    else if (m < 99) b = "75–90";
    buckets.set(b, (buckets.get(b) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([bucket, count]) => ({ bucket, count }));
}

export function buildDashboardMetrics(state: AppState, q: Record<string, string | undefined>) {
  const { startMs, endMs, preset } = resolveDashboardWindow(q);
  const { ps, pe } = priorWindow(startMs, endMs, preset);

  const rows = state.apiRequests as ApiRow[];
  const curRows = filterApiRows(rows, startMs, endMs);
  const prevRows = filterApiRows(rows, ps, pe);
  const cur = computeApiStats(curRows);
  const prev = computeApiStats(prevRows);

  const dqBatch = avgBatchSuccessRate(state, startMs, endMs);
  const dqInst = institutionAvgDQ(state);
  const dataQualityScore = dqBatch != null ? dqBatch : dqInst;
  const prevDqBatch = avgBatchSuccessRate(state, ps, pe);
  const prevDq = prevDqBatch != null ? prevDqBatch : dqInst;

  return {
    apiVolume24h: cur.total,
    apiVolumeChange: fmtPctChange(cur.total, prev.total),
    errorRate: cur.errorRate,
    errorRateChange: fmtDeltaPP(cur.errorRate, prev.errorRate),
    slaHealth: cur.slaHealth,
    slaHealthChange: fmtDeltaPP(cur.slaHealth, prev.slaHealth),
    dataQualityScore,
    dataQualityChange: fmtDeltaPP(dataQualityScore, prevDq),
  };
}

export function buildDashboardCharts(state: AppState, q: Record<string, string | undefined>) {
  const { startMs, endMs } = resolveDashboardWindow(q);
  const extra = state.dashboardChartsExtra as Record<string, unknown>;
  const fallbackRej = (extra.rejectionOverride as { week: string; rejected: number; overridden: number }[]) ?? [];

  const rows = state.apiRequests as ApiRow[];
  const curRows = filterApiRows(rows, startMs, endMs);

  const stats = computeApiStats(curRows);
  let apiUsageTrend = buildApiUsageTrend(curRows, startMs, endMs);
  if (apiUsageTrend.length === 0 && curRows.length === 0) {
    const raw = (extra.apiUsageTrend as { day?: string; volume?: number; errors?: number }[]) ?? [];
    apiUsageTrend = raw.map((p) => ({
      day: String(p.day ?? ""),
      volume: Number(p.volume ?? 0),
      errors: typeof p.errors === "number" ? p.errors : 0,
    }));
  }

  let slaLatency = buildSlaLatency(curRows, startMs, endMs);
  if (slaLatency.length === 0) {
    slaLatency = (extra.slaLatency as { day: string; p95: number; p99: number }[]) ?? [];
  }

  let mappingAccuracy = buildMappingAccuracyFromBatches(state, startMs, endMs);
  if (mappingAccuracy.length < 2) {
    mappingAccuracy = ((extra.mappingAccuracy as { period?: string; week?: string; accuracy?: number }[]) ?? []).map(
      (p) => ({
        week: String(p.week ?? p.period ?? ""),
        accuracy: Number(p.accuracy ?? 0),
      })
    );
  }

  const mcBuilt = buildMatchConfidence(state);
  const matchConfidence =
    mcBuilt.some((x) => x.count > 0) ? mcBuilt : ((extra.matchConfidence as { bucket: string; count: number }[]) ?? []);

  return {
    successFailure: { success: stats.success, failure: stats.pieFailure },
    apiUsageTrend,
    mappingAccuracy,
    matchConfidence,
    slaLatency,
    rejectionOverride: buildRejectionOverride(state, startMs, endMs, fallbackRej),
    topInstitutions: buildTopInstitutions(state, startMs, endMs),
  };
}

export function buildMemberQualityForRange(state: AppState, startMs: number, endMs: number) {
  type Acc = { srs: number[]; tr: number[] };
  const outer = new Map<string, Map<string, Acc>>();
  for (const j of state.batchJobs as { uploaded?: string; institution_id?: string | number; success_rate?: number; total_records?: number }[]) {
    const t = parseTimestamp(String(j.uploaded ?? ""))?.getTime();
    if (t == null || t < startMs || t > endMs) continue;
    const member = institutionNameById(state, j.institution_id ?? "");
    const period = new Date(t).toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" });
    let inner = outer.get(member);
    if (!inner) {
      inner = new Map();
      outer.set(member, inner);
    }
    const acc = inner.get(period) ?? { srs: [], tr: [] };
    acc.srs.push(Number(j.success_rate ?? 0));
    acc.tr.push(Number(j.total_records ?? 0));
    inner.set(period, acc);
  }

  const out: {
    member: string;
    period: string;
    qualityScore: number;
    recordCount: number;
    anomalyFlag: boolean;
  }[] = [];

  for (const [member, periods] of outer) {
    for (const [period, acc] of periods) {
      const q =
        acc.srs.length > 0 ? acc.srs.reduce((a, b) => a + b, 0) / acc.srs.length : 0;
      const recordCount = acc.tr.reduce((a, b) => a + b, 0);
      out.push({
        member,
        period,
        qualityScore: Math.round(q * 10) / 10,
        recordCount,
        anomalyFlag: q < 95,
      });
    }
  }

  out.sort((a, b) => a.member.localeCompare(b.member) || a.period.localeCompare(b.period));
  if (out.length > 0) return out.slice(0, 64);

  return (state.institutions as { name?: string; dataQualityScore?: number; matchAccuracyScore?: number; slaHealthPercent?: number; id?: number }[])
    .slice(0, 8)
    .map((inst) => ({
      member: String(inst.name ?? ""),
      period: "30d",
      qualityScore: Number(inst.dataQualityScore ?? inst.matchAccuracyScore ?? 92),
      recordCount: 8000 + Number(inst.id ?? 0) * 400,
      anomalyFlag: Number(inst.slaHealthPercent ?? 100) < 97,
    }));
}

export function recentApiErrors1h(state: AppState): number {
  const hourAgo = Date.now() - 3_600_000;
  return (state.apiRequests as ApiRow[]).filter((r) => {
    const t = parseTimestamp(String(r.timestamp ?? ""))?.getTime() ?? 0;
    return t >= hourAgo && !isSuccessStatus(r.status);
  }).length;
}
