import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { Roles } from '../../auth/decorators/auth.decorators';
import { Role } from '../../auth/interfaces/auth-types';

@Controller('admin/audit-log')
@Roles(Role.SUPER_ADMIN)
export class AdminAuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async find(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditLogService.find({
      userId,
      action,
      entityType,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }
}
