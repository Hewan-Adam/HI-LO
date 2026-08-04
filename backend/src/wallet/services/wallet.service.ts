import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { WALLET_REPOSITORY, WalletRepository } from '../interfaces/wallet-repository.interface';
import { TransactionRecord, WalletSnapshot, WalletTransactionStatus, WalletTransactionType } from '../interfaces/wallet-types';
import {
  DuplicateTransactionReferenceException,
  InsufficientFundsException,
  InvalidAmountException,
  WalletConcurrencyException,
  WalletNotFoundException,
} from '../exceptions/wallet.exceptions';

interface MutationPlan {
  balanceDelta: number;
  bonusBalanceDelta: number;
  type: WalletTransactionType;
  /** The amount recorded on the ledger row — not always equal to balanceDelta (e.g. a bet split across bonus + real balance). */
  ledgerAmount: number;
  gameId?: string;
  metadata?: Record<string, unknown>;
}

const MAX_OPTIMISTIC_LOCK_RETRIES = 10;
const BASE_RETRY_BACKOFF_MS = 8;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Every wallet mutation (deposit, withdraw, bet, cashout, refund, bonus
 * credit) funnels through `mutate()`, which:
 *   1. Reads the current wallet snapshot (balance + version).
 *   2. Validates the mutation against that snapshot (e.g. sufficient funds).
 *   3. Attempts a conditional update guarded by `version` (optimistic
 *      locking) — if another request updated the wallet in between steps 1
 *      and 3, the conditional update matches zero rows and `mutate()`
 *      retries from step 1 with a fresh read, up to MAX_OPTIMISTIC_LOCK_RETRIES.
 *   4. Records a Transaction row in the same atomic operation as the
 *      balance change (the repository implementation is responsible for
 *      making steps 3+4 a single DB transaction).
 *
 * This is what "every wallet operation must be transactional" from the spec
 * actually means in code: no wallet mutation is ever a plain
 * `UPDATE wallets SET balance = balance + x` — every one is conditioned on
 * the version it read, so two concurrent bets against the same wallet can
 * never silently overwrite each other's result.
 */
@Injectable()
export class WalletService {
  constructor(@Inject(WALLET_REPOSITORY) private readonly repository: WalletRepository) {}

  async getWallet(userId: string): Promise<WalletSnapshot> {
    const wallet = await this.repository.getWalletByUserId(userId);
    if (!wallet) throw new WalletNotFoundException(userId);
    return wallet;
  }

  async getOrCreateWallet(userId: string, currency = 'USD'): Promise<WalletSnapshot> {
    const existing = await this.repository.getWalletByUserId(userId);
    if (existing) return existing;
    return this.repository.createWalletForUser(userId, currency);
  }

  async getTransactionHistory(userId: string, limit = 50, offset = 0): Promise<TransactionRecord[]> {
    return this.repository.getTransactionHistory(userId, limit, offset);
  }

  /** Admin oversight only — searches across all users, unlike getTransactionHistory. */
  async searchTransactions(filters: {
    userId?: string;
    type?: WalletTransactionType;
    status?: WalletTransactionStatus;
    limit?: number;
    offset?: number;
  }): Promise<TransactionRecord[]> {
    return this.repository.searchTransactions(filters);
  }

  // --------------------------------------------------------------------
  // Public operations
  // --------------------------------------------------------------------

  async deposit(userId: string, amount: number, reference?: string, metadata?: Record<string, unknown>): Promise<TransactionRecord> {
    this.assertPositive(amount);
    const dedupeCheck = await this.checkIdempotency(reference);
    if (dedupeCheck) return dedupeCheck;

    return this.mutate(userId, {
      balanceDelta: amount,
      bonusBalanceDelta: 0,
      type: WalletTransactionType.DEPOSIT,
      ledgerAmount: amount,
      metadata,
    }, reference);
  }

  async withdraw(userId: string, amount: number, reference?: string): Promise<TransactionRecord> {
    this.assertPositive(amount);
    const dedupeCheck = await this.checkIdempotency(reference);
    if (dedupeCheck) return dedupeCheck;

    return this.mutate(userId, {
      balanceDelta: -amount,
      bonusBalanceDelta: 0,
      type: WalletTransactionType.WITHDRAWAL,
      ledgerAmount: amount,
    }, reference);
  }

  /**
   * Deducts a bet. If `useBonusFirst` is set, consumes available bonus
   * balance before touching the real balance; the split is recorded in the
   * transaction's metadata so it's auditable even though the ledger's
   * balanceBefore/After columns track main balance only.
   *
   * `reference` should be a caller-supplied deterministic string (the game
   * module uses `bet:${gameId}`) so that retrying the exact same bet event
   * — e.g. a network timeout where the client resends — is idempotent
   * rather than double-charging the player.
   */
  async placeBet(userId: string, gameId: string, amount: number, useBonusFirst = false, reference?: string): Promise<TransactionRecord> {
    this.assertPositive(amount);
    const dedupeCheck = await this.checkIdempotency(reference);
    if (dedupeCheck) return dedupeCheck;

    const wallet = await this.getWallet(userId);

    let fromBonus = 0;
    let fromReal = amount;
    if (useBonusFirst && wallet.bonusBalance > 0) {
      fromBonus = Math.min(wallet.bonusBalance, amount);
      fromReal = Number((amount - fromBonus).toFixed(8));
    }

    if (fromReal > wallet.balance) {
      throw new InsufficientFundsException(amount, wallet.balance + wallet.bonusBalance);
    }

    return this.mutate(userId, {
      balanceDelta: -fromReal,
      bonusBalanceDelta: -fromBonus,
      type: WalletTransactionType.BET,
      ledgerAmount: amount,
      gameId,
      metadata: { fromBonus, fromReal },
    }, reference);
  }

