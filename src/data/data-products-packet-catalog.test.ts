import { describe, expect, it } from "vitest";
import data from "./data-products.json";

describe("productCatalogPacketOptions", () => {
  it("every option has non-empty derivedFields", () => {
    for (const o of data.productCatalogPacketOptions) {
      expect(Array.isArray(o.derivedFields), o.id).toBe(true);
      expect((o.derivedFields as string[]).length, o.id).toBeGreaterThan(0);
    }
  });
});
