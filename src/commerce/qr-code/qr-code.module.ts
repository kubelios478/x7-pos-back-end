import { Module } from '@nestjs/common';
import { QrCodeController } from './qr-code.controller';
import { QrCodeService } from './qr-code.service';
import { QRLocationModule } from './qr-location/qr-location.module';
import { QRMenuModule } from './qr-menu/qr-menu.module';
import { QRMenuItemModule } from './qr-menu-item/qr-menu-item.module';
import { QRMenuSectionModule } from './qr-menu-section/qr-menu-section.module';
import { QROrderModule } from './qr-order/qr-order.module';
import { QROrderItemModule } from './qr-order-item/qr-order-item.module';

@Module({
  controllers: [QrCodeController],
  providers: [QrCodeService],
  imports: [
    QRLocationModule,
    QRMenuModule,
    QRMenuItemModule,
    QRMenuSectionModule,
    QROrderModule,
    QROrderItemModule,
  ],
  exports: [
    QRLocationModule,
    QRMenuModule,
    QRMenuItemModule,
    QRMenuSectionModule,
    QROrderModule,
    QROrderItemModule,
  ],
})
export class QRCodeModule {}
