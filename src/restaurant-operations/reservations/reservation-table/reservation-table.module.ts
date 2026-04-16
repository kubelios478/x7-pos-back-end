import { Module } from '@nestjs/common';
import { ReservationTableService } from './reservation-table.service';
import { ReservationTableController } from './reservation-table.controller';

@Module({
  controllers: [ReservationTableController],
  providers: [ReservationTableService],
})
export class ReservationTableModule {}
