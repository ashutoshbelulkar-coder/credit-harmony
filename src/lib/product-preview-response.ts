import type { EnquiryConfig, EnquiryDataScope } from "@/data/data-products-mock";
import { footprintCreatedForType } from "@/data/data-products-mock";
import {
  CROSS_ASSET_PACKET_ID,
  SUBJECT_PACKET_ID,
  getDictionaryAttribute,
  getDictionaryPacket,
  toCamelResponseKey,
} from "@/data/attribute-dictionary";
import {
  includedAttributeIds,
  type ContractSelection,
} from "@/lib/product-contract";

type PreviewScope = EnquiryDataScope;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function generatePeriods(window: number, referenceMonth = "2026-08"): string[] {
  const [refYear, refMonth] = referenceMonth.split("-").map(Number);
  const periods: string[] = [];
  for (let i = window - 1; i >= 0; i--) {
    const d = new Date(refYear, refMonth - 1 - i, 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return periods;
}

function retrievalAnchorFor(scope: PreviewScope, enquiryDate: string): string {
  if (scope === "RETRO") return `AS_OF ${enquiryDate}`;
  if (scope === "TRENDED") return "CURRENT";
  return "CURRENT";
}

function tokenise(qualifier: string): string {
  const seeds: Record<string, string> = {
    pan: "tok_9a1c7f…",
    national_id: "tok_4e07…",
    passport_no: "tok_8c21…",
    account_number: "tok_2b8e…",
    ifsc: "tok_c93b…",
    document_number: "tok_d11a…",
    gstin: "tok_g7e2…",
    photo_ref: "tok_ph0t…",
  };
  return seeds[qualifier] ?? `tok_${qualifier.slice(0, 4)}…`;
}

const SUBJECT_ROWS = [
  {
    providerId: "HDFC Bank",
    sourceId: "CRIF Connect",
    reportedAt: "2026-08-31",
    fullName: "Rohan S Mehta",
    dateOfBirth: "1988-03-14",
    mobile: "+91 98XXX XX210",
    addressLine: "14 Kalyani Nagar Rd",
    city: "Pune",
    postalCode: "411006",
    country: "IN",
    pan: "tok_9a1c7f…",
    firstName: "Rohan",
    lastName: "Mehta",
    gender: "Male",
    email: "rohan.mehta@example.com",
  },
  {
    providerId: "ZestMoney",
    sourceId: "CSDF",
    reportedAt: "2026-08-15",
    fullName: "Rohan Mehta",
    dateOfBirth: "1988-03-14",
    mobile: "+91 98XXX XX210",
    addressLine: "Flat 302 Trinity Towers",
    city: "Pune",
    postalCode: "411006",
    country: "IN",
    pan: "tok_9a1c7f…",
    nationalId: "tok_4e07…",
    firstName: "Rohan",
    lastName: "Mehta",
    gender: "Male",
    email: "rohan@example.com",
  },
  {
    providerId: "Airtel",
    sourceId: "CSDF",
    reportedAt: "2026-07-30",
    fullName: "ROHAN SURESH MEHTA",
    dateOfBirth: null as string | null,
    mobile: "+91 98XXX XX210",
    addressLine: "14 Kalyani Nagar Road",
    city: "Pune",
    postalCode: "411006",
    country: "IN",
    firstName: "ROHAN",
    lastName: "MEHTA",
  },
];

const CREDIT_FACILITIES = [
  {
    providerId: "ZestMoney",
    sourceId: "CSDF",
    accountNumber: "tok_2b8e…",
    contractType: "BNPL",
    contractStatus: "ACTIVE",
    contractRole: "BORROWER",
    financedAmount: 60000.0,
    outstandingBalance: 18450.0,
    overduePaymentsAmount: 0.0,
    monthlyPaymentAmount: 5000.0,
    overdueDays: 0,
    installmentsNumber: 12,
    contractStartDate: "2025-11-05",
    lastPaymentDate: "2026-08-05",
    dpdMax: 0,
    repaymentHistory: [
      { period: "2026-08", amountPaid: 5000.0, dpd: 0, paymentStatus: "PAID" },
      { period: "2026-07", amountPaid: 5000.0, dpd: 0, paymentStatus: "PAID" },
      { period: "2026-06", amountPaid: 5000.0, dpd: 4, paymentStatus: "PAID_LATE" },
    ],
  },
  {
    providerId: "Bajaj Finance",
    sourceId: "CSDF",
    accountNumber: "tok_77c1…",
    contractType: "PERSONAL_LOAN",
    contractStatus: "ACTIVE",
    contractRole: "BORROWER",
    financedAmount: 250000.0,
    outstandingBalance: 142300.0,
    overduePaymentsAmount: 8900.0,
    monthlyPaymentAmount: 8900.0,
    overdueDays: 31,
    installmentsNumber: 36,
    contractStartDate: "2024-09-20",
    lastPaymentDate: "2026-07-20",
    dpdMax: 31,
    repaymentHistory: [
      { period: "2026-08", amountPaid: 0.0, dpd: 31, paymentStatus: "OVERDUE" },
      { period: "2026-07", amountPaid: 8900.0, dpd: 0, paymentStatus: "PAID" },
    ],
  },
];

const BANK_ACCOUNTS = [
  {
    providerId: "HDFC Bank",
    sourceId: "CRIF Connect",
    accountNumber: "tok_5d2a…",
    ifsc: "tok_c93b…",
    accountType: "SAVINGS",
    accountSubtype: "REGULAR",
    currency: "INR",
    currentBalance: 46210.55,
    drawingLimit: 0.0,
    balanceDatetime: "2026-08-31T23:59:00+05:30",
    transactions: [
      {
        txnDate: "2026-08-28",
        amount: 85000.0,
        type: "CREDIT",
        narration: "SALARY AUG26 ACME TECH",
        balanceAfter: 51210.55,
      },
      {
        txnDate: "2026-08-05",
        amount: -5000.0,
        type: "DEBIT",
        narration: "UPI ZESTMONEY EMI",
        balanceAfter: 12340.0,
      },
      {
        txnDate: "2026-08-03",
        amount: -18500.0,
        type: "DEBIT",
        narration: "NEFT RENT KALYANI",
        balanceAfter: 17340.0,
      },
    ],
  },
];

const TELCO_PROFILES = [
  {
    providerId: "Airtel",
    sourceId: "CSDF",
    connectionType: "POSTPAID",
    planType: "UNLIMITED",
    tenureMonths: 41,
    billAmount: 799.0,
    paymentStatus: "PAID",
    daysPastDue: 0,
    identityTrust: 0.82,
    score: 71,
  },
];

const IDENTITY_DOCUMENTS = [
  {
    providerId: "HDFC Bank",
    sourceId: "CSDF",
    documentType: "PAN_CARD",
    issueDate: "2012-04-11",
    expiryDate: null,
    issuingAuthority: "Income Tax Department",
    documentNumber: "tok_d11a…",
  },
];

const GST_REGISTRATIONS = [
  {
    providerId: "GSTN",
    sourceId: "CSDF",
    gstin: "tok_g7e2…",
    legalName: "Mehta Trading Pvt Ltd",
    tradeName: "Mehta Trade",
    registrationStatus: "ACTIVE",
    turnoverBand: "1-5CR",
    filingRegularity: 0.92,
    filings: [
      { period: "2026-07", returnType: "GSTR1", filingDate: "2026-08-11", delayDays: 0 },
      { period: "2026-06", returnType: "GSTR1", filingDate: "2026-07-14", delayDays: 3 },
    ],
  },
];

const STREAM_NEST_KEY: Record<string, string> = {
  repayment_history: "repaymentHistory",
  transactions: "transactions",
  filings: "filings",
};

function pickKeys(
  sample: Record<string, unknown>,
  attrIds: string[],
  tokeniseSensitive: boolean
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const id of attrIds) {
    const a = getDictionaryAttribute(id);
    if (!a) continue;
    const key = toCamelResponseKey(a.qualifier);
    let value = sample[key] ?? sample[a.qualifier];
    if (value === undefined) {
      if (a.dataType === "decimal" || a.dataType === "long") value = 0;
      else if (a.dataType === "boolean") value = false;
      else value = `[${a.qualifier}]`;
    }
    if (tokeniseSensitive && (a.sensitivity === "Sensitive-PII" || a.specialCategory)) {
      value = tokenise(a.qualifier);
    }
    out[key] = value;
  }
  return out;
}

function trendify(
  entry: Record<string, unknown>,
  attrIds: string[],
  periods: string[]
): Record<string, unknown> {
  const next = { ...entry };
  for (const id of attrIds) {
    const a = getDictionaryAttribute(id);
    if (!a || a.mode !== "TRENDED" || a.eventStreamId) continue;
    const key = toCamelResponseKey(a.qualifier);
    const latest = next[key];
    if (typeof latest !== "number") continue;
    next[key] = {
      latest,
      series: periods.map((period, i) => {
        const drift = 1 + (i - (periods.length - 1) / 2) * 0.03;
        return { period, value: Math.round(latest * drift * 100) / 100 };
      }),
    };
  }
  return next;
}

function samplesForPacket(packetId: string): Record<string, unknown>[] {
  switch (packetId) {
    case "credit_facility":
      return CREDIT_FACILITIES as unknown as Record<string, unknown>[];
    case "bank_account":
      return BANK_ACCOUNTS as unknown as Record<string, unknown>[];
    case "telco_profile":
      return TELCO_PROFILES as unknown as Record<string, unknown>[];
    case "identity_document":
      return IDENTITY_DOCUMENTS as unknown as Record<string, unknown>[];
    case "gst_registration":
      return GST_REGISTRATIONS as unknown as Record<string, unknown>[];
    default:
      return [];
  }
}

export function buildContractResponsePreview(params: {
  productId: string;
  productVersion: number;
  productName: string;
  selection: ContractSelection;
  enquiryConfig: EnquiryConfig;
  enquiryType: "SOFT" | "HARD";
  trendedEnabled: boolean;
  retroEnabled: boolean;
  previewScope: PreviewScope;
  previewWindow: number;
  maxTrendedMonths: number;
  enquiryDate: string;
}): object {
  const effectiveScope: PreviewScope =
    params.previewScope === "TRENDED" && !params.trendedEnabled
      ? "LATEST"
      : params.previewScope === "RETRO" && !params.retroEnabled
        ? "LATEST"
        : params.previewScope;

  const window = clamp(params.previewWindow, 1, Math.max(params.maxTrendedMonths, 1));
  const periods = effectiveScope === "TRENDED" ? generatePeriods(window) : [];
  const footprintCreated = footprintCreatedForType(params.enquiryConfig, params.enquiryType);
  const included = includedAttributeIds(params.selection);
  const byPacket = new Map<string, string[]>();
  for (const id of included) {
    const a = getDictionaryAttribute(id);
    if (!a) continue;
    const list = byPacket.get(a.packetId) ?? [];
    list.push(id);
    byPacket.set(a.packetId, list);
  }

  const productPayload: Record<string, unknown> = {
    enquiryItemId: "ENQ-2026-251-0007-006",
    productId: params.productId,
    productName: params.productName || "Untitled product",
    productVersionServed: params.productVersion,
    outcome: "SERVED",
    dataScope: effectiveScope,
    retrievalAnchor: retrievalAnchorFor(effectiveScope, params.enquiryDate),
  };

  const subjectIds = (byPacket.get(SUBJECT_PACKET_ID) ?? []).filter((id) => {
    const a = getDictionaryAttribute(id);
    return a && !a.system;
  });
  productPayload.subjectAsReported = SUBJECT_ROWS.slice(0, 2).map((row) => {
    const picked = pickKeys(row as unknown as Record<string, unknown>, subjectIds, true);
    return {
      providerId: row.providerId,
      sourceId: row.sourceId,
      reportedAt: row.reportedAt,
      ...picked,
    };
  });

  for (const packetId of params.selection.packetIds) {
    if (packetId === SUBJECT_PACKET_ID || packetId === CROSS_ASSET_PACKET_ID) continue;
    const packet = getDictionaryPacket(packetId);
    if (!packet) continue;
    const ids = byPacket.get(packetId) ?? [];
    const coreIds = ids.filter((id) => !getDictionaryAttribute(id)?.eventStreamId);
    const streamIds = ids.filter((id) => getDictionaryAttribute(id)?.eventStreamId);
    const samples = samplesForPacket(packetId);
    const enabledStreams = params.selection.eventStreamToggles[packetId] ?? [];
    const entries = samples.map((sample) => {
      let entry: Record<string, unknown> = {
        providerId: sample.providerId,
        sourceId: sample.sourceId,
        ...pickKeys(sample, coreIds, true),
      };
      for (const streamId of enabledStreams) {
        const nestKey = STREAM_NEST_KEY[streamId] ?? streamId;
        const streamSample = sample[nestKey];
        const streamAttrIds = streamIds.filter(
          (id) => getDictionaryAttribute(id)?.eventStreamId === streamId
        );
        if (Array.isArray(streamSample)) {
          entry[nestKey] = (streamSample as Record<string, unknown>[]).map((row) =>
            pickKeys(row, streamAttrIds, true)
          );
        }
      }
      if (effectiveScope === "TRENDED") {
        entry = trendify(entry, coreIds, periods);
        if (packetId === "credit_facility") {
          entry.dataScope = "TRENDED";
          entry.window = {
            months: window,
            from: periods[0],
            to: periods[periods.length - 1],
          };
        }
      }
      return entry;
    });
    productPayload[packet.responseKey] = entries;
  }

  if (params.selection.packetIds.includes(CROSS_ASSET_PACKET_ID)) {
    const analyticsIds = byPacket.get(CROSS_ASSET_PACKET_ID) ?? [];
    const crossAsset: Record<string, unknown> = {};
    const sampleValues: Record<string, unknown> = {
      riskTier: { value: "B", basedOn: ["credit_facility", "bank_account"] },
      segment: { value: "SALARIED_THIN_FILE", basedOn: ["credit_facility", "bank_account"] },
      ageBand: { value: "35-44", basedOn: ["subject"] },
      incomeBand: { value: "PENDING", basedOn: ["bank_account", "credit_facility"] },
    };
    for (const id of analyticsIds) {
      const a = getDictionaryAttribute(id);
      if (!a) continue;
      const key = toCamelResponseKey(a.qualifier);
      crossAsset[key] =
        sampleValues[key] ?? {
          value: `[${a.qualifier}]`,
          basedOn: a.basedOn ?? [],
        };
    }
    productPayload.analytics = { crossAsset };
  }

  return {
    enquiryId: "ENQ-2026-251-0007",
    status: "SUCCESS",
    enquiryType: params.enquiryType,
    subjectFound: true,
    products: [productPayload],
    completedAt: "2026-09-08T11:42:17Z",
    footprintCreated,
  };
}
