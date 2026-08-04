import { Module } from '@nestjs/common';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './services/statistics.service';
import { PrismaStatisticsRepository } from './repositories/prisma-statistics.repository';
import { STATISTICS_REPOSITORY } from './interfaces/statistics-repository.interface';

@Module({
  controllers: [StatisticsController],
  providers: [StatisticsService, { provide: STATISTICS_REPOSITORY, useClass: PrismaStatisticsRepository }],
  exports: [StatisticsService],
})
export class StatisticsModule {}
