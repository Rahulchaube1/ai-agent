import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator that sets the required roles for a route handler or controller.
 * Used in conjunction with the RolesGuard.
 *
 * @example
 * @Roles('admin', 'editor')
 * @Get('protected')
 * getProtectedResource() { ... }
 */
export const Roles = (...roles: string[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
