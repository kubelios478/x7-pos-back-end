import { Module } from '@nestjs/common';
import { ProductsInventoryModule } from './products-inventory/products-inventory.module';
import { InputsModule } from './inputs/inputs.module';

@Module({
  imports: [ProductsInventoryModule, InputsModule],
})
export class InventoryModule {}
