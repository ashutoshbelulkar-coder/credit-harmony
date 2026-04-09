import type { SourceType } from "@/types/schema-mapper";

export type MasterSchemaStatus =
  | "draft"
  | "pending"
  | "active"
  | "deprecated"
  | "rejected"
  | "changes_requested";

export type Masking = "none" | "partial" | "full";

export type MasterSchemaDataType =
  | "string"
  | "number"
  | "integer"
  | "decimal"
  | "boolean"
  | "date"
  | "enum"
  | "object"
  | "array";

export interface MasterSchemaField {
  name: string;
  dataType: MasterSchemaDataType;
  required: boolean;
  masking: Masking;
  description: string;
}

export interface MasterSchemaImpactRef {
  id: string;
  name: string;
  /** Optional route for deep-linking. */
  href?: string;
}

export interface MasterSchemaImpactAnalysis {
  apis: MasterSchemaImpactRef[];
  products: MasterSchemaImpactRef[];
  institutions: MasterSchemaImpactRef[];
}

export type MasterSchemaDiffChangeType = "added" | "removed" | "modified";

export interface MasterSchemaDiffEntry {
  fieldName: string;
  changeType: MasterSchemaDiffChangeType;
  oldValue: string | null;
  newValue: string | null;
}

export interface MasterSchemaVersionEntry {
  id: string;
  version: string;
  createdAt: string;
  createdBy: string;
  status: MasterSchemaStatus;
  changesSummary: string;
  diff: MasterSchemaDiffEntry[];
  /** Immutable snapshot of the schema JSON at this version. */
  schemaSnapshot: MasterSchema;
}

export interface MasterSchema {
  id: string;
  name: string;
  sourceType: SourceType;
  description: string;
  version: string;
  status: MasterSchemaStatus;
  fields: MasterSchemaField[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  /** Raw schema JSON (for JSON View tab). */
  rawJson: unknown;
  versions: MasterSchemaVersionEntry[];
  impact: MasterSchemaImpactAnalysis;
}

export interface MasterSchemaListItem {
  id: string;
  sourceType: SourceType;
  name: string;
  version: string;
  fieldCount: number;
  status: MasterSchemaStatus;
  updatedAt: string;
}

