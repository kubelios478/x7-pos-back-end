import { Module } from '@nestjs/common';
import { ProductsInventoryController } from './products-inventory.controller';
import { ProductsInventoryService } from './products-inventory.service';
import { ProductsModule } from './products/products.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { CategoryModule } from './category/category.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './category/entities/category.entity';
import { VariantsModule } from './variants/variants.module';
import { Variant } from './variants/entities/variant.entity';

@Module({
  controllers: [ProductsInventoryController],
  providers: [ProductsInventoryService],
  imports: [
    TypeOrmModule.forFeature([Category, Variant]),
    CategoryModule,
    ProductsModule,
    SuppliersModule,
    VariantsModule,
  ],
  exports: [ProductsInventoryService, ProductsModule],
})
export class ProductsInventoryModule {}
