import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOG_REPOSITORY, AuditLogEntry, AuditLogFilters, AuditLogRepository, RecordAuditLogParams } from '../interfaces/audit-log-repository.interface';

@Injectable()
export class AuditLogService {
  constructor(@Inject(AUDIT_LOG_REPOSITORY) private readonly repository: AuditLogRepository) {}

  async record(params: RecordAuditLogParams): Promise<AuditLogEntry> {
    return this.repository.record(params);
  }

  async find(filters: AuditLogFilters): Promise<AuditLogEntry[]> {
    return this.repository.find(filters);
  }
}
