import { describe, expect, it } from "vitest";
import {
  apiRequestStatusBadgeClass,
  apiRequestStatusLabel,
  enquiryStatusBadgeClass,
  normalizeStatusKey,
  reportStatusBadgeClass,
  reportStatusLabel,
  reportStatusesEqual,
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
