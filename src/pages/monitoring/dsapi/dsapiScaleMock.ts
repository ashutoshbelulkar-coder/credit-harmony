/** Deterministic DSAPI ops mock: ~1M requests/day, 520+ submitters, aggregates only. */

export type DsapiWindow = "1h" | "24h" | "7d" | "30d" | "90d";
export type DsapiPathway = "all" | "structured" | "documents";
export type DsapiProfile =
  | "all"
  | "Consumer Credit"
  | "Commercial"
  | "Telco"
  | "Retail"
  | "Gold"
  | "Microfinance";

export const DSAPI_WINDOWS: { value: DsapiWindow; label: string }[] = [
  { value: "1h", label: "1h" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
];

export const DSAPI_PATHWAYS: { value: DsapiPathway; label: string }[] = [
  { value: "all", label: "All" },
  { value: "structured", label: "Structured" },
  { value: "documents", label: "Documents" },
];

export const DSAPI_PROFILES: Exclude<DsapiProfile, "all">[] = [
  "Consumer Credit",
  "Commercial",
  "Telco",
  "Retail",
  "Gold",
  "Microfinance",
];

export const PARETO_CODES = [
  "ERR_FIELD_MANDATORY",
  "ERR_FIELD_FORMAT",
  "ERR_FIELD_ENUM",
  "ERR_RATE_LIMIT_EXCEEDED",
  "ERR_DUPLICATE_SUBMISSION",
  "ERR_MAPPING_NOT_FOUND",
  "ERR_ENVELOPE_MALFORMED",
  "ERR_TOKEN_EXPIRED",
] as const;

const NAME_A = [
  "Harbor", "Meridian", "Crestline", "Pinnacle", "Stellar", "Union", "Atlas", "Nova",
  "Summit", "Cascade", "Beacon", "Sterling", "Granite", "Ridgeline", "Bluepeak", "Silveroak",
  "Irongate", "Northstar", "Lakeshore", "Fairfield", "Oakmont", "Westbrook", "Eastvale",
  "Kingsford", "Marlowe", "Halcyon", "Vantage", "Cornerstone", "Bridgeway", "Clearwater",
  "Redwood", "Sandstone", "Highland", "Millbrook", "Ashford", "Berkline", "Coralbay",
  "Dunmore", "Elmwood", "Foxton", "Glenmere", "Hartwell", "Ivorygate", "Junction", "Kestrel",
];
const NAME_B = [
  "Bank", "Finance", "Credit Union", "Lending", "Microfin", "Housing Fin", "Co-op Bank",
  "Capital", "NBFC", "Trust", "Retail Credit", "Leasing", "Savings Bank", "Auto Fin",
  "Agri Fin", "SME Capital", "Consumer Fin", "Mortgage", "Digital Lending", "Home Loans",
];

const ANCHORS: { name: string; code: string }[] = [
  { name: "AXISDEMO", code: "AXISDEMO" },
  { name: "Kotak Demo Bank", code: "KOTAKDEMO" },
  { name: "Bajaj Finance", code: "BAJAJFIN" },
  { name: "HDFC Housing Fin", code: "HDFCHF" },
  { name: "CapeCo Lending", code: "CAPECO" },
  { name: "Spandana Microfin", code: "SPANDANA" },
  { name: "Saraswat Co-op Bank", code: "SARASWATCB" },
  { name: "First National Bank", code: "FNB" },
];

export interface DsapiSubmitter {
  id: string;
  name: string;
  code: string;
}

export interface DsapiBucket {
  label: string;
  ts: number;
  requests: number;
  accepted: number;
  rejected: number;
  preReject: number;
  acceptancePct: number;
  p50: number;
  p95: number;
  p99: number;
  d50: number;
  d95: number;
  d99: number;
  queue: number;
  ageMin: number;
}

export interface DsapiKpiCard {
  id: string;
  label: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
  slo: "ok" | "breach" | "na";
  sloLabel: string;
  sub: string;
}

export interface DsapiParetoRow {
  code: string;
  count: number;
  pct: number;
}

export interface DsapiHeatRow {
  code: string;
  cells: { profile: string; pct: number; delta: number }[];
}

export interface DsapiFailureRow {
  id: string;
  time: string;
  submitterId: string;
  submitter: string;
  pathway: "Structured" | "Documents";
  ref: string;
  http: number;
  code: string;
  latencyMs: number;
}

export interface DsapiSubmitterRow {
  id: string;
  name: string;
  code: string;
  volume: number;
  acceptance: number;
  rejects: number;
  p95: number;
  throughput: number;
  lastSeen: string;
  topCode: string;
  inactive: boolean;
  insufficient: boolean;
  throttled: boolean;
}

export interface DsapiTraceDetail {
  ref: string;
  status: string;
  http: number;
  submitter: string;
  submitterId: string;
  pathway: string;
  profile: string;
  received: string;
  durationMs: number;
  disp: string;
  dispNote: string;
  stages: { name: string; status: string; dur: string }[];
  errors: { code: string; field: string; rule: string; message: string }[];
  facts: { k: string; v: string }[];
}

export interface DsapiSnapshot {
  asOf: string;
  submitterCount: number;
  kpis: DsapiKpiCard[];
  buckets: DsapiBucket[];
  pareto: DsapiParetoRow[];
  heatmap: DsapiHeatRow[];
  failures: DsapiFailureRow[];
  submitters: DsapiSubmitterRow[];
  catalog: DsapiSubmitter[];
  traces: DsapiTraceDetail[];
}

export interface DsapiMockFilters {
  window: DsapiWindow;
  pathway: DsapiPathway;
  profile: DsapiProfile;
  submitterId: string;
  filterCode: string | null;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(parts: string): number {
  let h = 2166136261;
  for (let i = 0; i < parts.length; i++) {
    h ^= parts.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Compact counts at ≥100k. */
export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000;
    return `${sign}${v >= 10 ? v.toFixed(1) : v.toFixed(2)}M`;
  }
  if (abs >= 100_000) {
    return `${sign}${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}${Math.round(abs).toLocaleString("en")}`;
}

export function formatDeltaPct(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function windowSpec(w: DsapiWindow): { hours: number; bucketCount: number; grain: "hour" | "day" } {
  switch (w) {
    case "1h":
      return { hours: 1, bucketCount: 12, grain: "hour" };
    case "24h":
      return { hours: 24, bucketCount: 24, grain: "hour" };
    case "7d":
      return { hours: 24 * 7, bucketCount: 7, grain: "day" };
    case "30d":
      return { hours: 24 * 30, bucketCount: 30, grain: "day" };
    case "90d":
      return { hours: 24 * 90, bucketCount: 45, grain: "day" };
  }
}

let catalogCache: DsapiSubmitter[] | null = null;

export function getDsapiCatalog(): DsapiSubmitter[] {
  if (catalogCache) return catalogCache;
  const list: DsapiSubmitter[] = ANCHORS.map((a, i) => ({
    id: `sub-${i + 1}`,
    name: a.name,
    code: a.code,
  }));
  const rng = mulberry32(0xa11ce);
  let i = list.length;
  while (list.length < 520) {
    i += 1;
    const a = NAME_A[Math.floor(rng() * NAME_A.length)];
    const b = NAME_B[Math.floor(rng() * NAME_B.length)];
    const name = `${a} ${b}`;
    const code = `${a.slice(0, 4)}${b.split(" ").map((w) => w[0]).join("")}${10 + (i % 89)}`.toUpperCase();
    list.push({ id: `sub-${i}`, name, code });
  }
  catalogCache = list;
  return list;
}

function labelBucket(ts: number, grain: "hour" | "day"): string {
  const d = new Date(ts);
  if (grain === "hour") {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return `${d.getDate()} ${d.toLocaleString("en", { month: "short" })}`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const date = `${d.getDate()} ${d.toLocaleString("en", { month: "short" })} ${d.getFullYear()}`;
  return `${date}, ${formatTime(ts)}`;
}

/** Format an API timestamp (`yyyy-MM-dd HH:mm:ss` or ISO) as date + time. */
export function formatDateTimeFromIso(ts: string): string {
  const normalised = ts.includes("T") ? ts : ts.replace(" ", "T");
  const d = new Date(normalised);
  if (Number.isNaN(d.getTime())) return ts;
  return formatDateTime(d.getTime());
}

/** Curated Trace matches: 2 async completed, 2 async rejected, 1 still in the pipeline. */
function buildAsyncTraceExamples(catalog: DsapiSubmitter[], nowMs: number): DsapiTraceDetail[] {
  const specs: {
    kind: "completed" | "rejected" | "in_progress";
    offsetMin: number;
    code?: string;
    field?: string;
    message?: string;
    stage?: string;
  }[] = [
    { kind: "in_progress", offsetMin: 1, stage: "STORING" },
    { kind: "completed", offsetMin: 12 },
    {
      kind: "rejected",
      offsetMin: 19,
      code: "ERR_FIELD_MANDATORY",
      field: "account.accountNumber",
      message: "Required field is missing",
    },
    { kind: "completed", offsetMin: 34 },
    {
      kind: "rejected",
      offsetMin: 47,
      code: "ERR_FIELD_ENUM",
      field: "facility.facilityType",
      message: "Value is not in the allowed code list",
    },
  ];

  return specs.map((spec, i) => {
    const sub = catalog[(i + 1) % catalog.length];
    const ts = nowMs - spec.offsetMin * 60_000;
    return buildDemoTrace(sub, ts, i, {
      kind: spec.kind,
      mode: "Async",
      http: 202,
      code: spec.code,
      field: spec.field,
      message: spec.message,
      stage: spec.stage,
    });
  });
}

/** Sync intake samples: accepted or rejected in the request path (HTTP 200 / 400). */
function buildSyncTraceExamples(catalog: DsapiSubmitter[], nowMs: number): DsapiTraceDetail[] {
  const specs: {
    kind: "completed" | "rejected";
    offsetMin: number;
    http: number;
    code?: string;
    field?: string;
    message?: string;
  }[] = [
    { kind: "completed", offsetMin: 8, http: 200 },
    {
      kind: "rejected",
      offsetMin: 15,
      http: 400,
      code: "ERR_ENVELOPE_MALFORMED",
      field: "envelope",
      message: "Request envelope failed sync validation",
    },
    { kind: "completed", offsetMin: 28, http: 200 },
    {
      kind: "rejected",
      offsetMin: 39,
      http: 400,
      code: "ERR_TOKEN_EXPIRED",
      field: "envelope",
      message: "API token expired before the request was accepted",
    },
  ];

  return specs.map((spec, i) => {
    const sub = catalog[(i + 6) % catalog.length];
    const ts = nowMs - spec.offsetMin * 60_000;
    return buildDemoTrace(sub, ts, i + 10, {
      kind: spec.kind,
      mode: "Sync",
      http: spec.http,
      code: spec.code,
      field: spec.field,
      message: spec.message,
    });
  });
}

function buildDemoTrace(
  sub: DsapiSubmitter,
  ts: number,
  i: number,
  spec: {
    kind: "completed" | "rejected" | "in_progress";
    mode: "Async" | "Sync";
    http: number;
    code?: string;
    field?: string;
    message?: string;
    stage?: string;
  }
): DsapiTraceDetail {
  const dateKey = new Date(ts).toISOString().slice(0, 10).replace(/-/g, "");
  const ref = `SUB-${sub.code}-${dateKey}-${String(210000 + i).slice(1)}`;
  const pathway = "Structured";
  const profile = DSAPI_PROFILES[i % DSAPI_PROFILES.length];
  const durationMs =
    spec.kind === "in_progress" ? 0 : spec.kind === "completed" ? 186 + i * 14 : 92 + i * 11;

  const status = spec.kind === "completed" ? "COMPLETED" : spec.kind === "rejected" ? "REJECTED" : "IN_PROGRESS";
  const disp =
    spec.kind === "completed" ? "Accepted" : spec.kind === "rejected" ? "Rejected" : "Processing";
  const dispNote =
    spec.kind === "completed"
      ? "Record stored"
      : spec.kind === "rejected"
        ? spec.mode === "Async"
          ? "Async validation failed"
          : "Rejected in the request path"
        : "Async pipeline in progress";

  return {
    ref,
    status,
    http: spec.http,
    submitter: sub.name,
    submitterId: sub.id,
    pathway,
    profile,
      received: formatDateTime(ts),
    durationMs,
    disp,
    dispNote,
    stages: [],
    errors:
      spec.kind === "rejected" && spec.code
        ? [
            {
              code: spec.code,
              field: spec.field ?? "envelope",
              rule: `R-${120 + i}`,
              message: spec.message ?? spec.code,
            },
          ]
        : [],
    facts: [
      { k: "Submission reference", v: ref },
      { k: "Submitter", v: sub.name },
      { k: "Pathway", v: pathway },
      { k: "HTTP", v: String(spec.http) },
      { k: "Processing", v: spec.mode },
      ...(spec.kind === "in_progress"
        ? [
            { k: "Pipeline stage", v: spec.stage ?? "RECEIVED" },
            { k: "Latency", v: "—" },
          ]
        : [{ k: "Latency", v: `${durationMs} ms` }]),
    ],
  };
}

function pathwayScale(p: DsapiPathway): number {
  if (p === "documents") return 0.08;
  if (p === "structured") return 0.92;
  return 1;
}

function profileScale(p: DsapiProfile): number {
  if (p === "all") return 1;
  const idx = DSAPI_PROFILES.indexOf(p);
  const weights = [0.38, 0.18, 0.12, 0.14, 0.08, 0.1];
  return weights[idx] ?? 1;
}

function submitterScale(id: string, catalog: DsapiSubmitter[]): number {
  if (id === "all") return 1;
  const idx = catalog.findIndex((s) => s.id === id);
  if (idx < 0) return 1;
  if (idx < 8) return 0.012 + (8 - idx) * 0.004;
  return 0.0012 + ((idx % 17) * 0.00008);
}

export function buildDsapiSnapshot(filters: DsapiMockFilters, nowMs = Date.now()): DsapiSnapshot {
  const catalog = getDsapiCatalog();
  const spec = windowSpec(filters.window);
  const scale =
    pathwayScale(filters.pathway) * profileScale(filters.profile) * submitterScale(filters.submitterId, catalog);
  const seed = hashSeed(`${filters.window}|${filters.pathway}|${filters.profile}|${filters.submitterId}|${filters.filterCode ?? ""}`);
  const rng = mulberry32(seed);

  const hours = spec.hours;
  const reqPerHour = 1_000_000 / 24;
  const totalReq = reqPerHour * hours * scale;

  const buckets: DsapiBucket[] = [];
  const bucketMs = (hours * 3600_000) / spec.bucketCount;
  for (let i = 0; i < spec.bucketCount; i++) {
    const ts = nowMs - (spec.bucketCount - 1 - i) * bucketMs;
    const wave = 0.82 + 0.28 * Math.sin((i / spec.bucketCount) * Math.PI * 2);
    const noise = 0.92 + rng() * 0.16;
    const requests = Math.max(40, Math.round((totalReq / spec.bucketCount) * wave * noise));
    const preReject = Math.round(requests * (0.028 + rng() * 0.012));
    const submissions = requests - preReject;
    const rejected = Math.round(submissions * (0.038 + rng() * 0.012));
    const accepted = submissions - rejected;
    const acceptancePct = submissions > 0 ? (100 * accepted) / submissions : 0;
    const docsBoost = filters.pathway === "documents" ? 8 : 1;
    buckets.push({
      label: labelBucket(ts, spec.grain),
      ts,
      requests,
      accepted,
      rejected,
      preReject,
      acceptancePct,
      p50: Math.round(118 + rng() * 40),
      p95: Math.round(210 + rng() * 70),
      p99: Math.round(280 + rng() * 90),
      d50: +(1.8 * docsBoost + rng() * 1.4).toFixed(1),
      d95: +(4.2 * docsBoost + rng() * 2.1).toFixed(1),
      d99: +(7.5 * docsBoost + rng() * 3.2).toFixed(1),
      queue: Math.round(120 + rng() * 480),
      ageMin: +(1.2 + rng() * 5.5).toFixed(1),
    });
  }

  const sum = (fn: (b: DsapiBucket) => number) => buckets.reduce((a, b) => a + fn(b), 0);
  const reqT = sum((b) => b.requests);
  const preT = sum((b) => b.preReject);
  const rejT = sum((b) => b.rejected);
  const accT = sum((b) => b.accepted);
  const subT = accT + rejT;
  const p95avg = Math.round(sum((b) => b.p95) / buckets.length);
  const p50avg = Math.round(sum((b) => b.p50) / buckets.length);
  const p99avg = Math.round(sum((b) => b.p99) / buckets.length);
  const last = buckets[buckets.length - 1];
  const accPct = subT > 0 ? (100 * accT) / subT : 0;
  const prePct = reqT > 0 ? (100 * preT) / reqT : 0;
  const rps = hours > 0 ? reqT / (hours * 3600) : 0;

  const prevFactor = 0.94 + rng() * 0.1;
  const dReq = ((1 - prevFactor) * 100);
  const dAcc = 0.4 - rng() * 0.9;
  const dLat = 4 - rng() * 10;

  const sloAcc: DsapiKpiCard["slo"] = accPct >= 95 ? "ok" : "breach";
  const sloLat: DsapiKpiCard["slo"] = p95avg <= 300 ? "ok" : "breach";
  const sloAge: DsapiKpiCard["slo"] = last.ageMin <= 5 ? "ok" : "breach";
  const slo5xx: DsapiKpiCard["slo"] = prePct < 4 ? "ok" : "breach";

  const kpis: DsapiKpiCard[] = [
    {
      id: "requests",
      label: "Requests",
      value: formatCompact(reqT),
      delta: formatDeltaPct(dReq),
      deltaPositive: dReq >= 0,
      slo: "na",
      sloLabel: "",
      sub: `${formatCompact(rps)} req/s`,
    },
    {
      id: "prereject",
      label: "Rejected before submission",
      value: `${prePct.toFixed(1)}%`,
      delta: formatDeltaPct(-0.3 + rng() * 0.6),
      deltaPositive: false,
      slo: slo5xx,
      sloLabel: slo5xx === "ok" ? "5xx within SLO" : "5xx breaching",
      sub: `${formatCompact(preT)} gated`,
    },
    {
      id: "submissions",
      label: "Submissions",
      value: formatCompact(subT),
      delta: formatDeltaPct(dReq * 0.9),
      deltaPositive: dReq >= 0,
      slo: "na",
      sloLabel: "",
      sub: "Structured + Documents",
    },
    {
      id: "acceptance",
      label: "Acceptance rate",
      value: `${accPct.toFixed(1)}%`,
      delta: formatDeltaPct(dAcc),
      deltaPositive: dAcc >= 0,
      slo: sloAcc,
      sloLabel: sloAcc === "ok" ? "Within SLO" : "Breaching",
      sub: `${formatCompact(rejT)} rejected`,
    },
    {
      id: "p95",
      label: "P95 latency · Structured",
      value: `${p95avg} ms`,
      delta: formatDeltaPct(dLat),
      deltaPositive: dLat < 0,
      slo: sloLat,
      sloLabel: sloLat === "ok" ? "Within SLO" : "Breaching",
      sub: `P50 ${p50avg} · P99 ${p99avg}`,
    },
    {
      id: "backlog",
      label: "Async backlog",
      value: formatCompact(last.queue),
      delta: formatDeltaPct(2 - rng() * 6),
      deltaPositive: false,
      slo: sloAge,
      sloLabel: sloAge === "ok" ? "Age within SLO" : "Age breaching",
      sub: `oldest pending: ${last.ageMin} min`,
    },
  ];

  const paretoWeights = [0.31, 0.22, 0.14, 0.11, 0.08, 0.06, 0.05, 0.03];
  let pareto: DsapiParetoRow[] = PARETO_CODES.map((code, i) => ({
    code,
    count: Math.max(1, Math.round(rejT * paretoWeights[i])),
    pct: +(100 * paretoWeights[i]).toFixed(1),
  }));
  if (filters.filterCode) {
    pareto = pareto.map((p) =>
      p.code === filters.filterCode ? p : { ...p, count: Math.round(p.count * 0.15), pct: +(p.pct * 0.15).toFixed(1) }
    );
  }

  const heatmap: DsapiHeatRow[] = pareto.slice(0, 6).map((p, ri) => ({
    code: p.code,
    cells: DSAPI_PROFILES.map((profile, ci) => {
      const base = 0.4 + ((ri + ci) % 5) * 1.1 + rng() * 1.8;
      return { profile, pct: +base.toFixed(1), delta: +(rng() * 1.6 - 0.7).toFixed(1) };
    }),
  }));

  const locked = filters.submitterId === "all" ? null : catalog.find((s) => s.id === filters.submitterId);
  const failures: DsapiFailureRow[] = [];
  const failureTimestamps: number[] = [];
  for (let i = 0; i < 50; i++) {
    const sub = locked ?? catalog[Math.floor(rng() * Math.min(80, catalog.length))];
    const code = PARETO_CODES[Math.floor(rng() * PARETO_CODES.length)];
    if (filters.filterCode && code !== filters.filterCode) continue;
    const ts = nowMs - rng() * Math.min(hours, 24) * 3600_000;
    const pathway: DsapiFailureRow["pathway"] =
      filters.pathway === "documents" ? "Documents" : filters.pathway === "structured" ? "Structured" : rng() < 0.08 ? "Documents" : "Structured";
    failures.push({
      id: `fail-${i}`,
      time: formatDateTime(ts),
      submitterId: sub.id,
      submitter: sub.name,
      pathway,
      ref: `SUB-${sub.code}-${new Date(ts).toISOString().slice(0, 10).replace(/-/g, "")}-${String(100000 + i).slice(1)}`,
      http: rng() < 0.12 ? 429 : rng() < 0.08 ? 401 : 400,
      code,
      latencyMs: Math.round(80 + rng() * 420),
    });
    failureTimestamps.push(ts);
  }

  const volumeShare = (idx: number) => {
    if (idx < 8) return 0.018 - idx * 0.0012;
    return 0.00115 + ((idx % 23) * 0.00004);
  };

  const submitters: DsapiSubmitterRow[] = catalog.map((s, idx) => {
    const share = volumeShare(idx) * (filters.submitterId === "all" || filters.submitterId === s.id ? 1 : 0.15);
    const volume = Math.max(0, Math.round(subT * share * (0.7 + rng() * 0.6)));
    const inactive = idx % 41 === 0 && idx > 20;
    const insufficient = volume < 80 || inactive;
    const throttled = idx % 29 === 3;
    const acceptance = inactive ? 0 : +(92 + rng() * 7.5 - (throttled ? 4 : 0)).toFixed(1);
    const rejects = inactive ? 0 : Math.round(volume * ((100 - acceptance) / 100));
    const topCode = PARETO_CODES[idx % PARETO_CODES.length];
    if (filters.filterCode && topCode !== filters.filterCode && rejects > 0 && rng() > 0.35) {
      /* keep row; ranking still useful */
    }
    const lastTs = inactive ? nowMs - (6 + (idx % 9)) * 86400_000 : nowMs - rng() * 12 * 3600_000;
    const lastD = new Date(lastTs);
    const lastSeen = lastD.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return {
      id: s.id,
      name: s.name,
      code: s.code,
      volume: inactive ? 0 : volume,
      acceptance,
      rejects,
      p95: insufficient ? 0 : Math.round(180 + rng() * 140 + (throttled ? 80 : 0)),
      throughput: inactive ? 0 : Math.round(volume / Math.max(1, hours)),
      lastSeen,
      topCode: inactive ? "—" : topCode,
      inactive,
      insufficient,
      throttled,
    };
  });

  const demoCatalog = locked ? [locked] : catalog;
  const asyncExamples = buildAsyncTraceExamples(demoCatalog, nowMs);
  const syncExamples = buildSyncTraceExamples(demoCatalog, nowMs);
  const extraTraces = failures.slice(0, 24).map((f, i) => {
    const rejected = i % 3 !== 0;
    return {
      ref: f.ref,
      status: rejected ? "REJECTED" : "COMPLETED",
      http: f.http,
      submitter: f.submitter,
      submitterId: f.submitterId,
      pathway: f.pathway,
      profile: DSAPI_PROFILES[i % DSAPI_PROFILES.length],
      received: formatDateTime(failureTimestamps[i] ?? nowMs),
      durationMs: f.latencyMs,
      disp: rejected ? "Rejected" : "Accepted",
      dispNote: rejected ? "Rejected in the request path" : "Record stored",
      stages: [
        { name: "Ingress", status: "OK", dur: "4 ms" },
        { name: "Auth", status: f.http === 401 ? "FAIL" : "OK", dur: "9 ms" },
        { name: "Schema map", status: rejected && f.code.includes("MAPPING") ? "FAIL" : "OK", dur: "22 ms" },
        { name: "Validate", status: rejected ? "FAIL" : "OK", dur: `${Math.round(f.latencyMs * 0.4)} ms` },
        { name: "Persist", status: rejected ? "SKIP" : "OK", dur: rejected ? "—" : "31 ms" },
      ],
      errors: rejected
        ? [
            {
              code: f.code,
              field: f.code.includes("FIELD") ? "account.accountNumber" : "envelope",
              rule: `R-${100 + (i % 40)}`,
              message:
                f.code === "ERR_FIELD_MANDATORY"
                  ? "Required field is missing"
                  : f.code === "ERR_RATE_LIMIT_EXCEEDED"
                    ? "Request failed with rate limit"
                    : `Payload contains ${f.code.toLowerCase().replace(/_/g, " ")}`,
            },
          ]
        : [],
      facts: [
        { k: "Submission reference", v: f.ref },
        { k: "Submitter", v: f.submitter },
        { k: "Pathway", v: f.pathway },
        { k: "HTTP", v: String(f.http) },
        { k: "Processing", v: "Sync" },
        { k: "Latency", v: `${f.latencyMs} ms` },
      ],
    };
  });

  const traces: DsapiTraceDetail[] = [
    asyncExamples[0], // IN_PROGRESS
    asyncExamples[1], // COMPLETED async
    syncExamples[0], // COMPLETED sync
    asyncExamples[2], // REJECTED async
    syncExamples[1], // REJECTED sync
    asyncExamples[3], // COMPLETED async
    syncExamples[2], // COMPLETED sync
    asyncExamples[4], // REJECTED async
    syncExamples[3], // REJECTED sync
    ...extraTraces,
  ];

  const asOf = new Date(nowMs);
  const asOfLabel = `${asOf.toLocaleString("en", { day: "2-digit", month: "short" })} ${String(asOf.getHours()).padStart(2, "0")}:${String(asOf.getMinutes()).padStart(2, "0")}`;

  return {
    asOf: asOfLabel,
    submitterCount: catalog.length,
    kpis,
    buckets,
    pareto,
    heatmap,
    failures,
    submitters,
    catalog,
    traces,
  };
}

export function searchCatalog(query: string, catalog: DsapiSubmitter[], limit = 40): DsapiSubmitter[] {
  const q = query.trim().toLowerCase();
  if (!q) return catalog.slice(0, limit);
  const hits = catalog.filter(
    (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
  );
  return hits.slice(0, limit);
}
