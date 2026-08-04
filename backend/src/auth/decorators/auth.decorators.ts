import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../interfaces/auth-types';

export const IS_PUBLIC_KEY = 'isPublic';
/** Marks a route as not requiring authentication (e.g. /auth/telegram-login, /auth/refresh). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
/** Restricts a route to the given roles. Applied on top of JwtAuthGuard; requires RolesGuard. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Extracts the AccessTokenPayload that JwtAuthGuard attached to the request. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
