import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationService } from './reservation.service';
import { ReservationController } from './reservation.controller';
import { Reservation } from './entities/reservation.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Customer } from 'src/core/business-partners/customers/entities/customer.entity';
import { Table } from 'src/restaurant-operations/dining-system/tables/entities/table.entity';
import { ReservationTable } from '../reservation-table/entities/reservation-table.entity';
import { ReservationStatusHistory } from '../reservation-status-history/entities/reservation-status-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reservation,
      Merchant,
      Customer,
      Table,
      ReservationTable,
      ReservationStatusHistory,
    ]),
  ],
  controllers: [ReservationController],
  providers: [ReservationService],
  exports: [ReservationService],
})
export class ReservationModule { }
