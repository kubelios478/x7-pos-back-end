import { Injectable } from '@nestjs/common';
import { CreateReservationTableDto } from './dto/create-reservation-table.dto';
import { UpdateReservationTableDto } from './dto/update-reservation-table.dto';

@Injectable()
export class ReservationTableService {
  create(createReservationTableDto: CreateReservationTableDto) {
    return 'This action adds a new reservationTable';
  }

  findAll() {
    return `This action returns all reservationTable`;
  }

  findOne(id: number) {
    return `This action returns a #${id} reservationTable`;
  }

  update(id: number, updateReservationTableDto: UpdateReservationTableDto) {
    return `This action updates a #${id} reservationTable`;
  }

  remove(id: number) {
    return `This action removes a #${id} reservationTable`;
  }
}
