/** Deterministic Enquiry API ops mock: ~9.6M requests/month, 1040+ members, aggregates only. */

export type EnquiryWindow = "1h" | "24h" | "7d" | "30d" | "90d";
export type EnquiryTypeFilter = "all" | "HARD" | "SOFT";
export type EnquiryAnchorFilter = "all" | "CURRENT" | "AS_OF";
export type EnquiryEntityFilter = "all" | "INDIVIDUAL" | "ORGANIZATION" | "JOINT";
export type EnquiryTab = "overview" | "members" | "products" | "trace";

export const ENQUIRY_WINDOWS: { value: EnquiryWindow; label: string }[] = [
  { value: "1h", label: "1h" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
];

export const ENQUIRY_TYPES: { value: EnquiryTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "HARD", label: "HARD" },
  { value: "SOFT", label: "SOFT" },
];

export const ENQUIRY_ANCHORS: { value: EnquiryAnchorFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "CURRENT", label: "Current" },
  { value: "AS_OF", label: "Retro (AS_OF)" },
];

export const ENQUIRY_ENTITIES: { value: EnquiryEntityFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "ORGANIZATION", label: "Organization" },
  { value: "JOINT", label: "Joint" },
];

export const ENQUIRY_CONSTANTS = {
  monthlyRequests: 9_600_000,
  memberCount: 1040,
  cbsShare: 0.38,
  next20Share: 0.35,
  gateRate: 0.029,
  platformErrorRate: 0.0018,
  platformErrorSlo: 0.005,
  successShare: 0.74,
  noDataShare: 0.24,
  failedShare: 0.02,
  productEnquiriesPerEnquiry: 1.62,
  hardShare: 0.63,
  retroShare: 0.06,
  trendedShare: 0.18,
  entityIndividual: 0.88,
  entityOrg: 0.09,
  entityJoint: 0.03,
  p50Ms: 1400,
  p95Ms: 3900,
  p99Ms: 5600,
  retrievalP95Ms: 2600,
  latencySloMs: 5000,
  hitRateSlo: 0.7,
  silentMemberShare: 0.06,
  throttledShare: 0.02,
  consentShare: 0.03,
  entitlementShare: 0.04,
};

export const ENQUIRY_PRODUCTS: { id: string; name: string; popularity: number; servedRate: number }[] = [
  { id: "PRD_0001", name: "Core Alternate Data", popularity: 0.61, servedRate: 0.8 },
  { id: "PRD_0007", name: "Trended Cashflow", popularity: 0.14, servedRate: 0.62 },
  { id: "PRD_0012", name: "Telco Stability", popularity: 0.09, servedRate: 0.71 },
  { id: "PRD_0015", name: "Commercial Profile", popularity: 0.07, servedRate: 0.55 },
  { id: "PRD_0021", name: "Fraud Signals", popularity: 0.05, servedRate: 0.44 },
  { id: "PRD_0003", name: "Income Insights", popularity: 0.02, servedRate: 0.68 },
  { id: "PRD_0009", name: "Bureau Overlay", popularity: 0.012, servedRate: 0.73 },
  { id: "PRD_0018", name: "Utility Tenure", popularity: 0.008, servedRate: 0.6 },
];

const GATE_CODES: { code: string; weight: number }[] = [
  { code: "ERR_VALIDATION", weight: 0.34 },
  { code: "ERR_PRODUCT_NOT_SUBSCRIBED", weight: 0.18 },
  { code: "token_expired", weight: 0.12 },
  { code: "ERR_RATE_LIMITED", weight: 0.1 },
  { code: "ERR_CONSENT_REQUIRED", weight: 0.07 },
  { code: "ERR_DUPLICATE_ENQUIRY", weight: 0.06 },
  { code: "ERR_ENQUIRY_DATE_EXCEEDS_CEILING", weight: 0.04 },
  { code: "ERR_PRODUCTS_LIMIT", weight: 0.03 },
  { code: "invalid_client", weight: 0.03 },
  { code: "ERR_CONSENT_INVALID", weight: 0.015 },
  { code: "ERR_WINDOW_EXCEEDS_CEILING", weight: 0.015 },
];

const FAIL_CODES = ["ERR_PRODUCT_RETRIEVAL_TIMEOUT", "ERR_DERIVATION_FAILED", "ERR_PRODUCT_UNSERVABLE"];

const NAME_STEM = [
  "Harbor", "Meridian", "Crestline", "Pinnacle", "Stellar", "Union", "Atlas", "Nova",
  "Summit", "Cascade", "Beacon", "Sterling", "Granite", "Ridgeline", "Bluepeak", "Silveroak",
  "Irongate", "Northstar", "Lakeshore", "Fairfield", "Oakmont", "Westbrook", "Eastvale",
  "Kingsford", "Marlowe", "Halcyon", "Vantage", "Cornerstone", "Bridgeway", "Clearwater",
  "Redwood", "Sandstone", "Highland", "Millbrook", "Ashford", "Berkline", "Coralbay",
  "Dunmore", "Elmwood", "Foxton", "Glenmere", "Hartwell", "Ivorygate", "Junction", "Kestrel",
  "Pune", "Jaipur", "Surat", "Indore", "Nagpur", "Coimbatore", "Kochi", "Lucknow",
];
const NAME_KIND = ["Bank", "Finance", "Fintech", "NBFC", "Co-op Bank", "HFC", "MFI"];

export interface EnquiryMember {
  id: string;
  name: string;
  code: string;
}

export interface EnquiryBucket {
  label: string;
  ts: number;
  requests: number;
  success: number;
  noData: number;
  failed: number;
  gated: number;
  platformError: number;
  hitRatePct: number;
  p50: number;
  p95: number;
  p99: number;
  r50: number;
  r95: number;
  r99: number;
  hard: number;
  soft: number;
  retro: number;
  peakRps: number;
}

export interface EnquiryKpiCard {
  id: string;
  label: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
  deltaNeutral?: boolean;
  slo: "ok" | "watch" | "breach" | "na";
  sloLabel: string;
  sub: string;
  tooltip: string;
}

export interface EnquiryParetoRow {
  code: string;
  count: number;
  pct: number;
}

export interface EnquiryProductMixRow {
  productId: string;
  name: string;
  served: number;
  noData: number;
  failed: number;
}

export interface EnquiryFailureRow {
  id: string;
  time: string;
  ts: number;
  memberId: string;
  member: string;
  entity: string;
  type: "HARD" | "SOFT";
  ref: string;
  outcome: "GATED" | "FAILED" | "ERROR";
  http: number;
  code: string;
  latencyMs: number;
}

export interface EnquiryMemberRow {
  id: string;
  name: string;
  code: string;
  requests: number;
  enquiries: number;
  productEnquiries: number;
  hitRate: number;
  noDataPct: number;
  gated: number;
  rejectedPct: number;
  failedPct: number;
  p95: number;
  throughput: number;
  hardPct: number;
  retroPct: number;
  lastSeen: string;
  topCode: string;
  silent: boolean;
  throttled: boolean;
  consentIssues: boolean;
  highReject: boolean;
  lowHit: boolean;
  insufficient: boolean;
}

