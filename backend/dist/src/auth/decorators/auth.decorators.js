"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = exports.Roles = exports.ROLES_KEY = exports.Public = exports.IS_PUBLIC_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.IS_PUBLIC_KEY = 'isPublic';
/** Marks a route as not requiring authentication (e.g. /auth/telegram-login, /auth/refresh). */
const Public = () => (0, common_1.SetMetadata)(exports.IS_PUBLIC_KEY, true);
exports.Public = Public;
exports.ROLES_KEY = 'roles';
/** Restricts a route to the given roles. Applied on top of JwtAuthGuard; requires RolesGuard. */
const Roles = (...roles) => (0, common_1.SetMetadata)(exports.ROLES_KEY, roles);
exports.Roles = Roles;
/** Extracts the AccessTokenPayload that JwtAuthGuard attached to the request. */
exports.CurrentUser = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
});
