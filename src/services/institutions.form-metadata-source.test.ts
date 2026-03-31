import { describe, it, expect } from "vitest";
import institutionsSeed from "@/data/institutions.json";
import { normaliseRequiredComplianceDocuments } from "./institutions.service";

/**
 * Register Step 1 + compliance checklist should mirror server seed files.
 * Mock API fallback must not duplicate a parallel list in code.
 */
describe("institutions form-metadata seed alignment", () => {
  it("normalises requiredComplianceDocuments from institutions.json (same source as Fastify state)", () => {
    const docs = normaliseRequiredComplianceDocuments(institutionsSeed.requiredComplianceDocuments);
    expect(docs).not.toBeNull();
    expect(docs!.length).toBeGreaterThan(0);
    expect(docs!.some((d) => d.documentName === "Certificate of Incorporation")).toBe(true);
    expect(docs!.some((d) => d.requiredWhen === "data_submitter")).toBe(true);
    expect(docs!.some((d) => d.requiredWhen === "subscriber")).toBe(true);
  });
});
