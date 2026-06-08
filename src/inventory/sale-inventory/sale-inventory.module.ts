import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { OrderItem } from 'src/restaurant-operations/pos/order-item/entities/order-item.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { ProductRecipe } from 'src/inventory/products-inventory/recipes/entities/product-recipe.entity';
import { ProductRecipeLine } from 'src/inventory/products-inventory/recipes/entities/product-recipe-line.entity';
import { Item } from 'src/inventory/products-inventory/stocks/items/entities/item.entity';
import { Movement } from 'src/inventory/products-inventory/stocks/movements/entities/movement.entity';
import { Location } from 'src/inventory/products-inventory/stocks/locations/entities/location.entity';
import { SaleInventoryDeductionService } from './sale-inventory-deduction.service';
import { OrderFullyPaidInventoryListener } from './order-fully-paid-inventory.listener';
import { StockAlertsModule } from '../stock-alerts/stock-alerts.module';

@Module({
  imports: [
    StockAlertsModule,
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Merchant,
      ProductRecipe,
      ProductRecipeLine,
      Item,
      Movement,
      Location,
    ]),
  ],
  providers: [SaleInventoryDeductionService, OrderFullyPaidInventoryListener],
  exports: [SaleInventoryDeductionService],
})
export class SaleInventoryModule {}
