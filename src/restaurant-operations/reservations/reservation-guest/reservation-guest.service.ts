import { Injectable } from '@nestjs/common';
import { CreateReservationGuestDto } from './dto/create-reservation-guest.dto';
import { UpdateReservationGuestDto } from './dto/update-reservation-guest.dto';

@Injectable()
export class ReservationGuestService {
  create(createReservationGuestDto: CreateReservationGuestDto) {
    return 'This action adds a new reservationGuest';
  }

  findAll() {
    return `This action returns all reservationGuest`;
  }

  findOne(id: number) {
    return `This action returns a #${id} reservationGuest`;
  }

  update(id: number, updateReservationGuestDto: UpdateReservationGuestDto) {
    return `This action updates a #${id} reservationGuest`;
  }

  remove(id: number) {
    return `This action removes a #${id} reservationGuest`;
  }
}
