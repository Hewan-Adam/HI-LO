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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryWalletRepository = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
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
let InMemoryWalletRepository = class InMemoryWalletRepository {
    constructor() {
        this.wallets = new Map(); // keyed by userId
        this.walletsById = new Map();
        this.transactions = [];
        this.referenceIndex = new Map(); // reference -> transaction id
        /** When >0, applyBalanceChange awaits this long between snapshotting and committing, to make race windows observable in tests. */
        this.simulateReadWriteDelayMs = 0;
    }
    async getWalletByUserId(userId) {
        const wallet = this.wallets.get(userId);
        return wallet ? { ...wallet } : null;
    }
    async createWalletForUser(userId, currency = 'USD') {
        if (this.wallets.has(userId)) {
            return { ...this.wallets.get(userId) };
        }
        const wallet = {
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
    async commitBalanceChange(request, transaction) {
        const current = this.walletsById.get(request.walletId);
        if (!current)
            return null;
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
        const fullTransaction = {
            ...transaction,
            balanceAfter: current.balance,
            id: crypto.randomUUID(),
            createdAt: new Date(),
        };
        this.transactions.push(fullTransaction);
        if (fullTransaction.reference)
            this.referenceIndex.set(fullTransaction.reference, fullTransaction.id);
        return { wallet: { ...current }, transaction: fullTransaction };
    }
    async getTransactionByReference(reference) {
        const id = this.referenceIndex.get(reference);
        if (!id)
            return null;
        return this.transactions.find((t) => t.id === id) ?? null;
    }
    async getTransactionHistory(userId, limit = 50, offset = 0) {
        return this.transactions
            .filter((t) => t.userId === userId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(offset, offset + limit);
    }
    async searchTransactions(filters) {
        return this.transactions
            .filter((t) => !filters.userId || t.userId === filters.userId)
            .filter((t) => !filters.type || t.type === filters.type)
            .filter((t) => !filters.status || t.status === filters.status)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 50));
    }
    /** Test/demo helper only — not part of the WalletRepository interface. */
    _debugAllTransactions() {
        return [...this.transactions];
    }
};
exports.InMemoryWalletRepository = InMemoryWalletRepository;
exports.InMemoryWalletRepository = InMemoryWalletRepository = __decorate([
    (0, common_1.Injectable)()
], InMemoryWalletRepository);
