export const ADMIN_SETTINGS_REPOSITORY = Symbol('ADMIN_SETTINGS_REPOSITORY');

export interface AdminSettingRecord {
  key: string;
  value: unknown;
  description?: string;
  updatedBy?: string;
  updatedAt: Date;
}

/**
 * Backs the `AdminSettings` table (already modeled in the phase 1 schema):
 * a generic typed key/value store so new admin-tunable parameters don't
 * need a migration. `AdminSettingsService` (below) is the one place that
 * knows which keys exist and what shape their values are — this interface
 * itself stays generic.
 */
export interface AdminSettingsRepository {
  get(key: string): Promise<AdminSettingRecord | null>;
  set(key: string, value: unknown, updatedBy?: string, description?: string): Promise<AdminSettingRecord>;
  getAll(): Promise<AdminSettingRecord[]>;
}
