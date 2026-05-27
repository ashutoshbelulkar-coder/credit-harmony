/**
 * Datasource Onboarding — validation module.
 *
 * Single source of truth for all field-, tree-, and form-level validation
 * rules required by the migrated POC flow. Composed of:
 *
 *  - zod schemas for the Step 1 datasource form and the per-node profile.
 *  - `validateTree(nodes)` aggregator that walks a SchemaNode tree and
 *    surfaces every structural / business / cross-field violation as
 *    `SchemaValidationIssue`s.
 *
 * All path values (FieldPath, SourcePath, TargetPath, CrossField FieldPath)
 * are validated against an optional catalog set produced by
 * `useMasterPathCatalog()`. If no catalog is supplied, path validation is
 * skipped (treat as best-effort during edit; final Finish must supply one).
 */
import { z } from "zod";
import type {
  BusinessValidationType,
  CrossFieldRule,
  FieldProfile,
  FieldValidationRule,
  NodeType,
  SchemaDataType,
  SchemaNode,
  SchemaValidationIssue,
  SchemaValidationResult,
  TransformationType,
  ValidationRuleType,
  ValidationSeverity,
  SourceMappingType,
  DatasourceDataLayout,
} from "@/types/datasource-onboarding";
import { SOURCE_MAPPING_TYPES } from "@/types/datasource-onboarding";
import type { SourceType } from "@/types/schema-mapper";

/** Zod tuple for file-format enums (must match `SOURCE_MAPPING_TYPES`). */
const SOURCE_MAPPING_ZOD = SOURCE_MAPPING_TYPES as unknown as [SourceMappingType, ...SourceMappingType[]];

/** Labels users may not reuse as a custom data source type name (case-insensitive). */
export const RESERVED_CUSTOM_DATA_SOURCE_NAMES = new Set(
  ["telecom", "utility", "bank", "gst", "custom", "telecommunications", "all"].map((s) => s.toLowerCase()),
);

// ─── Enums (kept in lock-step with the type definitions) ──────────────────

export const VALIDATION_RULE_TYPES: ValidationRuleType[] = [
  "NOT_EMPTY",
  "MAX_LENGTH",
  "MIN_LENGTH",
  "REGEX",
  "UNIQUE",
];

export const BUSINESS_VALIDATION_TYPES: BusinessValidationType[] = [
  "MANDATORY_CHECK",
  "FORMAT_CHECK",
  "DOMAIN_CHECK",
  "RANGE_CHECK",
];

export const CROSS_FIELD_RULES: CrossFieldRule[] = [
  "EQUALS",
  "NOT_EQUALS",
  "GREATER_THAN",
  "LESS_THAN",
  "GREATER_OR_EQUAL",
  "LESS_OR_EQUAL",
  "REQUIRED_IF",
  "FORBIDDEN_IF",
  "SAME_AS",
  "DIFFERENT_FROM",
];

export const TRANSFORMATION_TYPES: TransformationType[] = [
  "ALL_CAPS",
  "ALL_LOWERCASE",
  "TRIM",
  "REPLACE",
  "CONCATENATE",
];

export const VALIDATION_SEVERITIES: ValidationSeverity[] = ["Error", "Warning", "Info"];

export const SCHEMA_DATA_TYPES: SchemaDataType[] = [
  "STRING",
  "NUMBER",
  "BOOLEAN",
  "DATE",
  "OBJECT",
  "ARRAY",
];

export const NODE_TYPES: NodeType[] = ["FIELD", "OBJECT", "ARRAY"];

export { SOURCE_MAPPING_TYPES };

export const DATASOURCE_DATA_LAYOUTS: DatasourceDataLayout[] = ["STRUCTURED", "UNSTRUCTURED"];

// ─── Step 1 — Datasource form ─────────────────────────────────────────────

export interface DatasourceFormShape {
  name: string;
  sourceType: SourceMappingType;
  domainSourceType: SourceType;
  /** Required when `domainSourceType` is `custom`; otherwise empty string. */
  customDataSourceTypeName: string;
  dataLayout: DatasourceDataLayout;
  dataSubmitterInstitutionId: string;
  pkPattern: string;
}

