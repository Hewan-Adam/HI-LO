import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { AuditLogEntry, AuditLogFilters, AuditLogRepository, RecordAuditLogParams } from '../interfaces/audit-log-repository.interface';

@Injectable()
export class InMemoryAuditLogRepository implements AuditLogRepository {
  private entries: AuditLogEntry[] = [];

  async record(params: RecordAuditLogParams): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = { ...params, id: crypto.randomUUID(), createdAt: new Date() };
    this.entries.push(entry);
    return entry;
  }

  async find(filters: AuditLogFilters): Promise<AuditLogEntry[]> {
    return this.entries
      .filter((e) => !filters.userId || e.userId === filters.userId)
      .filter((e) => !filters.action || e.action === filters.action)
      .filter((e) => !filters.entityType || e.entityType === filters.entityType)
      .filter((e) => !filters.entityId || e.entityId === filters.entityId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 50));
  }
}
