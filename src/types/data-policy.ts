export type DataPolicyUnmaskType = "FULL" | "PARTIAL";

export type DataPolicyPartialConfig =
  | { type: "LAST_N"; value: number }
  | { type: "FIRST_N"; value: number }
  | { type: "MASK_DOMAIN"; value: number };

export type DataPolicyField = {
  fieldName: string;
  isMasked: boolean;
  isUnmasked: boolean;
  unmaskType: DataPolicyUnmaskType | null;
  partialConfig?: DataPolicyPartialConfig;
  /** UI metadata returned by API/mock for display in the drawer. */
  dataType?: string;
};

export type DataPolicy = {
  id: string;
  institutionId: string;
  productId: string;
  fields: DataPolicyField[];
  updatedBy: string;
  updatedAt: string;
};

