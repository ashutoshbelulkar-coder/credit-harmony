import type { AllowedValues, CanonicalAttribute } from "./types";

function exportAllowedValues(av: AllowedValues | null): string | string[] | null {
  if (!av) return null;
  if (av.kind === "domain") return `domain:${av.domain}`;
  if (av.kind === "format") return av.pattern;
  return av.values;
}

/** Snake_case export shape matching canonical_dictionary.json. Omits UI/audit-only fields. */
export function toExportShape(attr: CanonicalAttribute): Record<string, unknown> {
  return {
    attribute_id: attr.attributeId,
    canonical_qualifier: attr.canonicalQualifier,
    class: attr.class,
    target_table: attr.targetTable,
    column_family: attr.columnFamily,
    applies_to: attr.appliesTo,
    attribute_group: attr.attributeGroup,
    data_type: attr.dataType,
    sensitivity: attr.sensitivity,
    governance: {
      legal_basis_required: attr.governance.legalBasisRequired,
      special_category: attr.governance.specialCategory,
      tokenize: attr.governance.tokenize,
    },
    normalization_rule: attr.normalizationRule,
    allowed_values: exportAllowedValues(attr.allowedValues),
    definition: attr.definition,
    synonyms: attr.synonyms,
    status: attr.status,
    retention_class: attr.retentionClass,
    sources: attr.sources,
    version: attr.version,
    rules: attr.rules,
  };
}

export function exportAttributesJson(attributes: CanonicalAttribute[]): string {
  return JSON.stringify(attributes.map(toExportShape), null, 2);
}
