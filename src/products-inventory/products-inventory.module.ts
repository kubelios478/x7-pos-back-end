import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsInventoryController } from './products-inventory.controller';
import { ProductsInventoryService } from './products-inventory.service';
import { ProductsModule } from './products/products.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { CategoryModule } from './category/category.module';
import { VariantsModule } from './variants/variants.module';
import { ModifiersModule } from './modifiers/modifiers.module';
import { Category } from './category/entities/category.entity';
import { Variant } from './variants/entities/variant.entity';
import { Modifier } from './modifiers/entities/modifier.entity';
import { Product } from './products/entities/product.entity';

@Module({
  controllers: [ProductsInventoryController],
  providers: [ProductsInventoryService],
  imports: [
    TypeOrmModule.forFeature([Category, Product, Variant, Modifier]),
    CategoryModule,
    ProductsModule,
    SuppliersModule,
    VariantsModule,
    ModifiersModule,
  ],
  exports: [ProductsInventoryService, ProductsModule],
})
export class ProductsInventoryModule {}
