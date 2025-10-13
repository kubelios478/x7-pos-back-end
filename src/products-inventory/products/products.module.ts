import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { Category } from '../category/entities/category.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Service } from './.service';
import { ProductsServiceService } from './products.service/products.service.service';
import { ProductsService } from './products/products.service';
import { ProductsService } from './products/products.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Merchant, Category, Supplier])],
  controllers: [ProductsController],
  providers: [ProductsService, Service, ProductsServiceService],
  exports: [ProductsService],
})
export class ProductsModule {}
