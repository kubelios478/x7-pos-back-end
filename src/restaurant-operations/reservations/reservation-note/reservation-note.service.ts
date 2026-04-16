import { Injectable } from '@nestjs/common';
import { CreateReservationNoteDto } from './dto/create-reservation-note.dto';
import { UpdateReservationNoteDto } from './dto/update-reservation-note.dto';

@Injectable()
export class ReservationNoteService {
  create(createReservationNoteDto: CreateReservationNoteDto) {
    return 'This action adds a new reservationNote';
  }

  findAll() {
    return `This action returns all reservationNote`;
  }

  findOne(id: number) {
    return `This action returns a #${id} reservationNote`;
  }

  update(id: number, updateReservationNoteDto: UpdateReservationNoteDto) {
    return `This action updates a #${id} reservationNote`;
  }

  remove(id: number) {
    return `This action removes a #${id} reservationNote`;
  }
}
