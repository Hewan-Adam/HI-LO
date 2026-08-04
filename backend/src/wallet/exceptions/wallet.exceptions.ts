import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

export class WalletNotFoundException extends NotFoundException {
  constructor(userId: string) {
    super(`No wallet found for user ${userId}`);
  }
}

export class InsufficientFundsException extends BadRequestException {
  constructor(requested: number, available: number) {
    super(`Insufficient funds: requested ${requested}, available ${available}`);
  }
}

export class InvalidAmountException extends BadRequestException {
  constructor(amount: number) {
    super(`Amount must be greater than zero, received ${amount}`);
  }
}

/** Thrown only when optimistic-locking retries are exhausted — i.e. sustained contention, not a normal single collision. */
export class WalletConcurrencyException extends ConflictException {
  constructor(walletId: string, attempts: number) {
    super(`Could not update wallet ${walletId} after ${attempts} attempts due to concurrent modification`);
  }
}

/** A duplicate reference was submitted for a DEPOSIT/WITHDRAWAL — the operation is treated as already-processed (idempotent), not re-applied. */
export class DuplicateTransactionReferenceException extends ConflictException {
  constructor(reference: string) {
    super(`Transaction with reference "${reference}" was already processed`);
  }
}
