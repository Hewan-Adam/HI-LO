import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { AdminUsersService } from '../services/admin-users.service';
import { Roles, CurrentUser } from '../../auth/decorators/auth.decorators';
import { AccessTokenPayload, Role } from '../../auth/interfaces/auth-types';
import { BanUserDto } from '../dto/admin.dto';

@Controller('admin/users')
@Roles(Role.ADMIN)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  async search(@Query('telegramId') telegramId?: string, @Query('username') username?: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.adminUsersService.search({
      telegramId,
      username,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get(':userId')
  async detail(@Param('userId') userId: string) {
    return this.adminUsersService.getDetail(userId);
  }

  @Post(':userId/ban')
  async ban(@CurrentUser() actor: AccessTokenPayload, @Param('userId') userId: string, @Body() dto: BanUserDto, @Req() req: any) {
    await this.adminUsersService.setBanStatus(actor.sub, actor.role, userId, true, dto.reason, req?.ip);
    return { userId, banned: true };
  }

  @Post(':userId/unban')
  async unban(@CurrentUser() actor: AccessTokenPayload, @Param('userId') userId: string, @Req() req: any) {
    await this.adminUsersService.setBanStatus(actor.sub, actor.role, userId, false, undefined, req?.ip);
    return { userId, banned: false };
  }
}
