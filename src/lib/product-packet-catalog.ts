import type { SourceType } from "@/types/schema-mapper";
import {
  SOURCE_TYPE_LABELS,
  type ProductCatalogPacketGroup,
  type ProductCatalogPacketOption,
} from "@/data/data-products-mock";

/** Rows shown in the product form: Schema Mapper source types collapse; custom packets stay one-per-row. */
export interface ProductFormPacketRow {
  category: ProductCatalogPacketGroup;
  sourceType: SourceType;
  sourceTypeLabel: string;
  packetIds: string[];
  packets: ProductCatalogPacketOption[];
}

/** Product-form grouping: consumer vs business subject types. */
export type ProductFormDataDomain = "Individual data" | "Commercial data";

const SYNTHETIC_CATEGORY: ProductCatalogPacketGroup = "Synthetic / Test";
const FORM_HIDDEN_CATEGORIES = new Set<ProductCatalogPacketGroup>([
  SYNTHETIC_CATEGORY,
  "Consortium Data",
  "Fraud Signals",
]);

/** Explicit domain for form-visible packets (commercial = business/entity, individual = consumer). */
const COMMERCIAL_PACKET_IDS = new Set([
  "PKT_BCF", // SME / entity bank cashflow
  "PKT_GST",
  "PKT_BLK",
  "PKT_LEG",
]);

const FORM_DATA_DOMAIN_ORDER: ProductFormDataDomain[] = [
  "Individual data",
  "Commercial data",
];

/** Catalogue options eligible for the product form (hides synthetic, consortium, and fraud groups). */
export function filterCatalogOptionsForProductForm(
  options: ProductCatalogPacketOption[]
): ProductCatalogPacketOption[] {
  return options.filter((o) => !FORM_HIDDEN_CATEGORIES.has(o.category));
}

export function dataDomainForPacketId(packetId: string): ProductFormDataDomain {
  return COMMERCIAL_PACKET_IDS.has(packetId) ? "Commercial data" : "Individual data";
}

/**
 * Walk catalogue order: collapse non-custom packets that share the same `sourceType`
 * into one row, and keep each custom packet as its own selectable row.
 */
export function buildProductFormPacketRows(
  options: ProductCatalogPacketOption[]
): ProductFormPacketRow[] {
  const filtered = filterCatalogOptionsForProductForm(options);
  const seen = new Set<string>();
  const rows: ProductFormPacketRow[] = [];
  for (const opt of filtered) {
    const isCustom = opt.sourceType === "custom";
    const key = isCustom ? `custom::${opt.id}` : `${opt.category}::${opt.sourceType}`;
    if (seen.has(key)) {
      const row = rows.find(
        (r) =>
          !isCustom &&
          r.category === opt.category &&
          r.sourceType === opt.sourceType
      );
      if (row) {
        row.packetIds.push(opt.id);
        row.packets.push(opt);
      }
      continue;
    }
    seen.add(key);
    rows.push({
      category: opt.category,
      sourceType: opt.sourceType,
      sourceTypeLabel: isCustom ? opt.label : SOURCE_TYPE_LABELS[opt.sourceType],
      packetIds: [opt.id],
      packets: [opt],
    });
  }
  for (const row of rows) {
    if (row.packets.length === 1) {
      row.sourceTypeLabel = row.packets[0]!.label;
    }
  }
  return rows;
}

/** Group form rows into Individual vs Commercial (stable domain order). */
export function groupPacketRowsByDataDomain(
  rows: ProductFormPacketRow[]
): [ProductFormDataDomain, ProductFormPacketRow[]][] {
  const map = new Map<ProductFormDataDomain, ProductFormPacketRow[]>(
    FORM_DATA_DOMAIN_ORDER.map((d) => [d, []])
  );
  for (const row of rows) {
    const domain = dataDomainForPacketId(row.packetIds[0] ?? "");
    map.get(domain)!.push(row);
  }
  return FORM_DATA_DOMAIN_ORDER.map((d) => [d, map.get(d)!] as const).filter(
    ([, list]) => list.length > 0
  );
}

/** Stable ordering of selected packet ids following catalogue order (first match in `orderedCatalogIds`). */
export function sortPacketIdsByCatalogOrder(
  packetIds: string[],
  orderedCatalogIds: string[]
): string[] {
  const idx = new Map(orderedCatalogIds.map((id, i) => [id, i]));
  return [...packetIds].sort((a, b) => (idx.get(a) ?? 9999) - (idx.get(b) ?? 9999));
}

/** Category groups in first-seen order (matches catalogue walk). */
export function groupPacketRowsByCategory(
  rows: ProductFormPacketRow[]
): [ProductCatalogPacketGroup, ProductFormPacketRow[]][] {
  const map = new Map<ProductCatalogPacketGroup, ProductFormPacketRow[]>();
  for (const r of rows) {
    if (!map.has(r.category)) map.set(r.category, []);
    map.get(r.category)!.push(r);
  }
  return [...map.entries()];
}