export function buildDatasourceFormSchema(opts: {
  /** Datasource names already in use (case-insensitive). The current record's id is excluded. */
  existingNames?: Set<string>;
  /** Other datasources' `customDataSourceTypeName` values (case-insensitive), excluding current edit. */
  existingCustomTypeNames?: Set<string>;
}) {
  const reserved = new Set(
    Array.from(opts.existingNames ?? []).map((n) => n.trim().toLowerCase()),
  );
  const takenCustom = new Set(
    Array.from(opts.existingCustomTypeNames ?? []).map((n) => n.trim().toLowerCase()),
  );
  return z
    .object({
      name: z
        .string()
        .trim()
        .min(1, "Source name is required")
        .max(120, "Source name must be 120 characters or fewer")
        .refine((v) => !reserved.has(v.toLowerCase()), {
          message: "A datasource with this name already exists",
        }),
      sourceType: z.enum(SOURCE_MAPPING_ZOD, {
        errorMap: () => ({ message: "File format is required" }),
      }),
      domainSourceType: z.enum(["telecom", "utility", "bank", "gst", "custom"], {
        errorMap: () => ({ message: "Data source type is required" }),
      }),
      customDataSourceTypeName: z.string().trim().max(80, "Type name must be 80 characters or fewer"),
      dataLayout: z.enum(["STRUCTURED", "UNSTRUCTURED"], {
        errorMap: () => ({ message: "Data layout is required" }),
      }),
      dataSubmitterInstitutionId: z.string().trim().min(1, "Select a data submitter"),
      pkPattern: z.string().trim().max(120, "PK Pattern must be 120 characters or fewer"),
    })
    .superRefine((data, ctx) => {
      if (data.domainSourceType === "custom") {
        const raw = data.customDataSourceTypeName.trim();
        if (!raw) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["customDataSourceTypeName"],
            message: "Enter a name for the new data source type",
          });
          return;
        }
        const low = raw.toLowerCase();
        if (RESERVED_CUSTOM_DATA_SOURCE_NAMES.has(low)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["customDataSourceTypeName"],
            message: "This name is reserved or conflicts with a built-in type",
          });
        }
        if (takenCustom.has(low)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["customDataSourceTypeName"],
            message: "A data source type with this name already exists",
          });
        }
      }
    });
}

// ─── Field profile (per-node) ─────────────────────────────────────────────

const fieldValidationRuleSchema = z
  .object({
    Rule: z.enum(["NOT_EMPTY", "MAX_LENGTH", "MIN_LENGTH", "REGEX", "UNIQUE"]),
    Severity: z.enum(["Error", "Warning", "Info"]),
    Value: z.union([z.string(), z.number(), z.null()]).optional(),
    Pattern: z.string().optional(),
    Message: z.string().trim().min(1, "Message is required"),
  })
  .superRefine((rule, ctx) => {
    if ((rule.Rule === "MAX_LENGTH" || rule.Rule === "MIN_LENGTH") && (rule.Value == null || rule.Value === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["Value"],
        message: "Value is required for MAX_LENGTH / MIN_LENGTH",
      });
    }
    if (rule.Rule === "REGEX" && (!rule.Pattern || rule.Pattern.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["Pattern"],
        message: "Pattern is required for REGEX",
      });
    }
  });

const crossFieldSchema = (validPaths?: Set<string>) =>
  z
    .object({
      FieldPath: z.string().trim().min(1, "FieldPath is required"),
      Rule: z.enum([
        "EQUALS",
        "NOT_EQUALS",
        "GREATER_THAN",
        "LESS_THAN",
        "GREATER_OR_EQUAL",
        "LESS_OR_EQUAL",
        "REQUIRED_IF",
        "FORBIDDEN_IF",
        "SAME_AS",
        "DIFFERENT_FROM",
      ]),
      Severity: z.enum(["Error", "Warning", "Info"]),
    })
    .superRefine((entry, ctx) => {
      if (validPaths && !validPaths.has(entry.FieldPath)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["FieldPath"],
          message: "FieldPath is not in the master path catalog",
        });
      }
    });

