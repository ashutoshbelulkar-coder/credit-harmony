import { describe, it, expect } from "vitest";
import type { AppState } from "./state.js";
import {
  resolveRegisterGeographyId,
  validateRegisterInstitutionBody,
  buildRegisterFormPayload,
} from "./institutionRegisterForm.js";

/** Minimal state for register-form resolution (only `institutionTypes` + `consortiums` are read). */
function registerFormState(over: Partial<Pick<AppState, "institutionTypes" | "consortiums">> = {}): AppState {
  return {
    institutionTypes: over.institutionTypes ?? ["Commercial Bank", "MFI"],
    consortiums: over.consortiums ?? [
      { id: "CONS_001", name: "Alpha Consortium", type: "Network", status: "active" },
      { id: "CONS_003", name: "Draft Consortium", type: "Network", status: "pending" },
    ],
  } as AppState;
}

describe("institutionRegisterForm", () => {
  describe("resolveRegisterGeographyId", () => {
    it("returns kenya when that geography exists in config", () => {
      expect(resolveRegisterGeographyId("kenya")).toBe("kenya");
    });

    it("falls back to defaultGeography for unknown keys", () => {
      expect(resolveRegisterGeographyId("no-such-region-xyz")).toBe("default");
    });

    it("uses default when query is empty or whitespace", () => {
      expect(resolveRegisterGeographyId("")).toBe("default");
      expect(resolveRegisterGeographyId("   ")).toBe("default");
      expect(resolveRegisterGeographyId(undefined)).toBe("default");
    });
  });

  describe("buildRegisterFormPayload", () => {
    it("resolves institutionType options from state.institutionTypes", () => {
      const state = registerFormState({ institutionTypes: ["Type A", "Type B"] });
      const form = buildRegisterFormPayload(state, "default");
      const entity = form.sections.find((s) => s.id === "entity");
      const inst = entity?.fields.find((f) => f.name === "institutionType");
      expect(inst?.options.map((o) => o.value)).toEqual(["Type A", "Type B"]);
    });

    it("resolves activeConsortiums only for multiselect optionSource", () => {
      const state = registerFormState();
      const form = buildRegisterFormPayload(state, "default");
      const cons = form.sections.find((s) => s.id === "consortium");
      const field = cons?.fields.find((f) => f.name === "consortiumIds");
      const ids = field?.options.map((o) => o.value) ?? [];
      expect(ids).toContain("CONS_001");
      expect(ids).not.toContain("CONS_003");
    });

    it("exposes section legends and field labels from geography config (API-driven Step 1)", () => {
      const form = buildRegisterFormPayload(registerFormState(), "default");
      expect(form.sections.find((s) => s.id === "entity")?.legend).toBe("Entity Information");
      expect(form.sections.find((s) => s.id === "regulatory")?.legend).toBe("Regulatory Details");
      expect(form.sections.find((s) => s.id === "contact")?.legend).toBe("Contact Information");
      const email = form.sections
        .find((s) => s.id === "contact")
        ?.fields.find((f) => f.name === "contactEmail");
      expect(email?.label).toBe("Contact Email");
    });

    it("sets selectionMode single for institutionType select and multiple for consortiumIds multiselect", () => {
      const form = buildRegisterFormPayload(registerFormState(), "default");
      const inst = form.sections
        .find((s) => s.id === "entity")
        ?.fields.find((f) => f.name === "institutionType");
      expect(inst?.inputType).toBe("select");
      expect(inst?.selectionMode).toBe("single");
      const cons = form.sections
        .find((s) => s.id === "consortium")
        ?.fields.find((f) => f.name === "consortiumIds");
      expect(cons?.inputType).toBe("multiselect");
      expect(cons?.selectionMode).toBe("multiple");
    });
  });

  describe("validateRegisterInstitutionBody", () => {
    const baseBody = (): Record<string, unknown> => ({
      name: "Test Legal",
      tradingName: "Test Trading",
      institutionType: "Commercial Bank",
      institutionLifecycleStatus: "pending",
      registrationNumber: "REG-UNIT-1",
      jurisdiction: "Kenya",
      licenseNumber: "LIC-1",
      contactEmail: "a@example.test",
      contactPhone: "+254700000000",
      isDataSubmitter: true,
      isSubscriber: false,
    });

    it("returns null for a valid default-geography payload", () => {
      const err = validateRegisterInstitutionBody(baseBody(), registerFormState(), "default");
      expect(err).toBeNull();
    });

    it("returns error when no participation type is selected", () => {
      const b = { ...baseBody(), isDataSubmitter: false, isSubscriber: false };
      const err = validateRegisterInstitutionBody(b, registerFormState(), "default");
      expect(err).toBe("At least one participation type must be selected");
    });

    it("returns error for invalid email on default geography", () => {
      const err = validateRegisterInstitutionBody(
        { ...baseBody(), contactEmail: "not-an-email" },
        registerFormState(),
        "default"
      );
      expect(err).toMatch(/valid email/i);
    });

    it("kenya: accepts jurisdiction Kenya", () => {
      const err = validateRegisterInstitutionBody(baseBody(), registerFormState(), "kenya");
      expect(err).toBeNull();
    });

    it("kenya: rejects jurisdiction not in enum", () => {
      const err = validateRegisterInstitutionBody(
        { ...baseBody(), jurisdiction: "Rwanda" },
        registerFormState(),
        "kenya"
      );
      expect(err).toBe("Invalid Jurisdiction");
    });

    it("skips consortiumIds validation when not subscriber", () => {
      const err = validateRegisterInstitutionBody(
        {
          ...baseBody(),
          consortiumIds: ["CONS_999"],
        },
        registerFormState(),
        "default"
      );
      expect(err).toBeNull();
    });

    it("rejects invalid consortium id when subscriber", () => {
      const err = validateRegisterInstitutionBody(
        {
          ...baseBody(),
          isSubscriber: true,
          isDataSubmitter: false,
          consortiumIds: ["CONS_999"],
        },
        registerFormState(),
        "default"
      );
      expect(err).toMatch(/Invalid/);
    });
  });
});
