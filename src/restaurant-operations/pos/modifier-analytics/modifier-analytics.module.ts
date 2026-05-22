import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';

import { ModifierAnalyticsController } from './modifier-analytics.controller';
import { ModifierAnalyticsService } from './modifier-analytics.service';

@Module({
  imports: [TypeOrmModule.forFeature([]), AuthModule],
  controllers: [ModifierAnalyticsController],
  providers: [ModifierAnalyticsService],
})
export class ModifierAnalyticsModule {}
