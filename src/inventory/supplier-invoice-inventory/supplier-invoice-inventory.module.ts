import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierInvoiceInventoryService } from './supplier-invoice-inventory.service';
import { RecipesModule } from '../products-inventory/recipes/recipes.module';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { SupplierInvoice } from 'src/finance-hr/account-payable/supplier-invoices/entities/supplier-invoice.entity';
import { SupplierInvoiceItem } from 'src/finance-hr/account-payable/supplier-invoice-item/entities/supplier-invoice-item.entity';
import { Item } from '../products-inventory/stocks/items/entities/item.entity';
import { Movement } from '../products-inventory/stocks/movements/entities/movement.entity';
import { Location } from '../products-inventory/stocks/locations/entities/location.entity';
import { Product } from '../products-inventory/products/entities/product.entity';
import { Variant } from '../products-inventory/variants/entities/variant.entity';
import { ProductRecipe } from '../products-inventory/recipes/entities/product-recipe.entity';
import { ProductRecipeLine } from '../products-inventory/recipes/entities/product-recipe-line.entity';
import { StockAlertsModule } from '../stock-alerts/stock-alerts.module';

@Module({
  imports: [
    RecipesModule,
    StockAlertsModule,
    TypeOrmModule.forFeature([
      Merchant,
      SupplierInvoice,
      SupplierInvoiceItem,
      Item,
      Movement,
      Location,
      Product,
      Variant,
      ProductRecipe,
      ProductRecipeLine,
    ]),
  ],
  providers: [SupplierInvoiceInventoryService],
  exports: [SupplierInvoiceInventoryService],
})
export class SupplierInvoiceInventoryModule {}
