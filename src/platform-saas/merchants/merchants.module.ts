// src/Merchants/Merchants.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerchantsController } from './merchants.controller';
import { MerchantsService } from './merchants.service';
import { Merchant } from './entities/merchant.entity';
import { Company } from '../companies/entities/company.entity';
import { Location } from 'src/inventory/products-inventory/stocks/locations/entities/location.entity';
import { User } from '../users/entities/user.entity';
import { Table } from 'src/restaurant-operations/dining-system/tables/entities/table.entity';
import { Collaborator } from 'src/finance-hr/hr/collaborators/entities/collaborator.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Merchant, Company, Location, User, Table, Collaborator]),
  ],
  controllers: [MerchantsController],
  providers: [MerchantsService],
  exports: [MerchantsService],
})
export class MerchantsModule {}
