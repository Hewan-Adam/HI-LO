"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const auth_decorators_1 = require("../decorators/auth.decorators");
const auth_types_1 = require("../interfaces/auth-types");
let RolesGuard = class RolesGuard {
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const requiredRoles = this.reflector.getAllAndOverride(auth_decorators_1.ROLES_KEY, [context.getHandler(), context.getClass()]);
        if (!requiredRoles || requiredRoles.length === 0) {
            return true; // no @Roles(...) applied — any authenticated user may proceed
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            // JwtAuthGuard should always run first and set this; treat its absence as a misconfiguration, not a pass.
            throw new common_1.ForbiddenException('No authenticated user on request — is JwtAuthGuard registered before RolesGuard?');
        }
        // SUPER_ADMIN implicitly satisfies any ADMIN-restricted route.
        const effectiveRoles = user.role === auth_types_1.Role.SUPER_ADMIN ? [auth_types_1.Role.SUPER_ADMIN, auth_types_1.Role.ADMIN] : [user.role];
        const authorized = requiredRoles.some((role) => effectiveRoles.includes(role));
        if (!authorized) {
            throw new common_1.ForbiddenException(`This action requires one of the following roles: ${requiredRoles.join(', ')}`);
        }
        return true;
    }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], RolesGuard);