export interface EnquiryProductVersion {
  version: string;
  state: "Active" | "Deprecated";
  productEnquiries: number;
}

export interface EnquiryProductRow {
  productId: string;
  name: string;
  versions: EnquiryProductVersion[];
  productEnquiries: number;
  servedPct: number;
  noDataPct: number;
  failedPct: number;
  p95Retrieval: number;
  trendedShare: number;
  retroShare: number;
  membersUsing: number;
  topFailure: string;
  spark: { served: number; noData: number; failed: number }[];
}

export interface EnquiryTraceProduct {
  n: number;
  productId: string;
  name: string;
  version: string;
  dataScope: string;
  outcome: "SERVED" | "NO_DATA" | "FAILED";
  packets: string;
  retrievalMs: number;
  reason?: string;
  enquiryItemId: string;
}

export interface EnquiryTraceDetail {
  enquiryId: string | null;
  requestId: string;
  xRequestId: string;
  idempotencyKey: string;
  idempotentReplay: boolean;
  memberId: string;
  member: string;
  code: string;
  entityType: string;
  enquiryType: "HARD" | "SOFT" | "—";
  purpose: string;
  anchor: string;
  enquiryDate: string | null;
  consentRef: string;
  applicationRef: string;
  received: string;
  responded: string;
  latencyMs: number;
  footprintCreated: boolean;
  footprintId: string | null;
  status: "SUCCESS" | "NO_DATA" | "FAILED" | "GATED" | "ERROR";
  http: number;
  subjectNote: string;
  stages: { name: string; ms: number }[];
  products: EnquiryTraceProduct[];
  errors: { code: string; field: string; rule: string; message: string }[];
}

export interface EnquirySnapshot {
  asOf: string;
  asOfMs: number;
  kpis: EnquiryKpiCard[];
  buckets: EnquiryBucket[];
  productMix: EnquiryProductMixRow[];
  pareto: EnquiryParetoRow[];
  failures: EnquiryFailureRow[];
  members: EnquiryMemberRow[];
  products: EnquiryProductRow[];
  traces: EnquiryTraceDetail[];
  catalog: EnquiryMember[];
  totals: {
    requests: number;
    gated: number;
    platformErrors: number;
    enquiries: number;
    productEnquiries: number;
    success: number;
    noData: number;
    failed: number;
  };
}

