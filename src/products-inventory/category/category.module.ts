import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { Category } from './entities/category.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { ProductsInventoryModule } from '../products-inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Merchant]),
    forwardRef(() => ProductsInventoryModule),
  ],
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
