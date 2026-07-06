import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationGuestService } from './reservation-guest.service';
import { ReservationGuestController } from './reservation-guest.controller';
import { ReservationGuest } from './entities/reservation-guest.entity';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReservationGuest, Reservation])],
  controllers: [ReservationGuestController],
  providers: [ReservationGuestService],
  exports: [ReservationGuestService],
})
export class ReservationGuestModule {}
