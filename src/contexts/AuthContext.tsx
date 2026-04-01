/**
 * AuthContext — JWT-based authentication for the HCB platform.
 *
 * Token strategy:
 *  - Access token: module memory only (src/lib/api-client.ts) — never persisted.
 *  - Refresh token: sessionStorage — cleared when tab closes; survives page reload.
 *  - On app mount: attempts silent session restore via /auth/refresh.
 *  - On auth:session-expired event: clears user state and redirects to /login.
 *
 * Fallback: when `clientMockFallbackEnabled` (dev + VITE_USE_MOCK_FALLBACK) and the backend is unreachable,
 * login accepts any non-empty password and derives role from email prefix
 * (mirrors the previous demo-only behaviour for development convenience).
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearTokens,
  postAnon,
  post,
  ApiError,
} from "@/lib/api-client";
import { clientMockFallbackEnabled } from "@/lib/client-mock-fallback";
import {
  type AuthLoginApiResponse,
  interpretPasswordLoginResponse,
  type PasswordLoginResult,
} from "@/lib/auth-login-types";

export type { PasswordLoginResult } from "@/lib/auth-login-types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  roles: string[];
  institutionId?: number | null;
  institutionName?: string | null;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean,
    captchaToken?: string | null
  ) => Promise<PasswordLoginResult>;
  verifyMfaLogin: (mfaChallengeId: string, code: string) => Promise<void>;
  resendMfaOtp: (mfaChallengeId: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasAnyRole: (...roles: string[]) => boolean;
}

// ─── Spring JWT roles → SPA display names (AuthResponse uses ROLE_* authorities) ─

const SPRING_ROLE_TO_DISPLAY: Record<string, string> = {
  ROLE_SUPER_ADMIN: "Super Admin",
  ROLE_BUREAU_ADMIN: "Bureau Admin",
  ROLE_ANALYST: "Analyst",
  ROLE_VIEWER: "Viewer",
  ROLE_API_USER: "API User",
};

function normalizeUserFromApi(user: AuthUser): AuthUser {
  const roles = (user.roles ?? []).map((r) => {
    if (SPRING_ROLE_TO_DISPLAY[r]) return SPRING_ROLE_TO_DISPLAY[r];
    if (r.startsWith("ROLE_")) {
      return r
        .slice("ROLE_".length)
        .split("_")
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(" ");
    }
    return r;
  });
  return { ...user, roles };
}

// ─── Mock Fallback ────────────────────────────────────────────────────────────

function mockUserFromEmail(email: string): AuthUser {
  const lower = email.toLowerCase();
  let roles = ["Super Admin"];
  if (lower.includes("+viewer") || lower.startsWith("viewer")) roles = ["Viewer"];
  else if (lower.includes("analyst")) roles = ["Analyst"];
  else if (lower.includes("compliance")) roles = ["Compliance Officer"];
  else if (lower.includes("bureau")) roles = ["Bureau Admin"];
  return {
    id: 1,
    email,
    displayName: email.split("@")[0].replace(/[._+]/g, " "),
    roles,
    institutionId: null,
    institutionName: null,
  };
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionRestoredRef = useRef(false);

  // ── Silent session restore on mount ──────────────────────────────────────
  useEffect(() => {
    if (sessionRestoredRef.current) return;
    sessionRestoredRef.current = true;

    const stored = getRefreshToken();
    if (!stored) {
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await postAnon<AuthResponse>("/v1/auth/refresh", {
          refresh_token: stored,
        });
        setAccessToken(res.accessToken);
        setRefreshToken(res.refreshToken);
        setUser(normalizeUserFromApi(res.user));
      } catch {
        clearTokens();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Session-expired event listener ────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      setUser(null);
      clearTokens();
      navigate("/login?expired=true", { replace: true });
    };
    window.addEventListener("auth:session-expired", handler);
    return () => window.removeEventListener("auth:session-expired", handler);
  }, [navigate]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string, rememberMe = false, captchaToken?: string | null) => {
      if (!email || !password) throw new Error("Email and password are required");

      try {
        const res = await postAnon<AuthLoginApiResponse>("/v1/auth/login", {
          email,
          password,
          ...(captchaToken ? { captchaToken } : {}),
        });
        const step = interpretPasswordLoginResponse(res);
        if (step.kind === "mfa_required") {
          return step;
        }
        if (!res.accessToken || !res.refreshToken || !res.user) {
          throw new ApiError(502, "ERR_AUTH_INCOMPLETE", "Login response missing session data", "/v1/auth/login");
        }
        setAccessToken(res.accessToken);
        setRefreshToken(res.refreshToken);
        setUser(normalizeUserFromApi(res.user as AuthUser));
        return { kind: "session" } as const;
      } catch (err) {
        if (clientMockFallbackEnabled && err instanceof ApiError && err.isServerError) {
          setUser(mockUserFromEmail(email));
          return { kind: "session" } as const;
        }
        if (clientMockFallbackEnabled && !(err instanceof ApiError)) {
          setUser(mockUserFromEmail(email));
          return { kind: "session" } as const;
        }
        throw err;
      }
    },
    []
  );

  const verifyMfaLogin = useCallback(async (mfaChallengeId: string, code: string) => {
    const res = await postAnon<AuthResponse>("/v1/auth/mfa/verify", { mfaChallengeId, code });
    setAccessToken(res.accessToken);
    setRefreshToken(res.refreshToken);
    setUser(normalizeUserFromApi(res.user));
  }, []);

  const resendMfaOtp = useCallback(async (mfaChallengeId: string) => {
    await postAnon<void>("/v1/auth/mfa/resend", { mfaChallengeId });
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const rt = getRefreshToken();
    try {
      if (rt) {
        await post("/v1/auth/logout", { refresh_token: rt });
      }
    } catch {
      // Ignore logout API errors — always clear local state
    } finally {
      setUser(null);
      clearTokens();
    }
  }, []);

  // ── Role helpers ──────────────────────────────────────────────────────────
  const hasRole = useCallback(
    (role: string) => user?.roles?.includes(role) ?? false,
    [user]
  );

  const hasAnyRole = useCallback(
    (...roles: string[]) => roles.some((r) => user?.roles?.includes(r)) ?? false,
    [user]
  );

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, verifyMfaLogin, resendMfaOtp, logout, hasRole, hasAnyRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
