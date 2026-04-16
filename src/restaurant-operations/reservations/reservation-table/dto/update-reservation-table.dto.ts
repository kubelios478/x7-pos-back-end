import { PartialType } from '@nestjs/swagger';
import { CreateReservationTableDto } from './create-reservation-table.dto';

export class UpdateReservationTableDto extends PartialType(CreateReservationTableDto) {}
