"use client";

import { jwtVerify, decodeJwt } from "jose";

export interface JwtPayload {
  sub: string;       // user id
  role: "student" | "staff" | "admin";
  iat: number;
  exp: number;
}

// Access token stored in memory (not localStorage) for security
let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export function clearAccessToken() {
  _accessToken = null;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return decodeJwt(token) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload) return true;
  // add 10s buffer
  return payload.exp * 1000 < Date.now() + 10_000;
}

export function getUserFromToken(token: string): JwtPayload | null {
  if (isTokenExpired(token)) return null;
  return decodeToken(token);
}

/** Verify token signature on client (public key not available → just check expiry) */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const payload = decodeJwt(token) as JwtPayload;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
