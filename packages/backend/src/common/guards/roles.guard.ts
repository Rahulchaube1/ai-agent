import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles: string[] | undefined =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request: { user?: { role?: string } } = context
      .switchToHttp()
      .getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No user found in request');
    }

    const hasRole: boolean = requiredRoles.some(
      (role: string) => user.role === role,
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `User role '${user.role}' is not authorized. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
