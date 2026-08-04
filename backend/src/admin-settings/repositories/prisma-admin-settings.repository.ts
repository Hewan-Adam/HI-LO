import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AdminSettingRecord, AdminSettingsRepository } from '../interfaces/admin-settings-repository.interface';

@Injectable()
export class PrismaAdminSettingsRepository implements AdminSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get(key: string): Promise<AdminSettingRecord | null> {
    const row = await this.prisma.adminSettings.findUnique({ where: { key } });
    return row ? this.toRecord(row) : null;
  }

  async set(key: string, value: unknown, updatedBy?: string, description?: string): Promise<AdminSettingRecord> {
    const row = await this.prisma.adminSettings.upsert({
      where: { key },
      create: { key, value: value as Prisma.InputJsonValue, updatedBy, description },
      update: { value: value as Prisma.InputJsonValue, updatedBy, ...(description ? { description } : {}) },
    });
    return this.toRecord(row);
  }

  async getAll(): Promise<AdminSettingRecord[]> {
    const rows = await this.prisma.adminSettings.findMany({ orderBy: { key: 'asc' } });
    return rows.map((row) => this.toRecord(row));
  }

  private toRecord(row: { key: string; value: Prisma.JsonValue; description: string | null; updatedBy: string | null; updatedAt: Date }): AdminSettingRecord {
    return {
      key: row.key,
      value: row.value,
      description: row.description ?? undefined,
      updatedBy: row.updatedBy ?? undefined,
      updatedAt: row.updatedAt,
    };
  }
}
