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
      throw new ForbiddenException('Access denied');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Role '${user.role}' does not have permission for this resource`,
      );
    }

    return true;
  }
}
