import { describe, it, expect, vi } from "vitest";
import { institutionActiveForTrafficOrError } from "./institutionTrafficGate.js";

function mockReply() {
  const send = vi.fn();
  const code = vi.fn().mockReturnValue({ send });
  return { code, send };
}

describe("institutionTrafficGate", () => {
  it("allows active institutions", () => {
    const reply = mockReply();
    const ok = institutionActiveForTrafficOrError(reply as never, {
      id: 1,
      institutionLifecycleStatus: "active",
    });
    expect(ok).toBe(true);
    expect(reply.code).not.toHaveBeenCalled();
  });

  it("returns 403 ERR_INSTITUTION_SUSPENDED for suspended", () => {
    const reply = mockReply();
    const ok = institutionActiveForTrafficOrError(reply as never, {
      id: 1,
      institutionLifecycleStatus: "suspended",
    });
    expect(ok).toBe(false);
    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "ERR_INSTITUTION_SUSPENDED" })
    );
  });

  it("returns 403 ERR_INSTITUTION_PENDING_APPROVAL for pending", () => {
    const reply = mockReply();
    expect(
      institutionActiveForTrafficOrError(reply as never, {
        id: 1,
        institutionLifecycleStatus: "pending",
      })
    ).toBe(false);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "ERR_INSTITUTION_PENDING_APPROVAL" })
    );
  });

  it("returns 403 ERR_INSTITUTION_DRAFT for draft", () => {
    const reply = mockReply();
    expect(
      institutionActiveForTrafficOrError(reply as never, {
        id: 1,
        institutionLifecycleStatus: "draft",
      })
    ).toBe(false);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "ERR_INSTITUTION_DRAFT" })
    );
  });

  it("returns 403 ERR_INSTITUTION_NOT_ACTIVE for other statuses", () => {
    const reply = mockReply();
    expect(
      institutionActiveForTrafficOrError(reply as never, {
        id: 1,
        institutionLifecycleStatus: "inactive",
      })
    ).toBe(false);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "ERR_INSTITUTION_NOT_ACTIVE" })
    );
  });

  it("returns 403 when institution missing", () => {
    const reply = mockReply();
    expect(institutionActiveForTrafficOrError(reply as never, null)).toBe(false);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "ERR_INSTITUTION_NOT_FOUND" })
    );
  });
});
