import { Injectable } from '@nestjs/common';
import { CreateReservationStatusHistoryDto } from './dto/create-reservation-status-history.dto';
import { UpdateReservationStatusHistoryDto } from './dto/update-reservation-status-history.dto';

@Injectable()
export class ReservationStatusHistoryService {
  create(createReservationStatusHistoryDto: CreateReservationStatusHistoryDto) {
    return 'This action adds a new reservationStatusHistory';
  }

  findAll() {
    return `This action returns all reservationStatusHistory`;
  }

  findOne(id: number) {
    return `This action returns a #${id} reservationStatusHistory`;
  }

  update(id: number, updateReservationStatusHistoryDto: UpdateReservationStatusHistoryDto) {
    return `This action updates a #${id} reservationStatusHistory`;
  }

  remove(id: number) {
    return `This action removes a #${id} reservationStatusHistory`;
  }
}
