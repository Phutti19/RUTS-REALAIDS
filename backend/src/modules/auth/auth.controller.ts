import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  Query,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'lax' as const,
  maxAge: COOKIE_MAX_AGE,
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/login
   * Sets refresh token as httpOnly cookie; returns { accessToken, user }.
   *
   * Tracks login attempts per email+IP.
   * Locks account after 5 failures within 15 minutes.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = this.extractIp(req);
    const userAgent = (req.headers['user-agent'] as string) ?? null;
    const { accessToken, refreshToken, user } = await this.authService.login(dto, ipAddress, userAgent);
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    return { success: true, data: { accessToken, user } };
  }

  /**
   * POST /api/v1/auth/register
   * Creates a student account. Role is always 'student' on self-registration.
   * Staff/admin accounts are created by administrators.
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    const data = await this.authService.register(dto);
    return { success: true, data };
  }

  /**
   * GET /api/v1/auth/lookup?studentId=xxx
   * Look up an unactivated student account. Returns name + masked email.
   * Used by the frontend to confirm identity before setting a password.
   */
  @Get('lookup')
  async lookupUnactivated(@Query('studentId') studentId: string) {
    if (!studentId) {
      return { success: false, error: 'MISSING_PARAM', message: 'studentId is required' };
    }
    const data = await this.authService.lookupUnactivated(studentId);
    return { success: true, data };
  }

  /**
   * POST /api/v1/auth/activate
   * Activate a pre-imported student account by setting a password.
   */
  @Post('activate')
  @HttpCode(HttpStatus.OK)
  async activateAccount(@Body() dto: ActivateAccountDto) {
    const data = await this.authService.activateAccount(dto);
    return { success: true, data };
  }

  /**
   * POST /api/v1/auth/refresh
   * Reads refresh token from httpOnly cookie; returns a new access token.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request & { cookies: Record<string, string> }) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }
    const data = await this.authService.refresh(refreshToken);
    return { success: true, data };
  }

  /**
   * POST /api/v1/auth/logout
   * Revokes the refresh token in the database and clears the cookie.
   * Requires a valid access token in the Authorization header.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async logout(
    @Req() req: Request & { cookies: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * POST /api/v1/auth/forgot-password
   * Generates a one-time password reset token.
   * In development: token is returned in the response.
   * In production: token should be emailed to the user.
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const data = await this.authService.forgotPassword(dto.email);
    return { success: true, data };
  }

  /**
   * POST /api/v1/auth/reset-password
   * Resets the password using the one-time token.
   * Revokes all existing refresh tokens (forces re-login on all devices).
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { success: true, message: 'Password reset successfully. Please log in again.' };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Extract real client IP, handling reverse proxies (X-Forwarded-For).
   */
  private extractIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0';
  }
}
