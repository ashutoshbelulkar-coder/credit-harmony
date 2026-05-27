// MongoDB Schema Node Model
export interface SchemaNode {
  id: string;
  name: string;
  code: string;
  nodeType: 'FIELD' | 'OBJECT' | 'ARRAY';
  dataType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'OBJECT' | 'ARRAY';
  sourceMapping: string;
  destinationMapping: string;
  validations: Validation[];
  businessRules: BusinessRule[];
  transformations: Transformation[];
  children: SchemaNode[];
  fieldProfile?: FieldProfile;
  parent?: SchemaNode;
}

export interface Validation {
  id: string;
  type: string;
  value?: string;
}

export interface BusinessRule {
  id: string;
  code: string;
  description?: string;
}

export interface Transformation {
  id: string;
  type: string;
  value?: string;
}

export interface Datasource {
  id: string;
  name: string;
  sourceType: SourceMappingType;
  status: DatasourceStatus;
  pkPattern: string;
  profileReviewStatus: ProfileReviewStatus;
  reviewComments: ReviewComment[];
  nodes: SchemaNode[];
}

export interface ReviewComment {
  id: string;
  action: ProfileReviewAction;
  comment: string;
  createdAt: string;
}

export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SchemaProfileExport {
  version: number;
  exportedAt: string;
  datasources: Datasource[];
  fieldProfiles: FieldProfile[];
}

export interface FieldProfile {
  PK: string;
  SK: string;
  FieldPath: string;
  Section: string;
  FieldName: string;
  DisplayName: string;
  DataType: SchemaNode['dataType'];
  IsPII: boolean;
  SimilarFields: string[];
  Description: string;
  Validation: FieldValidationProfile;
  BusinessValidations: string[];
  CrossFieldValidations: CrossFieldValidation[];
  SourceMapping: FieldSourceMapping;
  ValueMode: FieldValueMode;
  DefaultValue: string | null;
  PossibleValues: string[];
  Transformations: string[];
}

export interface FieldValidationProfile {
  Type: string;
  Rules: FieldValidationRule[];
}

export interface FieldValidationRule {
  Rule: string;
  Severity: ValidationSeverity;
  Value?: string | number | null;
  Pattern?: string;
  Message: string;
}

export interface CrossFieldValidation {
  FieldPath: string;
  Rule: string;
  Severity: ValidationSeverity;
}

export interface FieldSourceMapping {
  SourceType: SourceMappingType;
  SourcePath: string;
  TargetPath: string;
}

export type SourceMappingType = 'JSON' | 'XML' | 'CSV';
export type DatasourceStatus = 'ACTIVE' | 'INACTIVE';
export type ProfileReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
export type ProfileReviewAction = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
export type ValidationSeverity = 'Error' | 'Warning' | 'Info';
export type FieldValueMode = 'DEFAULT' | 'ENUM';

// Tree Path Picker Models
export interface TreePathNode {
  key: string;              // The field name (last segment)
  fullPath: string;         // Full dot-notation path (e.g., "BasicInformation.CompanyName")
  isArray: boolean;         // Whether this path ends with [*]
  isLeaf: boolean;          // Whether this is a leaf node (selectable)
  children: TreePathNode[]; // Child nodes for objects
  expanded?: boolean;       // UI state for expand/collapse
  profile?: MasterNodeProfile;
}

export interface MasterNodeProfile {
  pk: string;
  sk: string;
  fieldPath: string;
  fieldName: string;
  displayName: string;
  dataType: SchemaNode['dataType'];
  sourcePath: string;
  targetPath: string;
  validationRules: FieldValidationRule[];
  businessValidations: string[];
  crossFieldValidations: CrossFieldValidation[];
  valueMode: FieldValueMode;
  defaultValue: string | null;
  possibleValues: string[];
  transformations: string[];
  isPii: boolean;
  similarFields: string[];
  description: string;
}
