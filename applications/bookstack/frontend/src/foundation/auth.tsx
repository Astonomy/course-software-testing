import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../kernel/api";

export type AuthUser = { id: number; nickname: string; email: string };

type AuthValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<AuthUser | null>;
  setUser: (user: AuthUser | null) => void;
};

const AuthContext = createContext<AuthValue>({
  user: null,
  loading: true,
  refresh: async () => null,
  setUser: () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const result = await api<{ user: AuthUser | null }>("/api/auth/me");
    const next = result.ok ? result.data?.user ?? null : null;
    setUser(next);
    setLoading(false);
    return next;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return <AuthContext.Provider value={{ user, loading, refresh, setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
