import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InputsController } from './inputs.controller';
import { InputsService } from './inputs.service';
import { Input } from './entities/input.entity';
import { InputSupplier } from './entities/input-supplier.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Supplier } from 'src/core/business-partners/suppliers/entities/supplier.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Input, InputSupplier, Merchant, Supplier]),
  ],
  controllers: [InputsController],
  providers: [InputsService],
})
export class InputsModule {}
