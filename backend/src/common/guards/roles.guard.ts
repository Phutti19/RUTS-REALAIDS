import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, UserRole } from '../decorators/roles.decorator';
import { RequestUser } from '../decorators/current-user.decorator';

/**
 * RolesGuard — check that req.user.role is in the @Roles() list.
 * Must be used AFTER AuthGuard (which sets req.user).
 *
 * @example
 * @UseGuards(AuthGuard, RolesGuard)
 * @Roles('staff', 'admin')
 * @Get()
 * findAll() { ... }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator — allow all authenticated users
    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest<{ user: RequestUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึง กรุณาเข้าสู่ระบบ');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `บทบาท "${user.role}" ไม่มีสิทธิ์ใช้งานฟีเจอร์นี้`,
      );
    }

    return true;
  }
}
