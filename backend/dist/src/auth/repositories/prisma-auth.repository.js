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
exports.PrismaAuthRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let PrismaAuthRepository = class PrismaAuthRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findUserByTelegramId(telegramId) {
        const user = await this.prisma.user.findUnique({ where: { telegramId } });
        return user ? this.toAuthenticatedUser(user) : null;
    }
    async createUser(params) {
        // Upsert rather than a plain create: two near-simultaneous first logins
        // from the same brand-new Telegram user (e.g. double-tapped launch)
        // must not race into a duplicate-user / unique-constraint error.
        const user = await this.prisma.user.upsert({
            where: { telegramId: params.telegramId },
            update: {},
            create: {
                telegramId: params.telegramId,
                username: params.username,
                firstName: params.firstName,
                lastName: params.lastName,
            },
        });
        return this.toAuthenticatedUser(user);
    }
    async findUserById(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        return user ? this.toAuthenticatedUser(user) : null;
    }
    async storeRefreshToken(params) {
        const record = await this.prisma.refreshToken.create({
            data: {
                userId: params.userId,
                tokenHash: params.tokenHash,
                familyId: params.familyId,
                expiresAt: params.expiresAt,
            },
        });
        return this.toRefreshTokenRecord(record);
    }
    async findRefreshTokenByHash(tokenHash) {
        const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
        return record ? this.toRefreshTokenRecord(record) : null;
    }
    async markRotated(tokenHash, replacedByTokenHash) {
        await this.prisma.refreshToken.update({
            where: { tokenHash },
            data: { revoked: true, replacedByTokenHash },
        });
    }
    async revokeFamily(familyId) {
        await this.prisma.refreshToken.updateMany({
            where: { familyId },
            data: { revoked: true },
        });
    }
    toAuthenticatedUser(user) {
        return {
            id: user.id,
            telegramId: user.telegramId,
            username: user.username ?? undefined,
            role: user.role,
            isBanned: user.isBanned,
        };
    }
    toRefreshTokenRecord(record) {
        return {
            id: record.id,
            userId: record.userId,
            tokenHash: record.tokenHash,
            familyId: record.familyId,
            revoked: record.revoked,
            replacedByTokenHash: record.replacedByTokenHash ?? undefined,
            expiresAt: record.expiresAt,
            createdAt: record.createdAt,
        };
    }
};
exports.PrismaAuthRepository = PrismaAuthRepository;
exports.PrismaAuthRepository = PrismaAuthRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaAuthRepository);
