// src/subscriptions/features/features.module.ts
import { Module } from '@nestjs/common';
import { FeaturesController } from './features.controller';
import { FeaturesService } from './features.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureEntity } from './entity/features.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FeatureEntity])],
  controllers: [FeaturesController],
  providers: [FeaturesService],
  exports: [FeaturesService],
})
export class FeaturesModule {}
