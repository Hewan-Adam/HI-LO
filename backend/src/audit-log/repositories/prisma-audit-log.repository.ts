import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogEntry, AuditLogFilters, AuditLogRepository, RecordAuditLogParams } from '../interfaces/audit-log-repository.interface';

@Injectable()
export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: RecordAuditLogParams): Promise<AuditLogEntry> {
    const row = await this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        ipAddress: params.ipAddress,
        metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue,
      },
    });
    return this.toEntry(row);
  }

  async find(filters: AuditLogFilters): Promise<AuditLogEntry[]> {
    const rows = await this.prisma.auditLog.findMany({
      where: {
        userId: filters.userId,
        action: filters.action,
        entityType: filters.entityType,
        entityId: filters.entityId,
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit ?? 50,
      skip: filters.offset ?? 0,
    });
    return rows.map((row) => this.toEntry(row));
  }

  private toEntry(row: {
    id: string;
    userId: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    ipAddress: string | null;
    metadata: Prisma.JsonValue;
    createdAt: Date;
  }): AuditLogEntry {
    return {
      id: row.id,
      userId: row.userId ?? undefined,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId ?? undefined,
      ipAddress: row.ipAddress ?? undefined,
      metadata: (row.metadata as Record<string, unknown>) ?? undefined,
      createdAt: row.createdAt,
    };
  }
}
