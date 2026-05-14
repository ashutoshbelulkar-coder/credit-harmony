/**
 * Service-level tests for the Data Management mock store. These exercise the
 * CRUD + link/unlink + audit guarantees the UI relies on: mandatory comments,
 * field validation, version conflicts, and audit log entries.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetDataManagementStore,
  createSubject,
  deleteSubject,
  getSubject,
  linkSources,
  listAuditLogForSubject,
  listAvailableSources,
  listSubjects,
  unlinkSource,
  updateSubject,
} from "@/services/dataManagement.service";
import { DataManagementValidationError } from "@/types/data-management";

const ACTOR = "tester@hcb.local";

beforeEach(() => {
  __resetDataManagementStore();
});

describe("listSubjects", () => {
  it("returns seeded subjects with linked-source counts", async () => {
    const rows = await listSubjects();
    expect(rows.length).toBeGreaterThanOrEqual(4);
    const alice = rows.find((r) => r.firstName === "Alice");
    expect(alice?.linkedSourceCount).toBe(3);
  });

  it("filters by query across id / name / email", async () => {
    const byEmail = await listSubjects({ query: "bob.kumar" });
    expect(byEmail).toHaveLength(1);
    const byId = await listSubjects({ query: "123e4567" });
    expect(byId[0].firstName).toBe("Alice");
  });

  it("filters by status", async () => {
    const active = await listSubjects({ status: "ACTIVE" });
    expect(active.every((r) => r.status === "ACTIVE")).toBe(true);
  });

  it("sorts by name ascending", async () => {
    const rows = await listSubjects({ sortKey: "name", sortDirection: "asc" });
    const names = rows.map((r) => `${r.firstName} ${r.lastName}`);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });
});

describe("createSubject", () => {
  const validInput = {
    firstName: "Test",
    lastName: "User",
    dateOfBirth: "1990-01-01",
    govIdType: "PAN" as const,
    govIdNumber: "TEST1234X",
    email: "test.user@example.com",
    phone: "+91-9999999999",
    address: "Test address",
    status: "ACTIVE" as const,
  };

  it("requires a non-empty comment", async () => {
    await expect(createSubject({ ...validInput, comment: "" }, ACTOR)).rejects.toBeInstanceOf(
      DataManagementValidationError
    );
  });

  it("rejects invalid email", async () => {
    await expect(
      createSubject({ ...validInput, email: "bad-email", comment: "Adding" }, ACTOR)
    ).rejects.toMatchObject({ fieldErrors: { email: expect.any(String) } });
  });

  it("creates a subject and logs a CREATE audit entry", async () => {
    const created = await createSubject(
      { ...validInput, comment: "Initial onboarding" },
      ACTOR
    );
    expect(created.subjectId).toBeTruthy();
    expect(created.version).toBe(1);
    const audit = await listAuditLogForSubject(created.subjectId);
    expect(audit[0]).toMatchObject({
      action: "CREATE",
      performedBy: ACTOR,
      comment: "Initial onboarding",
    });
  });

  it("prevents duplicate government ID", async () => {
    await createSubject({ ...validInput, comment: "first" }, ACTOR);
    await expect(
      createSubject(
        { ...validInput, email: "another@example.com", comment: "second" },
        ACTOR
      )
    ).rejects.toMatchObject({ fieldErrors: { govIdNumber: expect.any(String) } });
  });
});

describe("updateSubject", () => {
  const SUBJECT_ID = "123e4567-e89b-12d3-a456-426614174000";

  it("requires a comment", async () => {
    const detail = await getSubject(SUBJECT_ID);
    expect(detail).not.toBeNull();
    await expect(
      updateSubject(
        SUBJECT_ID,
        { address: "New", comment: "  ", expectedVersion: detail!.subject.version },
        ACTOR
      )
    ).rejects.toBeInstanceOf(DataManagementValidationError);
  });

  it("rejects version conflicts", async () => {
    await expect(
      updateSubject(
        SUBJECT_ID,
        { address: "New", comment: "Reason", expectedVersion: 999 },
        ACTOR
      )
    ).rejects.toMatchObject({ message: "Version conflict" });
  });

  it("records changed fields in the audit log and bumps version", async () => {
    const before = await getSubject(SUBJECT_ID);
    const initialVersion = before!.subject.version;
    const updated = await updateSubject(
      SUBJECT_ID,
      {
        address: "9 New Street, Bangalore 560002",
        comment: "Address change per customer call",
        expectedVersion: initialVersion,
      },
      ACTOR
    );
    expect(updated.version).toBe(initialVersion + 1);
    expect(updated.updatedBy).toBe(ACTOR);

    const audit = await listAuditLogForSubject(SUBJECT_ID);
    const updateEntry = audit.find((e) => e.action === "UPDATE" && e.performedBy === ACTOR);
    expect(updateEntry).toBeTruthy();
    expect(updateEntry!.changes).toEqual([
      {
        field: "address",
        oldValue: "12 MG Road, Bangalore 560001",
        newValue: "9 New Street, Bangalore 560002",
      },
    ]);
  });

  it("rejects a no-op edit", async () => {
    const detail = await getSubject(SUBJECT_ID);
    await expect(
      updateSubject(
        SUBJECT_ID,
        {
          firstName: detail!.subject.firstName,
          comment: "no change",
          expectedVersion: detail!.subject.version,
        },
        ACTOR
      )
    ).rejects.toBeInstanceOf(DataManagementValidationError);
  });
});

describe("linkSources / unlinkSource", () => {
  const SUBJECT_ID = "323e4567-e89b-12d3-a456-426614174002"; // Priya

  it("lists only unlinked active sources", async () => {
    const available = await listAvailableSources(SUBJECT_ID);
    expect(available.some((s) => s.sourceId === "S-001")).toBe(true);
    expect(available.some((s) => s.sourceId === "S-004")).toBe(false); // already linked
    expect(available.some((s) => s.status !== "ACTIVE")).toBe(false);
  });

  it("links multiple sources and writes audit entries", async () => {
    const added = await linkSources(
      SUBJECT_ID,
      ["S-001", "S-002"],
      "Linking primary docs",
      ACTOR
    );
    expect(added.map((s) => s.sourceId).sort()).toEqual(["S-001", "S-002"]);
    const detail = await getSubject(SUBJECT_ID);
    const linkedIds = detail!.linkedSources.map((s) => s.sourceId).sort();
    expect(linkedIds).toEqual(expect.arrayContaining(["S-001", "S-002", "S-004"]));
    const audit = await listAuditLogForSubject(SUBJECT_ID);
    const linkEvents = audit.filter((e) => e.action === "LINK" && e.performedBy === ACTOR);
    expect(linkEvents).toHaveLength(2);
  });

  it("does not double-link a source already linked", async () => {
    const added = await linkSources(SUBJECT_ID, ["S-004"], "retry", ACTOR);
    expect(added).toHaveLength(0);
  });

  it("requires a comment to unlink", async () => {
    await expect(unlinkSource(SUBJECT_ID, "S-004", "", ACTOR)).rejects.toBeInstanceOf(
      DataManagementValidationError
    );
  });

  it("unlinks an existing source and writes an UNLINK audit entry", async () => {
    await unlinkSource(SUBJECT_ID, "S-004", "no longer relevant", ACTOR);
    const detail = await getSubject(SUBJECT_ID);
    expect(detail!.linkedSources.find((s) => s.sourceId === "S-004")).toBeUndefined();
    const audit = await listAuditLogForSubject(SUBJECT_ID);
    expect(audit[0]).toMatchObject({
      action: "UNLINK",
      relatedSourceId: "S-004",
      comment: "no longer relevant",
    });
  });
});

describe("deleteSubject", () => {
  const SUBJECT_ID = "223e4567-e89b-12d3-a456-426614174001"; // Bob

  it("cascades unlinks and deletes the subject", async () => {
    await deleteSubject(SUBJECT_ID, "GDPR removal request", ACTOR);
    expect(await getSubject(SUBJECT_ID)).toBeNull();
    const list = await listSubjects();
    expect(list.find((r) => r.subjectId === SUBJECT_ID)).toBeUndefined();
    const audit = await listAuditLogForSubject(SUBJECT_ID);
    const actions = audit.map((e) => e.action);
    expect(actions).toContain("DELETE");
    expect(actions).toContain("UNLINK");
  });

  it("requires a comment", async () => {
    await expect(deleteSubject(SUBJECT_ID, "   ", ACTOR)).rejects.toBeInstanceOf(
      DataManagementValidationError
    );
  });
});
