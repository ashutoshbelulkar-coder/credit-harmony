import { describe, expect, it } from "vitest";
import {
  countEnabledSectionPermissions,
  mergeRolePermissionsFromApi,
  sectionPermissionSlotCount,
} from "@/data/user-management-mock";

describe("mergeRolePermissionsFromApi", () => {
  it("uses built-in matrix when API omits permissions (Spring-style)", () => {
    const m = mergeRolePermissionsFromApi("Super Admin", undefined);
    expect(countEnabledSectionPermissions(m)).toBe(sectionPermissionSlotCount);
  });

  it("fills sparse section objects from built-in defaults", () => {
    const sparse = { dashboard: {} };
    const m = mergeRolePermissionsFromApi("Super Admin", sparse);
    expect(countEnabledSectionPermissions(m)).toBe(sectionPermissionSlotCount);
  });

  it("honours explicit false from API over built-in true", () => {
    const m = mergeRolePermissionsFromApi("Super Admin", {
      dashboard: { View: false, Create: true, Edit: true, Delete: true, Export: true },
    });
    expect(m.dashboard?.View).toBe(false);
    expect(m.dashboard?.Create).toBe(true);
  });

  it("unknown role with empty API yields empty matrix", () => {
    const m = mergeRolePermissionsFromApi("Custom Role XYZ", {});
    expect(countEnabledSectionPermissions(m)).toBe(0);
  });
});
