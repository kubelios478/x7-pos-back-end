import { forwardRef, Module } from '@nestjs/common';
import { ModifiersService } from './modifiers.service';
import { ModifiersController } from './modifiers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Modifier } from './entities/modifier.entity';
import { ProductsInventoryModule } from '../products-inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Modifier]),
    forwardRef(() => ProductsInventoryModule),
  ],
  controllers: [ModifiersController],
  providers: [ModifiersService],
  exports: [ModifiersService],
})
export class ModifiersModule {}
