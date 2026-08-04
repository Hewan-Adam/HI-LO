import { Controller, Get, Query } from '@nestjs/common';
import { WalletService } from './services/wallet.service';
import { CurrentUser } from '../auth/decorators/auth.decorators';
import { AccessTokenPayload } from '../auth/interfaces/auth-types';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  async getWallet(@CurrentUser() user: AccessTokenPayload) {
    const wallet = await this.walletService.getOrCreateWallet(user.sub);
    return { balance: wallet.balance, bonusBalance: wallet.bonusBalance, currency: wallet.currency };
  }

  @Get('history')
  async getHistory(@CurrentUser() user: AccessTokenPayload, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.walletService.getTransactionHistory(user.sub, limit ? Number(limit) : undefined, offset ? Number(offset) : undefined);
  }
}
