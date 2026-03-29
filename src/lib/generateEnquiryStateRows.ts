import { parseTimestamp } from "./calc/dateFilter";

/** Minimal institution shape for resolving enquiry log rows (Fastify seed). */
export interface EnquiryInstitutionLite {
  id: number;
  name: string;
  isSubscriber?: boolean;
}

/** In-memory `state.enquiries` row (snake_case + camel institution_id from seed). */
export interface EnquiryStateRow {
  id: string;
  /** Numeric id when parseable; otherwise raw id string (matches Fastify seed behaviour). */
  institution_id: number | string;
  institution: string;
  product_id: string;
  product: string;
  alternate_data_used: number;
  status: string;
  response_time_ms: number;
  consumer_id: string;
  timestamp: string;
  enquiry_type: string;
}

const PRODUCT_CYCLE: { product_id: string; product: string; alternate_data_used: number }[] = [
  { product_id: "PRD_004", product: "Credit Report", alternate_data_used: 0 },
  { product_id: "PRD_006", product: "Credit Report + Telecom", alternate_data_used: 1 },
  { product_id: "PRD_001", product: "Credit Report + Bank Statement", alternate_data_used: 1 },
  { product_id: "PRD_009", product: "Full Package", alternate_data_used: 2 },
];

function formatTs(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19);
}

function mapSeedEntryToStateRow(
  row: Record<string, unknown>,
  institutions: EnquiryInstitutionLite[],
  subscriberIdByApiKey: Record<string, string>
): EnquiryStateRow | null {
  const id = row.enquiry_id != null ? String(row.enquiry_id) : "";
  if (!id) return null;
  const rawId =
    row.institution_id != null
      ? String(row.institution_id)
      : row.api_key
        ? subscriberIdByApiKey[String(row.api_key)] ?? ""
        : "";
  const numericId = parseInt(String(rawId).replace(/\D/g, ""), 10);
  const inst = institutions.find(
    (x) => x.id === numericId || String(x.id).replace(/\D/g, "") === String(rawId).replace(/\D/g, "")
  );
  return {
    id,
    institution_id: Number.isFinite(numericId) ? numericId : rawId,
    institution: inst?.name ?? "",
    product_id: row.product_id != null ? String(row.product_id) : "",
    product: row.product != null ? String(row.product) : "",
    alternate_data_used: Number(row.alternate_data_used ?? 0),
    status: String(row.status ?? "Success"),
    response_time_ms: Number(row.response_time_ms ?? 0),
    consumer_id: row.consumer_id != null ? String(row.consumer_id) : "",
    timestamp: String(row.timestamp ?? ""),
    enquiry_type: "Standard",
  };
}

/**
 * Merges JSON `enquiryLogEntries` with synthetic rows (last 24h + 36 days ahead)
 * so Monitoring → Inquiry API shows rows under “Last 24 hrs” and future-dated demos
 * match `isWithinRelativeWindow` (future timestamps stay in-window).
 */
export function buildEnquiryStateRows(args: {
  seed: ReadonlyArray<Record<string, unknown>>;
  institutions: EnquiryInstitutionLite[];
  subscriberIdByApiKey: Record<string, string>;
  nowMs?: number;
}): EnquiryStateRow[] {
  const { seed, institutions, subscriberIdByApiKey, nowMs = Date.now() } = args;
  const rows: EnquiryStateRow[] = [];
  for (const row of seed) {
    const mapped = mapSeedEntryToStateRow(row, institutions, subscriberIdByApiKey);
    if (mapped) rows.push(mapped);
  }

  const subs = institutions.filter((i) => i.isSubscriber);
  if (subs.length === 0) {
    return sortByTimestampDesc(rows);
  }

  let seq = 880000;

  for (let i = 0; i < 48; i++) {
    const t = nowMs - i * 30 * 60 * 1000;
    const sub = subs[i % subs.length];
    const prod = PRODUCT_CYCLE[i % PRODUCT_CYCLE.length];
    const status = i % 7 === 2 ? "Failed" : "Success";
    rows.push({
      id: `ENQ-${seq++}`,
      institution_id: sub.id,
      institution: sub.name,
      product_id: prod.product_id,
      product: prod.product,
      alternate_data_used: prod.alternate_data_used,
      status,
      response_time_ms: 120 + (i % 20) * 15,
      consumer_id: `CON-${880000 + i}`,
      timestamp: formatTs(new Date(t)),
      enquiry_type: i % 3 === 0 ? "Hard" : "Standard",
    });
  }

  for (let day = 1; day <= 36; day++) {
    for (let slot = 0; slot < 4; slot++) {
      const off =
        day * 86_400_000 + slot * 150 * 60 * 1000 + ((slot * 37 + day * 11) % 1000) * 1000;
      const t = nowMs + off;
      const sub = subs[(day + slot) % subs.length];
      const prod = PRODUCT_CYCLE[(day * 4 + slot) % PRODUCT_CYCLE.length];
      const status = (day + slot) % 9 === 1 ? "Failed" : "Success";
      rows.push({
        id: `ENQ-${seq++}`,
        institution_id: sub.id,
        institution: sub.name,
        product_id: prod.product_id,
        product: prod.product,
        alternate_data_used: prod.alternate_data_used,
        status,
        response_time_ms: 150 + ((day + slot) % 25) * 12,
        consumer_id: `CON-${890000 + day * 10 + slot}`,
        timestamp: formatTs(new Date(t)),
        enquiry_type: (day + slot) % 4 === 0 ? "Hard" : "Standard",
      });
    }
  }

  return sortByTimestampDesc(rows);
}

function sortByTimestampDesc(rows: EnquiryStateRow[]): EnquiryStateRow[] {
  return [...rows].sort((a, b) => {
    const tA = parseTimestamp(a.timestamp)?.getTime() ?? 0;
    const tB = parseTimestamp(b.timestamp)?.getTime() ?? 0;
    return tB - tA;
  });
}
