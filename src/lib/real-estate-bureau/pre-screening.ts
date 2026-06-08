import type { RiskLevel } from "./types";

/** Bureau pre-screening outcome derived from property risk intelligence. */
export type PreScreeningOutcome =
  | "pre_screen_approved"
  | "pre_screen_conditional"
  | "manual_screening_required";

export const PRE_SCREENING_OUTCOMES: PreScreeningOutcome[] = [
  "pre_screen_approved",
  "pre_screen_conditional",
  "manual_screening_required",
];

export const PRE_SCREENING_CONFIG: Record<
  PreScreeningOutcome,
  {
    label: string;
    shortLabel: string;
    summary: string;
    riskLevels: RiskLevel[];
  }
> = {
  pre_screen_approved: {
    label: "Pre-screening Approved",
    shortLabel: "Approved",
    summary:
      "Bureau checks cleared with no material flags. Proceed to standard underwriting without additional bureau review.",
    riskLevels: ["Low"],
  },
  pre_screen_conditional: {
    label: "Pre-screening Approved with Conditions",
    shortLabel: "With Conditions",
    summary:
      "Bureau profile is acceptable subject to documented conditions — encumbrance verification, missing documents, or exposure limits must be satisfied before disbursement.",
    riskLevels: ["Medium"],
  },
  manual_screening_required: {
    label: "Manual Screening Required",
    shortLabel: "Manual Screening",
    summary:
      "Material bureau, encumbrance, or documentation concerns identified. Route to credit operations or senior review before approval.",
    riskLevels: ["High"],
  },
};

export function riskLevelToPreScreeningOutcome(level: RiskLevel): PreScreeningOutcome {
  if (level === "Low") return "pre_screen_approved";
  if (level === "High") return "manual_screening_required";
  return "pre_screen_conditional";
}

export function preScreeningLabel(outcome: PreScreeningOutcome): string {
  return PRE_SCREENING_CONFIG[outcome].label;
}

export function preScreeningSummary(outcome: PreScreeningOutcome): string {
  return PRE_SCREENING_CONFIG[outcome].summary;
}
