import { describe, it, expect } from "vitest";
import { showDemoAccountRecoveryUi, showDemoAgentsRequestUi } from "@/lib/feature-flags";

describe("feature-flags", () => {
  it("showDemoAgentsRequestUi matches showDemoAccountRecoveryUi", () => {
    expect(showDemoAgentsRequestUi()).toBe(showDemoAccountRecoveryUi());
  });

  it("showDemoAccountRecoveryUi returns boolean (env-driven)", () => {
    expect(typeof showDemoAccountRecoveryUi()).toBe("boolean");
  });
});
