"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogModule = void 0;
const common_1 = require("@nestjs/common");
const audit_log_service_1 = require("./services/audit-log.service");
const prisma_audit_log_repository_1 = require("./repositories/prisma-audit-log.repository");
const audit_log_repository_interface_1 = require("./interfaces/audit-log-repository.interface");
let AuditLogModule = class AuditLogModule {
};
exports.AuditLogModule = AuditLogModule;
exports.AuditLogModule = AuditLogModule = __decorate([
    (0, common_1.Module)({
        providers: [audit_log_service_1.AuditLogService, { provide: audit_log_repository_interface_1.AUDIT_LOG_REPOSITORY, useClass: prisma_audit_log_repository_1.PrismaAuditLogRepository }],
        exports: [audit_log_service_1.AuditLogService],
    })
], AuditLogModule);
