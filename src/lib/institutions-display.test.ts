import { describe, it, expect } from "vitest";
import { institutionDisplayLabel } from "./institutions-display";

describe("institutionDisplayLabel", () => {
  it("prefers trimmed legal name over trading name", () => {
    expect(
      institutionDisplayLabel({ name: "  Acme Bank Ltd  ", tradingName: "Acme" })
    ).toBe("Acme Bank Ltd");
  });

  it("falls back to trading name when legal name is empty", () => {
    expect(institutionDisplayLabel({ name: "", tradingName: "Trade Co" })).toBe("Trade Co");
    expect(institutionDisplayLabel({ name: "   ", tradingName: "Trade Co" })).toBe("Trade Co");
  });

  it("returns empty string when both missing", () => {
    expect(institutionDisplayLabel({})).toBe("");
  });
});
