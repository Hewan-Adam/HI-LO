import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { WalletRepository } from '../interfaces/wallet-repository.interface';
import { BalanceChangeRequest, TransactionRecord, WalletSnapshot, WalletTransactionType, WalletTransactionStatus } from '../interfaces/wallet-types';

/**
 * Faithful in-memory implementation of WalletRepository, used for unit
 * tests and the phase-2 demo. It deliberately reproduces the two properties
 * that make optimistic locking meaningful even without a real database:
 *
 *  1. `applyBalanceChange` only succeeds if the wallet's current version
 *     still equals `expectedVersion` — otherwise it returns null, exactly
 *     like a Prisma `updateMany({ where: { id, version } })` that matched
 *     zero rows.
 *  2. It supports an artificial delay between a caller's read and its write
 *     (`simulateReadWriteDelayMs`), which is how the demo forces real
 *     version conflicts to happen so the retry logic can be observed
 *     actually doing something, rather than trusting it by inspection.
 */
@Injectable()
export class InMemoryWalletRepository implements WalletRepository {
  private wallets = new Map<string, WalletSnapshot>(); // keyed by userId
  private walletsById = new Map<string, WalletSnapshot>();
  private transactions: TransactionRecord[] = [];
  private referenceIndex = new Map<string, string>(); // reference -> transaction id

  /** When >0, applyBalanceChange awaits this long between snapshotting and committing, to make race windows observable in tests. */
  public simulateReadWriteDelayMs = 0;

  async getWalletByUserId(userId: string): Promise<WalletSnapshot | null> {
    const wallet = this.wallets.get(userId);
    return wallet ? { ...wallet } : null;
  }

  async createWalletForUser(userId: string, currency = 'USD'): Promise<WalletSnapshot> {
    if (this.wallets.has(userId)) {
      return { ...this.wallets.get(userId)! };
    }
    const wallet: WalletSnapshot = {
      id: crypto.randomUUID(),
      userId,
      balance: 0,
      bonusBalance: 0,
      currency,
      version: 0,
    };
    this.wallets.set(userId, wallet);
    this.walletsById.set(wallet.id, wallet);
    return { ...wallet };
  }

  async commitBalanceChange(
    request: BalanceChangeRequest,
    transaction: Omit<TransactionRecord, 'id' | 'createdAt'>,
  ): Promise<{ wallet: WalletSnapshot; transaction: TransactionRecord } | null> {
    const current = this.walletsById.get(request.walletId);
    if (!current) return null;

    // Snapshot the version we're conditioning on, then (optionally) yield
    // the event loop to let a concurrent caller interleave — this is what
    // actually exercises the optimistic-locking retry path in the demo.
    const conditionVersion = request.expectedVersion;
    if (this.simulateReadWriteDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.simulateReadWriteDelayMs));
    }

    if (current.version !== conditionVersion) {
      return null; // stale read — caller must retry, no writes performed
    }

    if (transaction.reference && this.referenceIndex.has(transaction.reference)) {
      throw new Error('UNIQUE constraint failed: transactions.reference');
    }

    // From here on this is the atomic "commit": both the wallet mutation and
    // the ledger insert happen with no `await` between them, so nothing else
    // can interleave inside this critical section (mirrors a Prisma
    // $transaction([...]) committing both statements together).
    current.balance = Number((current.balance + request.balanceDelta).toFixed(8));
    current.bonusBalance = Number((current.bonusBalance + request.bonusBalanceDelta).toFixed(8));
    current.version += 1;

    const fullTransaction: TransactionRecord = {
      ...transaction,
      balanceAfter: current.balance,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    this.transactions.push(fullTransaction);
    if (fullTransaction.reference) this.referenceIndex.set(fullTransaction.reference, fullTransaction.id);

    return { wallet: { ...current }, transaction: fullTransaction };
  }

  async getTransactionByReference(reference: string): Promise<TransactionRecord | null> {
    const id = this.referenceIndex.get(reference);
    if (!id) return null;
    return this.transactions.find((t) => t.id === id) ?? null;
  }

  async getTransactionHistory(userId: string, limit = 50, offset = 0): Promise<TransactionRecord[]> {
    return this.transactions
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);
  }

  async searchTransactions(filters: {
    userId?: string;
    type?: WalletTransactionType;
    status?: WalletTransactionStatus;
    limit?: number;
    offset?: number;
  }): Promise<TransactionRecord[]> {
    return this.transactions
      .filter((t) => !filters.userId || t.userId === filters.userId)
      .filter((t) => !filters.type || t.type === filters.type)
      .filter((t) => !filters.status || t.status === filters.status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 50));
  }

  /** Test/demo helper only — not part of the WalletRepository interface. */
  _debugAllTransactions(): TransactionRecord[] {
    return [...this.transactions];
  }
}
