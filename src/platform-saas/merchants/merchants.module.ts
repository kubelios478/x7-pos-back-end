// src/Merchants/Merchants.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerchantsController } from './merchants.controller';
import { MerchantsService } from './merchants.service';
import { Merchant } from './entities/merchant.entity';
import { Company } from '../companies/entities/company.entity';
import { Location } from 'src/inventory/products-inventory/stocks/locations/entities/location.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Merchant, Company, Location])],
  controllers: [MerchantsController],
  providers: [MerchantsService],
  exports: [MerchantsService],
})
export class MerchantsModule {}
