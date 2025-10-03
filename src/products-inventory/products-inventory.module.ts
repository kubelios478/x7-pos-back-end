import { Module } from '@nestjs/common';
import { ProductsInventoryController } from './products-inventory.controller';
import { ProductsInventoryService } from './products-inventory.service';
import { CategoryModule } from './category/category.module';
import { ProductsModule } from './products/products.module';
import { SuppliersModule } from './suppliers/suppliers.module';

@Module({
  controllers: [ProductsInventoryController],
  providers: [ProductsInventoryService],
  imports: [CategoryModule, ProductsModule, SuppliersModule],
})
export class ProductsInventoryModule {}
