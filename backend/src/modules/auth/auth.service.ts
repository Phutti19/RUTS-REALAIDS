import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import { DatabaseService } from '../../database/db.service';
import { EmailService } from '../../email/email.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ActivateAccountDto } from './dto/activate-account.dto';
import {
  UserRow,
  RefreshTokenRow,
  PasswordResetTokenRow,
  TokenResponse,
  AccessTokenResponse,
  AuthUser,
} from './interfaces/auth.interfaces';

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_WINDOW_MINUTES = 15;
const REFRESH_TOKEN_TTL_DAYS = 7;
const RESET_TOKEN_TTL_MINUTES = 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly email: EmailService,
  ) {}

  // ── Public methods ──────────────────────────────────────────────────────────

  async login(dto: LoginDto, ipAddress: string, userAgent?: string | null): Promise<TokenResponse> {
    const { email, password } = dto;

    // 1. Brute-force check before hitting users table
    const failedCount = await this.countRecentFailures(email);
    if (failedCount >= MAX_FAILED_ATTEMPTS) {
      await this.recordAttempt(email, ipAddress, userAgent, false, 'ACCOUNT_LOCKED');
      throw new UnauthorizedException(
        `เข้าสู่ระบบผิดหลายครั้ง บัญชีถูกล็อค ${LOCK_WINDOW_MINUTES} นาที`,
      );
    }

    // 2. Find user by email or student_id
    const user = await this.db.queryOne<UserRow>(
      `SELECT id, student_id, email, password_hash, first_name, last_name, phone, role, is_active, faculty, department
       FROM users WHERE email = $1 OR student_id = $1`,
      [email],
    );

    if (!user) {
      await this.recordAttempt(email, ipAddress, userAgent, false, 'USER_NOT_FOUND');
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    if (!user.is_active) {
      await this.recordAttempt(email, ipAddress, userAgent, false, 'ACCOUNT_INACTIVE');
      throw new UnauthorizedException('บัญชีถูกระงับ กรุณาติดต่อผู้ดูแลระบบ');
    }

    // 3. Verify password (bcryptjs compare)
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      await this.recordAttempt(email, ipAddress, userAgent, false, 'WRONG_PASSWORD');
      const remaining = MAX_FAILED_ATTEMPTS - (failedCount + 1);
      const hint =
        remaining > 0
          ? ` เหลือโอกาสลองอีก ${remaining} ครั้งก่อนถูกล็อค`
          : ` บัญชีจะถูกล็อคหากผิดอีกครั้ง`;
      throw new UnauthorizedException(`อีเมลหรือรหัสผ่านไม่ถูกต้อง${hint}`);
    }

    // 4. Record success and issue tokens
    await this.recordAttempt(email, ipAddress, userAgent, true, null);
    this.logger.log(`Login success: userId=${user.id} role=${user.role} ip=${ipAddress}`);

    return this.issueTokens(user, userAgent);
  }

  async register(dto: RegisterDto): Promise<{ message: string }> {
    // Check email uniqueness
    const existingEmail = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM users WHERE email = $1`,
      [dto.email],
    );
    if (existingEmail) {
      throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
    }

    // Check student_id uniqueness if provided
    if (dto.studentId) {
      const existingStudentId = await this.db.queryOne<{ id: string }>(
        `SELECT id FROM users WHERE student_id = $1`,
        [dto.studentId],
      );
      if (existingStudentId) {
        throw new ConflictException('รหัสนักศึกษานี้ถูกใช้งานแล้ว');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    await this.db.query(
      `INSERT INTO users (student_id, email, password_hash, first_name, last_name, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6, 'student')`,
      [
        dto.studentId ?? null,
        dto.email,
        passwordHash,
        dto.firstName,
        dto.lastName,
        dto.phone ?? null,
      ],
    );

    this.logger.log(`New student registered: ${dto.email}`);
    return { message: 'ลงทะเบียนสำเร็จ สามารถเข้าสู่ระบบได้แล้ว' };
  }

  /**
   * Look up a student account by student_id.
   * Returns { firstName, lastName, maskedEmail } for identity confirmation.
   * Used by the password-change flow (/register page).
   */
  async lookupUnactivated(studentId: string): Promise<{ firstName: string; lastName: string; maskedEmail: string }> {
    const user = await this.db.queryOne<{ first_name: string; last_name: string; email: string }>(
      `SELECT first_name, last_name, email FROM users
       WHERE student_id = $1 AND role = 'student' AND is_active = true`,
      [studentId],
    );

    if (!user) {
      throw new BadRequestException('ไม่พบรหัสนักศึกษานี้ในระบบ กรุณาติดต่อเจ้าหน้าที่');
    }

    // Mask email: e.g. phuttiwat.b@rmutsv.ac.th → p*******t.b@rmutsv.ac.th
    const [local, domain] = user.email.split('@');
    const masked = local!.length <= 2
      ? `${local}@${domain}`
      : `${local![0]}${'*'.repeat(local!.length - 2)}${local![local!.length - 1]}@${domain}`;

    return { firstName: user.first_name, lastName: user.last_name, maskedEmail: masked };
  }

  /**
   * Change password for a student using their student_id.
   * Works for all active students — used for both initial and subsequent password changes.
   */
  async activateAccount(dto: ActivateAccountDto): Promise<{ message: string }> {
    const user = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM users
       WHERE student_id = $1 AND role = 'student' AND is_active = true`,
      [dto.studentId],
    );

    if (!user) {
      throw new BadRequestException('ไม่พบรหัสนักศึกษานี้ในระบบ');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    await this.db.execute(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [passwordHash, user.id],
    );

    this.logger.log(`Password changed via student ID: studentId=${dto.studentId} userId=${user.id}`);
    return { message: 'เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบ' };
  }

  async refresh(rawRefreshToken: string): Promise<AccessTokenResponse> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const tokenRow = await this.db.queryOne<
      RefreshTokenRow & {
        role: 'student' | 'staff' | 'admin';
        is_active: boolean;
        email: string;
        first_name: string;
        last_name: string;
        student_id: string | null;
      }
    >(
      `SELECT rt.user_id, u.role, u.is_active,
              u.email, u.first_name, u.last_name, u.student_id, u.phone,
              u.faculty, u.department
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token_hash = $1
         AND rt.revoked_at IS NULL
         AND rt.expires_at > NOW()`,
      [tokenHash],
    );

    if (!tokenRow) {
      throw new UnauthorizedException('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }

    if (!tokenRow.is_active) {
      throw new UnauthorizedException('บัญชีถูกระงับ กรุณาติดต่อผู้ดูแลระบบ');
    }

    const accessToken = this.signAccessToken(tokenRow.user_id, tokenRow.role);
    const user: AuthUser = {
      id: tokenRow.user_id,
      email: tokenRow.email,
      role: tokenRow.role,
      firstName: tokenRow.first_name,
      lastName: tokenRow.last_name,
      studentId: tokenRow.student_id,
      phone: tokenRow.phone ?? null,
      faculty: tokenRow.faculty ?? null,
      department: tokenRow.department ?? null,
    };
    return { accessToken, user };
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.db.execute(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash],
    );
  }

  async forgotPassword(emailAddr: string): Promise<{ message: string; token?: string }> {
    // Generic message — never reveal whether email exists (prevents user enumeration)
    const genericMessage =
      'หากอีเมลนี้มีอยู่ในระบบ ลิงก์รีเซ็ตรหัสผ่านจะถูกส่งไปยังอีเมลของคุณ';

    const user = await this.db.queryOne<{ id: string; first_name: string }>(
      `SELECT id, first_name FROM users WHERE email = $1 AND is_active = true`,
      [emailAddr],
    );

    if (!user) return { message: genericMessage };

    // Invalidate any existing unused reset tokens for this user
    await this.db.execute(
      `UPDATE password_reset_tokens SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [user.id],
    );

    // Create new reset token (UUID → SHA-256 hash stored in DB)
    const rawToken = randomUUID();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    await this.db.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt],
    );

    this.logger.log(`Password reset requested for: ${emailAddr}`);

    const response: { message: string; token?: string } = { message: genericMessage };

    // Send reset email (non-blocking — don't let email failure affect response)
    if (this.email.isConfigured) {
      this.email
        .sendResetPasswordEmail(emailAddr, rawToken, user.first_name)
        .catch((err) => this.logger.error(`Email send error: ${err.message}`));
    } else if (process.env.NODE_ENV !== 'production') {
      // Expose token in dev mode only when SMTP is not configured
      response.token = rawToken;
    }

    return response;
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);

    const tokenRow = await this.db.queryOne<PasswordResetTokenRow>(
      `SELECT id, user_id, expires_at, used_at
       FROM password_reset_tokens
       WHERE token_hash = $1`,
      [tokenHash],
    );

    if (!tokenRow) {
      throw new BadRequestException('ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง');
    }
    if (tokenRow.used_at !== null) {
      throw new BadRequestException('ลิงก์รีเซ็ตรหัสผ่านนี้ถูกใช้งานแล้ว');
    }
    if (new Date(tokenRow.expires_at) < new Date()) {
      throw new BadRequestException('ลิงก์รีเซ็ตรหัสผ่านหมดอายุแล้ว กรุณาขอลิงก์ใหม่');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.db.transaction(async (client) => {
      // Update password
      await client.query(
        `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
        [passwordHash, tokenRow.user_id],
      );
      // Mark reset token as used
      await client.query(
        `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
        [tokenRow.id],
      );
      // Revoke all existing refresh tokens (force re-login on all devices)
      await client.query(
        `UPDATE refresh_tokens SET revoked_at = NOW()
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [tokenRow.user_id],
      );
    });

    this.logger.log(`Password reset completed for userId=${tokenRow.user_id}`);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async issueTokens(user: UserRow, deviceInfo?: string | null): Promise<TokenResponse> {
    const accessToken = this.signAccessToken(user.id, user.role);

    const rawRefreshToken = randomUUID();
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info)
       VALUES ($1, $2, $3, $4)`,
      [user.id, tokenHash, expiresAt, deviceInfo ?? null],
    );

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      studentId: user.student_id,
      phone: user.phone ?? null,
      faculty: user.faculty ?? null,
      department: user.department ?? null,
    };

    return { accessToken, refreshToken: rawRefreshToken, user: authUser };
  }

  private signAccessToken(
    userId: string,
    role: 'student' | 'staff' | 'admin',
  ): string {
    return jwt.sign(
      { sub: userId, role },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as jwt.SignOptions['expiresIn'] },
    ) as string;
  }

  /**
   * SHA-256 hash for O(1) DB lookup.
   * bcrypt is intentionally NOT used here — it's too slow for lookups.
   */
  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private async countRecentFailures(email: string): Promise<number> {
    const row = await this.db.queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM login_attempts
       WHERE email = $1
         AND success = false
         AND created_at > NOW() - ($2 || ' minutes')::interval`,
      [email, LOCK_WINDOW_MINUTES],
    );
    return parseInt(row?.count ?? '0', 10);
  }

  private async recordAttempt(
    email: string,
    ipAddress: string,
    userAgent: string | null | undefined,
    success: boolean,
    failureReason: string | null,
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO login_attempts (email, ip_address, user_agent, success, failure_reason)
         VALUES ($1, $2::inet, $3, $4, $5)`,
        [email, ipAddress, userAgent ?? null, success, failureReason],
      );
    } catch (err: unknown) {
      // Never let audit logging break the auth flow
      this.logger.error(`Failed to record login attempt: ${(err as Error).message}`);
    }
  }
}
