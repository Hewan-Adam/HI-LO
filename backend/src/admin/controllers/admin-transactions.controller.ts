import { Controller, Get, Query } from '@nestjs/common';
import { AdminTransactionsService } from '../services/admin-transactions.service';
import { Roles } from '../../auth/decorators/auth.decorators';
import { Role } from '../../auth/interfaces/auth-types';
import { WalletTransactionStatus, WalletTransactionType } from '../../wallet/interfaces/wallet-types';

@Controller('admin/transactions')
@Roles(Role.ADMIN)
export class AdminTransactionsController {
  constructor(private readonly adminTransactionsService: AdminTransactionsService) {}

  @Get()
  async search(
    @Query('userId') userId?: string,
    @Query('type') type?: WalletTransactionType,
    @Query('status') status?: WalletTransactionStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminTransactionsService.search({
      userId,
      type,
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }
}
