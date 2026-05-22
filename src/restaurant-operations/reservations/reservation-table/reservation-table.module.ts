import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationTableService } from './reservation-table.service';
import { ReservationTableController } from './reservation-table.controller';
import { ReservationTable } from './entities/reservation-table.entity';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';
import { Table } from 'src/restaurant-operations/dining-system/tables/entities/table.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReservationTable, Reservation, Table])],
  controllers: [ReservationTableController],
  providers: [ReservationTableService],
  exports: [ReservationTableService],
})
export class ReservationTableModule { }
