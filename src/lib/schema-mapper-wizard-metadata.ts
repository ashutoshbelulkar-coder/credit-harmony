/**
 * Schema Mapper wizard — labeled options for Source Type and Data Category.
 * Defaults match legacy UI; `src/data/schema-mapper.json` can override via
 * `wizardSourceTypeOptions` / `wizardDataCategoryOptions`.
 */

export interface WizardLabeledOption {
  value: string;
  label: string;
}

export const FALLBACK_WIZARD_SOURCE_TYPE_OPTIONS: WizardLabeledOption[] = [
  { value: "telecom", label: "Telecom" },
  { value: "utility", label: "Utility" },
  { value: "bank", label: "Bank" },
  { value: "gst", label: "GST" },
  { value: "custom", label: "Custom" },
];

export const FALLBACK_WIZARD_DATA_CATEGORY_OPTIONS: WizardLabeledOption[] = [
  { value: "Financial Data", label: "Financial Data" },
  { value: "Business Data", label: "Business Data" },
  { value: "Behavioral Data", label: "Behavioral Data" },
  { value: "Consortium Data", label: "Consortium Data" },
  { value: "Fraud Signals", label: "Fraud Signals" },
  { value: "Synthetic / Test", label: "Synthetic / Test" },
];

export function normaliseWizardLabeledOptions(
  raw: unknown,
  fallback: WizardLabeledOption[]
): WizardLabeledOption[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...fallback];
  const out: WizardLabeledOption[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const value = String(o.value ?? o.id ?? "").trim();
    const label = String(o.label ?? o.name ?? value).trim();
    if (value && label) out.push({ value, label });
  }
  return out.length > 0 ? out : [...fallback];
}
