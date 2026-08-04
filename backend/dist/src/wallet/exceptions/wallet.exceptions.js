"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuplicateTransactionReferenceException = exports.WalletConcurrencyException = exports.InvalidAmountException = exports.InsufficientFundsException = exports.WalletNotFoundException = void 0;
const common_1 = require("@nestjs/common");
class WalletNotFoundException extends common_1.NotFoundException {
    constructor(userId) {
        super(`No wallet found for user ${userId}`);
    }
}
exports.WalletNotFoundException = WalletNotFoundException;
class InsufficientFundsException extends common_1.BadRequestException {
    constructor(requested, available) {
        super(`Insufficient funds: requested ${requested}, available ${available}`);
    }
}
exports.InsufficientFundsException = InsufficientFundsException;
class InvalidAmountException extends common_1.BadRequestException {
    constructor(amount) {
        super(`Amount must be greater than zero, received ${amount}`);
    }
}
exports.InvalidAmountException = InvalidAmountException;
/** Thrown only when optimistic-locking retries are exhausted — i.e. sustained contention, not a normal single collision. */
class WalletConcurrencyException extends common_1.ConflictException {
    constructor(walletId, attempts) {
        super(`Could not update wallet ${walletId} after ${attempts} attempts due to concurrent modification`);
    }
}
exports.WalletConcurrencyException = WalletConcurrencyException;
/** A duplicate reference was submitted for a DEPOSIT/WITHDRAWAL — the operation is treated as already-processed (idempotent), not re-applied. */
class DuplicateTransactionReferenceException extends common_1.ConflictException {
    constructor(reference) {
        super(`Transaction with reference "${reference}" was already processed`);
    }
}
exports.DuplicateTransactionReferenceException = DuplicateTransactionReferenceException;
