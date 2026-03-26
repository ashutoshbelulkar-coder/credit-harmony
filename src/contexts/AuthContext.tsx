import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { UserRole } from "@/data/user-management-mock";

interface User {
  email: string;
  role: UserRole;
}

interface AuthContextValue {
  user: User | null;
  login: (email: string, _password: string, rememberMe?: boolean) => void;
  logout: () => void;
}

const STORAGE_KEY = "hcb-auth-user";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((email: string, _password: string, rememberMe?: boolean) => {
    // Demo-friendly role heuristic without adding new login UI:
    // - email containing "+viewer" or starting with "viewer" => Viewer
    // - otherwise Super Admin
    const lower = email.toLowerCase();
    const role: UserRole =
      lower.includes("+viewer") || lower.startsWith("viewer") ? "Viewer" : "Super Admin";
    const u: User = { email, role };
    setUser(u);
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
