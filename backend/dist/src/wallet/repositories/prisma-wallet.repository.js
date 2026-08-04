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
exports.PrismaWalletRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
/**
 * Real production implementation of WalletRepository, backed by Postgres via
 * Prisma. The optimistic-locking guarantee is enforced by conditioning the
 * update on `version` in the `WHERE` clause (`updateMany`, since Prisma's
 * `update` throws on a non-matching unique filter rather than returning a
 * count) — if another request already advanced the version, `count` comes
 * back 0 and this method returns `null` with nothing written, exactly like
 * the in-memory test double.
 */
let PrismaWalletRepository = class PrismaWalletRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getWalletByUserId(userId) {
        const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
        return wallet ? this.toSnapshot(wallet) : null;
    }
    async createWalletForUser(userId, currency = 'USD') {
        const wallet = await this.prisma.wallet.upsert({
            where: { userId },
            update: {},
            create: { userId, currency, balance: 0, bonusBalance: 0 },
        });
        return this.toSnapshot(wallet);
    }
    async commitBalanceChange(request, transaction) {
        return this.prisma.$transaction(async (tx) => {
            const updateResult = await tx.wallet.updateMany({
                where: { id: request.walletId, version: request.expectedVersion },
                data: {
                    balance: { increment: request.balanceDelta },
                    bonusBalance: { increment: request.bonusBalanceDelta },
                    version: { increment: 1 },
                },
            });
            if (updateResult.count === 0) {
                // Version mismatch: someone else updated this wallet first. Nothing
                // was written — returning null here lets Prisma commit an empty
                // transaction, and WalletService retries with a fresh read.
                return null;
            }
            const updatedWallet = await tx.wallet.findUniqueOrThrow({ where: { id: request.walletId } });
            const createdTransaction = await tx.transaction.create({
                data: {
                    userId: transaction.userId,
                    gameId: transaction.gameId,
                    type: transaction.type,
                    status: transaction.status,
                    amount: transaction.amount,
                    balanceBefore: transaction.balanceBefore,
                    balanceAfter: Number(updatedWallet.balance),
                    reference: transaction.reference,
                    metadata: (transaction.metadata ?? undefined),
                },
            });
            return {
                wallet: this.toSnapshot(updatedWallet),
                transaction: this.toTransactionRecord(createdTransaction),
            };
        });
    }
    async getTransactionByReference(reference) {
        const tx = await this.prisma.transaction.findUnique({ where: { reference } });
        return tx ? this.toTransactionRecord(tx) : null;
    }
    async getTransactionHistory(userId, limit = 50, offset = 0) {
        const rows = await this.prisma.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
        return rows.map((row) => this.toTransactionRecord(row));
    }
    async searchTransactions(filters) {
        const rows = await this.prisma.transaction.findMany({
            where: {
                userId: filters.userId,
                type: filters.type,
                status: filters.status,
            },
            orderBy: { createdAt: 'desc' },
            take: filters.limit ?? 50,
            skip: filters.offset ?? 0,
        });
        return rows.map((row) => this.toTransactionRecord(row));
    }
    // --------------------------------------------------------------------
    // Mapping helpers: Prisma's generated types use Decimal for money fields
    // and typed enums that structurally match, but aren't the same TS type
    // identity as, our domain enums — these functions are the single place
    // that conversion happens.
    // --------------------------------------------------------------------
    toSnapshot(wallet) {
        return {
            id: wallet.id,
            userId: wallet.userId,
            balance: Number(wallet.balance),
            bonusBalance: Number(wallet.bonusBalance),
            currency: wallet.currency,
            version: wallet.version,
        };
    }
    toTransactionRecord(row) {
        return {
            id: row.id,
            userId: row.userId,
            gameId: row.gameId ?? undefined,
            type: row.type,
            status: row.status,
            amount: Number(row.amount),
            balanceBefore: Number(row.balanceBefore),
            balanceAfter: Number(row.balanceAfter),
            reference: row.reference ?? undefined,
            metadata: row.metadata ?? undefined,
            createdAt: row.createdAt,
        };
    }
};
exports.PrismaWalletRepository = PrismaWalletRepository;
exports.PrismaWalletRepository = PrismaWalletRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaWalletRepository);
