import { Module } from '@nestjs/common';
import { PurchaseOrderService } from './purchase-order.service';
import { PurchaseOrderController } from './purchase-order.controller';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseOrder, Merchant, Supplier])],
  controllers: [PurchaseOrderController],
  providers: [PurchaseOrderService],
  exports: [PurchaseOrderService],
})
export class PurchaseOrderModule {}
