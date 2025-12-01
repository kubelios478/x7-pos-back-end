import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItemService } from './order-item.service';
import { OrderItemController } from './order-item.controller';
import { OrderItem } from './entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products-inventory/products/entities/product.entity';
import { Variant } from '../products-inventory/variants/entities/variant.entity';
import { Modifier } from '../products-inventory/modifiers/entities/modifier.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderItem, Order, Product, Variant, Modifier]),
  ],
  controllers: [OrderItemController],
  providers: [OrderItemService],
  exports: [OrderItemService],
})
export class OrderItemModule {}
