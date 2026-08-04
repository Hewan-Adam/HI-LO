import { Module } from '@nestjs/common';
import { AdminSettingsModule } from '../admin-settings/admin-settings.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { WalletModule } from '../wallet/wallet.module';
import { GameModule } from '../game/game.module';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminGameSettingsController } from './controllers/admin-game-settings.controller';
import { AdminAnalyticsController } from './controllers/admin-analytics.controller';
import { AdminTransactionsController } from './controllers/admin-transactions.controller';
import { AdminAuditLogController } from './controllers/admin-audit-log.controller';
import { AdminUsersService } from './services/admin-users.service';
import { AdminAnalyticsService } from './services/admin-analytics.service';
import { AdminTransactionsService } from './services/admin-transactions.service';
import { ADMIN_USER_REPOSITORY } from './interfaces/admin-user-repository.interface';
import { PrismaAdminUserRepository } from './repositories/prisma-admin-user.repository';

@Module({
  imports: [AdminSettingsModule, AuditLogModule, WalletModule, GameModule],
  controllers: [AdminUsersController, AdminGameSettingsController, AdminAnalyticsController, AdminTransactionsController, AdminAuditLogController],
  providers: [
    AdminUsersService,
    AdminAnalyticsService,
    AdminTransactionsService,
    { provide: ADMIN_USER_REPOSITORY, useClass: PrismaAdminUserRepository },
  ],
})
export class AdminModule {}
