// ── Database row types ────────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  student_id: string | null;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: 'student' | 'staff' | 'admin';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
  // Joined from users when needed
  role?: 'student' | 'staff' | 'admin';
  is_active?: boolean;
  email?: string;
  first_name?: string;
  last_name?: string;
  student_id?: string | null;
  phone?: string | null;
}

export interface PasswordResetTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export interface LoginAttemptRow {
  id: string;
  email: string;
  ip_address: string;
  success: boolean;
  failure_reason: string | null;
  created_at: Date;
}

// ── API response types ────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: 'student' | 'staff' | 'admin';
  firstName: string;
  lastName: string;
  studentId: string | null;
  phone: string | null;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface AccessTokenResponse {
  accessToken: string;
  user: AuthUser;
}

// ── JWT payload ───────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  role: 'student' | 'staff' | 'admin';
  iat: number;
  exp: number;
}
