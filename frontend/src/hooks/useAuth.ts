"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import {
  setAccessToken,
  clearAccessToken,
  getAccessToken,
  getUserFromToken,
  isTokenExpired,
} from "@/lib/auth";
import { wsClient } from "@/lib/websocket";
import type { User, UserRole } from "@/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  user: User;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const initialized = useRef(false);

  // On mount: try to restore session via refresh token cookie
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      const res = await api.post<LoginResponse>("/auth/refresh");
      if (res.success && res.data?.accessToken) {
        setAccessToken(res.data.accessToken);
        wsClient.connect();
        setState({
          user: res.data.user,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    })();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const res = await api.post<LoginResponse>("/auth/login", credentials);
    if (res.success && res.data) {
      setAccessToken(res.data.accessToken);
      wsClient.connect();
      setState({
        user: res.data.user,
        isLoading: false,
        isAuthenticated: true,
      });
      return { success: true, role: res.data.user.role as UserRole };
    }
    return { success: false, error: res.message ?? "เข้าสู่ระบบไม่สำเร็จ" };
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    clearAccessToken();
    wsClient.disconnect();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  return {
    user: state.user,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    login,
    logout,
  };
}
