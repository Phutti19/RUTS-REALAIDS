import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { AuthService } from './auth.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/login
   * Returns: { success, data: { accessToken, refreshToken, user } }
   *
   * Tracks login attempts per email+IP.
   * Locks account after 5 failures within 15 minutes.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ipAddress = this.extractIp(req);
    const data = await this.authService.login(dto, ipAddress);
    return { success: true, data };
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
   * POST /api/v1/auth/refresh
   * Exchange a valid refresh token for a new access token.
   * Refresh token itself is NOT rotated — client keeps the same one until logout.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    const data = await this.authService.refresh(dto.refreshToken);
    return { success: true, data };
  }

  /**
   * POST /api/v1/auth/logout
   * Revokes the refresh token in the database.
   * Requires a valid access token in the Authorization header.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async logout(
    @Body() dto: RefreshTokenDto,
    @CurrentUser('id') userId: string,
  ) {
    await this.authService.logout(dto.refreshToken);
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
