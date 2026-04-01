/** Shape of POST /v1/auth/login JSON (Spring). */
export interface AuthLoginApiResponse {
  mfaRequired: boolean;
  mfaChallengeId?: string;
  emailMasked?: string;
  resendAvailableInSeconds?: number;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: {
    id: number;
    email: string;
    displayName: string;
    roles: string[];
    institutionId?: number | null;
    institutionName?: string | null;
  };
}

export type PasswordLoginResult =
  | { kind: "session" }
  | {
      kind: "mfa_required";
      mfaChallengeId: string;
      emailMasked: string;
      resendAvailableInSeconds: number;
    };

export function interpretPasswordLoginResponse(body: AuthLoginApiResponse): PasswordLoginResult {
  if (body.mfaRequired && body.mfaChallengeId) {
    return {
      kind: "mfa_required",
      mfaChallengeId: body.mfaChallengeId,
      emailMasked: body.emailMasked ?? "",
      resendAvailableInSeconds: body.resendAvailableInSeconds ?? 60,
    };
  }
  return { kind: "session" };
}
