import { Module } from '@nestjs/common';
import { ProductsInventoryController } from './products-inventory.controller';
import { ProductsInventoryService } from './products-inventory.service';
import { CategoryModule } from './category/category.module';

@Module({
  controllers: [ProductsInventoryController],
  providers: [ProductsInventoryService],
  imports: [CategoryModule],
})
export class ProductsInventoryModule {}
