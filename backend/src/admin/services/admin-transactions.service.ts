import { Injectable } from '@nestjs/common';
import { WalletService } from '../../wallet/services/wallet.service';
import { WalletTransactionStatus, WalletTransactionType } from '../../wallet/interfaces/wallet-types';

@Injectable()
export class AdminTransactionsService {
  constructor(private readonly walletService: WalletService) {}

  async search(filters: { userId?: string; type?: WalletTransactionType; status?: WalletTransactionStatus; limit?: number; offset?: number }) {
    return this.walletService.searchTransactions(filters);
  }
}
