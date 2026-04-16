import { Module } from '@nestjs/common';
import { ReservationGuestService } from './reservation-guest.service';
import { ReservationGuestController } from './reservation-guest.controller';

@Module({
  controllers: [ReservationGuestController],
  providers: [ReservationGuestService],
})
export class ReservationGuestModule {}
