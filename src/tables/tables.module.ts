import { Module } from '@nestjs/common';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Table } from './entities/table.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { IsUnique } from 'src/validators/is-unique.validator';

@Module({
  imports: [
    TypeOrmModule.forFeature([Table, Merchant])
  ],
  controllers: [TablesController,],
  providers: [TablesService, IsUnique],
  exports: [IsUnique]
})
export class TablesModule { }
