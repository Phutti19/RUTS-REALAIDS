import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface RequestUser {
  id: string;
  role: 'student' | 'staff' | 'admin';
}

/**
 * @CurrentUser() — extract the authenticated user from the request.
 *
 * @example
 * async getProfile(@CurrentUser() user: RequestUser) { ... }
 * async getId(@CurrentUser('id') id: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (field: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    const user = request.user;
    return field ? user?.[field] : user;
  },
);
