import { Module } from '@nestjs/common';
import { KitchenAnalyticsService } from './kitchen-analytics.service';
import { KitchenAnalyticsController } from './kitchen-analytics.controller';

@Module({
  controllers: [KitchenAnalyticsController],
  providers: [KitchenAnalyticsService],
})
export class KitchenAnalyticsModule {}
