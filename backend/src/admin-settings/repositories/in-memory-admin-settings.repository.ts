import { Injectable } from '@nestjs/common';
import { AdminSettingRecord, AdminSettingsRepository } from '../interfaces/admin-settings-repository.interface';

@Injectable()
export class InMemoryAdminSettingsRepository implements AdminSettingsRepository {
  private settings = new Map<string, AdminSettingRecord>();

  async get(key: string): Promise<AdminSettingRecord | null> {
    const record = this.settings.get(key);
    return record ? { ...record } : null;
  }

  async set(key: string, value: unknown, updatedBy?: string, description?: string): Promise<AdminSettingRecord> {
    const existing = this.settings.get(key);
    const record: AdminSettingRecord = {
      key,
      value,
      description: description ?? existing?.description,
      updatedBy,
      updatedAt: new Date(),
    };
    this.settings.set(key, record);
    return { ...record };
  }

  async getAll(): Promise<AdminSettingRecord[]> {
    return [...this.settings.values()].sort((a, b) => a.key.localeCompare(b.key));
  }
}
