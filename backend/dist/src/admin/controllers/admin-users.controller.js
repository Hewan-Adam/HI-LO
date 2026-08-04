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
exports.AdminUsersController = void 0;
const common_1 = require("@nestjs/common");
const admin_users_service_1 = require("../services/admin-users.service");
const auth_decorators_1 = require("../../auth/decorators/auth.decorators");
const auth_types_1 = require("../../auth/interfaces/auth-types");
const admin_dto_1 = require("../dto/admin.dto");
let AdminUsersController = class AdminUsersController {
    constructor(adminUsersService) {
        this.adminUsersService = adminUsersService;
    }
    async search(telegramId, username, limit, offset) {
        return this.adminUsersService.search({
            telegramId,
            username,
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined,
        });
    }
    async detail(userId) {
        return this.adminUsersService.getDetail(userId);
    }
    async ban(actor, userId, dto, req) {
        await this.adminUsersService.setBanStatus(actor.sub, actor.role, userId, true, dto.reason, req?.ip);
        return { userId, banned: true };
    }
    async unban(actor, userId, req) {
        await this.adminUsersService.setBanStatus(actor.sub, actor.role, userId, false, undefined, req?.ip);
        return { userId, banned: false };
    }
};
exports.AdminUsersController = AdminUsersController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('telegramId')),
    __param(1, (0, common_1.Query)('username')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "search", null);
__decorate([
    (0, common_1.Get)(':userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "detail", null);
__decorate([
    (0, common_1.Post)(':userId/ban'),
    __param(0, (0, auth_decorators_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, admin_dto_1.BanUserDto, Object]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "ban", null);
__decorate([
    (0, common_1.Post)(':userId/unban'),
    __param(0, (0, auth_decorators_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "unban", null);
exports.AdminUsersController = AdminUsersController = __decorate([
    (0, common_1.Controller)('admin/users'),
    (0, auth_decorators_1.Roles)(auth_types_1.Role.ADMIN),
    __metadata("design:paramtypes", [admin_users_service_1.AdminUsersService])
], AdminUsersController);
