import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { KitchenStationService } from './kitchen-station.service';
import { KitchenStationController } from './kitchen-station.controller';
import { KitchenStation } from './entities/kitchen-station.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { KitchenDisplayDevice } from '../kitchen-display-device/entities/kitchen-display-device.entity';
import { KitchenOrder } from '../kitchen-order/entities/kitchen-order.entity';
import { KitchenEventLog } from '../kitchen-event-log/entities/kitchen-event-log.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      KitchenStation,
      Merchant,
      KitchenDisplayDevice,
      KitchenOrder,
      KitchenEventLog,
    ]),
  ],
  controllers: [KitchenStationController],
  providers: [KitchenStationService],
  exports: [KitchenStationService],
})
export class KitchenStationModule {}
