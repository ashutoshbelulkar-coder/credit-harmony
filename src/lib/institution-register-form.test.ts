import { describe, it, expect } from "vitest";
import {
  resolveRegisterFormClientSide,
  buildRegisterDetailsSchema,
  defaultValuesFromRegisterForm,
  mapRegisterDetailsToCreateBody,
} from "./institution-register-form";

const mockTypes = ["Commercial Bank", "MFI"];
const mockConsortia = [
  { id: "CONS_001", name: "Alpha", type: "Network" },
  { id: "CONS_002", name: "Beta", type: "Vertical" },
];

describe("institution-register-form (client)", () => {
  describe("resolveRegisterFormClientSide", () => {
    it("loads default geography sections", () => {
      const rf = resolveRegisterFormClientSide("default", mockTypes, mockConsortia);
      expect(rf.geographyId).toBe("default");
      expect(rf.sections.some((s) => s.id === "entity")).toBe(true);
      const inst = rf.sections
        .find((s) => s.id === "entity")
        ?.fields.find((f) => f.name === "institutionType");
      expect(inst?.options.map((o) => o.value)).toEqual(mockTypes);
    });

    it("falls back to defaultGeography for unknown geography id", () => {
      const rf = resolveRegisterFormClientSide("unknown-geo-xyz", mockTypes, mockConsortia);
      expect(rf.geographyId).toBe("default");
    });

    it("kenya geography uses select for jurisdiction with fixed options", () => {
      const rf = resolveRegisterFormClientSide("kenya", mockTypes, mockConsortia);
      expect(rf.geographyId).toBe("kenya");
      const jur = rf.sections
        .find((s) => s.id === "regulatory")
        ?.fields.find((f) => f.name === "jurisdiction");
      expect(jur?.inputType).toBe("select");
      expect(jur?.options.map((o) => o.value).sort()).toEqual(["Kenya", "Tanzania", "Uganda"].sort());
    });
  });

  describe("buildRegisterDetailsSchema", () => {
    it("rejects empty required text field", () => {
      const rf = resolveRegisterFormClientSide("default", mockTypes, mockConsortia);
      const schema = buildRegisterDetailsSchema(rf);
      const vals = defaultValuesFromRegisterForm(rf);
      const parsed = schema.safeParse(vals);
      expect(parsed.success).toBe(false);
    });

    it("accepts valid default-geography-shaped values", () => {
      const rf = resolveRegisterFormClientSide("default", mockTypes, mockConsortia);
      const schema = buildRegisterDetailsSchema(rf);
      const parsed = schema.safeParse({
        legalName: "Acme Bank Ltd",
        tradingName: "Acme",
        registrationNumber: "REG-1",
        institutionType: "Commercial Bank",
        jurisdiction: "Kenya",
        licenseNumber: "LIC-1",
        contactEmail: "ops@acme.test",
        contactPhone: "+254700000000",
        isDataSubmitter: true,
        isSubscriber: false,
        consortiumIds: [],
      });
      expect(parsed.success).toBe(true);
    });

    it("kenya: rejects jurisdiction not in enum", () => {
      const rf = resolveRegisterFormClientSide("kenya", mockTypes, mockConsortia);
      const schema = buildRegisterDetailsSchema(rf);
      const parsed = schema.safeParse({
        legalName: "Acme Bank Ltd",
        tradingName: "Acme",
        registrationNumber: "REG-1",
        institutionType: "Commercial Bank",
        jurisdiction: "Rwanda",
        licenseNumber: "LIC-1",
        contactEmail: "ops@acme.test",
        contactPhone: "+254700000000",
        isDataSubmitter: true,
        isSubscriber: false,
        consortiumIds: [],
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("mapRegisterDetailsToCreateBody", () => {
    it("maps legalName to name via apiKey", () => {
      const rf = resolveRegisterFormClientSide("default", mockTypes, mockConsortia);
      const body = mapRegisterDetailsToCreateBody(
        {
          legalName: "Full Legal Name",
          tradingName: "T",
          registrationNumber: "R",
          institutionType: "MFI",
          jurisdiction: "Kenya",
          licenseNumber: "L",
          contactEmail: "x@y.z",
          contactPhone: "+1",
          isDataSubmitter: true,
          isSubscriber: false,
          consortiumIds: [],
        },
        rf
      );
      expect(body.name).toBe("Full Legal Name");
      expect(body.legalName).toBeUndefined();
    });

    it("includes consortiumIds only when subscriber and list non-empty", () => {
      const rf = resolveRegisterFormClientSide("default", mockTypes, mockConsortia);
      const sub = mapRegisterDetailsToCreateBody(
        {
          legalName: "L",
          tradingName: "T",
          registrationNumber: "R",
          institutionType: "MFI",
          jurisdiction: "Kenya",
          licenseNumber: "L",
          contactEmail: "x@y.z",
          contactPhone: "+1",
          isDataSubmitter: false,
          isSubscriber: true,
          consortiumIds: ["CONS_001"],
        },
        rf
      );
      expect(sub.consortiumIds).toEqual(["CONS_001"]);

      const noSub = mapRegisterDetailsToCreateBody(
        {
          legalName: "L",
          tradingName: "T",
          registrationNumber: "R",
          institutionType: "MFI",
          jurisdiction: "Kenya",
          licenseNumber: "L",
          contactEmail: "x@y.z",
          contactPhone: "+1",
          isDataSubmitter: true,
          isSubscriber: false,
          consortiumIds: ["CONS_001"],
        },
        rf
      );
      expect(noSub.consortiumIds).toBeUndefined();
    });
  });
});
