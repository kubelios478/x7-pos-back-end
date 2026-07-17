import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { VariantsService } from './variants.service';
import { VariantsController } from './variants.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Variant } from './entities/variant.entity';
import { Product } from '../products/entities/product.entity';
import { ProductsModule } from '../products/products.module';
import { StockAlertsModule } from '../../stock-alerts/stock-alerts.module';

import { Location } from '../stocks/locations/entities/location.entity';
import { Item } from '../stocks/items/entities/item.entity';

@Module({
  imports: [
    AuthModule,
    StockAlertsModule,
    TypeOrmModule.forFeature([Variant, Product, Location, Item]),
    forwardRef(() => ProductsModule),
  ],
  controllers: [VariantsController],
  providers: [VariantsService],
  exports: [VariantsService],
})
export class VariantsModule {}
