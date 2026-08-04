import { BalanceChangeRequest, TransactionRecord, WalletSnapshot, WalletTransactionType, WalletTransactionStatus } from './wallet-types';

export const WALLET_REPOSITORY = Symbol('WALLET_REPOSITORY');

export interface CommitBalanceChangeResult {
  wallet: WalletSnapshot;
  transaction: TransactionRecord;
}

/**
 * Every implementation must guarantee:
 *  1. `commitBalanceChange` performs the conditional wallet update
 *     (`WHERE id = walletId AND version = expectedVersion`) *and* inserts the
 *     accompanying Transaction ledger row as a single atomic unit — both
 *     happen or neither does. In Prisma this is `prisma.$transaction([...])`;
 *     in the in-memory test double it's a single synchronous critical
 *     section. This is what "every wallet operation must be transactional"
 *     means concretely: a balance change is never persisted without its
 *     ledger entry, and vice versa.
 *  2. If no wallet row matches `expectedVersion` (someone else updated the
 *     wallet first), it returns `null` and performs no writes at all —
 *     WalletService retries with a fresh read rather than trusting stale data.
 *  3. A duplicate `reference` on the ledger row must be rejected (unique
 *     constraint / equivalent), so idempotency checks upstream are backed by
 *     a real constraint, not just an application-level pre-check.
 */
export interface WalletRepository {
  getWalletByUserId(userId: string): Promise<WalletSnapshot | null>;
  createWalletForUser(userId: string, currency?: string): Promise<WalletSnapshot>;
  commitBalanceChange(
    request: BalanceChangeRequest,
    transaction: Omit<TransactionRecord, 'id' | 'createdAt'>,
  ): Promise<CommitBalanceChangeResult | null>;
  getTransactionByReference(reference: string): Promise<TransactionRecord | null>;
  getTransactionHistory(userId: string, limit?: number, offset?: number): Promise<TransactionRecord[]>;
  /** Admin oversight: search across ALL users' transactions, unlike getTransactionHistory which is scoped to one user. */
  searchTransactions(filters: { userId?: string; type?: WalletTransactionType; status?: WalletTransactionStatus; limit?: number; offset?: number }): Promise<TransactionRecord[]>;
}
