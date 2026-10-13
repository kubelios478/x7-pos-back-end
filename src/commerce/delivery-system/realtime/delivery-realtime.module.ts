//src/commerce/delivery-system/realtime/delivery-realtime.module.ts
import { Module } from '@nestjs/common';
import { RealtimeModule } from 'src/realtime/realtime.module';
import { DeliveryRealtimeService } from './delivery-realtime.service';

@Module({
  imports: [RealtimeModule],
  providers: [DeliveryRealtimeService],
  exports: [DeliveryRealtimeService],
})
export class DeliveryRealtimeModule {}
