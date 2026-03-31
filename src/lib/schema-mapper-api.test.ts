import { describe, it, expect } from "vitest";
import { fieldMappingsToLlmRows, llmRowsToFieldMappings, flattenMasterForApi } from "./schema-mapper-api";
import { masterSchemaTree } from "@/data/schema-mapper-mock";
import type { LLMFieldIntelligenceRow } from "@/types/schema-mapper";

describe("schema-mapper-api", () => {
  it("fieldMappingsToLlmRows maps API shape to UI rows", () => {
    const rows = fieldMappingsToLlmRows([
      {
        sourcePath: "subscriber_id",
        sourceFieldId: "tf-1",
        canonicalPath: "consumer_id",
        canonicalFieldId: "ms-1",
        confidence: 0.88,
        llmRationale: "ID field",
      },
    ]);
    expect(rows[0].sourceField).toBe("subscriber_id");
    expect(rows[0].canonicalMatch).toBe("consumer_id");
    expect(rows[0].confidence).toBe(88);
  });

  it("llmRowsToFieldMappings round-trips with master tree", () => {
    const prev = [
      {
        sourcePath: "subscriber_id",
        sourceFieldId: "tf-1",
        canonicalPath: "consumer_id",
        canonicalFieldId: "ms-1",
        matchType: "semantic",
        confidence: 0.88,
        reviewStatus: "pending",
        llmRationale: "x",
      },
    ];
    const uiRows: LLMFieldIntelligenceRow[] = [
      {
        id: "lli-1",
        sourceFieldId: "tf-1",
        sourceField: "subscriber_id",
        sourceFieldType: "string",
        llmMeaning: "x",
        canonicalMatch: "full_name",
        canonicalMatchId: "ms-2",
        similarFieldsAcrossSystem: [],
        confidence: 90,
        pii: false,
      },
    ];
    const out = llmRowsToFieldMappings(uiRows, masterSchemaTree, prev);
    expect(out[0].sourcePath).toBe("subscriber_id");
    expect(out[0].canonicalPath).toBe("full_name");
    expect(out[0].canonicalFieldId).toBe("ms-2");
    expect(out[0].containsPii).toBe(false);
  });

  it("llmRowsToFieldMappings persists containsPii and fieldMappingsToLlmRows reads it", () => {
    const prev = [
      {
        sourcePath: "customer_name",
        sourceFieldId: "tf-2",
        canonicalPath: "full_name",
        canonicalFieldId: "ms-2",
        matchType: "semantic",
        confidence: 0.9,
        reviewStatus: "pending" as const,
        llmRationale: "name",
        containsPii: true,
      },
    ];
    const uiRows: LLMFieldIntelligenceRow[] = [
      {
        id: "lli-2",
        sourceFieldId: "tf-2",
        sourceField: "customer_name",
        sourceFieldType: "string",
        llmMeaning: "name",
        canonicalMatch: "full_name",
        canonicalMatchId: "ms-2",
        similarFieldsAcrossSystem: [],
        confidence: 90,
        pii: true,
      },
    ];
    const api = llmRowsToFieldMappings(uiRows, masterSchemaTree, prev);
    expect(api[0].containsPii).toBe(true);
    const back = fieldMappingsToLlmRows(api);
    expect(back[0].pii).toBe(true);
  });

  it("flattenMasterForApi includes nested paths", () => {
    const flat = flattenMasterForApi(masterSchemaTree);
    expect(flat.some((f) => f.path === "accounts.dpd")).toBe(true);
  });
});
