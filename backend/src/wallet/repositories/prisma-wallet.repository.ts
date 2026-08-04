import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CommitBalanceChangeResult, WalletRepository } from '../interfaces/wallet-repository.interface';
import { BalanceChangeRequest, TransactionRecord, WalletSnapshot, WalletTransactionStatus, WalletTransactionType } from '../interfaces/wallet-types';

/**
 * Real production implementation of WalletRepository, backed by Postgres via
 * Prisma. The optimistic-locking guarantee is enforced by conditioning the
 * update on `version` in the `WHERE` clause (`updateMany`, since Prisma's
 * `update` throws on a non-matching unique filter rather than returning a
 * count) — if another request already advanced the version, `count` comes
 * back 0 and this method returns `null` with nothing written, exactly like
 * the in-memory test double.
 */
@Injectable()
export class PrismaWalletRepository implements WalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getWalletByUserId(userId: string): Promise<WalletSnapshot | null> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    return wallet ? this.toSnapshot(wallet) : null;
  }

  async createWalletForUser(userId: string, currency = 'USD'): Promise<WalletSnapshot> {
    const wallet = await this.prisma.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId, currency, balance: 0, bonusBalance: 0 },
    });
    return this.toSnapshot(wallet);
  }

  async commitBalanceChange(
    request: BalanceChangeRequest,
    transaction: Omit<TransactionRecord, 'id' | 'createdAt'>,
  ): Promise<CommitBalanceChangeResult | null> {
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
          type: transaction.type as unknown as Prisma.TransactionCreateInput['type'],
          status: transaction.status as unknown as Prisma.TransactionCreateInput['status'],
          amount: transaction.amount,
          balanceBefore: transaction.balanceBefore,
          balanceAfter: Number(updatedWallet.balance),
          reference: transaction.reference,
          metadata: (transaction.metadata ?? undefined) as Prisma.InputJsonValue,
        },
      });

      return {
        wallet: this.toSnapshot(updatedWallet),
        transaction: this.toTransactionRecord(createdTransaction),
      };
    });
  }

  async getTransactionByReference(reference: string): Promise<TransactionRecord | null> {
    const tx = await this.prisma.transaction.findUnique({ where: { reference } });
    return tx ? this.toTransactionRecord(tx) : null;
  }

  async getTransactionHistory(userId: string, limit = 50, offset = 0): Promise<TransactionRecord[]> {
    const rows = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return rows.map((row) => this.toTransactionRecord(row));
  }

  async searchTransactions(filters: {
    userId?: string;
    type?: WalletTransactionType;
    status?: WalletTransactionStatus;
    limit?: number;
    offset?: number;
  }): Promise<TransactionRecord[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        userId: filters.userId,
        type: filters.type as unknown as Prisma.TransactionWhereInput['type'],
        status: filters.status as unknown as Prisma.TransactionWhereInput['status'],
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

  private toSnapshot(wallet: {
    id: string;
    userId: string;
    balance: Prisma.Decimal;
    bonusBalance: Prisma.Decimal;
    currency: string;
    version: number;
  }): WalletSnapshot {
    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: Number(wallet.balance),
      bonusBalance: Number(wallet.bonusBalance),
      currency: wallet.currency,
      version: wallet.version,
    };
  }

  private toTransactionRecord(row: {
    id: string;
    userId: string;
    gameId: string | null;
    type: string;
    status: string;
    amount: Prisma.Decimal;
    balanceBefore: Prisma.Decimal;
    balanceAfter: Prisma.Decimal;
    reference: string | null;
    metadata: Prisma.JsonValue;
    createdAt: Date;
  }): TransactionRecord {
    return {
      id: row.id,
      userId: row.userId,
      gameId: row.gameId ?? undefined,
      type: row.type as WalletTransactionType,
      status: row.status as WalletTransactionStatus,
      amount: Number(row.amount),
      balanceBefore: Number(row.balanceBefore),
      balanceAfter: Number(row.balanceAfter),
      reference: row.reference ?? undefined,
      metadata: (row.metadata as Record<string, unknown>) ?? undefined,
      createdAt: row.createdAt,
    };
  }
}
