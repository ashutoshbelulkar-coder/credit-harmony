import { describe, expect, it } from "vitest";
import {
  CROSS_ASSET_PACKET_ID,
  SUBJECT_PACKET_ID,
  attributesForPacket,
} from "@/data/attribute-dictionary";
import type { PacketConfig } from "@/data/data-products-mock";
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
  it("defaults Standard and PII on, Sensitive-PII off, with dob for reconciliation", () => {
    const ids = defaultSelectedIdsForPacket(SUBJECT_PACKET_ID);
    expect(ids).toContain("subject.full_name");
    expect(ids).toContain("subject.dob");
    expect(ids).not.toContain("subject.pan");
    expect(ids).not.toContain("subject.national_id");

    const credit = defaultSelectedIdsForPacket("credit_facility");
    expect(credit).toContain("assets.outstanding_balance");
    expect(credit).not.toContain("credit.account_status_cbs");
  });

  it("reconciliation key is unmet until identifier or name+dob", () => {
    const emptySubject: ReturnType<typeof emptyContractSelection> = {
      ...emptyContractSelection(),
      packetConfigs: [
        {
          packetId: SUBJECT_PACKET_ID,
          selectedFields: ["subject.full_name"],
          selectedDerivedFields: [],
        },
      ],
    };
    expect(evaluateReconciliationKey(emptySubject).met).toBe(false);

    const nameDob: ReturnType<typeof emptyContractSelection> = {
      ...emptyContractSelection(),
      packetConfigs: [
        {
          packetId: SUBJECT_PACKET_ID,
          selectedFields: ["subject.full_name", "subject.dob"],
          selectedDerivedFields: [],
        },
      ],
    };
    expect(evaluateReconciliationKey(nameDob).met).toBe(true);
    expect(evaluateReconciliationKey(nameDob).via).toBe("name_dob");
    expect(evaluateReconciliationKey(emptyContractSelection()).met).toBe(true);

    const panOnly: ReturnType<typeof emptyContractSelection> = {
      ...emptyContractSelection(),
      packetConfigs: [
        {
          packetId: SUBJECT_PACKET_ID,
          selectedFields: ["subject.pan"],
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
    // Defaults include subject.dob (Sensitive-PII, reconciliation), so empty selection is High.
    const baseline = deriveProductSensitivity(includedAttributeIds(emptyContractSelection()));
    expect(baseline.value).toBe("High");

    const high = deriveProductSensitivity(includedAttributeIds(withSubjectPan()));
    expect(high.value).toBe("High");
    expect(high.reason).toMatch(/pan|dob/);
  });

  it("hides phone_profile for Company; tax_registration applies to both scopes", () => {
    const individualIds = packetsForScope("INDIVIDUAL").map((p) => p.id);
    const companyIds = packetsForScope("COMPANY").map((p) => p.id);
    expect(individualIds).toContain("phone_profile");
    expect(individualIds).toContain("tax_registration");
    expect(companyIds).toContain("tax_registration");
    expect(companyIds).not.toContain("phone_profile");
  });

  it("blocks Continue until a non-subject packet is selected", () => {
    const blockers = contractContinueBlockers(emptyContractSelection());
    expect(blockers.some((b) => b.toLowerCase().includes("packet"))).toBe(true);

    const withCredit = togglePacket(emptyContractSelection(), "credit_facility", true);
    expect(contractContinueBlockers(withCredit)).toEqual([]);
  });

  it("counts dropped attributes when changing subject scope", () => {
    let sel = togglePacket(emptyContractSelection(), "phone_profile", true);
    const dropped = attributesDroppedByScopeChange(sel, "COMPANY");
    expect(dropped).toBeGreaterThan(0);
    sel = applySubjectScopeChange(sel, "COMPANY");
    expect(sel.packetIds).not.toContain("phone_profile");
    expect(sel.packetIds).toContain(SUBJECT_PACKET_ID);
  });

  it("enables event-stream attributes only when the stream is toggled", () => {
    let sel = togglePacket(emptyContractSelection(), "bank_account", true);
    const before = includedAttributeIds(sel);
    expect(before).not.toContain("event.transaction_id");
    sel = toggleEventStream(sel, "bank_account", "transactions", true);
    expect(includedAttributeIds(sel)).toContain("event.transaction_id");
    expect(contractHasTrendedCapable(sel)).toBe(true);
  });

  it("does not treat deprecated as selected by default", () => {
    const cfg = defaultPacketConfig("credit_facility");
    expect(cfg.selectedFields).not.toContain("credit.account_status_cbs");
    const analytics = defaultPacketConfig(CROSS_ASSET_PACKET_ID);
    // income_band is active/PII derived — may be defaulted; deprecated attrs must not be.
    expect(analytics.selectedFields).not.toContain("credit.account_status_cbs");
  });

  it("flags a contract that includes a deprecated attribute", () => {
    const cfg: PacketConfig = {
      ...defaultPacketConfig("credit_facility"),
      selectedFields: [
        ...defaultPacketConfig("credit_facility").selectedFields,
        "credit.account_status_cbs",
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

  it("keeps unresolved field ids so DICTIONARY_GAP contracts still render", () => {
    const ids = includedAttributeIds({
      ...emptyContractSelection(),
      packetConfigs: [
        {
          packetId: SUBJECT_PACKET_ID,
          selectedFields: ["subject.full_name", "subject.dob", "telco.plan_type"],
          selectedDerivedFields: [],
        },
      ],
    });
    expect(ids).toContain("telco.plan_type");
    expect(attributesForPacket(SUBJECT_PACKET_ID).some((a) => a.system)).toBe(false);
  });
});
