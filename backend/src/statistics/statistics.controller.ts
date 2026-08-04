import { Controller, Get } from '@nestjs/common';
import { StatisticsService } from './services/statistics.service';
import { CurrentUser } from '../auth/decorators/auth.decorators';
import { AccessTokenPayload } from '../auth/interfaces/auth-types';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  async getMyStatistics(@CurrentUser() user: AccessTokenPayload) {
    return this.statisticsService.getStatistics(user.sub);
  }
}
