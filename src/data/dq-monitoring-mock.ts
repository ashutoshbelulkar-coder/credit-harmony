import type {
  DqApiAssessmentRow,
  DqBatchRow,
  DqFilters,
  DqGrade,
  DqGradeBucket,
  DqHeadlineKpis,
  DqIssue,
  DqMemberDetail,
  DqMemberRow,
  DqMover,
  DqReportType,
  DqSeverity,
  DqThresholdEvent,
  DqTrendPoint,
} from "@/types/dq-monitoring";

export const DQ_AS_OF = "2026-08-19";
export const DQ_REFRESH_LABEL =
  "Updated 19 Aug 2026, 09:42 IST · batch: event-driven · API: 60-second aggregates";
export const DQ_MEMBER_COUNT = 1214;
export const DQ_TARGET = 85;
export const DQ_PORTFOLIO_MEDIAN = 86.9;
export const DQ_PAGE_SIZE_MEMBERS = 50;
export const DQ_PAGE_SIZE_TABLE = 50;

export const DQ_SOURCE_TYPES = [
  "BANK_STATEMENT",
  "INVESTMENT",
  "MOBILE_MONEY",
  "REMITTANCE",
  "ECOMMERCE",
  "MERCHANT_POS",
  "TRADE_CREDIT",
  "AGRICULTURAL",
  "RENTAL",
  "SUBSCRIPTION",
  "TELECOM",
  "UTILITY",
  "INSURANCE",
  "EMPLOYMENT",
  "GST",
  "LOANS",
  "CARDS",
  "MICROFINANCE",
  "LEASING",
  "HOUSING_FINANCE",
  "BNPL",
  "FRAUD_SIGNALS",
] as const;

export const DQ_PROFILES = [
  "Loans master v3.2",
  "Customer demographics v2.1",
  "Collateral v1.4",
  "Repayment schedule v2.0",
  "Member master v1.9",
  "Guarantor v1.1",
  "KYC v2.3",
] as const;

export const DQ_STAGES: { id: string; label: string }[] = [
  { id: "S11", label: "S11 File Transfer & Pre-Checks" },
  { id: "S12", label: "S12 Batch Creation" },
  { id: "S21", label: "S21 Profile Identification" },
  { id: "S31", label: "S31 Data Model Mapping" },
  { id: "S32", label: "S32 Normalisation & Transformation" },
  { id: "S33", label: "S33 Validation (DQI)" },
  { id: "S34", label: "S34 Business Logic" },
  { id: "S35", label: "S35 De-duplication" },
  { id: "S41", label: "S41 Identity Resolution" },
  { id: "S51", label: "S51 Data Load" },
  { id: "S52", label: "S52 Post-Load Reconciliation" },
];

const STAGE_BY_ID = Object.fromEntries(DQ_STAGES.map((s) => [s.id, s.label]));

export function gradeFromDqi(dqi: number): DqGrade {
  if (dqi >= 90) return "A";
  if (dqi >= 80) return "B";
  if (dqi >= 70) return "C";
  if (dqi >= 60) return "D";
  return "F";
}

