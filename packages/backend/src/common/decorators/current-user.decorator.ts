import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * The shape of the authenticated user object attached to the request
 * after JWT validation.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

/**
 * Parameter decorator that extracts the current authenticated user
 * from the request object.
 *
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser() user: AuthenticatedUser) {
 *   return user;
 * }
 *
 * @example
 * @Get('profile')
 * getEmail(@CurrentUser('email') email: string) {
 *   return email;
 * }
 */
export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | AuthenticatedUser[keyof AuthenticatedUser] => {
    const request: { user: AuthenticatedUser } = ctx
      .switchToHttp()
      .getRequest();
    const user: AuthenticatedUser = request.user;

    if (data) {
      return user[data];
    }

    return user;
  },
);
