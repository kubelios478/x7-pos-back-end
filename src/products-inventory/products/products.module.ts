import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { Category } from '../category/entities/category.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Variant } from '../variants/entities/variant.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Merchant, Category, Supplier, Variant]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
