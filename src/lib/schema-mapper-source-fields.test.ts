import { describe, expect, it } from "vitest";
import type { ParsedSourceField } from "@/types/schema-mapper";
import {
  flattenParsedSourceFields,
  sourceTypeFieldsFromMockCatalog,
} from "@/lib/schema-mapper-source-fields";

describe("flattenParsedSourceFields", () => {
  it("flattens root nodes and preserves path, name, dataType", () => {
    const nodes: ParsedSourceField[] = [
      {
        id: "a",
        name: "foo",
        dataType: "string",
        path: "foo",
        depth: 0,
        sampleValues: [],
        nullFrequency: 0,
        isEnumCandidate: false,
        detectedEnumValues: [],
      },
    ];
    const out = flattenParsedSourceFields(nodes);
    expect(out).toEqual([{ id: "a", path: "foo", name: "foo", dataType: "string" }]);
  });

  it("includes nested children paths", () => {
    const nodes: ParsedSourceField[] = [
      {
        id: "root",
        name: "parent",
        dataType: "object",
        path: "parent",
        depth: 0,
        sampleValues: [],
        nullFrequency: 0,
        isEnumCandidate: false,
        detectedEnumValues: [],
        children: [
          {
            id: "c1",
            name: "child",
            dataType: "number",
            path: "parent.child",
            depth: 1,
            sampleValues: [],
            nullFrequency: 0,
            isEnumCandidate: false,
            detectedEnumValues: [],
          },
        ],
      },
    ];
    const paths = flattenParsedSourceFields(nodes).map((f) => f.path).sort();
    expect(paths).toEqual(["parent", "parent.child"]);
  });
});

describe("sourceTypeFieldsFromMockCatalog", () => {
  it("returns telecom sample paths including subscriber_id", () => {
    const fields = sourceTypeFieldsFromMockCatalog("telecom");
    expect(fields.some((f) => f.path === "subscriber_id")).toBe(true);
    expect(fields.some((f) => f.path === "borrower_ucin")).toBe(false);
  });

  it("returns utility sample paths including utility_customer_id", () => {
    const fields = sourceTypeFieldsFromMockCatalog("utility");
    expect(fields.some((f) => f.path === "utility_customer_id")).toBe(true);
  });

  it("returns bank sample paths including borrower_ucin", () => {
    const fields = sourceTypeFieldsFromMockCatalog("bank");
    expect(fields.some((f) => f.path === "borrower_ucin")).toBe(true);
    expect(fields.some((f) => f.path === "subscriber_id")).toBe(false);
  });

  it("returns gst sample paths including gstin", () => {
    const fields = sourceTypeFieldsFromMockCatalog("gst");
    expect(fields.some((f) => f.path === "gstin")).toBe(true);
  });

  it("returns custom sample paths including member_id", () => {
    const fields = sourceTypeFieldsFromMockCatalog("custom");
    expect(fields.some((f) => f.path === "member_id")).toBe(true);
  });

  it("returns empty list for unknown sourceType with no registry rows", () => {
    const fields = sourceTypeFieldsFromMockCatalog("nonexistent-type-xyz");
    expect(fields).toEqual([]);
  });

  it("sorts paths lexicographically", () => {
    const fields = sourceTypeFieldsFromMockCatalog("bank");
    const paths = fields.map((f) => f.path);
    const sorted = [...paths].sort((a, b) => a.localeCompare(b));
    expect(paths).toEqual(sorted);
  });
});