  /** `reference` (typically `cashout:${gameId}`) makes re-attempting a cashout credit after a partial failure safe — see GameApiService.cashout. */
  async settleCashout(userId: string, gameId: string, payoutAmount: number, reference?: string): Promise<TransactionRecord> {
    this.assertPositive(payoutAmount);
    const dedupeCheck = await this.checkIdempotency(reference);
    if (dedupeCheck) return dedupeCheck;

    return this.mutate(userId, {
      balanceDelta: payoutAmount,
      bonusBalanceDelta: 0,
      type: WalletTransactionType.CASHOUT,
      ledgerAmount: payoutAmount,
      gameId,
    }, reference);
  }

  /** Refunds a bet (e.g. an aborted/errored game) — credits back exactly what was deducted, including any bonus-balance portion. */
  async refundBet(userId: string, gameId: string, amount: number, bonusPortion = 0, reference?: string): Promise<TransactionRecord> {
    this.assertPositive(amount);
    const dedupeCheck = await this.checkIdempotency(reference);
    if (dedupeCheck) return dedupeCheck;

    const realPortion = Number((amount - bonusPortion).toFixed(8));

    return this.mutate(userId, {
      balanceDelta: realPortion,
      bonusBalanceDelta: bonusPortion,
      type: WalletTransactionType.REFUND,
      ledgerAmount: amount,
      gameId,
      metadata: { bonusPortion, realPortion },
    }, reference);
  }

  async creditBonus(userId: string, amount: number, reference?: string, metadata?: Record<string, unknown>): Promise<TransactionRecord> {
    this.assertPositive(amount);
    const dedupeCheck = await this.checkIdempotency(reference);
    if (dedupeCheck) return dedupeCheck;

    return this.mutate(userId, {
      balanceDelta: 0,
      bonusBalanceDelta: amount,
      type: WalletTransactionType.BONUS_CREDIT,
      ledgerAmount: amount,
      metadata,
    }, reference);
  }

  async creditReferralReward(userId: string, amount: number, metadata?: Record<string, unknown>): Promise<TransactionRecord> {
    this.assertPositive(amount);
    return this.mutate(userId, {
      balanceDelta: amount,
      bonusBalanceDelta: 0,
      type: WalletTransactionType.REFERRAL_REWARD,
      ledgerAmount: amount,
      metadata,
    });
  }

  // --------------------------------------------------------------------
  // Internals
  // --------------------------------------------------------------------

  private assertPositive(amount: number): void {
    if (!(amount > 0)) throw new InvalidAmountException(amount);
  }

  private async checkIdempotency(reference?: string): Promise<TransactionRecord | null> {
    if (!reference) return null;
    const existing = await this.repository.getTransactionByReference(reference);
    return existing ?? null;
  }

  private async mutate(userId: string, plan: MutationPlan, reference?: string): Promise<TransactionRecord> {
    for (let attempt = 1; attempt <= MAX_OPTIMISTIC_LOCK_RETRIES; attempt++) {
      const wallet = await this.repository.getWalletByUserId(userId);
      if (!wallet) throw new WalletNotFoundException(userId);

      const newBalance = Number((wallet.balance + plan.balanceDelta).toFixed(8));
      const newBonusBalance = Number((wallet.bonusBalance + plan.bonusBalanceDelta).toFixed(8));

      if (newBalance < 0) {
        throw new InsufficientFundsException(Math.abs(plan.balanceDelta), wallet.balance);
      }
      if (newBonusBalance < 0) {
        throw new InsufficientFundsException(Math.abs(plan.bonusBalanceDelta), wallet.bonusBalance);
      }

      try {
        const committed = await this.repository.commitBalanceChange(
          {
            walletId: wallet.id,
            expectedVersion: wallet.version,
            balanceDelta: plan.balanceDelta,
            bonusBalanceDelta: plan.bonusBalanceDelta,
          },
          {
            userId,
            gameId: plan.gameId,
            type: plan.type,
            status: WalletTransactionStatus.COMPLETED,
            amount: plan.ledgerAmount,
            balanceBefore: wallet.balance,
            balanceAfter: Number((wallet.balance + plan.balanceDelta).toFixed(8)),
            reference,
            metadata: plan.metadata,
          },
        );

        if (!committed) {
          // Someone else updated this wallet between our read and our write.
          // Back off with jitter before retrying — an immediate retry loop
          // just re-collides with every other contender at the same instant.
          const backoff = BASE_RETRY_BACKOFF_MS * attempt + Math.random() * BASE_RETRY_BACKOFF_MS;
          await sleep(backoff);
          continue;
        }

        return committed.transaction;
      } catch (err) {
        if (reference && this.isUniqueViolation(err)) {
          throw new DuplicateTransactionReferenceException(reference);
        }
        throw err;
      }
    }

    const wallet = await this.repository.getWalletByUserId(userId);
    throw new WalletConcurrencyException(wallet?.id ?? userId, MAX_OPTIMISTIC_LOCK_RETRIES);
  }

  private isUniqueViolation(err: unknown): boolean {
    // Prisma unique constraint violation code; the in-memory repository throws a plain Error with this message.
    return typeof err === 'object' && err !== null && ((err as any).code === 'P2002' || (err as Error).message?.includes('UNIQUE'));
  }
}

// Re-exported so callers only need one import path for the token used with @Inject above.
export { WALLET_REPOSITORY };
export function generateTransactionId(): string {
  return crypto.randomUUID();
}
