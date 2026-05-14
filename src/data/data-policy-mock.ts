import type { DataPolicy, DataPolicyField, DataPolicyPartialConfig } from "@/types/data-policy";

function seededInt(seed: string, mod: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return mod === 0 ? 0 : h % mod;
}

function inferTemplate(fieldName: string): DataPolicyPartialConfig | undefined {
  const f = fieldName.toLowerCase();
  if (f.includes("pan") || f.includes("card_number") || f.includes("cardnumber")) return { type: "LAST_N", value: 4 };
  if (f.includes("phone") || f.includes("msisdn") || f.includes("mobile")) return { type: "LAST_N", value: 2 };
  if (f.includes("email")) return { type: "MASK_DOMAIN", value: 0 };
  if (f.includes("name") && !f.includes("company")) return { type: "FIRST_N", value: 1 };
  return undefined;
}

export function inferPartialTemplate(fieldName: string): DataPolicyPartialConfig | undefined {
  return inferTemplate(fieldName);
}

function defaultFields(productSeed: string): DataPolicyField[] {
  const base: Array<Pick<DataPolicyField, "fieldName" | "dataType">> = [
    { fieldName: "PAN", dataType: "string" },
    { fieldName: "Phone", dataType: "string" },
    { fieldName: "Email", dataType: "string" },
    { fieldName: "Name", dataType: "string" },
    { fieldName: "NationalId", dataType: "string" },
    { fieldName: "DateOfBirth", dataType: "date" },
    { fieldName: "AddressLine1", dataType: "string" },
    { fieldName: "Employer", dataType: "string" },
  ];

  const extraCount = 18 + seededInt(productSeed, 8);
  for (let i = 0; i < extraCount; i += 1) {
    base.push({
      fieldName: `MaskedField_${String(i + 1).padStart(3, "0")}`,
      dataType: "string",
    });
  }

  return base.map((b) => ({
    fieldName: b.fieldName,
    isMasked: true,
    isUnmasked: false,
    unmaskType: null,
    dataType: b.dataType,
  }));
}

export function buildMockDataPolicy(params: {
  institutionId: string;
  productId: string;
}): DataPolicy {
  const seed = `${params.institutionId}:${params.productId}`;
  const fields = defaultFields(seed);
  return {
    id: `dp_${seededInt(seed, 1_000_000)}`,
    institutionId: params.institutionId,
    productId: params.productId,
    fields,
    updatedBy: "system",
    updatedAt: new Date().toISOString(),
  };
}

export function applyPartialTemplate(field: DataPolicyField): DataPolicyField {
  const tpl = inferTemplate(field.fieldName);
  if (!tpl) return field;
  return { ...field, partialConfig: tpl };
}

