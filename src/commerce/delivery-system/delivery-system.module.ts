import { Module } from '@nestjs/common';
// import { DeliverySystemController } from './delivery-system.controller';
// import { DeliverySystemService } from './delivery-system.service';
import { DeliveryAssignmentModule } from './delivery-assignment/delivery-assignment.module';
import { DeliveryDriverModule } from './delivery-driver/delivery-driver.module';
import { DeliveryFeeModule } from './delivery-fee/delivery-fee.module';
import { DeliveryTrackingModule } from './delivery-tracking/delivery-tracking.module';
import { DeliveryZoneModule } from './delivery-zone/delivery-zone.module';

@Module({
  // controllers: [DeliverySystemController],
  // providers: [DeliverySystemService],
  imports: [
    DeliveryAssignmentModule,
    DeliveryDriverModule,
    DeliveryFeeModule,
    DeliveryTrackingModule,
    DeliveryZoneModule,
  ],
  exports: [
    DeliveryAssignmentModule,
    DeliveryDriverModule,
    DeliveryFeeModule,
    DeliveryTrackingModule,
    DeliveryZoneModule,
  ],
})
export class DeliverySystemModule {}
