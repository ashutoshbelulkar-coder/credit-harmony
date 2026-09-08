import { describe, expect, it } from "vitest";
import { productCatalogPacketOptions } from "@/data/data-products-mock";
import { isDictionaryPacketId } from "@/lib/product-contract";
import {
  buildProductFormPacketRows,
  filterCatalogOptionsForProductForm,
  groupPacketRowsByDataDomain,
} from "@/lib/product-packet-catalog";
import demo from "@/data/product-management-demo.json";

const FORM_HIDDEN = new Set(["Synthetic / Test", "Consortium Data", "Fraud Signals"]);

describe("product form packet catalogue", () => {
  it("includes every form-visible packet used by demo products", () => {
    const used = new Set<string>();
    for (const v of demo.versions) {
      for (const id of v.packetIds) used.add(id);
    }

    const byId = new Map(productCatalogPacketOptions.map((o) => [o.id, o]));
    const eligible = new Set(
      filterCatalogOptionsForProductForm(productCatalogPacketOptions).map((o) => o.id)
    );

    for (const id of used) {
      if (isDictionaryPacketId(id)) continue;
      const opt = byId.get(id);
      if (opt && FORM_HIDDEN.has(opt.category)) continue;
      expect(eligible.has(id), `${id} should appear on the product form`).toBe(true);
    }
  });

  it("hides consortium and fraud groups from the form", () => {
    const eligible = filterCatalogOptionsForProductForm(productCatalogPacketOptions);
    expect(eligible.some((o) => o.id === "PKT_CON")).toBe(false);
    expect(eligible.some((o) => o.id === "PKT_FRD")).toBe(false);
    expect(eligible.some((o) => o.category === "Consortium Data")).toBe(false);
    expect(eligible.some((o) => o.category === "Fraud Signals")).toBe(false);
  });

  it("lists custom packets as individual labeled rows", () => {
    const rows = buildProductFormPacketRows(productCatalogPacketOptions);
    const customRows = rows.filter((r) => r.sourceType === "custom");

    expect(customRows.length).toBeGreaterThan(0);
    for (const row of customRows) {
      expect(row.packetIds).toHaveLength(1);
      expect(row.sourceTypeLabel).toBe(row.packets[0]!.label);
    }

    expect(customRows.some((r) => r.packetIds[0] === "PKT_BLK")).toBe(true);
    expect(customRows.some((r) => r.packetIds[0] === "PKT_LEG")).toBe(true);
    expect(customRows.some((r) => r.packetIds[0] === "PKT_PAY")).toBe(true);
    expect(customRows.some((r) => r.packetIds[0] === "PKT_DEV")).toBe(true);
    expect(customRows.some((r) => r.packetIds[0] === "PKT_BNPL")).toBe(true);
    expect(customRows.some((r) => r.packetIds[0] === "PKT_CON")).toBe(false);
    expect(customRows.some((r) => r.packetIds[0] === "PKT_FRD")).toBe(false);
    expect(customRows.some((r) => r.packetIds[0] === "PKT_SYN")).toBe(false);
  });

  it("lists Utility under its catalogue label", () => {
    const rows = buildProductFormPacketRows(productCatalogPacketOptions);
    const utility = rows.find((r) => r.packetIds[0] === "PKT_UTL");
    expect(utility?.sourceTypeLabel).toBe("Utility & Rent Payments");
    expect(utility?.packetIds).toEqual(["PKT_UTL"]);
  });

  it("lists Employment Insights and Digital Spend as separate packets", () => {
    const rows = buildProductFormPacketRows(productCatalogPacketOptions);
    const emp = rows.find((r) => r.packetIds[0] === "PKT_EMP");
    const dsp = rows.find((r) => r.packetIds[0] === "PKT_DSP");
    expect(emp?.sourceTypeLabel).toBe("Employment Insights");
    expect(dsp?.sourceTypeLabel).toBe("Digital Spend Profile");
    expect(emp?.packets[0]?.fields).not.toContain("monthly_bill_amount");
    expect(utilityFields(rows)).toEqual(
      expect.arrayContaining(["electricity_ontime_ratio", "outstanding_amount"])
    );
  });
  it("groups packets into Individual and Commercial data", () => {
    const groups = groupPacketRowsByDataDomain(
      buildProductFormPacketRows(productCatalogPacketOptions)
    );
    expect(groups.map(([d]) => d)).toEqual(["Individual data", "Commercial data"]);

    const individualIds = groups[0]![1].flatMap((r) => r.packetIds);
    const commercialIds = groups[1]![1].flatMap((r) => r.packetIds);

    expect(individualIds).toEqual(
      expect.arrayContaining([
        "PKT_TBS",
        "PKT_EMP",
        "PKT_DSP",
        "PKT_BNPL",
        "PKT_UTL",
        "PKT_PAY",
        "PKT_DEV",
      ])
    );
    expect(commercialIds).toEqual(
      expect.arrayContaining(["PKT_BCF", "PKT_GST", "PKT_BLK", "PKT_LEG"])
    );
    expect(individualIds).not.toEqual(expect.arrayContaining(["PKT_GST"]));
    expect(commercialIds).not.toEqual(expect.arrayContaining(["PKT_PAY"]));
  });
});

function utilityFields(
  rows: ReturnType<typeof buildProductFormPacketRows>
): string[] | undefined {
  return rows.find((r) => r.packetIds[0] === "PKT_UTL")?.packets[0]?.fields;
}
