//src/commerce/delivery-system/delivery-driver/delivery-driver.module.ts
import { Module } from '@nestjs/common';
import { DeliveryDriverController } from './delivery-driver.controller';
import { DeliveryDriverService } from './delivery-driver.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryDriver } from './entity/delivery-driver.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { DeliveryRealtimeModule } from '../realtime/delivery-realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeliveryDriver, Merchant]),
    DeliveryRealtimeModule,
  ],
  controllers: [DeliveryDriverController],
  providers: [DeliveryDriverService],
})
export class DeliveryDriverModule {}
