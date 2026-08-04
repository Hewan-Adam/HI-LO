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
exports.AdminGameSettingsController = void 0;
const common_1 = require("@nestjs/common");
const admin_settings_service_1 = require("../../admin-settings/services/admin-settings.service");
const audit_log_service_1 = require("../../audit-log/services/audit-log.service");
const auth_decorators_1 = require("../../auth/decorators/auth.decorators");
const auth_types_1 = require("../../auth/interfaces/auth-types");
const admin_dto_1 = require("../dto/admin.dto");
let AdminGameSettingsController = class AdminGameSettingsController {
    constructor(adminSettingsService, auditLog) {
        this.adminSettingsService = adminSettingsService;
        this.auditLog = auditLog;
    }
    async getAll() {
        const [aceMode, equalRule, multiplierTable, targetRtpPercent] = await Promise.all([
            this.adminSettingsService.getAceMode(),
            this.adminSettingsService.getEqualRule(),
            this.adminSettingsService.getMultiplierTable(),
            this.adminSettingsService.getTargetRtpPercent(),
        ]);
        return { aceMode, equalRule, multiplierTable, targetRtpPercent };
    }
    // Mutations are SUPER_ADMIN-only: these parameters directly control house
    // edge / player payout, which is a materially different blast radius than
    // day-to-day moderation (banning a user, viewing transactions).
    async setAceMode(actor, dto, req) {
        await this.adminSettingsService.setAceMode(dto.aceMode, actor.sub);
        await this.auditLog.record({ userId: actor.sub, action: 'game-settings.ace-mode.update', entityType: 'AdminSettings', ipAddress: req?.ip, metadata: { aceMode: dto.aceMode } });
        return { aceMode: dto.aceMode };
    }
    async setEqualRule(actor, dto, req) {
        await this.adminSettingsService.setEqualRule(dto.equalRule, actor.sub);
        await this.auditLog.record({ userId: actor.sub, action: 'game-settings.equal-rule.update', entityType: 'AdminSettings', ipAddress: req?.ip, metadata: { equalRule: dto.equalRule } });
        return { equalRule: dto.equalRule };
    }
    async setMultiplierTable(actor, dto, req) {
        // AdminSettingsService.setMultiplierTable throws BadRequestException if
        // the table isn't strictly increasing, so a bad admin edit is rejected
        // with a proper 400 before ever reaching a live game.
        await this.adminSettingsService.setMultiplierTable(dto.table, actor.sub);
        await this.auditLog.record({ userId: actor.sub, action: 'game-settings.multiplier-table.update', entityType: 'AdminSettings', ipAddress: req?.ip, metadata: { table: dto.table } });
        return { multiplierTable: dto.table };
    }
    async setTargetRtp(actor, dto, req) {
        await this.adminSettingsService.setTargetRtpPercent(dto.percent, actor.sub);
        await this.auditLog.record({ userId: actor.sub, action: 'game-settings.target-rtp.update', entityType: 'AdminSettings', ipAddress: req?.ip, metadata: { percent: dto.percent } });
        return { targetRtpPercent: dto.percent };
    }
};
exports.AdminGameSettingsController = AdminGameSettingsController;
__decorate([
    (0, auth_decorators_1.Roles)(auth_types_1.Role.ADMIN),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminGameSettingsController.prototype, "getAll", null);
__decorate([
    (0, auth_decorators_1.Roles)(auth_types_1.Role.SUPER_ADMIN),
    (0, common_1.Post)('ace-mode'),
    __param(0, (0, auth_decorators_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, admin_dto_1.UpdateAceModeDto, Object]),
    __metadata("design:returntype", Promise)
], AdminGameSettingsController.prototype, "setAceMode", null);
__decorate([
    (0, auth_decorators_1.Roles)(auth_types_1.Role.SUPER_ADMIN),
    (0, common_1.Post)('equal-rule'),
    __param(0, (0, auth_decorators_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, admin_dto_1.UpdateEqualRuleDto, Object]),
    __metadata("design:returntype", Promise)
], AdminGameSettingsController.prototype, "setEqualRule", null);
__decorate([
    (0, auth_decorators_1.Roles)(auth_types_1.Role.SUPER_ADMIN),
    (0, common_1.Post)('multiplier-table'),
    __param(0, (0, auth_decorators_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, admin_dto_1.UpdateMultiplierTableDto, Object]),
    __metadata("design:returntype", Promise)
], AdminGameSettingsController.prototype, "setMultiplierTable", null);
__decorate([
    (0, auth_decorators_1.Roles)(auth_types_1.Role.SUPER_ADMIN),
    (0, common_1.Post)('target-rtp'),
    __param(0, (0, auth_decorators_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, admin_dto_1.UpdateTargetRtpDto, Object]),
    __metadata("design:returntype", Promise)
], AdminGameSettingsController.prototype, "setTargetRtp", null);
exports.AdminGameSettingsController = AdminGameSettingsController = __decorate([
    (0, common_1.Controller)('admin/game-settings'),
    __metadata("design:paramtypes", [admin_settings_service_1.AdminSettingsService,
        audit_log_service_1.AuditLogService])
], AdminGameSettingsController);
