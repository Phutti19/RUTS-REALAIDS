import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { Request } from 'express';

interface JwtPayload {
  sub: string;
  role: 'student' | 'staff' | 'admin';
  iat: number;
  exp: number;
}

/**
 * AuthGuard — verify the Bearer token in the Authorization header.
 * On success, attaches `req.user = { id, role }` for downstream use.
 *
 * Apply globally or per-route:
 *   @UseGuards(AuthGuard)
 */
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('ไม่พบ Token กรุณาเข้าสู่ระบบ');
    }

    const token = authHeader.slice(7);

    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new UnauthorizedException('เซิร์ฟเวอร์ไม่ได้ตั้งค่า JWT_SECRET');
      }
      const payload = jwt.verify(token, jwtSecret) as JwtPayload;
      request.user = { id: payload.sub, role: payload.role };
      return true;
    } catch (err: unknown) {
      const isExpired = err instanceof jwt.TokenExpiredError;
      throw new UnauthorizedException(
        isExpired ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' : 'Token ไม่ถูกต้อง',
      );
    }
  }
}
