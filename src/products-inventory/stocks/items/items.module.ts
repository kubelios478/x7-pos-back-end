import { Module } from '@nestjs/common';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Item } from './entities/item.entity';
import { Product } from 'src/products-inventory/products/entities/product.entity';
import { Location } from 'src/products-inventory/stocks/locations/entities/location.entity';
import { Variant } from 'src/products-inventory/variants/entities/variant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Item, Product, Location, Variant])],
  controllers: [ItemsController],
  providers: [ItemsService],
})
export class ItemsModule {}
