import { describe, expect, it } from "vitest";
import {
  CROSS_FIELD_RULES,
  VALIDATION_RULE_TYPES,
  buildDatasourceFormSchema,
  buildFieldProfileSchema,
  normaliseLegacyRule,
  rewriteProfilePaths,
  validateTree,
} from "@/lib/datasource-onboarding-validation";
import type { FieldProfile, SchemaNode } from "@/types/datasource-onboarding";

function makeField(name: string, opts: Partial<SchemaNode> = {}): SchemaNode {
  return {
    id: `node-${name}`,
    name,
    code: name.toUpperCase(),
    nodeType: "FIELD",
    dataType: "STRING",
    sourceMapping: name,
    destinationMapping: name,
    validations: [],
    businessRules: [],
    transformations: [],
    children: [],
    ...opts,
  };
}

function makeProfile(overrides: Partial<FieldProfile> = {}): FieldProfile {
  return {
    PK: "PK#TEST",
    SK: "SK#TEST",
    FieldPath: "root.field",
    Section: "root",
    FieldName: "field",
    DisplayName: "Field",
    DataType: "STRING",
    IsPII: false,
    SimilarFields: [],
    Description: "Test field",
    Validation: {
      Type: "STRING",
      Rules: [
        {
          Rule: "NOT_EMPTY",
          Severity: "Error",
          Message: "Required",
        },
      ],
    },
    BusinessValidations: [],
    CrossFieldValidations: [],
    SourceMapping: {
      SourceType: "JSON",
      SourcePath: "root.field",
      TargetPath: "root.field",
    },
    ValueMode: "DEFAULT",
    DefaultValue: "",
    PossibleValues: [],
    Transformations: [],
    ...overrides,
  };
}

