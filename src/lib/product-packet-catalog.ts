import type { SourceType } from "@/types/schema-mapper";
import {
  SOURCE_TYPE_LABELS,
  type ProductCatalogPacketGroup,
  type ProductCatalogPacketOption,
} from "@/data/data-products-mock";

/** Rows shown in the product form: one per distinct Schema Mapper source type within a category (custom excluded). */
export interface ProductFormPacketRow {
  category: ProductCatalogPacketGroup;
  sourceType: SourceType;
  sourceTypeLabel: string;
  packetIds: string[];
  packets: ProductCatalogPacketOption[];
}

const SYNTHETIC_CATEGORY: ProductCatalogPacketGroup = "Synthetic / Test";

/** Catalogue options eligible for the product form (Schema Mapper source types only; excludes `custom`). */
export function filterCatalogOptionsForProductForm(
  options: ProductCatalogPacketOption[]
): ProductCatalogPacketOption[] {
  return options.filter(
    (o) => o.sourceType !== "custom" && o.category !== SYNTHETIC_CATEGORY
  );
}

/**
 * Walk catalogue order: group by category, then collapse packets that share the same `sourceType`
 * into one row (unique source type per category; aligns with Schema Mapper).
 */
export function buildProductFormPacketRows(
  options: ProductCatalogPacketOption[]
): ProductFormPacketRow[] {
  const filtered = filterCatalogOptionsForProductForm(options);
  const seen = new Set<string>();
  const rows: ProductFormPacketRow[] = [];
  for (const opt of filtered) {
    const key = `${opt.category}::${opt.sourceType}`;
    if (seen.has(key)) {
      const row = rows.find(
        (r) => r.category === opt.category && r.sourceType === opt.sourceType
      );
      if (row) {
        row.packetIds.push(opt.id);
        row.packets.push(opt);
      }
    } else {
      seen.add(key);
      rows.push({
        category: opt.category,
        sourceType: opt.sourceType,
        sourceTypeLabel: SOURCE_TYPE_LABELS[opt.sourceType],
        packetIds: [opt.id],
        packets: [opt],
      });
    }
  }
  return rows;
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
