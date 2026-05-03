import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setAuthTokenGetter, getApiUrl } from "@/api";
import { TOKEN_KEY } from "@/lib/auth-utils";

const ADMIN_KEY = "upcore_admin_info";

export interface AdminInfo {
  email: string;
  name: string;
  displayName?: string | null;
  profilePicUrl?: string | null;
  playerTag?: string | null;
}

interface AuthContextValue {
  admin: AdminInfo | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { displayName?: string; profilePicUrl?: string; playerTag?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): { token: string; admin: AdminInfo } | null {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const adminRaw = sessionStorage.getItem(ADMIN_KEY);
    if (!token || !adminRaw) return null;
    const admin = JSON.parse(adminRaw) as AdminInfo;
    return { token, admin };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(() => sessionStorage.getItem(TOKEN_KEY));
    const s = readSession();
    if (s) {
      setToken(s.token);
      setAdmin(s.admin);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(getApiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      let msg = "Invalid email or password";
      try {
        const data = await res.json();
        if (data?.error) msg = data.error;
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    const data = (await res.json()) as { token: string; admin: AdminInfo };
    sessionStorage.setItem(TOKEN_KEY, data.token);
    sessionStorage.setItem(ADMIN_KEY, JSON.stringify(data.admin));
    setToken(data.token);
    setAdmin(data.admin);
  }, []);

  const logout = useCallback(() => {
    const storedToken = sessionStorage.getItem(TOKEN_KEY);
    // Fire-and-forget: record logout audit log on the backend
    if (storedToken) {
      void fetch(getApiUrl("/api/auth/logout"), {
        method: "POST",
        headers: { Authorization: `Bearer ${storedToken}` },
      }).catch(() => { /* ignore network errors during logout */ });
    }
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_KEY);
    setToken(null);
    setAdmin(null);
  }, []);

  const updateProfile = useCallback(async (data: {
    displayName?: string;
    profilePicUrl?: string;
    playerTag?: string;
  }) => {
    const storedToken = sessionStorage.getItem(TOKEN_KEY);
    const res = await fetch(getApiUrl("/api/auth/profile"), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? "Failed to update profile");
    }
    const result = (await res.json()) as { token: string; admin: AdminInfo };
    sessionStorage.setItem(TOKEN_KEY, result.token);
    sessionStorage.setItem(ADMIN_KEY, JSON.stringify(result.admin));
    setToken(result.token);
    setAdmin(result.admin);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ admin, token, isLoading, login, logout, updateProfile }),
    [admin, token, isLoading, login, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
