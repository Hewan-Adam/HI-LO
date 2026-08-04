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
exports.AdminAuditLogController = void 0;
const common_1 = require("@nestjs/common");
const audit_log_service_1 = require("../../audit-log/services/audit-log.service");
const auth_decorators_1 = require("../../auth/decorators/auth.decorators");
const auth_types_1 = require("../../auth/interfaces/auth-types");
let AdminAuditLogController = class AdminAuditLogController {
    constructor(auditLogService) {
        this.auditLogService = auditLogService;
    }
    async find(userId, action, entityType, limit, offset) {
        return this.auditLogService.find({
            userId,
            action,
            entityType,
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined,
        });
    }
};
exports.AdminAuditLogController = AdminAuditLogController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('userId')),
    __param(1, (0, common_1.Query)('action')),
    __param(2, (0, common_1.Query)('entityType')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminAuditLogController.prototype, "find", null);
exports.AdminAuditLogController = AdminAuditLogController = __decorate([
    (0, common_1.Controller)('admin/audit-log'),
    (0, auth_decorators_1.Roles)(auth_types_1.Role.SUPER_ADMIN),
    __metadata("design:paramtypes", [audit_log_service_1.AuditLogService])
], AdminAuditLogController);