export function buildFieldProfileSchema(opts: { validPaths?: Set<string> } = {}) {
  return z
    .object({
      PK: z.string().trim(),
      SK: z.string().trim(),
      FieldPath: z
        .string()
        .trim()
        .min(1, "FieldPath is required")
        .superRefine((v, ctx) => {
          if (opts.validPaths && !opts.validPaths.has(v)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "FieldPath is not in the master path catalog",
            });
          }
        }),
      Section: z.string().trim().min(1, "Section is required"),
      FieldName: z.string().trim().min(1, "FieldName is required"),
      DisplayName: z.string().trim().min(1, "DisplayName is required"),
      DataType: z.enum(["STRING", "NUMBER", "BOOLEAN", "DATE", "OBJECT", "ARRAY"]),
      IsPII: z.boolean(),
      SimilarFields: z.array(z.string().trim().min(1)).default([]),
      Description: z.string().default(""),
      Validation: z.object({
        Type: z.string(),
        Rules: z.array(fieldValidationRuleSchema).default([]),
      }),
      BusinessValidations: z
        .array(z.enum(["MANDATORY_CHECK", "FORMAT_CHECK", "DOMAIN_CHECK", "RANGE_CHECK"]))
        .default([]),
      CrossFieldValidations: z.array(crossFieldSchema(opts.validPaths)).default([]),
      SourceMapping: z.object({
        SourceType: z.enum(SOURCE_MAPPING_ZOD),
        SourcePath: z
          .string()
          .trim()
          .min(1, "Source path is required")
          .superRefine((v, ctx) => {
            if (opts.validPaths && !opts.validPaths.has(v)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Source path is not in the master path catalog",
              });
            }
          }),
        TargetPath: z
          .string()
          .trim()
          .min(1, "Target path is required")
          .superRefine((v, ctx) => {
            if (opts.validPaths && !opts.validPaths.has(v)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Target path is not in the master path catalog",
              });
            }
          }),
      }),
      ValueMode: z.enum(["DEFAULT", "ENUM"]),
      DefaultValue: z.union([z.string(), z.null()]),
      PossibleValues: z.array(z.string().trim().min(1)).default([]),
      Transformations: z
        .array(z.enum(["ALL_CAPS", "ALL_LOWERCASE", "TRIM", "REPLACE", "CONCATENATE"]))
        .default([]),
    })
    .superRefine((profile, ctx) => {
      if (profile.ValueMode === "ENUM" && profile.PossibleValues.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["PossibleValues"],
          message: "Enum mode requires at least one possible value",
        });
      }
      // Dedupe checks for arrays of enum-like strings.
      const seenBus = new Set<string>();
      profile.BusinessValidations.forEach((b, idx) => {
        if (seenBus.has(b)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["BusinessValidations", idx],
            message: "Duplicate business validation",
          });
        }
        seenBus.add(b);
      });
      const seenTx = new Set<string>();
      profile.Transformations.forEach((t, idx) => {
        if (seenTx.has(t)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["Transformations", idx],
            message: "Duplicate transformation",
          });
        }
        seenTx.add(t);
      });
    });
}

// ─── Tree-level structural validation ─────────────────────────────────────

export interface ValidateTreeOptions {
  /** Catalog of valid full-paths (from `useMasterPathCatalog`). */
  validPaths?: Set<string>;
}

