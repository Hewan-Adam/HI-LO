import { Inject, Injectable } from '@nestjs/common';
import { ADMIN_USER_REPOSITORY, AdminUserDetail, AdminUserRepository, AdminUserSearchFilters, AdminUserSummary } from '../interfaces/admin-user-repository.interface';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { Role } from '../../auth/interfaces/auth-types';
import { AdminUserNotFoundException, InsufficientAdminPrivilegeException } from '../exceptions/admin.exceptions';

const ROLE_RANK: Record<Role, number> = { [Role.PLAYER]: 0, [Role.ADMIN]: 1, [Role.SUPER_ADMIN]: 2 };

@Injectable()
export class AdminUsersService {
  constructor(
    @Inject(ADMIN_USER_REPOSITORY) private readonly repository: AdminUserRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async search(filters: AdminUserSearchFilters): Promise<AdminUserSummary[]> {
    return this.repository.search(filters);
  }

  async getDetail(userId: string): Promise<AdminUserDetail> {
    const detail = await this.repository.getDetail(userId);
    if (!detail) throw new AdminUserNotFoundException(userId);
    return detail;
  }

  /**
   * Enforces a strict privilege hierarchy: an actor can only act on a target
   * whose role ranks strictly below their own. This means an ADMIN can ban
   * a PLAYER but not another ADMIN or a SUPER_ADMIN (preventing a compromised
   * or rogue admin account from disabling peer/superior admin accounts),
   * while a SUPER_ADMIN can act on anyone below SUPER_ADMIN.
   */
  async setBanStatus(actorUserId: string, actorRole: Role, targetUserId: string, banned: boolean, reason: string | undefined, actorIp?: string): Promise<void> {
    const targetRole = await this.repository.getRole(targetUserId);
    if (targetRole === null) throw new AdminUserNotFoundException(targetUserId);

    if (ROLE_RANK[targetRole] >= ROLE_RANK[actorRole]) {
      throw new InsufficientAdminPrivilegeException(`${banned ? 'ban' : 'unban'} a user with role ${targetRole}`);
    }

    await this.repository.setBanStatus(targetUserId, banned, reason);

    await this.auditLog.record({
      userId: actorUserId,
      action: banned ? 'user.ban' : 'user.unban',
      entityType: 'User',
      entityId: targetUserId,
      ipAddress: actorIp,
      metadata: banned ? { reason } : undefined,
    });
  }
}
