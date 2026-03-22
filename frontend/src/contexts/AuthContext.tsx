"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { api, extractError } from "@/lib/api";
import { setAccessToken, clearAccessToken } from "@/lib/auth";
import { wsClient } from "@/lib/websocket";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; role?: string; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      const res = await api.post<{ accessToken: string; user: User }>("/auth/refresh");
      if (res.success && res.data) {
        setAccessToken(res.data.accessToken);
        setUser(res.data.user);
        wsClient.connect();
      }
      setIsLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ accessToken: string; user: User }>("/auth/login", {
      email,
      password,
    });
    if (res.success && res.data) {
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
      wsClient.connect();
      return { success: true, role: res.data.user.role };
    }
    return { success: false, error: extractError(res, "เข้าสู่ระบบไม่สำเร็จ") };
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore errors
    }
    clearAccessToken();
    wsClient.disconnect();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await api.get<User>("/users/me");
    if (res.success && res.data) {
      setUser(res.data);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside AuthProvider");
  return ctx;
}
