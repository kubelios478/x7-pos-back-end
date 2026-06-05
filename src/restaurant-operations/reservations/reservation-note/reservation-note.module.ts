import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationNoteService } from './reservation-note.service';
import { ReservationNoteController } from './reservation-note.controller';
import { ReservationNote } from './entities/reservation-note.entity';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReservationNote, Reservation])],
  controllers: [ReservationNoteController],
  providers: [ReservationNoteService],
  exports: [ReservationNoteService],
})
export class ReservationNoteModule { }
