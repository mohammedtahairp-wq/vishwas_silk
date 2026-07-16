import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { apiClient, ROLE_STORAGE_KEY, TOKEN_STORAGE_KEY } from "../api/client";

export type Role = "admin" | "rider" | "customer";

interface AuthContextValue {
  token: string | null;
  role: Role | null;
  login: (username: string, password: string) => Promise<Role>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [role, setRole] = useState<Role | null>(() => localStorage.getItem(ROLE_STORAGE_KEY) as Role | null);

  const login = async (username: string, password: string) => {
    const { data } = await apiClient.post<{ token: string; role: Role }>("/auth/login", {
      username,
      password,
    });
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    localStorage.setItem(ROLE_STORAGE_KEY, data.role);
    setToken(data.token);
    setRole(data.role);
    return data.role;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(ROLE_STORAGE_KEY);
    setToken(null);
    setRole(null);
  };

  const value = useMemo(() => ({ token, role, login, logout }), [token, role]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
