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
exports.PrismaAuditLogRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let PrismaAuditLogRepository = class PrismaAuditLogRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async record(params) {
        const row = await this.prisma.auditLog.create({
            data: {
                userId: params.userId,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                ipAddress: params.ipAddress,
                metadata: (params.metadata ?? undefined),
            },
        });
        return this.toEntry(row);
    }
    async find(filters) {
        const rows = await this.prisma.auditLog.findMany({
            where: {
                userId: filters.userId,
                action: filters.action,
                entityType: filters.entityType,
                entityId: filters.entityId,
            },
            orderBy: { createdAt: 'desc' },
            take: filters.limit ?? 50,
            skip: filters.offset ?? 0,
        });
        return rows.map((row) => this.toEntry(row));
    }
    toEntry(row) {
        return {
            id: row.id,
            userId: row.userId ?? undefined,
            action: row.action,
            entityType: row.entityType,
            entityId: row.entityId ?? undefined,
            ipAddress: row.ipAddress ?? undefined,
            metadata: row.metadata ?? undefined,
            createdAt: row.createdAt,
        };
    }
};
exports.PrismaAuditLogRepository = PrismaAuditLogRepository;
exports.PrismaAuditLogRepository = PrismaAuditLogRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaAuditLogRepository);
