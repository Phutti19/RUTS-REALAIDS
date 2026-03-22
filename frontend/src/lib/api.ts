import { getAccessToken, setAccessToken, isTokenExpired } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

// Prevent concurrent refresh calls
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include", // send httpOnly refresh token cookie
      });
      if (!res.ok) return null;
      const data = await res.json();
      const newToken: string = data.data?.accessToken ?? null;
      if (newToken) setAccessToken(newToken);
      return newToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  errors?: string[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  let token = getAccessToken();

  // Proactively refresh if token is near expiry
  if (token && isTokenExpired(token)) {
    token = await refreshAccessToken();
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  // If 401, try refreshing once — but skip if this IS the refresh endpoint (avoids loop)
  if (res.status === 401 && !path.includes("/auth/refresh")) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      const retry = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: "include",
      });
      if (retry.status === 204 || retry.headers.get("content-length") === "0") {
        return { success: true } as ApiResponse<T>;
      }
      const retryText = await retry.text();
      if (!retryText) return { success: true } as ApiResponse<T>;
      const retryData = JSON.parse(retryText);
      return retryData as ApiResponse<T>;
    }
    // Refresh failed — clear token
    setAccessToken(null);
  }

  // 204 No Content or empty body — return success with no data
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return { success: true } as ApiResponse<T>;
  }
  const text = await res.text();
  if (!text) return { success: true } as ApiResponse<T>;
  const data = JSON.parse(text);
  return data as ApiResponse<T>;
}

/** Extract specific validation errors or fall back to generic message */
export function extractError(res: ApiResponse, fallback = "เกิดข้อผิดพลาด"): string {
  if (Array.isArray(res.errors) && res.errors.length > 0) {
    return (res.errors as string[]).join(", ");
  }
  return res.message ?? fallback;
}

export const api = {
  get<T>(path: string) {
    return request<T>(path, { method: "GET" });
  },

  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(path: string) {
    return request<T>(path, { method: "DELETE" });
  },

  /** For file download — returns raw Response */
  async download(path: string): Promise<Response> {
    let token = getAccessToken();
    if (token && isTokenExpired(token)) {
      token = await refreshAccessToken();
    }
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(`${BASE_URL}${path}`, { headers, credentials: "include" });
  },
};
