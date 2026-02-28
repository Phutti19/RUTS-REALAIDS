import { SetMetadata } from '@nestjs/common';

export type UserRole = 'student' | 'staff' | 'admin';

export const ROLES_KEY = 'roles';

/**
 * @Roles('staff', 'admin') — restrict endpoint to specific roles.
 * Used together with RolesGuard.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
