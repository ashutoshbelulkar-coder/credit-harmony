import { describe, expect, it } from "vitest";
import {
  apiRequestStatusBadgeClass,
  apiRequestStatusLabel,
  enquiryStatusBadgeClass,
  institutionLifecycleStatusBadgeClass,
  institutionLifecycleStatusKey,
  institutionLifecycleStatusLabel,
  normalizeStatusKey,
  reportStatusBadgeClass,
  reportStatusLabel,
  reportStatusesEqual,
  userAccountStatusBadgeClass,
  userAccountStatusLabel,
} from "./status-badges";

describe("normalizeStatusKey", () => {
  it("lowercases and maps spaces to underscores", () => {
    expect(normalizeStatusKey("Rate Limited")).toBe("rate_limited");
    expect(normalizeStatusKey("SUCCESS")).toBe("success");
  });
});

describe("api request status (Spring wire values)", () => {
  it("maps lowercase DB values to success tint in badge class string", () => {
    expect(apiRequestStatusBadgeClass("success")).toContain("bg-success/20");
    expect(apiRequestStatusLabel("success")).toBe("Success");
  });
  it("maps Title Case mock values", () => {
    expect(apiRequestStatusBadgeClass("Failed")).toContain("bg-destructive/20");
    expect(apiRequestStatusLabel("authentication_failed")).toBe("Authentication Failed");
  });
});

describe("enquiry status", () => {
  it("styles consent_missing", () => {
    expect(enquiryStatusBadgeClass("consent_missing")).toContain("bg-warning/20");
  });
});

describe("report status", () => {
  it("treats queued and Queued as equal for filters", () => {
    expect(reportStatusesEqual("queued", "Queued")).toBe(true);
    expect(reportStatusLabel("completed")).toBe("Completed");
    expect(reportStatusBadgeClass("failed")).toContain("bg-destructive/20");
  });
});

describe("institution lifecycle status", () => {
  it("normalises pending variants", () => {
    expect(institutionLifecycleStatusKey("Pending Approval")).toBe("pending_approval");
    expect(institutionLifecycleStatusKey("pending-approval")).toBe("pending_approval");
  });
  it("maps active and suspended to badge classes", () => {
    expect(institutionLifecycleStatusBadgeClass("active")).toContain("bg-success/15");
    expect(institutionLifecycleStatusBadgeClass("suspended")).toContain("bg-destructive/15");
    expect(institutionLifecycleStatusLabel("active")).toBe("Active");
  });
});

describe("user account status", () => {
  it("maps invited to info tint", () => {
    expect(userAccountStatusBadgeClass("invited")).toContain("bg-info/15");
    expect(userAccountStatusLabel("Active")).toBe("Active");
  });
});
