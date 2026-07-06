import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { VariantsService } from './variants.service';
import { VariantsController } from './variants.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Variant } from './entities/variant.entity';
import { Product } from '../products/entities/product.entity';
import { ProductsModule } from '../products/products.module';
import { StockAlertsModule } from '../../stock-alerts/stock-alerts.module';

@Module({
  imports: [
    AuthModule,
    StockAlertsModule,
    TypeOrmModule.forFeature([Variant, Product]),
    forwardRef(() => ProductsModule),
  ],
  controllers: [VariantsController],
  providers: [VariantsService],
  exports: [VariantsService],
})
export class VariantsModule {}
