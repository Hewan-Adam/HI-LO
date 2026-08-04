import { Controller, Get, Query } from '@nestjs/common';
import { AdminAnalyticsService } from '../services/admin-analytics.service';
import { Roles } from '../../auth/decorators/auth.decorators';
import { Role } from '../../auth/interfaces/auth-types';

@Controller('admin/analytics')
@Roles(Role.ADMIN)
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AdminAnalyticsService) {}

  @Get('summary')
  async summary(@Query('start') start?: string, @Query('end') end?: string) {
    const rangeEnd = end ? new Date(end) : new Date();
    const rangeStart = start ? new Date(start) : new Date(rangeEnd.getTime() - 24 * 60 * 60 * 1000); // default: last 24h
    return this.analyticsService.getSummary(rangeStart, rangeEnd);
  }
}
