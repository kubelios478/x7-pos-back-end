import { Module } from '@nestjs/common';
import { ReservationNoteService } from './reservation-note.service';
import { ReservationNoteController } from './reservation-note.controller';

@Module({
  controllers: [ReservationNoteController],
  providers: [ReservationNoteService],
})
export class ReservationNoteModule {}
