import { PartialType } from '@nestjs/swagger';
import { CreateReservationGuestDto } from './create-reservation-guest.dto';

export class UpdateReservationGuestDto extends PartialType(
  CreateReservationGuestDto,
) {}
