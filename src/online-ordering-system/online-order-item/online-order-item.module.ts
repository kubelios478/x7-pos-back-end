import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnlineOrderItemService } from './online-order-item.service';
import { OnlineOrderItemController } from './online-order-item.controller';
import { OnlineOrderItem } from './entities/online-order-item.entity';
import { OnlineOrder } from '../online-order/entities/online-order.entity';
import { Product } from '../../products-inventory/products/entities/product.entity';
import { Variant } from '../../products-inventory/variants/entities/variant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OnlineOrderItem, OnlineOrder, Product, Variant]),
  ],
  controllers: [OnlineOrderItemController],
  providers: [OnlineOrderItemService],
  exports: [OnlineOrderItemService],
})
export class OnlineOrderItemModule {}