export interface EnquiryMockFilters {
  window: EnquiryWindow;
  type: EnquiryTypeFilter;
  anchor: EnquiryAnchorFilter;
  entity: EnquiryEntityFilter;
  productId: string;
  memberId: string;
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

export function formatPct1(n: number): string {
  return `${n.toFixed(1)}%`;
}

function windowSpec(w: EnquiryWindow): { hours: number; bucketCount: number; grain: "5min" | "hour" | "day" | "2day" } {
  switch (w) {
    case "1h":
      return { hours: 1, bucketCount: 12, grain: "5min" };
    case "24h":
      return { hours: 24, bucketCount: 24, grain: "hour" };
    case "7d":
      return { hours: 24 * 7, bucketCount: 7, grain: "day" };
    case "30d":
      return { hours: 24 * 30, bucketCount: 30, grain: "day" };
    case "90d":
      return { hours: 24 * 90, bucketCount: 45, grain: "2day" };
  }
}

let catalogCache: EnquiryMember[] | null = null;

export function getEnquiryCatalog(): EnquiryMember[] {
  if (catalogCache) return catalogCache;
  const rng = mulberry32(0xcb5001);
  const list: EnquiryMember[] = [{ id: "mem-cbs", name: "CBS", code: "CBS" }];
  while (list.length < ENQUIRY_CONSTANTS.memberCount) {
    const i = list.length;
    const stem = NAME_STEM[Math.floor(rng() * NAME_STEM.length)];
    const kind = NAME_KIND[Math.floor(rng() * NAME_KIND.length)];
    const name = `${stem} ${kind}`;
    const raw = `${stem.slice(0, 4)}${kind.replace(/[^A-Za-z]/g, "").slice(0, 4)}${10 + (i % 89)}`.toUpperCase();
    const code = raw.slice(0, 6 + (i % 5)).padEnd(6, "X");
    list.push({ id: `mem-${i}`, name, code });
  }
  catalogCache = list;
  return list;
}

function memberShare(idx: number, silent: boolean): number {
  if (silent) return 0;
  if (idx === 0) return ENQUIRY_CONSTANTS.cbsShare;
  if (idx <= 20) {
    const w = 21 - idx;
    const sum = (20 * 21) / 2;
    return (ENQUIRY_CONSTANTS.next20Share * w) / sum;
  }
  const tailCount = ENQUIRY_CONSTANTS.memberCount - 21;
  const activeTail = Math.max(1, Math.round(tailCount * (1 - ENQUIRY_CONSTANTS.silentMemberShare)));
  if (idx > 21 + activeTail) return 0;
  return 0.27 / activeTail;
}

function labelBucket(ts: number, grain: "5min" | "hour" | "day" | "2day"): string {
  const d = new Date(ts);
  if (grain === "5min" || grain === "hour") {
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

export function formatAsOf(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${d.toLocaleString("en", { month: "short" })} ${formatTime(ts)} IST`;
}

function diurnal(hour: number): number {
  if (hour >= 11 && hour <= 14) return 2.4;
  if (hour >= 2 && hour <= 5) return 0.35;
  if (hour >= 8 && hour <= 18) return 1.35;
  return 0.7;
}

function weekdayFactor(ts: number): number {
  const day = new Date(ts).getDay();
  return day === 0 || day === 6 ? 0.55 : 1;
}

function monthEndFactor(ts: number): number {
  const d = new Date(ts);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return d.getDate() > last - 3 ? 1.25 : 1;
}

function typeScale(t: EnquiryTypeFilter): number {
  if (t === "HARD") return ENQUIRY_CONSTANTS.hardShare;
  if (t === "SOFT") return 1 - ENQUIRY_CONSTANTS.hardShare;
  return 1;
}

function anchorScale(a: EnquiryAnchorFilter, type: EnquiryTypeFilter): number {
  if (a === "all") return 1;
  if (a === "AS_OF") return type === "HARD" ? 0 : ENQUIRY_CONSTANTS.retroShare / (type === "SOFT" ? 1 - ENQUIRY_CONSTANTS.hardShare : 1);
  return 1 - ENQUIRY_CONSTANTS.retroShare;
}

function entityScale(e: EnquiryEntityFilter): number {
  if (e === "INDIVIDUAL") return ENQUIRY_CONSTANTS.entityIndividual;
  if (e === "ORGANIZATION") return ENQUIRY_CONSTANTS.entityOrg;
  if (e === "JOINT") return ENQUIRY_CONSTANTS.entityJoint;
  return 1;
}

function productScale(id: string): number {
  if (id === "all") return 1;
  return ENQUIRY_PRODUCTS.find((p) => p.id === id)?.popularity ?? 1;
}

function pickWeighted<T extends { weight: number }>(rng: () => number, items: T[]): T {
  let x = rng();
  for (const item of items) {
    x -= item.weight;
    if (x <= 0) return item;
  }
  return items[items.length - 1];
}

function uuidFrom(rng: () => number): string {
  const hex = () => Math.floor(rng() * 16).toString(16);
  const block = (n: number) => Array.from({ length: n }, hex).join("");
  return `${block(8)}-${block(4)}-4${block(3)}-a${block(3)}-${block(12)}`;
}

function enquiryId(code: string, ts: number, seq: number): string {
  const d = new Date(ts);
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `ENQ-${code}-${ymd}-${String(seq).padStart(6, "0")}`;
}

function hitRateForEntity(entity: EnquiryEntityFilter): number {
  if (entity === "ORGANIZATION") return 0.58;
  if (entity === "JOINT") return 0.71;
  if (entity === "INDIVIDUAL") return 0.76;
  return ENQUIRY_CONSTANTS.successShare;
}

function pickProduct(rng: () => number) {
  let x = rng();
  for (const p of ENQUIRY_PRODUCTS) {
    x -= p.popularity;
    if (x <= 0) return p;
  }
  return ENQUIRY_PRODUCTS[0];
}

function buildCuratedTraces(catalog: EnquiryMember[], nowMs: number): EnquiryTraceDetail[] {
  const cbs = catalog[0];
  const mfi = catalog.find((m) => m.name.includes("MFI")) ?? catalog[12];
  const fintech = catalog.find((m) => m.name.includes("Fintech")) ?? catalog[8];
  const orgM = catalog[4];
  const jointM = catalog[6];

  const stage = (e2e: number) => {
    const gw = Math.round(e2e * 0.06);
    const val = Math.round(e2e * 0.1);
    const idr = Math.round(e2e * 0.18);
    const retr = Math.round(e2e * 0.52);
    const asm = e2e - gw - val - idr - retr;
    return [
      { name: "Gateway/auth", ms: gw },
      { name: "Validation", ms: val },
      { name: "Identity resolution", ms: idr },
      { name: "Product retrieval", ms: retr },
      { name: "Response assembly", ms: Math.max(1, asm) },
    ];
  };

  const t = (offsetMin: number) => nowMs - offsetMin * 60_000;

  const traces: EnquiryTraceDetail[] = [];

  const id1 = enquiryId(cbs.code, t(8), 100041);
  traces.push({
    enquiryId: id1,
    requestId: "7c2e1a90-4b11-4f02-9d44-aa01enquiry01",
    xRequestId: "cbs-app-4411",
    idempotencyKey: "idem-cbs-4411",
    idempotentReplay: false,
    memberId: cbs.id,
    member: cbs.name,
    code: cbs.code,
    entityType: "INDIVIDUAL",
    enquiryType: "HARD",
    purpose: "new_credit",
    anchor: "CURRENT",
    enquiryDate: null,
    consentRef: "CNS-****-4411",
    applicationRef: "APP-CBS-10041",
    received: formatDateTime(t(8)),
    responded: formatDateTime(t(8) + 1850),
    latencyMs: 1850,
    footprintCreated: true,
    footprintId: "FP-CBS-100041",
    status: "SUCCESS",
    http: 200,
    subjectNote: "Subject: INDIVIDUAL · 2 identifiers · masked",
    stages: stage(1850),
    products: [
      { n: 1, productId: "PRD_0001", name: "Core Alternate Data", version: "2.0", dataScope: "SNAPSHOT", outcome: "SERVED", packets: "5/5", retrievalMs: 920, enquiryItemId: `${id1}-01` },
      { n: 2, productId: "PRD_0007", name: "Trended Cashflow", version: "1.1", dataScope: "TRENDED · 12m", outcome: "SERVED", packets: "3/3", retrievalMs: 1180, enquiryItemId: `${id1}-02` },
      { n: 3, productId: "PRD_0012", name: "Telco Stability", version: "1.0", dataScope: "SNAPSHOT", outcome: "NO_DATA", packets: "0/2", retrievalMs: 640, enquiryItemId: `${id1}-03` },
    ],
    errors: [],
  });

  const id2 = enquiryId(fintech.code, t(22), 100102);
  traces.push({
    enquiryId: id2,
    requestId: "8d3f2b01-5c22-4a13-8e55-bb02enquiry02",
    xRequestId: "ft-xr-2201",
    idempotencyKey: "idem-ft-2201",
    idempotentReplay: false,
    memberId: fintech.id,
    member: fintech.name,
    code: fintech.code,
    entityType: "INDIVIDUAL",
    enquiryType: "SOFT",
    purpose: "portfolio_review",
    anchor: "AS_OF",
    enquiryDate: "2025-06-30",
    consentRef: "CNS-****-4411",
    applicationRef: "APP-FT-2201",
    received: formatDateTime(t(22)),
    responded: formatDateTime(t(22) + 2410),
    latencyMs: 2410,
    footprintCreated: false,
    footprintId: null,
    status: "SUCCESS",
    http: 200,
    subjectNote: "Subject: INDIVIDUAL · 2 identifiers · masked",
    stages: stage(2410),
    products: [
      { n: 1, productId: "PRD_0007", name: "Trended Cashflow", version: "1.1", dataScope: "TRENDED · 12m", outcome: "SERVED", packets: "3/3", retrievalMs: 1620, enquiryItemId: `${id2}-01` },
      { n: 2, productId: "PRD_0001", name: "Core Alternate Data", version: "2.0", dataScope: "TRENDED · 12m", outcome: "SERVED", packets: "4/5", retrievalMs: 1480, enquiryItemId: `${id2}-02` },
    ],
    errors: [],
  });

  const id3 = enquiryId(mfi.code, t(36), 100203);
  traces.push({
    enquiryId: id3,
    requestId: "9e401c12-6d33-4b24-9f66-cc03enquiry03",
    xRequestId: "mfi-xr-3603",
    idempotencyKey: "idem-mfi-3603",
    idempotentReplay: false,
    memberId: mfi.id,
    member: mfi.name,
    code: mfi.code,
    entityType: "INDIVIDUAL",
    enquiryType: "SOFT",
    purpose: "account_monitoring",
    anchor: "CURRENT",
    enquiryDate: null,
    consentRef: "CNS-****-4411",
    applicationRef: "APP-MFI-3603",
    received: formatDateTime(t(36)),
    responded: formatDateTime(t(36) + 980),
    latencyMs: 980,
    footprintCreated: false,
    footprintId: null,
    status: "NO_DATA",
    http: 200,
    subjectNote: "Subject: INDIVIDUAL · 2 identifiers · masked",
    stages: stage(980),
    products: [
      { n: 1, productId: "PRD_0012", name: "Telco Stability", version: "1.0", dataScope: "SNAPSHOT", outcome: "NO_DATA", packets: "0/2", retrievalMs: 510, enquiryItemId: `${id3}-01` },
    ],
    errors: [],
  });

  const id4 = enquiryId(cbs.code, t(48), 100304);
  traces.push({
    enquiryId: id4,
    requestId: "af512d23-7e44-4c35-a077-dd04enquiry04",
    xRequestId: "cbs-app-4804",
    idempotencyKey: "idem-cbs-4804",
    idempotentReplay: false,
    memberId: cbs.id,
    member: cbs.name,
    code: cbs.code,
    entityType: "INDIVIDUAL",
    enquiryType: "HARD",
    purpose: "new_credit",
    anchor: "CURRENT",
    enquiryDate: null,
    consentRef: "CNS-****-4411",
    applicationRef: "APP-CBS-4804",
    received: formatDateTime(t(48)),
    responded: formatDateTime(t(48) + 4120),
    latencyMs: 4120,
    footprintCreated: true,
    footprintId: "FP-CBS-100304",
    status: "FAILED",
    http: 200,
    subjectNote: "Subject: INDIVIDUAL · 2 identifiers · masked",
    stages: stage(4120),
    products: [
      { n: 1, productId: "PRD_0007", name: "Trended Cashflow", version: "1.1", dataScope: "TRENDED · 12m", outcome: "FAILED", packets: "0/3", retrievalMs: 3800, reason: "ERR_PRODUCT_RETRIEVAL_TIMEOUT", enquiryItemId: `${id4}-01` },
      { n: 2, productId: "PRD_0021", name: "Fraud Signals", version: "1.0", dataScope: "SNAPSHOT", outcome: "FAILED", packets: "0/4", retrievalMs: 3650, reason: "ERR_PRODUCT_RETRIEVAL_TIMEOUT", enquiryItemId: `${id4}-02` },
    ],
    errors: [
      { code: "ERR_PRODUCT_RETRIEVAL_TIMEOUT", field: "products[0]", rule: "NFR-PER-01", message: "Per-product retrieval exceeded the stage timeout" },
      { code: "ERR_PRODUCT_RETRIEVAL_TIMEOUT", field: "products[1]", rule: "NFR-PER-01", message: "Per-product retrieval exceeded the stage timeout" },
    ],
  });

  traces.push({
    enquiryId: null,
    requestId: "b0623e34-8f55-4d46-b188-ee05enquiry05",
    xRequestId: "ft-xr-5505",
    idempotencyKey: "idem-ft-5505",
    idempotentReplay: false,
    memberId: fintech.id,
    member: fintech.name,
    code: fintech.code,
    entityType: "INDIVIDUAL",
    enquiryType: "HARD",
    purpose: "new_credit",
    anchor: "CURRENT",
    enquiryDate: null,
    consentRef: "CNS-****-4411",
    applicationRef: "APP-FT-5505",
    received: formatDateTime(t(55)),
    responded: formatDateTime(t(55) + 42),
    latencyMs: 42,
    footprintCreated: false,
    footprintId: null,
    status: "GATED",
    http: 403,
    subjectNote: "Subject: INDIVIDUAL · 2 identifiers · masked",
    stages: [
      { name: "Gateway/auth", ms: 12 },
      { name: "Validation", ms: 18 },
      { name: "Identity resolution", ms: 0 },
      { name: "Product retrieval", ms: 0 },
      { name: "Response assembly", ms: 12 },
    ],
    products: [],
    errors: [
      { code: "ERR_PRODUCT_NOT_SUBSCRIBED", field: "products[0].productId", rule: "ENTITLEMENT", message: "Member is not subscribed to PRD_0021 Fraud Signals" },
    ],
  });

  traces.push({
    enquiryId: null,
    requestId: "c1734f45-9066-4e57-c299-ff06enquiry06",
    xRequestId: "mfi-xr-6106",
    idempotencyKey: "idem-mfi-6106",
    idempotentReplay: false,
    memberId: mfi.id,
    member: mfi.name,
    code: mfi.code,
    entityType: "INDIVIDUAL",
    enquiryType: "SOFT",
    purpose: "kyc",
    anchor: "CURRENT",
    enquiryDate: null,
    consentRef: "CNS-****-4411",
    applicationRef: "APP-MFI-6106",
    received: formatDateTime(t(61)),
    responded: formatDateTime(t(61) + 38),
    latencyMs: 38,
    footprintCreated: false,
    footprintId: null,
    status: "GATED",
    http: 400,
    subjectNote: "Subject: INDIVIDUAL · 2 identifiers · masked",
    stages: [
      { name: "Gateway/auth", ms: 8 },
      { name: "Validation", ms: 22 },
      { name: "Identity resolution", ms: 0 },
      { name: "Product retrieval", ms: 0 },
      { name: "Response assembly", ms: 8 },
    ],
    products: [],
    errors: [
      { code: "ERR_VALIDATION", field: "subject.individual.identifiers", rule: "VAL_REQUIRED_FIELD_MISSING", message: "At least one identifier is required" },
      { code: "ERR_VALIDATION", field: "enquiryPurpose", rule: "VAL_ENUM_INVALID", message: "enquiryPurpose is not in the allowed list" },
    ],
  });

  traces.push({
    enquiryId: null,
    requestId: "d2845066-a177-4f68-d3aa-1107enquiry07",
    xRequestId: "cbs-app-6707",
    idempotencyKey: "idem-cbs-6707",
    idempotentReplay: false,
    memberId: cbs.id,
    member: cbs.name,
    code: cbs.code,
    entityType: "INDIVIDUAL",
    enquiryType: "HARD",
    purpose: "portfolio_review",
    anchor: "AS_OF",
    enquiryDate: "2025-01-15",
    consentRef: "CNS-****-4411",
    applicationRef: "APP-CBS-6707",
    received: formatDateTime(t(67)),
    responded: formatDateTime(t(67) + 29),
    latencyMs: 29,
    footprintCreated: false,
    footprintId: null,
    status: "GATED",
    http: 400,
    subjectNote: "Subject: INDIVIDUAL · 2 identifiers · masked",
    stages: [
      { name: "Gateway/auth", ms: 7 },
      { name: "Validation", ms: 16 },
      { name: "Identity resolution", ms: 0 },
      { name: "Product retrieval", ms: 0 },
      { name: "Response assembly", ms: 6 },
    ],
    products: [],
    errors: [
      { code: "ERR_RETRO_REQUIRES_SOFT", field: "enquiryType", rule: "BR-RETRO", message: "Retro (AS_OF) enquiries must be SOFT" },
    ],
  });

  traces.push({
    enquiryId: null,
    requestId: "e3956177-b288-4079-e4bb-2208enquiry08",
    xRequestId: "ft-xr-7208",
    idempotencyKey: "idem-ft-7208",
    idempotentReplay: false,
    memberId: fintech.id,
    member: fintech.name,
    code: fintech.code,
    entityType: "INDIVIDUAL",
    enquiryType: "SOFT",
    purpose: "collections",
    anchor: "CURRENT",
    enquiryDate: null,
    consentRef: "CNS-****-4411",
    applicationRef: "APP-FT-7208",
    received: formatDateTime(t(72)),
    responded: formatDateTime(t(72) + 18),
    latencyMs: 18,
    footprintCreated: false,
    footprintId: null,
    status: "GATED",
    http: 429,
    subjectNote: "Subject: INDIVIDUAL · 2 identifiers · masked",
    stages: [
      { name: "Gateway/auth", ms: 11 },
      { name: "Validation", ms: 0 },
      { name: "Identity resolution", ms: 0 },
      { name: "Product retrieval", ms: 0 },
      { name: "Response assembly", ms: 7 },
    ],
    products: [],
    errors: [{ code: "ERR_RATE_LIMITED", field: "—", rule: "RATE_LIMIT", message: "Member exceeded the enquiry rate limit" }],
  });

  traces.push({
    enquiryId: null,
    requestId: "f4a67288-c399-418a-f5cc-3309enquiry09",
    xRequestId: "cbs-app-7909",
    idempotencyKey: "idem-cbs-4411",
    idempotentReplay: true,
    memberId: cbs.id,
    member: cbs.name,
    code: cbs.code,
    entityType: "INDIVIDUAL",
    enquiryType: "HARD",
    purpose: "new_credit",
    anchor: "CURRENT",
    enquiryDate: null,
    consentRef: "CNS-****-4411",
    applicationRef: "APP-CBS-10041",
    received: formatDateTime(t(79)),
    responded: formatDateTime(t(79) + 21),
    latencyMs: 21,
    footprintCreated: false,
    footprintId: null,
    status: "GATED",
    http: 409,
    subjectNote: "Subject: INDIVIDUAL · 2 identifiers · masked",
    stages: [
      { name: "Gateway/auth", ms: 9 },
      { name: "Validation", ms: 6 },
      { name: "Identity resolution", ms: 0 },
      { name: "Product retrieval", ms: 0 },
      { name: "Response assembly", ms: 6 },
    ],
    products: [],
    errors: [
      { code: "ERR_DUPLICATE_ENQUIRY", field: "Idempotency-Key", rule: "IDEMPOTENCY", message: "Idempotent replay — original enquiry already accepted" },
    ],
  });

  traces.push({
    enquiryId: null,
    requestId: "05b78399-d4aa-429b-06dd-4410enquiry10",
    xRequestId: "org-xr-8410",
    idempotencyKey: "idem-org-8410",
    idempotentReplay: false,
    memberId: orgM.id,
    member: orgM.name,
    code: orgM.code,
    entityType: "ORGANIZATION",
    enquiryType: "SOFT",
    purpose: "kyc",
    anchor: "CURRENT",
    enquiryDate: null,
    consentRef: "CNS-****-4411",
    applicationRef: "APP-ORG-8410",
    received: formatDateTime(t(84)),
    responded: formatDateTime(t(84) + 5240),
    latencyMs: 5240,
    footprintCreated: false,
    footprintId: null,
    status: "ERROR",
    http: 503,
    subjectNote: "Subject: ORGANIZATION · 2 identifiers · masked",
    stages: [
      { name: "Gateway/auth", ms: 40 },
      { name: "Validation", ms: 80 },
      { name: "Identity resolution", ms: 210 },
      { name: "Product retrieval", ms: 4800 },
      { name: "Response assembly", ms: 110 },
    ],
    products: [],
    errors: [{ code: "service_unavailable", field: "—", rule: "SLA", message: "End-to-end timeout — SLA breach (5 240 ms)" }],
  });

  const id11 = enquiryId(jointM.code, t(96), 100411);
  traces.push({
    enquiryId: id11,
    requestId: "16c894aa-e5bb-43ac-17ee-5511enquiry11",
    xRequestId: "jt-xr-9611",
    idempotencyKey: "idem-jt-9611",
    idempotentReplay: false,
    memberId: jointM.id,
    member: jointM.name,
    code: jointM.code,
    entityType: "JOINT",
    enquiryType: "HARD",
    purpose: "new_credit",
    anchor: "CURRENT",
    enquiryDate: null,
    consentRef: "CNS-****-4411",
    applicationRef: "APP-JT-9611",
    received: formatDateTime(t(96)),
    responded: formatDateTime(t(96) + 2680),
    latencyMs: 2680,
    footprintCreated: true,
    footprintId: `FP-${jointM.code}-100411`,
    status: "SUCCESS",
    http: 200,
    subjectNote: "Subject: JOINT · 2 co-applicants · 4 identifiers · masked",
    stages: stage(2680),
    products: [
      { n: 1, productId: "PRD_0001", name: "Core Alternate Data", version: "2.0", dataScope: "SNAPSHOT", outcome: "SERVED", packets: "5/5", retrievalMs: 1100, enquiryItemId: `${id11}-01` },
      { n: 2, productId: "PRD_0012", name: "Telco Stability", version: "1.0", dataScope: "SNAPSHOT", outcome: "SERVED", packets: "2/2", retrievalMs: 840, enquiryItemId: `${id11}-02` },
      { n: 3, productId: "PRD_0007", name: "Trended Cashflow", version: "1.1", dataScope: "SNAPSHOT", outcome: "NO_DATA", packets: "0/3", retrievalMs: 720, enquiryItemId: `${id11}-03` },
      { n: 4, productId: "PRD_0021", name: "Fraud Signals", version: "1.0", dataScope: "SNAPSHOT", outcome: "SERVED", packets: "3/4", retrievalMs: 990, enquiryItemId: `${id11}-04` },
    ],
    errors: [],
  });

  const id12 = enquiryId(orgM.code, t(110), 100512);
  traces.push({
    enquiryId: id12,
    requestId: "27d9a5bb-f6cc-44bd-28ff-6612enquiry12",
    xRequestId: "org-xr-11012",
    idempotencyKey: "idem-org-11012",
    idempotentReplay: false,
    memberId: orgM.id,
    member: orgM.name,
    code: orgM.code,
    entityType: "ORGANIZATION",
    enquiryType: "SOFT",
    purpose: "kyc",
    anchor: "CURRENT",
    enquiryDate: null,
    consentRef: "CNS-****-4411",
    applicationRef: "APP-ORG-11012",
    received: formatDateTime(t(110)),
    responded: formatDateTime(t(110) + 1720),
    latencyMs: 1720,
    footprintCreated: false,
    footprintId: null,
    status: "SUCCESS",
    http: 200,
    subjectNote: "Subject: ORGANIZATION · 2 identifiers · masked",
    stages: stage(1720),
    products: [
      { n: 1, productId: "PRD_0015", name: "Commercial Profile", version: "2.0", dataScope: "SNAPSHOT", outcome: "SERVED", packets: "4/4", retrievalMs: 1210, enquiryItemId: `${id12}-01` },
    ],
    errors: [],
  });

  return traces;
}

export function applyBucketJitter(snapshot: EnquirySnapshot, tick: number): EnquirySnapshot {
  if (snapshot.buckets.length === 0) return { ...snapshot, asOf: formatAsOf(snapshot.asOfMs + tick * 60_000), asOfMs: snapshot.asOfMs + tick * 60_000 };
  const rng = mulberry32(hashSeed(`jitter|${tick}|${snapshot.asOfMs}`));
  const factor = 0.98 + rng() * 0.04;
  const last = snapshot.buckets[snapshot.buckets.length - 1];
  const jittered: EnquiryBucket = {
    ...last,
    requests: Math.max(0, Math.round(last.requests * factor)),
    success: Math.max(0, Math.round(last.success * factor)),
    noData: Math.max(0, Math.round(last.noData * factor)),
    failed: Math.max(0, Math.round(last.failed * factor)),
    gated: Math.max(0, Math.round(last.gated * factor)),
    platformError: Math.max(0, Math.round(last.platformError * factor)),
    hard: Math.max(0, Math.round(last.hard * factor)),
    soft: Math.max(0, Math.round(last.soft * factor)),
    retro: Math.max(0, Math.round(last.retro * factor)),
    peakRps: +(last.peakRps * factor).toFixed(2),
  };
  const buckets = [...snapshot.buckets.slice(0, -1), jittered];
  const asOfMs = snapshot.asOfMs + tick * 60_000;
  return { ...snapshot, buckets, asOfMs, asOf: formatAsOf(asOfMs) };
}

export function buildEnquirySnapshot(filters: EnquiryMockFilters, nowMs = Date.now()): EnquirySnapshot {
  const catalog = getEnquiryCatalog();
  const spec = windowSpec(filters.window);
  const locked = catalog.find((m) => m.id === filters.memberId);
  const silentFlags = catalog.map((_, idx) => idx > 0 && idx % Math.round(1 / ENQUIRY_CONSTANTS.silentMemberShare) === 0);
  const memberIdx = locked ? catalog.findIndex((m) => m.id === locked.id) : -1;
  const mScale = locked ? memberShare(memberIdx, silentFlags[memberIdx] ?? false) : 1;
  const scale =
    typeScale(filters.type) *
    anchorScale(filters.anchor, filters.type) *
    entityScale(filters.entity) *
    productScale(filters.productId) *
    (mScale === 0 ? 0 : mScale);

  const seed = hashSeed(JSON.stringify(filters));
  const rng = mulberry32(seed);

  const hours = spec.hours;
  const reqPerHour = ENQUIRY_CONSTANTS.monthlyRequests / (30 * 24);
  const expected = reqPerHour * hours * scale;

  const buckets: EnquiryBucket[] = [];
  const bucketMs = (hours * 3600_000) / spec.bucketCount;
  let totalReq = 0;
  let totalGated = 0;
  let totalPlat = 0;
  let totalSuccess = 0;
  let totalNoData = 0;
  let totalFailed = 0;

  const entityHit = hitRateForEntity(filters.entity);
  const productHit =
    filters.productId === "all"
      ? entityHit
      : ENQUIRY_PRODUCTS.find((p) => p.id === filters.productId)?.servedRate ?? entityHit;
  const successShare = Math.min(0.92, Math.max(0.4, productHit * (filters.memberId === "mem-cbs" ? 1.05 : 1)));
  const noDataShare = Math.max(0.04, (1 - successShare) * 0.92);
  const failedShare = Math.max(0.005, 1 - successShare - noDataShare);

  let hardShare = filters.type === "SOFT" ? 0 : filters.type === "HARD" ? 1 : ENQUIRY_CONSTANTS.hardShare;
  let retroShare =
    filters.anchor === "CURRENT" ? 0 : filters.anchor === "AS_OF" ? 1 : filters.type === "HARD" ? 0 : ENQUIRY_CONSTANTS.retroShare;
  if (filters.type === "HARD") retroShare = 0;
  if (filters.anchor === "AS_OF") hardShare = 0;

  for (let i = 0; i < spec.bucketCount; i++) {
    const ts = nowMs - (spec.bucketCount - 1 - i) * bucketMs;
    const hour = new Date(ts).getHours();
    const wave = spec.grain === "day" || spec.grain === "2day" ? weekdayFactor(ts) * monthEndFactor(ts) : diurnal(hour) * weekdayFactor(ts);
    const base = (expected / spec.bucketCount) * wave * (0.92 + rng() * 0.16);
    const requests = Math.max(0, Math.round(base));
    const gated = Math.round(requests * ENQUIRY_CONSTANTS.gateRate);
    const platformError = Math.round(requests * ENQUIRY_CONSTANTS.platformErrorRate);
    const executed = Math.max(0, requests - gated - platformError);
    const success = Math.round(executed * successShare);
    const failed = Math.round(executed * failedShare);
    const noData = Math.max(0, executed - success - failed);
    const hard = Math.round(executed * hardShare);
    const retro = Math.round(executed * retroShare);
    const soft = Math.max(0, executed - hard);
    const enq = success + noData + failed;
    const pJitter = 0.96 + rng() * 0.08;
    buckets.push({
      label: labelBucket(ts, spec.grain),
      ts,
      requests,
      success,
      noData,
      failed,
      gated,
      platformError,
      hitRatePct: enq === 0 ? 0 : +((success / enq) * 100).toFixed(1),
      p50: Math.round(ENQUIRY_CONSTANTS.p50Ms * pJitter),
      p95: Math.round(ENQUIRY_CONSTANTS.p95Ms * pJitter),
      p99: Math.round(ENQUIRY_CONSTANTS.p99Ms * pJitter),
      r50: Math.round(ENQUIRY_CONSTANTS.retrievalP95Ms * 0.55 * pJitter),
      r95: Math.round(ENQUIRY_CONSTANTS.retrievalP95Ms * pJitter),
      r99: Math.round(ENQUIRY_CONSTANTS.retrievalP95Ms * 1.55 * pJitter),
      hard,
      soft,
      retro,
      peakRps: +(requests / (bucketMs / 1000) * 1.8).toFixed(2),
    });
    totalReq += requests;
    totalGated += gated;
    totalPlat += platformError;
    totalSuccess += success;
    totalNoData += noData;
    totalFailed += failed;
  }

  const enquiries = totalSuccess + totalNoData + totalFailed;
  const productEnquiries = Math.round(enquiries * ENQUIRY_CONSTANTS.productEnquiriesPerEnquiry);
  const gatedPct = totalReq === 0 ? 0 : (totalGated / totalReq) * 100;
  const hitRate = enquiries === 0 ? 0 : (totalSuccess / enquiries) * 100;
  const p95 = buckets.length ? Math.round(buckets.reduce((s, b) => s + b.p95, 0) / buckets.length) : 0;
  const failedPct = enquiries === 0 ? 0 : (totalFailed / enquiries) * 100;

  const band = (ok: boolean, watch: boolean): Pick<EnquiryKpiCard, "slo" | "sloLabel"> => {
    if (ok) return { slo: "ok", sloLabel: "acceptable" };
    if (watch) return { slo: "watch", sloLabel: "Needs attention" };
    return { slo: "breach", sloLabel: "Needs attention" };
  };

  const kpis: EnquiryKpiCard[] = [
    {
      id: "requests",
      label: "Total requests",
      value: formatCompact(totalReq),
      delta: "",
      deltaPositive: true,
      deltaNeutral: true,
      slo: "na",
      sloLabel: "",
      sub: "",
      tooltip: "Every call received, including gated calls, platform errors, and executed enquiries.",
    },
    {
      id: "success",
      label: "Success %",
      value: formatPct1(hitRate),
      delta: "",
      deltaPositive: true,
      deltaNeutral: true,
      ...band(hitRate >= ENQUIRY_CONSTANTS.hitRateSlo * 100, hitRate >= 60),
      sub: "",
      tooltip: "SUCCESS ÷ executed enquiries. SUCCESS means at least one product was SERVED.",
    },
    {
      id: "rejection",
      label: "Rejection %",
      value: formatPct1(gatedPct),
      delta: "",
      deltaPositive: true,
      deltaNeutral: true,
      ...band(gatedPct <= 5, gatedPct <= 8),
      sub: "",
      tooltip: "Share of requests rejected before execution (auth, entitlement, validation, consent, rate limit, or duplicate).",
    },
    {
      id: "failed",
      label: "Failed %",
      value: formatPct1(failedPct),
      delta: "",
      deltaPositive: true,
      deltaNeutral: true,
      ...band(failedPct <= 3, failedPct <= 5),
      sub: "",
      tooltip: "FAILED ÷ executed enquiries. Product retrieval or derivation failed after the request passed the gate.",
    },
    {
      id: "p95",
      label: "P95 latency",
      value: `${p95} ms`,
      delta: "",
      deltaPositive: true,
      deltaNeutral: true,
      ...band(p95 <= ENQUIRY_CONSTANTS.latencySloMs, p95 <= ENQUIRY_CONSTANTS.latencySloMs * 1.3),
      sub: "",
      tooltip: "End-to-end P95 for executed traffic versus the 5 000 ms SLO.",
    },
  ];

  const mixSource = filters.productId === "all" ? ENQUIRY_PRODUCTS : ENQUIRY_PRODUCTS.filter((p) => p.id === filters.productId);
  const ranked = [...mixSource].sort((a, b) => b.popularity - a.popularity);
  const top8 = ranked.slice(0, 8);
  const otherPop = ranked.slice(8).reduce((s, p) => s + p.popularity, 0);
  const productMix: EnquiryProductMixRow[] = top8.map((p) => {
    const n = Math.round(productEnquiries * (filters.productId === "all" ? p.popularity : 1));
    const served = Math.round(n * p.servedRate);
    const failed = Math.round(n * 0.03);
    const noData = Math.max(0, n - served - failed);
    return { productId: p.id, name: `${p.id} — ${p.name}`, served, noData, failed };
  });
  if (otherPop > 0 && filters.productId === "all") {
    const n = Math.round(productEnquiries * otherPop);
    productMix.push({
      productId: "OTHER",
      name: "Other",
      served: Math.round(n * 0.6),
      noData: Math.round(n * 0.35),
      failed: Math.max(0, n - Math.round(n * 0.6) - Math.round(n * 0.35)),
    });
  }

  const paretoTotal = totalGated + totalFailed;
  const pareto: EnquiryParetoRow[] = GATE_CODES.slice(0, 8).map((g) => {
    const count = Math.round(paretoTotal * g.weight);
    return { code: g.code, count, pct: paretoTotal ? +((count / paretoTotal) * 100).toFixed(1) : 0 };
  });
  const used = pareto.reduce((s, p) => s + p.count, 0);
  pareto.push({
    code: "Other",
    count: Math.max(0, paretoTotal - used),
    pct: paretoTotal ? +(((paretoTotal - used) / paretoTotal) * 100).toFixed(1) : 0,
  });

  const failWindowMs = Math.min(hours, 24) * 3600_000;
  const failures: EnquiryFailureRow[] = [];
  const outcomeCycle: EnquiryFailureRow["outcome"][] = ["GATED", "GATED", "GATED", "FAILED", "ERROR"];
  for (let i = 0; i < 50; i++) {
    const idx = Math.min(catalog.length - 1, i === 0 ? 0 : 1 + Math.floor(rng() * 80));
    const member = catalog[idx];
    const outcome = outcomeCycle[i % outcomeCycle.length];
    const gatedPick = pickWeighted(rng, GATE_CODES);
    const code =
      outcome === "ERROR" ? "service_unavailable" : outcome === "FAILED" ? FAIL_CODES[i % FAIL_CODES.length] : gatedPick.code;
    const http = outcome === "ERROR" ? 503 : outcome === "FAILED" ? 200 : code === "ERR_RATE_LIMITED" ? 429 : code === "ERR_DUPLICATE_ENQUIRY" ? 409 : code === "ERR_PRODUCT_NOT_SUBSCRIBED" ? 403 : 400;
    const ts = nowMs - Math.floor(rng() * failWindowMs);
    const type: "HARD" | "SOFT" = rng() < hardShare || hardShare === 1 ? "HARD" : "SOFT";
    const entity =
      filters.entity !== "all"
        ? filters.entity
        : rng() < 0.88
          ? "INDIVIDUAL"
          : rng() < 0.75
            ? "ORGANIZATION"
            : "JOINT";
    const ref =
      outcome === "GATED" || outcome === "ERROR"
        ? uuidFrom(rng)
        : enquiryId(member.code, ts, 200000 + i);
    failures.push({
      id: `fail-${i}`,
      time: formatDateTime(ts),
      ts,
      memberId: member.id,
      member: member.name,
      entity,
      type,
      ref,
      outcome,
      http,
      code,
      latencyMs: outcome === "ERROR" ? 5000 + Math.round(rng() * 800) : outcome === "FAILED" ? 3200 + Math.round(rng() * 900) : 20 + Math.round(rng() * 80),
    });
  }
  failures.sort((a, b) => b.ts - a.ts);

  const hoursSafe = Math.max(1, hours);
  const members: EnquiryMemberRow[] = catalog.map((m, idx) => {
    const silent = silentFlags[idx] ?? false;
    const share = memberShare(idx, silent);
    const req = locked
      ? m.id === locked.id
        ? totalReq
        : 0
      : Math.round(reqPerHour * hours * share * typeScale(filters.type) * entityScale(filters.entity) * productScale(filters.productId));
    const gated = Math.round(req * (idx % 11 === 0 ? 0.12 : ENQUIRY_CONSTANTS.gateRate));
    const plat = Math.round(req * ENQUIRY_CONSTANTS.platformErrorRate);
    const enq = Math.max(0, req - gated - plat);
    const mfi = m.name.includes("MFI");
    const fintech = m.name.includes("Fintech");
    const hit = m.code === "CBS" ? 0.78 : mfi ? 0.58 : fintech ? 0.65 : 0.74;
    const success = Math.round(enq * hit);
    const noData = Math.round(enq * (1 - hit) * 0.9);
    const failed = Math.max(0, enq - success - noData);
    const productEnq = Math.round(enq * ENQUIRY_CONSTANTS.productEnquiriesPerEnquiry);
    const entitlement = Math.round(gated * (idx % Math.round(1 / ENQUIRY_CONSTANTS.entitlementShare) === 0 ? 0.55 : 0.18));
    const throttled = !silent && idx % Math.round(1 / ENQUIRY_CONSTANTS.throttledShare) === 0;
    const consentIssues = !silent && idx % Math.round(1 / ENQUIRY_CONSTANTS.consentShare) === 3;
    const insufficient = req < 80;
    const highReject = gated / Math.max(req, 1) > 0.1 && req >= 80;
    const lowHit = hit < 0.5 && enq >= 80;
    const lastSeen = silent
      ? formatDateTime(nowMs - (1 + (idx % 14)) * 86400_000)
      : formatDateTime(nowMs - (idx % 50) * 60_000);
    const topCode = silent ? "—" : throttled ? "ERR_RATE_LIMITED" : consentIssues ? "ERR_CONSENT_REQUIRED" : entitlement > gated * 0.4 ? "ERR_PRODUCT_NOT_SUBSCRIBED" : GATE_CODES[idx % GATE_CODES.length].code;
    return {
      id: m.id,
      name: m.name,
      code: m.code,
      requests: req,
      enquiries: enq,
      productEnquiries: productEnq,
      hitRate: enq === 0 ? 0 : +((success / enq) * 100).toFixed(1),
      noDataPct: enq === 0 ? 0 : +((noData / enq) * 100).toFixed(1),
      gated,
      rejectedPct: req === 0 ? 0 : +((gated / req) * 100).toFixed(1),
      failedPct: enq === 0 ? 0 : +((failed / enq) * 100).toFixed(1),
      p95: silent || insufficient ? 0 : Math.round(ENQUIRY_CONSTANTS.p95Ms * (mfi ? 1.08 : 0.98)),
      throughput: Math.round(req / hoursSafe),
      hardPct: +(hardShare * 100).toFixed(1),
      retroPct: +(retroShare * 100).toFixed(1),
      lastSeen,
      topCode,
      silent,
      throttled,
      consentIssues,
      highReject,
      lowHit,
      insufficient,
    };
  });

  const sparkBuckets = buckets.slice(-8);
  const products: EnquiryProductRow[] = ENQUIRY_PRODUCTS.filter((p) => filters.productId === "all" || p.id === filters.productId).map((p) => {
    const n = Math.round(productEnquiries * (filters.productId === "all" ? p.popularity : 1));
    const served = n * p.servedRate;
    const failed = n * 0.03;
    const noData = n - served - failed;
    const depShare = 0.08 + (p.id.charCodeAt(7) % 8) / 100;
    return {
      productId: p.id,
      name: p.name,
      versions: [
        { version: "2.0", state: "Active", productEnquiries: Math.round(n * (1 - depShare)) },
        { version: "1.0", state: "Deprecated", productEnquiries: Math.round(n * depShare) },
      ],
      productEnquiries: n,
      servedPct: n ? +((served / n) * 100).toFixed(1) : 0,
      noDataPct: n ? +((noData / n) * 100).toFixed(1) : 0,
      failedPct: n ? +((failed / n) * 100).toFixed(1) : 0,
      p95Retrieval: Math.round(ENQUIRY_CONSTANTS.retrievalP95Ms * (p.id === "PRD_0007" ? 1.35 : 1)),
      trendedShare: p.id === "PRD_0007" ? 82 : +(ENQUIRY_CONSTANTS.trendedShare * 100 * (p.id === "PRD_0001" ? 0.4 : 0.2)).toFixed(1),
      retroShare: +(ENQUIRY_CONSTANTS.retroShare * 100).toFixed(1),
      membersUsing: Math.max(1, Math.round(catalog.length * p.popularity * 0.55)),
      topFailure: p.servedRate < 0.5 ? "ERR_PRODUCT_RETRIEVAL_TIMEOUT" : "ERR_DERIVATION_FAILED",
      spark: sparkBuckets.map((b) => {
        const pe = Math.round(b.success + b.noData + b.failed) * p.popularity * ENQUIRY_CONSTANTS.productEnquiriesPerEnquiry;
        return {
          served: Math.round(pe * p.servedRate),
          noData: Math.round(pe * (1 - p.servedRate) * 0.9),
          failed: Math.round(pe * 0.03),
        };
      }),
    };
  });
  products.sort((a, b) => b.productEnquiries - a.productEnquiries);

  const curated = buildCuratedTraces(catalog, nowMs);
  const extraTraces: EnquiryTraceDetail[] = failures.slice(0, 24).map((f) => ({
    enquiryId: f.outcome === "FAILED" ? f.ref : null,
    requestId: f.outcome === "FAILED" ? uuidFrom(rng) : f.ref,
    xRequestId: `xr-${f.id}`,
    idempotencyKey: `idem-${f.id}`,
    idempotentReplay: f.code === "ERR_DUPLICATE_ENQUIRY",
    memberId: f.memberId,
    member: f.member,
    code: catalog.find((c) => c.id === f.memberId)?.code ?? "UNK",
    entityType: f.entity,
    enquiryType: f.type,
    purpose: "new_credit",
    anchor: "CURRENT",
    enquiryDate: null,
    consentRef: "CNS-****-4411",
    applicationRef: `APP-${f.id}`,
    received: f.time,
    responded: f.time,
    latencyMs: f.latencyMs,
    footprintCreated: f.outcome === "FAILED" && f.type === "HARD",
    footprintId: f.outcome === "FAILED" && f.type === "HARD" ? `FP-${f.id}` : null,
    status: f.outcome,
    http: f.http,
    subjectNote: `Subject: ${f.entity} · 2 identifiers · masked`,
    stages: [
      { name: "Gateway/auth", ms: Math.round(f.latencyMs * 0.08) },
      { name: "Validation", ms: Math.round(f.latencyMs * 0.12) },
      { name: "Identity resolution", ms: f.outcome === "GATED" ? 0 : Math.round(f.latencyMs * 0.18) },
      { name: "Product retrieval", ms: f.outcome === "GATED" ? 0 : Math.round(f.latencyMs * 0.5) },
      { name: "Response assembly", ms: Math.round(f.latencyMs * 0.12) },
    ],
    products:
      f.outcome === "FAILED"
        ? [
            {
              n: 1,
              productId: "PRD_0001",
              name: "Core Alternate Data",
              version: "2.0",
              dataScope: "SNAPSHOT",
              outcome: "FAILED" as const,
              packets: "0/5",
              retrievalMs: f.latencyMs,
              reason: f.code,
              enquiryItemId: `${f.ref}-01`,
            },
          ]
        : [],
    errors: [{ code: f.code, field: f.outcome === "GATED" ? "request" : "products[0]", rule: f.code.startsWith("VAL") ? f.code : "—", message: f.code.replace(/_/g, " ").toLowerCase() }],
  }));

  const traces = [...curated, ...extraTraces];

  return {
    asOf: formatAsOf(nowMs),
    asOfMs: nowMs,
    kpis,
    buckets,
    productMix,
    pareto,
    failures,
    members,
    products,
    traces,
    catalog,
    totals: {
      requests: totalReq,
      gated: totalGated,
      platformErrors: totalPlat,
      enquiries,
      productEnquiries,
      success: totalSuccess,
      noData: totalNoData,
      failed: totalFailed,
    },
  };
}

export function searchMembers(query: string, catalog: EnquiryMember[], limit = 40): EnquiryMember[] {
  const q = query.trim().toLowerCase();
  const src = q
    ? catalog.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
    : catalog;
  return src.slice(0, limit);
}

export function traceSearchKey(t: EnquiryTraceDetail): string {
  return [t.enquiryId, t.requestId, t.xRequestId, t.idempotencyKey, t.applicationRef, t.member, t.code]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

declare global {
  interface Window {
    __enquiryMock?: {
      constants: typeof ENQUIRY_CONSTANTS;
      buildEnquirySnapshot: typeof buildEnquirySnapshot;
    };
  }
}

if (typeof window !== "undefined" && import.meta.env.DEV) {
  window.__enquiryMock = { constants: ENQUIRY_CONSTANTS, buildEnquirySnapshot };
}
