import { forwardRef, Module } from '@nestjs/common';
import { PurchaseOrderService } from './purchase-order.service';
import { PurchaseOrderController } from './purchase-order.controller';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrderItem } from '../purchase-order-item/entities/purchase-order-item.entity';
//import { PurchaseOrderItemModule } from '../purchase-order-item/purchase-order-item.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrder,
      PurchaseOrderItem,
      Merchant,
      Supplier,
    ]),
    forwardRef(() => PurchaseOrderModule),
  ],
  controllers: [PurchaseOrderController],
  providers: [PurchaseOrderService],
  exports: [PurchaseOrderService],
})
export class PurchaseOrderModule {}
