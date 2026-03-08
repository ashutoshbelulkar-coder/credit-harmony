import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface User {
  email: string;
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
    const u = { email };
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
