import { Module } from '@nestjs/common';
import { AdminSettingsService } from './services/admin-settings.service';
import { PrismaAdminSettingsRepository } from './repositories/prisma-admin-settings.repository';
import { ADMIN_SETTINGS_REPOSITORY } from './interfaces/admin-settings-repository.interface';

@Module({
  providers: [
    {
      provide: AdminSettingsService,
      useFactory: (repo: PrismaAdminSettingsRepository) => new AdminSettingsService(repo),
      inject: [ADMIN_SETTINGS_REPOSITORY],
    },
    { provide: ADMIN_SETTINGS_REPOSITORY, useClass: PrismaAdminSettingsRepository },
  ],
  exports: [AdminSettingsService],
})
export class AdminSettingsModule {}
