import { describe, expect, it } from "vitest";
import {
  CROSS_ASSET_PACKET_ID,
  SUBJECT_PACKET_ID,
  attributesForPacket,
} from "@/data/attribute-dictionary";
import {
  applySubjectScopeChange,
  attributesDroppedByScopeChange,
  contractContinueBlockers,
  contractHasTrendedCapable,
  contractReferencesDeprecated,
  defaultPacketConfig,
  defaultSelectedIdsForPacket,
  deriveProductSensitivity,
  emptyContractSelection,
  evaluateReconciliationKey,
  includedAttributeIds,
  packetsForScope,
  summarizeContract,
  toggleAttribute,
  toggleEventStream,
  togglePacket,
} from "@/lib/product-contract";

function withSubjectPan(sel = emptyContractSelection()) {
  return toggleAttribute(sel, "subject.pan", true);
}

describe("product contract helpers", () => {
  it("defaults Standard and PII on, Sensitive-PII off, system included", () => {
    const ids = defaultSelectedIdsForPacket(SUBJECT_PACKET_ID);
    expect(ids).toContain("subject.full_name");
    expect(ids).toContain("subject.dob");
    expect(ids).toContain("subject.provider_id");
    expect(ids).not.toContain("subject.pan");
    expect(ids).not.toContain("subject.national_id");

    const credit = defaultSelectedIdsForPacket("credit_facility");
    expect(credit).toContain("credit.outstanding_balance");
    expect(credit).not.toContain("credit.account_number");
    expect(credit).not.toContain("credit.current_balance");
    expect(credit).not.toContain("credit.bureau_score");
  });

  it("reconciliation key is unmet until identifier or name+dob", () => {
    const emptySubject: ReturnType<typeof emptyContractSelection> = {
      ...emptyContractSelection(),
      packetConfigs: [
        {
          packetId: SUBJECT_PACKET_ID,
          selectedFields: ["subject.provider_id", "subject.reported_at"],
          selectedDerivedFields: [],
        },
      ],
    };
    expect(evaluateReconciliationKey(emptySubject).met).toBe(false);

    const nameDob = emptyContractSelection();
    expect(evaluateReconciliationKey(nameDob).met).toBe(true);
    expect(evaluateReconciliationKey(nameDob).via).toBe("name_dob");

    const panOnly: ReturnType<typeof emptyContractSelection> = {
      ...emptyContractSelection(),
      packetConfigs: [
        {
          packetId: SUBJECT_PACKET_ID,
          selectedFields: ["subject.pan", "subject.provider_id", "subject.reported_at"],
          selectedDerivedFields: [],
        },
      ],
    };
    const panState = evaluateReconciliationKey(panOnly);
    expect(panState.met).toBe(true);
    expect(panState.via).toBe("identifier");
    expect(panState.summary).toContain("pan");
  });

  it("derives Medium from PII and High from Sensitive-PII", () => {
    const medium = deriveProductSensitivity(includedAttributeIds(emptyContractSelection()));
    expect(medium.value).toBe("Medium");

    const high = deriveProductSensitivity(includedAttributeIds(withSubjectPan()));
    expect(high.value).toBe("High");
    expect(high.reason).toMatch(/pan/);
  });

  it("hides telco for Company and GST for Individual", () => {
    const individualIds = packetsForScope("INDIVIDUAL").map((p) => p.id);
    const companyIds = packetsForScope("COMPANY").map((p) => p.id);
    expect(individualIds).toContain("telco_profile");
    expect(individualIds).not.toContain("gst_registration");
    expect(companyIds).toContain("gst_registration");
    expect(companyIds).not.toContain("telco_profile");
  });

  it("blocks Continue until a non-subject packet is selected", () => {
    const blockers = contractContinueBlockers(emptyContractSelection());
    expect(blockers.some((b) => b.toLowerCase().includes("packet"))).toBe(true);

    const withCredit = togglePacket(emptyContractSelection(), "credit_facility", true);
    expect(contractContinueBlockers(withCredit)).toEqual([]);
  });

  it("counts dropped attributes when changing subject scope", () => {
    let sel = togglePacket(emptyContractSelection(), "telco_profile", true);
    const dropped = attributesDroppedByScopeChange(sel, "COMPANY");
    expect(dropped).toBeGreaterThan(0);
    sel = applySubjectScopeChange(sel, "COMPANY");
    expect(sel.packetIds).not.toContain("telco_profile");
    expect(sel.packetIds).toContain(SUBJECT_PACKET_ID);
  });

  it("enables event-stream attributes only when the stream is toggled", () => {
    let sel = togglePacket(emptyContractSelection(), "credit_facility", true);
    const before = includedAttributeIds(sel);
    expect(before).not.toContain("credit.repayment_period");
    sel = toggleEventStream(sel, "credit_facility", "repayment_history", true);
    expect(includedAttributeIds(sel)).toContain("credit.repayment_period");
    expect(contractHasTrendedCapable(sel)).toBe(true);
  });

  it("does not treat pending/deprecated as selected by default", () => {
    const cfg = defaultPacketConfig("credit_facility");
    expect(cfg.selectedFields).not.toContain("credit.current_balance");
    const analytics = defaultPacketConfig(CROSS_ASSET_PACKET_ID);
    expect(analytics.selectedDerivedFields ?? []).not.toContain("feature.income_band");
  });

  it("flags a contract that includes a deprecated attribute", () => {
    const cfg: PacketConfig = {
      ...defaultPacketConfig("credit_facility"),
      selectedFields: [
        ...defaultPacketConfig("credit_facility").selectedFields,
        "credit.current_balance",
      ],
    };
    const sel = {
      ...emptyContractSelection(),
      packetIds: [SUBJECT_PACKET_ID, "credit_facility"],
      packetConfigs: [defaultPacketConfig(SUBJECT_PACKET_ID), cfg],
    };
    expect(contractReferencesDeprecated(sel)).toBe(true);
  });

  it("summarises packet and Sensitive-PII counts", () => {
    const sel = withSubjectPan(togglePacket(emptyContractSelection(), "credit_facility", true));
    const summary = summarizeContract(sel);
    expect(summary.packetCount).toBe(2);
    expect(summary.sensitivePiiCount).toBeGreaterThanOrEqual(1);
    expect(summary.sensitivity).toBe("High");
    expect(summary.reconciliation.met).toBe(true);
  });

  it("keeps system attributes even if omitted from selectedFields", () => {
    const ids = includedAttributeIds({
      ...emptyContractSelection(),
      packetConfigs: [
        {
          packetId: SUBJECT_PACKET_ID,
          selectedFields: ["subject.full_name", "subject.dob"],
          selectedDerivedFields: [],
        },
      ],
    });
    expect(ids).toContain("subject.provider_id");
    expect(ids).toContain("subject.reported_at");
    expect(attributesForPacket(SUBJECT_PACKET_ID).some((a) => a.system)).toBe(true);
  });
});
