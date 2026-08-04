/**
 * Domain-layer enums intentionally mirror the Prisma schema's
 * TransactionType/TransactionStatus enums (kept in sync manually), following
 * the same pattern as the game-engine module: the business logic in
 * WalletService never imports the generated Prisma client directly, so it
 * stays testable with an in-memory repository and framework-agnostic.
 */
export enum WalletTransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  BET = 'BET',
  CASHOUT = 'CASHOUT',
  REFUND = 'REFUND',
  BONUS_CREDIT = 'BONUS_CREDIT',
  PROMOTION_CREDIT = 'PROMOTION_CREDIT',
  REFERRAL_REWARD = 'REFERRAL_REWARD',
}

export enum WalletTransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

export interface WalletSnapshot {
  id: string;
  userId: string;
  balance: number;
  bonusBalance: number;
  currency: string;
  version: number;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  gameId?: string;
  type: WalletTransactionType;
  status: WalletTransactionStatus;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface BalanceChangeRequest {
  walletId: string;
  expectedVersion: number;
  balanceDelta: number; // positive = credit, negative = debit
  bonusBalanceDelta: number;
}
