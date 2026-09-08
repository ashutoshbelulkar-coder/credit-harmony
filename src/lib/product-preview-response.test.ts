import { describe, expect, it } from "vitest";
import { emptyContractSelection, toggleEventStream, togglePacket } from "@/lib/product-contract";
import { buildContractResponsePreview } from "@/lib/product-preview-response";
import { DEFAULT_ENQUIRY_CONFIG } from "@/data/data-products-mock";

describe("buildContractResponsePreview", () => {
  it("emits subjectAsReported array and nested event streams", () => {
    let sel = togglePacket(emptyContractSelection(), "credit_facility", true);
    sel = togglePacket(sel, "bank_account", true);
    sel = toggleEventStream(sel, "bank_account", "transactions", true);
    sel = toggleEventStream(sel, "credit_facility", "repayment_history", true);
    sel = togglePacket(sel, "cross_asset_analytics", true);

    const json = buildContractResponsePreview({
      productId: "PRD_0006",
      productVersion: 2,
      productName: "Retail Cashflow Plus",
      selection: sel,
      enquiryConfig: DEFAULT_ENQUIRY_CONFIG,
      enquiryType: "HARD",
      trendedEnabled: true,
      retroEnabled: false,
      previewScope: "LATEST",
      previewWindow: 6,
      maxTrendedMonths: 12,
      enquiryDate: "2026-06-15",
    }) as {
      products: Array<Record<string, unknown>>;
    };

    const product = json.products[0]!;
    expect(Array.isArray(product.subjectAsReported)).toBe(true);
    expect((product.subjectAsReported as unknown[]).length).toBe(2);
    expect(Array.isArray(product.creditFacilities)).toBe(true);
    const facility = (product.creditFacilities as Record<string, unknown>[])[0]!;
    expect(facility.providerId).toBeTruthy();
    expect(Array.isArray(facility.repaymentHistory)).toBe(true);
    const bank = (product.bankAccounts as Record<string, unknown>[])[0]!;
    expect(Array.isArray(bank.transactions)).toBe(true);
    expect(product.analytics).toBeTruthy();
    expect(product).not.toHaveProperty("customerProfile");
  });
});
