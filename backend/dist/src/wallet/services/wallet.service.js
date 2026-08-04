"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WALLET_REPOSITORY = exports.WalletService = void 0;
exports.generateTransactionId = generateTransactionId;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
const wallet_repository_interface_1 = require("../interfaces/wallet-repository.interface");
Object.defineProperty(exports, "WALLET_REPOSITORY", { enumerable: true, get: function () { return wallet_repository_interface_1.WALLET_REPOSITORY; } });
const wallet_types_1 = require("../interfaces/wallet-types");
const wallet_exceptions_1 = require("../exceptions/wallet.exceptions");
const MAX_OPTIMISTIC_LOCK_RETRIES = 10;
const BASE_RETRY_BACKOFF_MS = 8;
function sleep(ms) {
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
let WalletService = class WalletService {
    constructor(repository) {
        this.repository = repository;
    }
    async getWallet(userId) {
        const wallet = await this.repository.getWalletByUserId(userId);
        if (!wallet)
            throw new wallet_exceptions_1.WalletNotFoundException(userId);
        return wallet;
    }
    async getOrCreateWallet(userId, currency = 'USD') {
        const existing = await this.repository.getWalletByUserId(userId);
        if (existing)
            return existing;
        return this.repository.createWalletForUser(userId, currency);
    }
    async getTransactionHistory(userId, limit = 50, offset = 0) {
        return this.repository.getTransactionHistory(userId, limit, offset);
    }
    /** Admin oversight only — searches across all users, unlike getTransactionHistory. */
    async searchTransactions(filters) {
        return this.repository.searchTransactions(filters);
    }
    // --------------------------------------------------------------------
    // Public operations
    // --------------------------------------------------------------------
    async deposit(userId, amount, reference, metadata) {
        this.assertPositive(amount);
        const dedupeCheck = await this.checkIdempotency(reference);
        if (dedupeCheck)
            return dedupeCheck;
        return this.mutate(userId, {
            balanceDelta: amount,
            bonusBalanceDelta: 0,
            type: wallet_types_1.WalletTransactionType.DEPOSIT,
            ledgerAmount: amount,
            metadata,
        }, reference);
    }
    async withdraw(userId, amount, reference) {
        this.assertPositive(amount);
        const dedupeCheck = await this.checkIdempotency(reference);
        if (dedupeCheck)
            return dedupeCheck;
        return this.mutate(userId, {
            balanceDelta: -amount,
            bonusBalanceDelta: 0,
            type: wallet_types_1.WalletTransactionType.WITHDRAWAL,
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
    async placeBet(userId, gameId, amount, useBonusFirst = false, reference) {
        this.assertPositive(amount);
        const dedupeCheck = await this.checkIdempotency(reference);
        if (dedupeCheck)
            return dedupeCheck;
        const wallet = await this.getWallet(userId);
        let fromBonus = 0;
        let fromReal = amount;
        if (useBonusFirst && wallet.bonusBalance > 0) {
            fromBonus = Math.min(wallet.bonusBalance, amount);
            fromReal = Number((amount - fromBonus).toFixed(8));
        }
        if (fromReal > wallet.balance) {
            throw new wallet_exceptions_1.InsufficientFundsException(amount, wallet.balance + wallet.bonusBalance);
        }
        return this.mutate(userId, {
            balanceDelta: -fromReal,
            bonusBalanceDelta: -fromBonus,
            type: wallet_types_1.WalletTransactionType.BET,
            ledgerAmount: amount,
            gameId,
            metadata: { fromBonus, fromReal },
        }, reference);
    }
    /** `reference` (typically `cashout:${gameId}`) makes re-attempting a cashout credit after a partial failure safe — see GameApiService.cashout. */
    async settleCashout(userId, gameId, payoutAmount, reference) {
        this.assertPositive(payoutAmount);
        const dedupeCheck = await this.checkIdempotency(reference);
        if (dedupeCheck)
            return dedupeCheck;
        return this.mutate(userId, {
            balanceDelta: payoutAmount,
            bonusBalanceDelta: 0,
            type: wallet_types_1.WalletTransactionType.CASHOUT,
            ledgerAmount: payoutAmount,
            gameId,
        }, reference);
    }
    /** Refunds a bet (e.g. an aborted/errored game) — credits back exactly what was deducted, including any bonus-balance portion. */
    async refundBet(userId, gameId, amount, bonusPortion = 0, reference) {
        this.assertPositive(amount);
        const dedupeCheck = await this.checkIdempotency(reference);
        if (dedupeCheck)
            return dedupeCheck;
        const realPortion = Number((amount - bonusPortion).toFixed(8));
        return this.mutate(userId, {
            balanceDelta: realPortion,
            bonusBalanceDelta: bonusPortion,
            type: wallet_types_1.WalletTransactionType.REFUND,
            ledgerAmount: amount,
            gameId,
            metadata: { bonusPortion, realPortion },
        }, reference);
    }
    async creditBonus(userId, amount, reference, metadata) {
        this.assertPositive(amount);
        const dedupeCheck = await this.checkIdempotency(reference);
        if (dedupeCheck)
            return dedupeCheck;
        return this.mutate(userId, {
            balanceDelta: 0,
            bonusBalanceDelta: amount,
            type: wallet_types_1.WalletTransactionType.BONUS_CREDIT,
            ledgerAmount: amount,
            metadata,
        }, reference);
    }
    async creditReferralReward(userId, amount, metadata) {
        this.assertPositive(amount);
        return this.mutate(userId, {
            balanceDelta: amount,
            bonusBalanceDelta: 0,
            type: wallet_types_1.WalletTransactionType.REFERRAL_REWARD,
            ledgerAmount: amount,
            metadata,
        });
    }
    // --------------------------------------------------------------------
    // Internals
    // --------------------------------------------------------------------
    assertPositive(amount) {
        if (!(amount > 0))
            throw new wallet_exceptions_1.InvalidAmountException(amount);
    }
    async checkIdempotency(reference) {
        if (!reference)
            return null;
        const existing = await this.repository.getTransactionByReference(reference);
        return existing ?? null;
    }
    async mutate(userId, plan, reference) {
        for (let attempt = 1; attempt <= MAX_OPTIMISTIC_LOCK_RETRIES; attempt++) {
            const wallet = await this.repository.getWalletByUserId(userId);
            if (!wallet)
                throw new wallet_exceptions_1.WalletNotFoundException(userId);
            const newBalance = Number((wallet.balance + plan.balanceDelta).toFixed(8));
            const newBonusBalance = Number((wallet.bonusBalance + plan.bonusBalanceDelta).toFixed(8));
            if (newBalance < 0) {
                throw new wallet_exceptions_1.InsufficientFundsException(Math.abs(plan.balanceDelta), wallet.balance);
            }
            if (newBonusBalance < 0) {
                throw new wallet_exceptions_1.InsufficientFundsException(Math.abs(plan.bonusBalanceDelta), wallet.bonusBalance);
            }
            try {
                const committed = await this.repository.commitBalanceChange({
                    walletId: wallet.id,
                    expectedVersion: wallet.version,
                    balanceDelta: plan.balanceDelta,
                    bonusBalanceDelta: plan.bonusBalanceDelta,
                }, {
                    userId,
                    gameId: plan.gameId,
                    type: plan.type,
                    status: wallet_types_1.WalletTransactionStatus.COMPLETED,
                    amount: plan.ledgerAmount,
                    balanceBefore: wallet.balance,
                    balanceAfter: Number((wallet.balance + plan.balanceDelta).toFixed(8)),
                    reference,
                    metadata: plan.metadata,
                });
                if (!committed) {
                    // Someone else updated this wallet between our read and our write.
                    // Back off with jitter before retrying — an immediate retry loop
                    // just re-collides with every other contender at the same instant.
                    const backoff = BASE_RETRY_BACKOFF_MS * attempt + Math.random() * BASE_RETRY_BACKOFF_MS;
                    await sleep(backoff);
                    continue;
                }
                return committed.transaction;
            }
            catch (err) {
                if (reference && this.isUniqueViolation(err)) {
                    throw new wallet_exceptions_1.DuplicateTransactionReferenceException(reference);
                }
                throw err;
            }
        }
        const wallet = await this.repository.getWalletByUserId(userId);
        throw new wallet_exceptions_1.WalletConcurrencyException(wallet?.id ?? userId, MAX_OPTIMISTIC_LOCK_RETRIES);
    }
    isUniqueViolation(err) {
        // Prisma unique constraint violation code; the in-memory repository throws a plain Error with this message.
        return typeof err === 'object' && err !== null && (err.code === 'P2002' || err.message?.includes('UNIQUE'));
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(wallet_repository_interface_1.WALLET_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], WalletService);
function generateTransactionId() {
    return crypto.randomUUID();
}
