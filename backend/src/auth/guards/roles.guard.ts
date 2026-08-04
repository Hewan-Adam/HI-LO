import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/auth.decorators';
import { AccessTokenPayload, Role } from '../interfaces/auth-types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // no @Roles(...) applied — any authenticated user may proceed
    }

    const request = context.switchToHttp().getRequest();
    const user: AccessTokenPayload | undefined = request.user;

    if (!user) {
      // JwtAuthGuard should always run first and set this; treat its absence as a misconfiguration, not a pass.
      throw new ForbiddenException('No authenticated user on request — is JwtAuthGuard registered before RolesGuard?');
    }

    // SUPER_ADMIN implicitly satisfies any ADMIN-restricted route.
    const effectiveRoles = user.role === Role.SUPER_ADMIN ? [Role.SUPER_ADMIN, Role.ADMIN] : [user.role];
    const authorized = requiredRoles.some((role) => effectiveRoles.includes(role));

    if (!authorized) {
      throw new ForbiddenException(`This action requires one of the following roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
