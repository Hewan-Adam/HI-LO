import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './services/wallet.service';
import { PrismaWalletRepository } from './repositories/prisma-wallet.repository';
import { WALLET_REPOSITORY } from './interfaces/wallet-repository.interface';

@Module({
  controllers: [WalletController],
  providers: [
    WalletService,
    {
      provide: WALLET_REPOSITORY,
      useClass: PrismaWalletRepository,
    },
  ],
  exports: [WalletService],
})
export class WalletModule {}
