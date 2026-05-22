import { Module } from '@nestjs/common';
import { ReservationModule } from './reservation/reservation.module';
import { ReservationGuestModule } from './reservation-guest/reservation-guest.module';
import { ReservationTableModule } from './reservation-table/reservation-table.module';
import { ReservationNoteModule } from './reservation-note/reservation-note.module';
import { ReservationStatusHistoryModule } from './reservation-status-history/reservation-status-history.module';

@Module({
  imports: [ReservationModule, ReservationGuestModule, ReservationTableModule, ReservationNoteModule, ReservationStatusHistoryModule]
})
export class ReservationsModule {}
