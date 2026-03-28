/**
 * AuthContext — JWT-based authentication for the HCB platform.
 *
 * Token strategy:
 *  - Access token: module memory only (src/lib/api-client.ts) — never persisted.
 *  - Refresh token: sessionStorage — cleared when tab closes; survives page reload.
 *  - On app mount: attempts silent session restore via /auth/refresh.
 *  - On auth:session-expired event: clears user state and redirects to /login.
 *
 * Fallback: when VITE_USE_MOCK_FALLBACK=true and the backend is unreachable,
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
  get,
  ApiError,
} from "@/lib/api-client";

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
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasAnyRole: (...roles: string[]) => boolean;
}

// ─── Mock Fallback ────────────────────────────────────────────────────────────

const USE_MOCK_FALLBACK = import.meta.env.VITE_USE_MOCK_FALLBACK === "true";

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
          refreshToken: stored,
        });
        setAccessToken(res.accessToken);
        setRefreshToken(res.refreshToken);
        setUser(res.user);
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
    async (email: string, password: string, rememberMe = false) => {
      if (!email || !password) throw new Error("Email and password are required");

      try {
        const res = await postAnon<AuthResponse>("/v1/auth/login", { email, password });
        setAccessToken(res.accessToken);
        // Store refresh token regardless of rememberMe (cleared on tab close anyway)
        setRefreshToken(res.refreshToken);
        setUser(res.user);
      } catch (err) {
        // Graceful mock fallback for development/demo when backend is offline
        if (USE_MOCK_FALLBACK && err instanceof ApiError && err.isServerError) {
          setUser(mockUserFromEmail(email));
          return;
        }
        if (USE_MOCK_FALLBACK && !(err instanceof ApiError)) {
          // Network error (backend not running)
          setUser(mockUserFromEmail(email));
          return;
        }
        throw err;
      }
    },
    []
  );

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await get("/v1/auth/logout");
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
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasRole, hasAnyRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
