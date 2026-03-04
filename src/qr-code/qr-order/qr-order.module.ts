//src/qr-code/qr-order/qr-order.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QROrder } from './entity/qr-order.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { QRLocation } from '../qr-location/entity/qr-location.entity';
import { Customer } from 'src/customers/entities/customer.entity';
import { Order } from 'src/orders/entities/order.entity';
import { Table } from 'src/tables/entities/table.entity';
import { QROrderController } from './qr-order.controller';
import { QROrderService } from './qr-order.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QROrder,
      Merchant,
      QRLocation,
      Customer,
      Table,
      Order,
    ]),
  ],
  controllers: [QROrderController],
  providers: [QROrderService],
  exports: [QROrderService],
})
export class QrOrderModule {}
