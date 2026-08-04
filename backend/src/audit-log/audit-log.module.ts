import { Module } from '@nestjs/common';
import { AuditLogService } from './services/audit-log.service';
import { PrismaAuditLogRepository } from './repositories/prisma-audit-log.repository';
import { AUDIT_LOG_REPOSITORY } from './interfaces/audit-log-repository.interface';

@Module({
  providers: [AuditLogService, { provide: AUDIT_LOG_REPOSITORY, useClass: PrismaAuditLogRepository }],
  exports: [AuditLogService],
})
export class AuditLogModule {}