export function gradeBand(grade: DqGrade): [number, number] {
  switch (grade) {
    case "A":
      return [90, 100];
    case "B":
      return [80, 89];
    case "C":
      return [70, 79];
    case "D":
      return [60, 69];
    default:
      return [0, 59];
  }
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)] as T;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function isoDaysBack(endIso: string, days: number): string {
  const d = new Date(`${endIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function formatYmdLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
}

function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

type NamedSeed = {
  id: string;
  name: string;
  dqi: number;
  delta: number;
  cause?: string;
  tier?: DqMemberRow["tier"];
  validity?: number;
  completeness?: number;
  dupIntegrity?: number;
  sourceTypes?: string[];
};

const NAMED: NamedSeed[] = [
  { id: "FNB", name: "First National Bank", dqi: 95.8, delta: 0.8, tier: "Tier 1", validity: 95, completeness: 96, dupIntegrity: 97, sourceTypes: ["LOANS", "CARDS"] },
  { id: "MMF", name: "Metro Microfinance", dqi: 81.6, delta: 5.2, cause: "VAL-PHONE-FORMAT", sourceTypes: ["MICROFINANCE"] },
  { id: "APX", name: "Apex Finance", dqi: 71.2, delta: -9.4, cause: "VAL-PAN-FORMAT", tier: "Tier 2" },
  { id: "SSFB", name: "Suryoday Small Finance Bank", dqi: 88.4, delta: 0.4, tier: "Tier 1" },
  { id: "KHF", name: "Kaveri Housing Finance", dqi: 86.1, delta: -0.6, sourceTypes: ["HOUSING_FINANCE"] },
  { id: "NLN", name: "Northline NBFC", dqi: 79.4, delta: -1.8, cause: "ERR_FIELD_MANDATORY" },
  { id: "DGB", name: "Deccan Gramin Bank", dqi: 90.3, delta: 3.8 },
  { id: "VSC", name: "Vistara Capital", dqi: 84.7, delta: 0.2 },
  { id: "SCB", name: "Sahyadri Co-op Bank", dqi: 87.9, delta: 1.1 },
  { id: "BSF", name: "Bluestone Fintech", dqi: 83.2, delta: -0.9, sourceTypes: ["BNPL", "ECOMMERCE"] },
  { id: "PKL", name: "Prakash Leasing", dqi: 66.8, delta: -4.9, cause: "VAL-REF-INTEGRITY", sourceTypes: ["LEASING"] },
  { id: "MRB", name: "Meridian Bank", dqi: 93.1, delta: 0.5, tier: "Tier 1" },
  { id: "ARM", name: "Aarohan Microcredit", dqi: 85.4, delta: 1.6, sourceTypes: ["MICROFINANCE"] },
  { id: "KUB", name: "Konkan Urban Bank", dqi: 78.0, delta: -6.1, cause: "MAP-MANDATORY-MISSING" },
  { id: "TCF", name: "Trident Consumer Finance", dqi: 86.0, delta: 2.9 },
  { id: "GRB", name: "Godavari Rural Bank", dqi: 92.7, delta: 2.2 },
  { id: "NXD", name: "Nexa Digital Lending", dqi: 84.1, delta: -3.7, cause: "ERR_FIELD_ENUM", sourceTypes: ["LOANS", "BNPL"] },
  { id: "SWM", name: "Shakti Women's MFI", dqi: 88.9, delta: 4.1, sourceTypes: ["MICROFINANCE"] },
  { id: "ORC", name: "Orion Credit", dqi: 82.5, delta: -5.3, cause: "ERR_FIELD_MANDATORY" },
  { id: "PAF", name: "Pinnacle Auto Finance", dqi: 80.6, delta: -0.4 },
  { id: "USF", name: "Ujjivan Small Finance", dqi: 89.2, delta: 0.7, tier: "Tier 1" },
  { id: "BDN", name: "Bandhan Inclusive", dqi: 81.0, delta: 1.2 },
  { id: "CUF", name: "Chola Urban Finance", dqi: 77.4, delta: -2.1 },
  { id: "HMH", name: "Hemavati Housing", dqi: 85.8, delta: 0.3, sourceTypes: ["HOUSING_FINANCE"] },
  { id: "MCB", name: "Malabar Coastal Bank", dqi: 91.4, delta: 0.9 },
  { id: "GND", name: "Ganga Nidhi", dqi: 74.6, delta: -1.4 },
  { id: "CRP", name: "Coral Pay", dqi: 82.0, delta: 0.1, sourceTypes: ["MOBILE_MONEY"] },
  { id: "ICS", name: "Indus Consumer", dqi: 86.8, delta: -0.2 },
  { id: "TGB", name: "Tungabhadra Grameen", dqi: 90.1, delta: 1.8 },
  { id: "EMC", name: "Eastern Mercantile", dqi: 83.9, delta: -0.8 },
  { id: "LMF", name: "Lumbini Microfinance", dqi: 87.2, delta: 2.4, sourceTypes: ["MICROFINANCE"] },
  { id: "SGL", name: "Sagar Leasing", dqi: 69.4, delta: -2.6, sourceTypes: ["LEASING"] },
  { id: "YVC", name: "Yuva Credit", dqi: 80.2, delta: 0.6 },
  { id: "ARB", name: "Aravalli Rural Bank", dqi: 91.8, delta: 1.0 },
  { id: "PNN", name: "Peninsula Nidhi", dqi: 76.1, delta: -1.1 },
  { id: "CBF", name: "Canara Belt Finance", dqi: 84.5, delta: 0.0 },
  { id: "NLH", name: "Nilgiri Housing", dqi: 88.0, delta: 0.4, sourceTypes: ["HOUSING_FINANCE"] },
  { id: "SPA", name: "Satpura Auto", dqi: 72.8, delta: -3.0 },
  { id: "AWC", name: "Ananya Women's Co-op", dqi: 89.6, delta: 1.9 },
  { id: "FDB", name: "Frontier Digital Bank", dqi: 94.2, delta: 0.6, tier: "Tier 1" },
];

const NAME_PREFIX = [
  "Sundaram", "Navya", "Kiran", "Bharat", "Pragati", "Tejas", "Ankur", "Vikas",
  "Sampada", "Jyoti", "Narmada", "Cauvery", "Mahanadi", "Sabarmati", "Krishna",
  "Godavari", "Yamuna", "Tapti", "Indrayani", "Bhagirathi", "Alaknanda", "Mandakini",
  "Saraswati", "Gomati", "Pamba", "Periyar", "Vaigai", "Pennar", "Subarnarekha",
];
const NAME_KIND = [
  "Finance", "Credit", "NBFC", "Bank", "Urban Bank", "Rural Bank", "Housing",
  "Leasing", "Microfinance", "Capital", "Lending", "Co-op Bank", "Fintech", "Nidhi",
];

function dimensionsFromDqi(dqi: number, rng: () => number, override?: NamedSeed) {
  if (override?.validity != null && override.completeness != null && override.dupIntegrity != null) {
    return { validity: override.validity, completeness: override.completeness, dupIntegrity: override.dupIntegrity };
  }
  const jitter = () => round1((rng() - 0.5) * 3);
  const validity = clamp(round1(dqi + jitter() + 0.4), 40, 100);
  const completeness = clamp(round1(dqi + jitter() - 0.2), 40, 100);
  const dupIntegrity = clamp(round1((dqi - validity * 0.4 - completeness * 0.35) / 0.25), 40, 100);
  return { validity, completeness, dupIntegrity: round1(dupIntegrity) };
}

function buildMembers(): DqMemberRow[] {
  const rng = mulberry32(20260819);
  const members: DqMemberRow[] = [];
  const usedIds = new Set<string>();

  const pushMember = (row: DqMemberRow) => {
    usedIds.add(row.id);
    members.push(row);
  };

  const makeRow = (seed: { id: string; name: string; dqi: number; delta: number; named: boolean; extra?: NamedSeed }): DqMemberRow => {
    const dims = dimensionsFromDqi(seed.dqi, rng, seed.extra);
    const grade = gradeFromDqi(seed.dqi);
    const rejectedPct = round1(clamp((100 - seed.dqi) * 0.22 + rng() * 1.4, 0.2, 28));
    const breaches = seed.dqi < 75 ? 1 + Math.floor(rng() * 3) : seed.dqi < 85 ? (rng() > 0.7 ? 1 : 0) : 0;
    const records = Math.round(8_000 + rng() * 180_000 + (seed.extra?.tier === "Tier 1" ? 220_000 : 0));
    const batchShare = seed.extra?.sourceTypes?.includes("MOBILE_MONEY") ? 15 + rng() * 20 : 40 + rng() * 50;
    const sources = seed.extra?.sourceTypes ?? [pick(rng, DQ_SOURCE_TYPES), ...(rng() > 0.55 ? [pick(rng, DQ_SOURCE_TYPES)] : [])];
    const uniqueSources = Array.from(new Set(sources)).slice(0, 3);
    const profiles = Array.from(new Set([pick(rng, DQ_PROFILES), ...(rng() > 0.52 ? [pick(rng, DQ_PROFILES)] : [])]));
    const attention = round1((100 - seed.dqi) * 0.55 + rejectedPct * 0.7 + breaches * 8);
    const lastOffset = Math.floor(rng() * 4);
    return {
      id: seed.id,
      name: seed.name,
      tier: seed.extra?.tier ?? (seed.dqi >= 90 ? "Tier 1" : seed.dqi >= 75 ? "Tier 2" : "Tier 3"),
      sourceTypes: uniqueSources,
      profiles,
      batchSharePct: round1(clamp(batchShare, 8, 92)),
      recordsEvaluated: records,
      dqi: seed.dqi,
      dqiPrev: round1(seed.dqi - seed.delta),
      grade,
      validity: dims.validity,
      completeness: dims.completeness,
      dupIntegrity: dims.dupIntegrity,
      rejectedPct,
      breaches,
      lastAssessment: isoDaysBack(DQ_AS_OF, lastOffset),
      attention,
      isMyMember: false,
      contact: `dq.ops@${seed.id.toLowerCase()}.co.in`,
      named: seed.named,
    };
  };

  for (const n of NAMED) {
    pushMember(makeRow({ id: n.id, name: n.name, dqi: n.dqi, delta: n.delta, named: true, extra: n }));
  }

  const gradeTargets: Record<DqGrade, number> = { A: 421, B: 498, C: 201, D: 68, F: 26 };
  const used: Record<DqGrade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const m of members) used[m.grade] += 1;

  const dqiForGrade = (g: DqGrade) => {
    const [lo, hi] = gradeBand(g);
    return round1(lo + rng() * (hi - lo));
  };

  let seq = 1;
  while (members.length < DQ_MEMBER_COUNT) {
    let grade: DqGrade = "B";
    for (const g of ["A", "B", "C", "D", "F"] as DqGrade[]) {
      if (used[g] < gradeTargets[g]) {
        grade = g;
        break;
      }
    }
    const id = `M${String(seq).padStart(4, "0")}`;
    seq += 1;
    if (usedIds.has(id)) continue;
    const prefix = pick(rng, NAME_PREFIX);
    const kind = pick(rng, NAME_KIND);
    const dqi = dqiForGrade(grade);
    const delta = round1((rng() - 0.48) * 4.2);
    const row = makeRow({ id, name: `${prefix} ${kind}`, dqi, delta, named: false });
    row.grade = grade;
    used[grade] += 1;
    pushMember(row);
  }

  const myIdx = members
    .map((m, i) => i)
    .sort((a, b) => members[b].attention - members[a].attention)
    .slice(0, 86);
  for (const i of myIdx) members[i].isMyMember = true;

  return members;
}

export const dqMembers: DqMemberRow[] = buildMembers();
const memberById = new Map(dqMembers.map((m) => [m.id, m]));

export const DEFAULT_WATCHLIST = ["APX", "KUB", "PKL", "ORC", "NLN", "NXD", "SPA", "SGL", "GND", "CUF", "PNN", "FNB"];

function spark(rng: () => number, end: number, n = 8): number[] {
  const out: number[] = [];
  let v = Math.max(4, end * (0.55 + rng() * 0.25));
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    v = v * 0.7 + end * t * 0.3 + (rng() - 0.5) * end * 0.08;
    out.push(Math.max(1, Math.round(v)));
  }
  out[n - 1] = end;
  return out;
}

const ISSUE_SPECS: Array<{
  code: string;
  ruleType: string;
  field: string;
  severity: DqSeverity;
  records: number;
  membersAffected: number;
  firstSeen: string;
  lastSeen?: string;
  rejectSharePct: number;
  deltaPct: number;
}> = [
  { code: "ERR_FIELD_MANDATORY", ruleType: "Validation", field: "nationalId", severity: "REJECT", records: 612_340, membersAffected: 388, firstSeen: "2026-06-02", rejectSharePct: 23.1, deltaPct: 1.4 },
  { code: "VAL-PAN-FORMAT", ruleType: "Validation", field: "pan", severity: "REJECT", records: 418_902, membersAffected: 341, firstSeen: "2026-05-18", rejectSharePct: 15.8, deltaPct: 4.6 },
  { code: "MAP-MANDATORY-MISSING", ruleType: "Transformation", field: "customerId", severity: "REJECT", records: 96_120, membersAffected: 41, firstSeen: "2026-08-12", rejectSharePct: 3.6, deltaPct: 3.6 },
  { code: "VAL-DOB-RANGE", ruleType: "Validation", field: "dateOfBirth", severity: "REJECT", records: 201_455, membersAffected: 297, firstSeen: "2026-04-09", rejectSharePct: 7.6, deltaPct: -0.4 },
  { code: "ERR_FIELD_ENUM", ruleType: "Validation", field: "facilityType", severity: "REJECT", records: 188_010, membersAffected: 262, firstSeen: "2026-07-01", rejectSharePct: 7.1, deltaPct: 0.9 },
  { code: "ERR_FIELD_CROSS", ruleType: "Business logic", field: "dpdDays / facilityStatus", severity: "REJECT", records: 143_880, membersAffected: 219, firstSeen: "2026-06-21", rejectSharePct: 5.4, deltaPct: -0.2 },
  { code: "VAL-PHONE-FORMAT", ruleType: "Validation", field: "mobile", severity: "WARNING", records: 704_220, membersAffected: 455, firstSeen: "2026-03-14", rejectSharePct: 0, deltaPct: 2.1 },
  { code: "VAL-REF-INTEGRITY", ruleType: "Validation", field: "guarantorId", severity: "REJECT", records: 87_660, membersAffected: 74, firstSeen: "2026-07-22", rejectSharePct: 3.3, deltaPct: 1.8 },
  { code: "DEDUP-KEY-MATCH", ruleType: "Others", field: "dedup key", severity: "INFO", records: 412_000, membersAffected: 503, firstSeen: "2026-02-11", rejectSharePct: 0, deltaPct: 0.3 },
  { code: "VAL-GSTIN-CHECKDIGIT", ruleType: "Validation", field: "gstin", severity: "WARNING", records: 52_310, membersAffected: 88, firstSeen: "2026-08-01", rejectSharePct: 0, deltaPct: 0.6 },
];

function buildIssues(): DqIssue[] {
  const rng = mulberry32(77);
  const ranked = [...dqMembers].sort((a, b) => a.dqi - b.dqi);
  return ISSUE_SPECS.map((spec, idx) => {
    const top = ranked.slice(idx * 2, idx * 2 + 10).map((m, i) => ({
      id: m.id,
      name: m.name,
      records: Math.round(spec.records * (0.12 - i * 0.008) * (0.7 + rng())),
    }));
    const samples = Array.from({ length: 3 }, (_, i) => `400${(idx % 9) + 1}-R${String(15 + i + idx * 3).padStart(7, "0")}`);
    return {
      ...spec,
      lastSeen: spec.lastSeen ?? DQ_AS_OF,
      systemic: spec.membersAffected >= 25,
      sparkline: spark(rng, spec.membersAffected),
      topMembers: top,
      sampleRecordIds: samples,
    };
  });
}

export const dqIssues: DqIssue[] = buildIssues();

export const dqMoversDrops: DqMover[] = [
  { memberId: "APX", memberName: "Apex Finance", dqi: 71.2, delta: -9.4, records: memberById.get("APX")?.recordsEvaluated ?? 142_000, causeCode: "VAL-PAN-FORMAT" },
  { memberId: "KUB", memberName: "Konkan Urban Bank", dqi: 78.0, delta: -6.1, records: memberById.get("KUB")?.recordsEvaluated ?? 98_000, causeCode: "MAP-MANDATORY-MISSING" },
  { memberId: "ORC", memberName: "Orion Credit", dqi: 82.5, delta: -5.3, records: memberById.get("ORC")?.recordsEvaluated ?? 76_000, causeCode: "ERR_FIELD_MANDATORY" },
  { memberId: "PKL", memberName: "Prakash Leasing", dqi: 66.8, delta: -4.9, records: memberById.get("PKL")?.recordsEvaluated ?? 54_000, causeCode: "VAL-REF-INTEGRITY" },
  { memberId: "NXD", memberName: "Nexa Digital Lending", dqi: 84.1, delta: -3.7, records: memberById.get("NXD")?.recordsEvaluated ?? 121_000, causeCode: "ERR_FIELD_ENUM" },
];

export const dqMoversRises: DqMover[] = [
  { memberId: "MMF", memberName: "Metro Microfinance", dqi: 81.6, delta: 5.2, records: memberById.get("MMF")?.recordsEvaluated ?? 88_000, causeCode: "VAL-PHONE-FORMAT" },
  { memberId: "SWM", memberName: "Shakti Women's MFI", dqi: 88.9, delta: 4.1, records: memberById.get("SWM")?.recordsEvaluated ?? 63_000, causeCode: "ERR_FIELD_MANDATORY" },
  { memberId: "DGB", memberName: "Deccan Gramin Bank", dqi: 90.3, delta: 3.8, records: memberById.get("DGB")?.recordsEvaluated ?? 110_000, causeCode: "VAL-DOB-RANGE" },
  { memberId: "TCF", memberName: "Trident Consumer Finance", dqi: 86.0, delta: 2.9, records: memberById.get("TCF")?.recordsEvaluated ?? 71_000, causeCode: "ERR_FIELD_ENUM" },
  { memberId: "GRB", memberName: "Godavari Rural Bank", dqi: 92.7, delta: 2.2, records: memberById.get("GRB")?.recordsEvaluated ?? 95_000, causeCode: "VAL-PAN-FORMAT" },
];

export const dqGradeDistribution: DqGradeBucket[] = [
  { grade: "A", members: 421, membersPrev: 398, recordsPct: 61, recordsPctPrev: 58 },
  { grade: "B", members: 498, membersPrev: 512, recordsPct: 27, recordsPctPrev: 29 },
  { grade: "C", members: 201, membersPrev: 215, recordsPct: 8, recordsPctPrev: 9 },
  { grade: "D", members: 68, membersPrev: 64, recordsPct: 3, recordsPctPrev: 3 },
  { grade: "F", members: 26, membersPrev: 25, recordsPct: 1, recordsPctPrev: 1 },
];

export const dqHeadline: DqHeadlineKpis = {
  dqi: 87.4,
  grade: "B",
  dqiDelta: 0.6,
  recordsEvaluated: 54_200_000,
  acceptedPct: 95.1,
  rejected: 2_660_000,
  warned: 2_100_000,
  info: 412_000,
  totalRules: dqIssues.length,
  duplicatesCollapsed: 412_000,
  eventsOpen: 17,
  eventsTotal: 63,
  systemicIssues: 3,
};

function buildTrend(): DqTrendPoint[] {
  const from = isoDaysBack(DQ_AS_OF, 30);
  const dates = eachDate(from, DQ_AS_OF);
  return dates.map((date) => {
    const dip = date >= "2026-08-12" && date <= "2026-08-14";
    const recovery = date >= "2026-08-15";
    const median = dip ? 82.4 + (date === "2026-08-13" ? -1.6 : 0) : recovery ? 86.2 + (date > "2026-08-17" ? 1.2 : 0.4) : 87.1;
    const p10 = dip ? (date === "2026-08-13" ? 74.0 : 76.2) : recovery ? 81.5 : 82.8;
    const p90 = dip ? 93.8 : 95.1;
    return {
      date,
      label: formatYmdLabel(date),
      p90: round1(p90),
      median: round1(median),
      p10: round1(p10),
      batchMedian: round1(median - 0.4),
      apiMedian: round1(median + 0.6),
    };
  });
}

export const dqTrend: DqTrendPoint[] = buildTrend();

function buildEvents(): DqThresholdEvent[] {
  const rng = mulberry32(63);
  const samples: DqThresholdEvent[] = [
    { id: "evt-1", batchId: "BATCH-APX-20260819-0001", memberId: "APX", memberName: "Apex Finance", stageId: "S33", stageLabel: STAGE_BY_ID.S33, observedPct: 54.2, configuredPct: 50, pauseType: "AUTO_VALIDATION", reasonCode: "PAUSE-VAL-THRESHOLD", status: "New", age: "2h" },
    { id: "evt-2", batchId: "BATCH-KUB-20260818-0001", memberId: "KUB", memberName: "Konkan Urban Bank", stageId: "S31", stageLabel: STAGE_BY_ID.S31, observedPct: 63.0, configuredPct: 50, pauseType: "AUTO_VALIDATION", reasonCode: "PAUSE-VAL-THRESHOLD", status: "Acknowledged", age: "1d" },
    { id: "evt-3", batchId: "BATCH-PKL-20260818-0003", memberId: "PKL", memberName: "Prakash Leasing", stageId: "S35", stageLabel: STAGE_BY_ID.S35, observedPct: 24.1, configuredPct: 20, pauseType: "AUTO_VALIDATION", reasonCode: "PAUSE-VAL-THRESHOLD", status: "Linked to RCA", age: "1d", note: "volume guard" },
    { id: "evt-4", batchId: "BATCH-NLN-20260817-0001", memberId: "NLN", memberName: "Northline NBFC", stageId: "S33", stageLabel: STAGE_BY_ID.S33, observedPct: 51.8, configuredPct: 50, pauseType: "AUTO_VALIDATION", reasonCode: "PAUSE-VAL-THRESHOLD", status: "Acknowledged", age: "2d" },
    { id: "evt-5", batchId: "BATCH-ORC-20260816-0002", memberId: "ORC", memberName: "Orion Credit", stageId: "S33", stageLabel: STAGE_BY_ID.S33, observedPct: null, configuredPct: null, pauseType: "MANUAL", reasonCode: "SUS-DATA-QUALITY", status: "Closed", age: "3d", note: "Suspended" },
  ];
  const pool = dqMembers.filter((m) => m.dqi < 86).slice(0, 80);
  const ages = ["4h", "6h", "12h", "1d", "2d", "3d", "4d", "5d", "6d"];
  const rest: DqThresholdEvent[] = [];
  for (let i = 0; i < 58; i++) {
    const m = pool[i % pool.length];
    const openSlots = 13;
    const status: DqThresholdEvent["status"] = i < openSlots ? (i % 3 === 0 ? "New" : i % 3 === 1 ? "Acknowledged" : "Linked to RCA") : "Closed";
    const stage = pick(rng, ["S33", "S31", "S35", "S34"] as const);
    const ymd = isoDaysBack(DQ_AS_OF, 1 + (i % 12)).replace(/-/g, "");
    rest.push({
      id: `evt-${i + 6}`,
      batchId: `BATCH-${m.id}-${ymd}-${String((i % 9) + 1).padStart(4, "0")}`,
      memberId: m.id,
      memberName: m.name,
      stageId: stage,
      stageLabel: STAGE_BY_ID[stage],
      observedPct: round1(50 + rng() * 18),
      configuredPct: 50,
      pauseType: i % 11 === 0 ? "AUTO_SLA" : "AUTO_VALIDATION",
      reasonCode: i % 11 === 0 ? "PAUSE-TIME-THRESHOLD" : "PAUSE-VAL-THRESHOLD",
      status,
      age: pick(rng, ages),
    });
  }
  return [...samples, ...rest];
}

export const dqEvents: DqThresholdEvent[] = buildEvents();

function buildBatches(): DqBatchRow[] {
  const rng = mulberry32(4001);
  const rows: DqBatchRow[] = [];
  const named = dqMembers.filter((m) => m.named);
  const fnb: DqBatchRow = {
    batchId: "BATCH-FNB-20260819-0001",
    memberId: "FNB",
    memberName: "First National Bank",
    sourceType: "LOANS",
    profile: "Loans master v3.2",
    evaluated: 18420,
    accepted: 17490,
    rejected: 930,
    warned: 210,
    info: 48,
    dqi: 95.8,
    grade: "A",
    firstBreachStage: "—",
    completedAt: "2026-08-19 08:14 IST",
  };
  rows.push(fnb);

  const dates = eachDate(isoDaysBack(DQ_AS_OF, 6), DQ_AS_OF);
  let n = 0;
  for (const date of dates) {
    const perDay = date.endsWith("31") || date.endsWith("30") ? 90 : 52;
    for (let i = 0; i < perDay && rows.length < 420; i++) {
      const m = named[n % named.length] ?? pick(rng, dqMembers);
      n += 1;
      if (date === DQ_AS_OF && m.id === "FNB" && i === 0) continue;
      const ymd = date.replace(/-/g, "");
      const evaluated = Math.round(4_000 + rng() * 28_000);
      const rejectedPct = clamp((100 - m.dqi) * 0.2 + rng() * 2, 0.4, 35);
      const rejected = Math.round(evaluated * (rejectedPct / 100));
      const warned = Math.round(evaluated * (0.01 + rng() * 0.04));
      const info = Math.round(evaluated * (0.002 + rng() * 0.008));
      const accepted = Math.max(0, evaluated - rejected);
      const dqi = round1(clamp(m.dqi + (rng() - 0.5) * 2.4, 52, 99));
      rows.push({
        batchId: `BATCH-${m.id}-${ymd}-${String((i % 9) + 1).padStart(4, "0")}`,
        memberId: m.id,
        memberName: m.name,
        sourceType: pick(rng, m.sourceTypes.length ? m.sourceTypes : DQ_SOURCE_TYPES),
        profile: pick(rng, m.profiles.length ? m.profiles : DQ_PROFILES),
        evaluated,
        accepted,
        rejected,
        warned,
        info,
        dqi,
        grade: gradeFromDqi(dqi),
        firstBreachStage: dqi < 85 ? pick(rng, ["S33 Validation (DQI)", "S31 Data Model Mapping", "S35 De-duplication"]) : "—",
        completedAt: `${date} ${String(6 + Math.floor(rng() * 12)).padStart(2, "0")}:${String(Math.floor(rng() * 60)).padStart(2, "0")} IST`,
      });
    }
  }
  return rows;
}

export const dqBatches: DqBatchRow[] = buildBatches();

function buildApiAssessments(): DqApiAssessmentRow[] {
  const rng = mulberry32(700);
  const dates = eachDate(isoDaysBack(DQ_AS_OF, 6), DQ_AS_OF);
  const apiMembers = dqMembers.filter((m) => m.batchSharePct < 70).slice(0, 28);
  const rows: DqApiAssessmentRow[] = [];
  for (const date of dates) {
    for (const m of apiMembers) {
      if (rng() > 0.72) continue;
      const st = m.sourceTypes[0] ?? "LOANS";
      const records = Math.round(2_400 + rng() * 18_000);
      const rejectedPct = clamp((100 - m.dqi) * 0.18, 0.5, 20);
      const rejected = Math.round(records * (rejectedPct / 100));
      const accepted = Math.max(0, records - rejected);
      const dqi = round1(clamp(m.dqi + (rng() - 0.5) * 2.4, 52, 99));
      rows.push({
        id: `SUB-${m.id}-${date.replace(/-/g, "")}-${String(rows.length + 1).padStart(6, "0")}`,
        memberId: m.id,
        memberName: m.name,
        sourceType: st,
        profile: m.profiles[0] ?? pick(rng, DQ_PROFILES),
        date,
        records,
        accepted,
        acceptedPct: round1(100 - rejectedPct),
        rejected,
        dqi,
        grade: gradeFromDqi(dqi),
        topCode: pick(rng, ISSUE_SPECS).code,
        sparkline: Array.from({ length: 8 }, () => round1(m.dqi + (rng() - 0.5) * 3)),
      });
      if (rows.length >= 200) return rows;
    }
  }
  return rows;
}

export const dqApiAssessments: DqApiAssessmentRow[] = buildApiAssessments();

function fnbTrend(): DqMemberDetail["trend"] {
  const dates = eachDate(isoDaysBack(DQ_AS_OF, 30), DQ_AS_OF);
  return dates.map((date, i) => {
    const t = i / (dates.length - 1);
    const dqi = round1(90.5 + t * 5.3 + Math.sin(i / 2.2) * 0.6);
    return {
      date,
      label: formatYmdLabel(date),
      dqi: clamp(dqi, 90.5, 95.8),
      acceptedPct: round1(94.2 + t * 1.6),
    };
  });
}

export function getMemberDetail(memberId: string): DqMemberDetail | undefined {
  const member = memberById.get(memberId);
  if (!member) return undefined;
  const isFnb = memberId === "FNB";
  const batches = dqBatches.filter((b) => b.memberId === memberId);
  const apiDays = dqApiAssessments.filter((a) => a.memberId === memberId);
  const events = dqEvents.filter((e) => e.memberId === memberId);
  const rng = mulberry32(memberId.split("").reduce((s, c) => s + c.charCodeAt(0), 0));
  const issues = isFnb
    ? [
        { ...dqIssues.find((i) => i.code === "VAL-PAN-FORMAT")!, records: 312, membersAffected: 1, systemic: false, field: "pan" },
        { ...dqIssues.find((i) => i.code === "ERR_FIELD_MANDATORY")!, records: 140, membersAffected: 1, systemic: false, field: "customerId" },
        { ...dqIssues.find((i) => i.code === "VAL-DOB-RANGE")!, records: 118, membersAffected: 1, systemic: false },
      ]
    : dqIssues.slice(0, 4).map((i) => ({ ...i, records: Math.round(40 + rng() * 400), membersAffected: 1, systemic: false }));

  const trend = isFnb
    ? fnbTrend()
    : eachDate(isoDaysBack(DQ_AS_OF, 30), DQ_AS_OF).map((date, i) => {
        const noise = (rng() - 0.5) * 1.4;
        const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
        const weekendGap = member.batchSharePct > 80 && (dow === 0 || dow === 6);
        return {
          date,
          label: formatYmdLabel(date),
          dqi: weekendGap ? member.dqi : round1(clamp(member.dqi + noise, 52, 99)),
          acceptedPct: round1(clamp(100 - member.rejectedPct + noise, 70, 99.5)),
        };
      });

  return {
    member: isFnb
      ? { ...member, dqi: 95.8, grade: "A", validity: 95, completeness: 96, dupIntegrity: 97, dqiPrev: 95.0 }
      : member,
    trend,
    issues,
    batches: isFnb && batches.length < 26
      ? [
          ...batches,
          ...Array.from({ length: 26 - batches.length }, (_, i) => ({
            ...batches[0] ?? {
              batchId: `BATCH-FNB-202608${String(18 - (i % 10)).padStart(2, "0")}-0001`,
              memberId: "FNB",
              memberName: "First National Bank",
              sourceType: "LOANS",
              profile: "Loans master v3.2",
              evaluated: 16000 + i * 80,
              accepted: 15200 + i * 70,
              rejected: 800 - i * 4,
              warned: 180,
              info: 40,
              dqi: round1(94 + (i % 5) * 0.3),
              grade: "A" as DqGrade,
              firstBreachStage: "—",
              completedAt: `${isoDaysBack(DQ_AS_OF, i + 1)} 09:10 IST`,
            },
            batchId: `BATCH-FNB-${isoDaysBack(DQ_AS_OF, i + 1).replace(/-/g, "")}-${String((i % 3) + 1).padStart(4, "0")}`,
          })),
        ]
      : batches,
    apiDays,
    events: isFnb ? [] : events,
    batchCount: isFnb ? 26 : batches.length,
    apiSourceTypeCount: isFnb ? 2 : new Set(apiDays.map((a) => a.sourceType)).size,
  };
}

export function defaultDqFilters(): DqFilters {
  return {
    period: "30d",
    from: isoDaysBack(DQ_AS_OF, 30),
    to: DQ_AS_OF,
    compare: true,
    channel: "all",
    memberIds: [],
    sourceType: "all",
    profile: "all",
    severity: "all",
    grade: "all",
  };
}

export function periodRange(period: DqFilters["period"], from?: string, to?: string): { from: string; to: string } {
  if (period === "custom") return { from: from ?? isoDaysBack(DQ_AS_OF, 30), to: to ?? DQ_AS_OF };
  const days = period === "24h" ? 0 : period === "7d" ? 7 : period === "90d" ? 90 : 30;
  return { from: isoDaysBack(DQ_AS_OF, days), to: DQ_AS_OF };
}

export function isDefaultDqFilters(f: DqFilters): boolean {
  return (
    f.period === "30d" &&
    f.channel === "all" &&
    f.memberIds.length === 0 &&
    f.sourceType === "all" &&
    f.profile === "all" &&
    f.severity === "all" &&
    f.grade === "all"
  );
}

export function filterMembers(members: DqMemberRow[], f: DqFilters, watchlist: Set<string>, view: "all" | "mine" | "watchlist" = "all"): DqMemberRow[] {
  return members.filter((m) => {
    if (f.memberIds.length && !f.memberIds.includes(m.id)) return false;
    if (f.grade !== "all" && m.grade !== f.grade) return false;
    if (f.sourceType !== "all" && !m.sourceTypes.includes(f.sourceType)) return false;
    if (f.profile !== "all" && !m.profiles.includes(f.profile)) return false;
    if (view === "mine" && !m.isMyMember) return false;
    if (view === "watchlist" && !watchlist.has(m.id)) return false;
    if (f.channel === "batch" && m.batchSharePct < 20) return false;
    if (f.channel === "api" && m.batchSharePct > 85) return false;
    return true;
  });
}

export function headlineForFilters(f: DqFilters): DqHeadlineKpis {
  if (isDefaultDqFilters(f)) return dqHeadline;
  const subset = filterMembers(dqMembers, f, new Set());
  if (!subset.length) {
    return { ...dqHeadline, dqi: 0, recordsEvaluated: 0, acceptedPct: 0, rejected: 0, warned: 0, info: 0, totalRules: 0, duplicatesCollapsed: 0, eventsOpen: 0, eventsTotal: 0, systemicIssues: 0, grade: "F" };
  }
  const records = subset.reduce((s, m) => s + m.recordsEvaluated, 0);
  const dqi = round1(subset.reduce((s, m) => s + m.dqi * m.recordsEvaluated, 0) / records);
  const rejectedShare = records ? subset.reduce((s, m) => s + m.recordsEvaluated * (m.rejectedPct / 100), 0) / records : 0;
  const channelScale = f.channel === "batch" ? 0.62 : f.channel === "api" ? 0.38 : 1;
  const periodScale = f.period === "7d" ? 0.25 : f.period === "24h" ? 0.035 : f.period === "90d" ? 2.8 : 1;
  const volumeScale = channelScale * periodScale;
  const recordsEvaluated = Math.round(records * volumeScale);
  const rejected = Math.min(recordsEvaluated, Math.round(recordsEvaluated * rejectedShare));
  const acceptedPct = round1(recordsEvaluated ? (1 - rejected / recordsEvaluated) * 100 : 0);
  const memberShare = subset.length / DQ_MEMBER_COUNT;
  const events = dqEvents.filter((e) => subset.some((m) => m.id === e.memberId));
  return {
    dqi,
    grade: gradeFromDqi(dqi),
    dqiDelta: round1(dqi - round1(subset.reduce((s, m) => s + m.dqiPrev * m.recordsEvaluated, 0) / records)),
    recordsEvaluated,
    acceptedPct,
    rejected,
    warned: Math.round(rejected * 0.79),
    info: Math.round(412_000 * volumeScale * memberShare),
    totalRules: filterIssues(f).length,
    duplicatesCollapsed: Math.min(recordsEvaluated, Math.round(412_000 * volumeScale * memberShare)),
    eventsOpen: events.filter((e) => e.status !== "Closed").length,
    eventsTotal: events.length,
    systemicIssues: dqIssues.filter((i) => i.systemic && (f.severity === "all" || i.severity === f.severity)).length > 3 ? 3 : dqIssues.filter((i) => i.systemic).length,
  };
}

export function filterIssues(f: DqFilters, systemicOnly = false): DqIssue[] {
  return dqIssues.filter((i) => {
    if (systemicOnly && !i.systemic) return false;
    if (f.severity !== "all" && i.severity !== f.severity) return false;
    return true;
  });
}

export function filterEvents(f: DqFilters): DqThresholdEvent[] {
  return dqEvents.filter((e) => {
    if (f.memberIds.length && !f.memberIds.includes(e.memberId)) return false;
    return true;
  });
}

export function filterBatches(f: DqFilters): DqBatchRow[] {
  return dqBatches.filter((b) => {
    if (f.memberIds.length && !f.memberIds.includes(b.memberId)) return false;
    if (f.sourceType !== "all" && b.sourceType !== f.sourceType) return false;
    if (f.profile !== "all" && b.profile !== f.profile) return false;
    if (f.grade !== "all" && b.grade !== f.grade) return false;
    if (b.completedAt.slice(0, 10) < f.from || b.completedAt.slice(0, 10) > f.to) return false;
    return true;
  });
}

export function filterApiAssessments(f: DqFilters): DqApiAssessmentRow[] {
  return dqApiAssessments.filter((a) => {
    if (f.memberIds.length && !f.memberIds.includes(a.memberId)) return false;
    if (f.sourceType !== "all" && a.sourceType !== f.sourceType) return false;
    if (f.profile !== "all" && a.profile !== f.profile) return false;
    if (a.date < f.from || a.date > f.to) return false;
    return true;
  });
}

export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 10_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${Math.round(n / 1000)}k`;
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

export function formatInt(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

export function formatSigned(n: number, digits = 1): string {
  const v = n.toFixed(digits);
  if (n > 0) return `▲${v}`;
  if (n < 0) return `▼${Math.abs(n).toFixed(digits)}`;
  return `0.${ "0".repeat(digits) }`;
}

export const DQ_REPORT_TYPES: { value: DqReportType; label: string }[] = [
  { value: "member_scorecard", label: "Member scorecard" },
  { value: "portfolio_summary", label: "Portfolio summary" },
  { value: "issue_extract", label: "Issue extract" },
  { value: "submission_extract", label: "Submission extract" },
  { value: "movers_report", label: "Movers report" },
];
