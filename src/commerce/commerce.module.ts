import { Module } from '@nestjs/common';
import { QRCodeModule } from './qr-code/qr-code.module';
import { OnlineOrderingModule } from './online-ordering-system/online-ordering.module';
import { DeliverySystemModule } from './delivery-system/delivery-system.module';

@Module({
  imports: [QRCodeModule, OnlineOrderingModule, DeliverySystemModule],
  exports: [QRCodeModule, OnlineOrderingModule, DeliverySystemModule],
})
export class CommerceModule {}
