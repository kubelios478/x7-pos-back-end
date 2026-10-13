//src/commerce/delivery-system/delivery-assignment/delivery-assignment.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryAssignmentController } from './delivery-assignment.controller';
import { DeliveryAssignmentService } from './delivery-assignment.service';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { DeliveryDriver } from '../delivery-driver/entity/delivery-driver.entity';
import { DeliveryZone } from '../delivery-zone/entity/delivery-zone.entity';
import { DeliveryAssignment } from './entity/delivery-assignment.entity';
import {
  DSP_DISPATCH_PROVIDER,
  NotConfiguredDspDispatchProvider,
} from './dsp/dsp-dispatch.provider';
import { DeliveryWebhooksController } from './webhooks/delivery-webhooks.controller';
import { DeliveryRealtimeModule } from '../realtime/delivery-realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeliveryAssignment,
      DeliveryDriver,
      DeliveryZone,
      Order,
    ]),
    DeliveryRealtimeModule,
  ],
  controllers: [DeliveryAssignmentController, DeliveryWebhooksController],
  providers: [
    DeliveryAssignmentService,
    // Integración real con DoorDash Drive / Uber Direct PENDIENTE: sustituir aquí.
    {
      provide: DSP_DISPATCH_PROVIDER,
      useClass: NotConfiguredDspDispatchProvider,
    },
  ],
})
export class DeliveryAssignmentModule {}
