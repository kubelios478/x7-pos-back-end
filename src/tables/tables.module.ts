import { Module } from '@nestjs/common';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Table } from './entities/table.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { IsUniqueField } from 'src/validators/is-unique-field.validator';

@Module({
  imports: [
    TypeOrmModule.forFeature([Table, Merchant])
  ],
  controllers: [TablesController,],
  providers: [TablesService, IsUniqueField],
  exports: [IsUniqueField]
})
export class TablesModule { }
