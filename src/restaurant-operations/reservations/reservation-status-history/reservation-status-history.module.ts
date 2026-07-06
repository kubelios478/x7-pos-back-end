import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationStatusHistoryService } from './reservation-status-history.service';
import { ReservationStatusHistoryController } from './reservation-status-history.controller';
import { ReservationStatusHistory } from './entities/reservation-status-history.entity';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReservationStatusHistory, Reservation])],
  controllers: [ReservationStatusHistoryController],
  providers: [ReservationStatusHistoryService],
  exports: [ReservationStatusHistoryService],
})
export class ReservationStatusHistoryModule {}
