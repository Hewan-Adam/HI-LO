export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');

export interface AuditLogEntry {
  id: string;
  userId?: string; // the actor (typically an admin) who performed the action
  action: string; // e.g. "user.ban", "game-settings.multiplier-table.update"
  entityType: string; // e.g. "User", "AdminSettings", "Wallet"
  entityId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface RecordAuditLogParams {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogRepository {
  record(params: RecordAuditLogParams): Promise<AuditLogEntry>;
  find(filters: AuditLogFilters): Promise<AuditLogEntry[]>;
}
