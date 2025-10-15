import { forwardRef, Module } from '@nestjs/common';
import { VariantsService } from './variants.service';
import { VariantsController } from './variants.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Variant } from './entities/variant.entity';
import { ProductsInventoryModule } from '../products-inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Variant]),
    forwardRef(() => ProductsInventoryModule),
  ],
  controllers: [VariantsController],
  providers: [VariantsService],
  exports: [VariantsService],
})
export class VariantsModule {}
