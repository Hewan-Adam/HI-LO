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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminUsersService = void 0;
const common_1 = require("@nestjs/common");
const admin_user_repository_interface_1 = require("../interfaces/admin-user-repository.interface");
const audit_log_service_1 = require("../../audit-log/services/audit-log.service");
const auth_types_1 = require("../../auth/interfaces/auth-types");
const admin_exceptions_1 = require("../exceptions/admin.exceptions");
const ROLE_RANK = { [auth_types_1.Role.PLAYER]: 0, [auth_types_1.Role.ADMIN]: 1, [auth_types_1.Role.SUPER_ADMIN]: 2 };
let AdminUsersService = class AdminUsersService {
    constructor(repository, auditLog) {
        this.repository = repository;
        this.auditLog = auditLog;
    }
    async search(filters) {
        return this.repository.search(filters);
    }
    async getDetail(userId) {
        const detail = await this.repository.getDetail(userId);
        if (!detail)
            throw new admin_exceptions_1.AdminUserNotFoundException(userId);
        return detail;
    }
    /**
     * Enforces a strict privilege hierarchy: an actor can only act on a target
     * whose role ranks strictly below their own. This means an ADMIN can ban
     * a PLAYER but not another ADMIN or a SUPER_ADMIN (preventing a compromised
     * or rogue admin account from disabling peer/superior admin accounts),
     * while a SUPER_ADMIN can act on anyone below SUPER_ADMIN.
     */
    async setBanStatus(actorUserId, actorRole, targetUserId, banned, reason, actorIp) {
        const targetRole = await this.repository.getRole(targetUserId);
        if (targetRole === null)
            throw new admin_exceptions_1.AdminUserNotFoundException(targetUserId);
        if (ROLE_RANK[targetRole] >= ROLE_RANK[actorRole]) {
            throw new admin_exceptions_1.InsufficientAdminPrivilegeException(`${banned ? 'ban' : 'unban'} a user with role ${targetRole}`);
        }
        await this.repository.setBanStatus(targetUserId, banned, reason);
        await this.auditLog.record({
            userId: actorUserId,
            action: banned ? 'user.ban' : 'user.unban',
            entityType: 'User',
            entityId: targetUserId,
            ipAddress: actorIp,
            metadata: banned ? { reason } : undefined,
        });
    }
};
exports.AdminUsersService = AdminUsersService;
exports.AdminUsersService = AdminUsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(admin_user_repository_interface_1.ADMIN_USER_REPOSITORY)),
    __metadata("design:paramtypes", [Object, audit_log_service_1.AuditLogService])
], AdminUsersService);