describe("datasource-onboarding-validation", () => {
  const baseForm = {
    name: "Acme Bank",
    sourceType: "JSON" as const,
    domainSourceType: "bank" as const,
    customDataSourceTypeName: "",
    dataLayout: "STRUCTURED" as const,
    dataSubmitterInstitutionId: "inst-1",
    pkPattern: "PK#CUSTOMER#${id}",
  };

  describe("buildDatasourceFormSchema", () => {
    const schema = buildDatasourceFormSchema({ existingNames: new Set(["acme telecom"]) });

    it("accepts a minimal valid payload", () => {
      const result = schema.safeParse(baseForm);
      expect(result.success).toBe(true);
    });

    it("accepts PARQUET as file format", () => {
      const result = schema.safeParse({ ...baseForm, name: "Parquet DS", sourceType: "PARQUET" });
      expect(result.success).toBe(true);
    });

    it("rejects a duplicate name (case-insensitive)", () => {
      const result = schema.safeParse({
        ...baseForm,
        name: "ACME TELECOM",
        domainSourceType: "telecom",
      });
      expect(result.success).toBe(false);
    });

    it("rejects an invalid sourceType", () => {
      const result = schema.safeParse({
        ...baseForm,
        sourceType: "NOT_A_FORMAT",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing data submitter id", () => {
      const result = schema.safeParse({
        ...baseForm,
        dataSubmitterInstitutionId: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects custom type name that matches a reserved built-in label", () => {
      const schemaCustom = buildDatasourceFormSchema({
        existingNames: new Set(),
        existingCustomTypeNames: new Set(),
      });
      const result = schemaCustom.safeParse({
        ...baseForm,
        name: "Custom Type DS",
        domainSourceType: "custom",
        customDataSourceTypeName: "telecom",
      });
      expect(result.success).toBe(false);
    });

    it("rejects duplicate custom type name against workspace list", () => {
      const schemaCustom = buildDatasourceFormSchema({
        existingNames: new Set(),
        existingCustomTypeNames: new Set(["my vendor"]),
      });
      const result = schemaCustom.safeParse({
        ...baseForm,
        name: "Another DS",
        domainSourceType: "custom",
        customDataSourceTypeName: "MY VENDOR",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("buildFieldProfileSchema", () => {
    it("accepts a fully-formed profile", () => {
      const schema = buildFieldProfileSchema();
      expect(schema.safeParse(makeProfile()).success).toBe(true);
    });

    it("requires Pattern for REGEX rules", () => {
      const schema = buildFieldProfileSchema();
      const result = schema.safeParse(
        makeProfile({
          Validation: {
            Type: "STRING",
            Rules: [
              {
                Rule: "REGEX",
                Severity: "Error",
                Message: "Bad",
              },
            ],
          },
        }),
      );
      expect(result.success).toBe(false);
    });

    it("requires PossibleValues for ENUM mode", () => {
      const schema = buildFieldProfileSchema();
      const result = schema.safeParse(makeProfile({ ValueMode: "ENUM", PossibleValues: [] }));
      expect(result.success).toBe(false);
    });
  });

  describe("validateTree", () => {
    it("emits a Warning when a leaf has no FieldProfile", () => {
      const result = validateTree([makeField("amount")]);
      expect(result.errors.some((e) => e.severity === "Warning" && /missing/i.test(e.message))).toBe(true);
      expect(result.isValid).toBe(true);
    });

    it("flags an ARRAY container without [*] as an Error", () => {
      const root: SchemaNode = {
        id: "n1",
        name: "items",
        code: "ITEMS",
        nodeType: "ARRAY",
        dataType: "ARRAY",
        sourceMapping: "items",
        destinationMapping: "items",
        validations: [],
        businessRules: [],
        transformations: [],
        children: [],
      };
      const result = validateTree([root]);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => /\[\*]/.test(e.message))).toBe(true);
    });

    it("flags duplicate sibling names as an Error", () => {
      const a = makeField("dup", { fieldProfile: makeProfile() });
      const b = makeField("DUP", { id: "node-dup-2", fieldProfile: makeProfile() });
      const result = validateTree([a, b]);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => /Duplicate sibling/i.test(e.message))).toBe(true);
    });

    it("accepts a profiled FIELD node", () => {
      const node = makeField("amount", { fieldProfile: makeProfile() });
      const result = validateTree([node]);
      expect(result.isValid).toBe(true);
    });

    it("validates FieldPath against the master path catalog", () => {
      const node = makeField("amount", {
        fieldProfile: makeProfile({ FieldPath: "totally.not.in.catalog" }),
      });
      const result = validateTree([node], { validPaths: new Set(["root.field"]) });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => /catalog/i.test(e.message))).toBe(true);
    });
  });

  describe("rewriteProfilePaths", () => {
    it("rewrites the path prefix everywhere", () => {
      const profile = makeProfile({
        FieldPath: "old.path.field",
        SourceMapping: { SourceType: "JSON", SourcePath: "old.path.field", TargetPath: "old.path.field" },
      });
      const next = rewriteProfilePaths(profile, "old.path", "new.path");
      expect(next.FieldPath).toBe("new.path.field");
      expect(next.SourceMapping.SourcePath).toBe("new.path.field");
      expect(next.SourceMapping.TargetPath).toBe("new.path.field");
    });
  });

  describe("normaliseLegacyRule", () => {
    it("matches a known rule (case-insensitive)", () => {
      expect(normaliseLegacyRule("not_empty")).toBe("NOT_EMPTY");
      expect(normaliseLegacyRule("MAX_LENGTH")).toBe("MAX_LENGTH");
      expect(normaliseLegacyRule("regex")).toBe("REGEX");
    });

    it("rewrites hyphens to underscores", () => {
      expect(normaliseLegacyRule("MIN-LENGTH")).toBe("MIN_LENGTH");
    });

    it("returns null for an unknown rule", () => {
      expect(normaliseLegacyRule("magic")).toBeNull();
      expect(normaliseLegacyRule(undefined)).toBeNull();
    });
  });

  describe("enum stability", () => {
    it("validation rule types are exhaustively listed", () => {
      expect(VALIDATION_RULE_TYPES).toEqual(["NOT_EMPTY", "MAX_LENGTH", "MIN_LENGTH", "REGEX", "UNIQUE"]);
    });
    it("cross-field rules include direction- and conditional-style rules", () => {
      expect(CROSS_FIELD_RULES).toContain("EQUALS");
      expect(CROSS_FIELD_RULES).toContain("GREATER_OR_EQUAL");
      expect(CROSS_FIELD_RULES).toContain("REQUIRED_IF");
    });
  });
});
