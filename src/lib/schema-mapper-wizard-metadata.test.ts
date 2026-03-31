import { describe, expect, it } from "vitest";
import {
  normaliseWizardLabeledOptions,
  FALLBACK_WIZARD_SOURCE_TYPE_OPTIONS,
  FALLBACK_WIZARD_DATA_CATEGORY_OPTIONS,
} from "@/lib/schema-mapper-wizard-metadata";

describe("normaliseWizardLabeledOptions", () => {
  it("returns fallback when raw is not an array", () => {
    expect(normaliseWizardLabeledOptions(null, FALLBACK_WIZARD_SOURCE_TYPE_OPTIONS)).toEqual(
      FALLBACK_WIZARD_SOURCE_TYPE_OPTIONS
    );
  });

  it("maps value/label from objects", () => {
    const out = normaliseWizardLabeledOptions(
      [{ value: "x", label: "X Label" }],
      FALLBACK_WIZARD_SOURCE_TYPE_OPTIONS
    );
    expect(out).toEqual([{ value: "x", label: "X Label" }]);
  });

  it("accepts id/name as aliases", () => {
    const out = normaliseWizardLabeledOptions([{ id: "a", name: "A" }], FALLBACK_WIZARD_DATA_CATEGORY_OPTIONS);
    expect(out).toEqual([{ value: "a", label: "A" }]);
  });

  it("falls back when array is empty after filtering", () => {
    const out = normaliseWizardLabeledOptions([{}], FALLBACK_WIZARD_SOURCE_TYPE_OPTIONS);
    expect(out).toEqual(FALLBACK_WIZARD_SOURCE_TYPE_OPTIONS);
  });
});