/** Walk a SchemaNode tree and collect every structural / profile issue. */
export function validateTree(
  nodes: SchemaNode[],
  options: ValidateTreeOptions = {},
): SchemaValidationResult {
  const errors: SchemaValidationIssue[] = [];
  const seenIds = new Set<string>();
  const fieldProfileSchema = buildFieldProfileSchema({ validPaths: options.validPaths });

  function visit(node: SchemaNode, parent: SchemaNode | null, parentPath: string, siblingNames: Map<string, number>) {
    // Unique id
    if (seenIds.has(node.id)) {
      errors.push({
        path: node.code,
        severity: "Error",
        message: `Duplicate node id "${node.id}"`,
      });
    }
    seenIds.add(node.id);

    // Sibling-name uniqueness (case-insensitive) — `[*]` is exempt
    const key = node.name.trim().toLowerCase();
    if (node.name !== "[*]") {
      const count = (siblingNames.get(key) ?? 0) + 1;
      siblingNames.set(key, count);
      if (count > 1) {
        errors.push({
          path: `${parentPath}/${node.name}`,
          severity: "Error",
          message: `Duplicate sibling name "${node.name}"`,
        });
      }
    }

    // Structural rules per nodeType
    if (node.nodeType === "FIELD") {
      if (node.children?.length) {
        errors.push({
          path: `${parentPath}/${node.name}`,
          severity: "Error",
          message: "FIELD nodes cannot have children",
        });
      }
      // Field profile must validate
      if (node.fieldProfile) {
        const result = fieldProfileSchema.safeParse(node.fieldProfile);
        if (!result.success) {
          for (const issue of result.error.issues) {
            errors.push({
              path: `${parentPath}/${node.name}/${issue.path.join(".")}`,
              severity: "Error",
              message: issue.message,
            });
          }
        }
      } else {
        errors.push({
          path: `${parentPath}/${node.name}`,
          severity: "Warning",
          message: "Field profile is missing",
        });
      }
    } else if (node.nodeType === "OBJECT") {
      if (node.dataType !== "OBJECT") {
        errors.push({
          path: `${parentPath}/${node.name}`,
          severity: "Error",
          message: "OBJECT node must have dataType OBJECT",
        });
      }
    } else if (node.nodeType === "ARRAY") {
      const directChildren = node.children ?? [];
      if (directChildren.length !== 1 || directChildren[0]?.name !== "[*]") {
        errors.push({
          path: `${parentPath}/${node.name}`,
          severity: "Error",
          message: "ARRAY node must have a single direct child named [*]",
        });
      }
    }

    // Recurse with a fresh sibling map for the child level
    const childSiblings = new Map<string, number>();
    for (const c of node.children ?? []) {
      visit(c, node, `${parentPath}/${node.name}`, childSiblings);
    }
  }

  const rootSiblings = new Map<string, number>();
  for (const root of nodes) visit(root, null, "", rootSiblings);

  return {
    isValid: errors.filter((e) => e.severity === "Error").length === 0,
    errors,
  };
}

// ─── Utility helpers ──────────────────────────────────────────────────────

/**
 * Rewrite all `fullPath` derivatives (SourcePath/TargetPath/FieldPath/CrossField)
 * when a tree node is renamed. Operates on the in-memory profile only.
 */
export function rewriteProfilePaths(
  profile: FieldProfile,
  oldPath: string,
  newPath: string,
): FieldProfile {
  if (!oldPath || oldPath === newPath) return profile;
  const swap = (s: string) => (s === oldPath ? newPath : s.startsWith(`${oldPath}.`) ? `${newPath}${s.slice(oldPath.length)}` : s);
  return {
    ...profile,
    FieldPath: swap(profile.FieldPath),
    SourceMapping: {
      ...profile.SourceMapping,
      SourcePath: swap(profile.SourceMapping.SourcePath),
      TargetPath: swap(profile.SourceMapping.TargetPath),
    },
    CrossFieldValidations: profile.CrossFieldValidations.map((c) => ({
      ...c,
      FieldPath: swap(c.FieldPath),
    })),
  };
}

/** Convert legacy free-text Rule values to enum (defensive on load). */
export function normaliseLegacyRule(s: string | undefined): ValidationRuleType | null {
  if (!s) return null;
  const v = s.trim().toUpperCase().replace(/-/g, "_");
  return VALIDATION_RULE_TYPES.includes(v as ValidationRuleType) ? (v as ValidationRuleType) : null;
}

export type { FieldValidationRule };
