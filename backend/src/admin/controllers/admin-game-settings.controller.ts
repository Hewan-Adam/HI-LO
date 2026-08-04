import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { AdminSettingsService } from '../../admin-settings/services/admin-settings.service';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { Roles, CurrentUser } from '../../auth/decorators/auth.decorators';
import { AccessTokenPayload, Role } from '../../auth/interfaces/auth-types';
import { UpdateAceModeDto, UpdateEqualRuleDto, UpdateMultiplierTableDto, UpdateTargetRtpDto } from '../dto/admin.dto';

@Controller('admin/game-settings')
export class AdminGameSettingsController {
  constructor(
    private readonly adminSettingsService: AdminSettingsService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Roles(Role.ADMIN)
  @Get()
  async getAll() {
    const [aceMode, equalRule, multiplierTable, targetRtpPercent] = await Promise.all([
      this.adminSettingsService.getAceMode(),
      this.adminSettingsService.getEqualRule(),
      this.adminSettingsService.getMultiplierTable(),
      this.adminSettingsService.getTargetRtpPercent(),
    ]);
    return { aceMode, equalRule, multiplierTable, targetRtpPercent };
  }

  // Mutations are SUPER_ADMIN-only: these parameters directly control house
  // edge / player payout, which is a materially different blast radius than
  // day-to-day moderation (banning a user, viewing transactions).
  @Roles(Role.SUPER_ADMIN)
  @Post('ace-mode')
  async setAceMode(@CurrentUser() actor: AccessTokenPayload, @Body() dto: UpdateAceModeDto, @Req() req: any) {
    await this.adminSettingsService.setAceMode(dto.aceMode, actor.sub);
    await this.auditLog.record({ userId: actor.sub, action: 'game-settings.ace-mode.update', entityType: 'AdminSettings', ipAddress: req?.ip, metadata: { aceMode: dto.aceMode } });
    return { aceMode: dto.aceMode };
  }

  @Roles(Role.SUPER_ADMIN)
  @Post('equal-rule')
  async setEqualRule(@CurrentUser() actor: AccessTokenPayload, @Body() dto: UpdateEqualRuleDto, @Req() req: any) {
    await this.adminSettingsService.setEqualRule(dto.equalRule, actor.sub);
    await this.auditLog.record({ userId: actor.sub, action: 'game-settings.equal-rule.update', entityType: 'AdminSettings', ipAddress: req?.ip, metadata: { equalRule: dto.equalRule } });
    return { equalRule: dto.equalRule };
  }

  @Roles(Role.SUPER_ADMIN)
  @Post('multiplier-table')
  async setMultiplierTable(@CurrentUser() actor: AccessTokenPayload, @Body() dto: UpdateMultiplierTableDto, @Req() req: any) {
    // AdminSettingsService.setMultiplierTable throws BadRequestException if
    // the table isn't strictly increasing, so a bad admin edit is rejected
    // with a proper 400 before ever reaching a live game.
    await this.adminSettingsService.setMultiplierTable(dto.table, actor.sub);
    await this.auditLog.record({ userId: actor.sub, action: 'game-settings.multiplier-table.update', entityType: 'AdminSettings', ipAddress: req?.ip, metadata: { table: dto.table } });
    return { multiplierTable: dto.table };
  }

  @Roles(Role.SUPER_ADMIN)
  @Post('target-rtp')
  async setTargetRtp(@CurrentUser() actor: AccessTokenPayload, @Body() dto: UpdateTargetRtpDto, @Req() req: any) {
    await this.adminSettingsService.setTargetRtpPercent(dto.percent, actor.sub);
    await this.auditLog.record({ userId: actor.sub, action: 'game-settings.target-rtp.update', entityType: 'AdminSettings', ipAddress: req?.ip, metadata: { percent: dto.percent } });
    return { targetRtpPercent: dto.percent };
  }
}
