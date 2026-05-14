import { describe, it, expect } from "vitest";
import { interpretPasswordLoginResponse } from "./auth-login-types";

describe("interpretPasswordLoginResponse", () => {
  it("returns mfa_required when mfaRequired and challenge id present", () => {
    const r = interpretPasswordLoginResponse({
      mfaRequired: true,
      mfaChallengeId: "abc123",
      emailMasked: "a***@x.com",
      resendAvailableInSeconds: 60,
    });
    expect(r).toEqual({
      kind: "mfa_required",
      mfaChallengeId: "abc123",
      emailMasked: "a***@x.com",
      resendAvailableInSeconds: 60,
    });
  });

  it("defaults resend seconds to 60 when omitted", () => {
    const r = interpretPasswordLoginResponse({
      mfaRequired: true,
      mfaChallengeId: "x",
    });
    expect(r.kind).toBe("mfa_required");
    if (r.kind === "mfa_required") {
      expect(r.resendAvailableInSeconds).toBe(60);
    }
  });

  it("returns session when mfa not required", () => {
    expect(
      interpretPasswordLoginResponse({
        mfaRequired: false,
        accessToken: "a",
        refreshToken: "r",
        expiresIn: 900,
        user: {
          id: 1,
          email: "u@x.com",
          displayName: "U",
          roles: ["ROLE_VIEWER"],
        },
      })
    ).toEqual({ kind: "session" });
  });
});
