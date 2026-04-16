import { PartialType } from '@nestjs/swagger';
import { CreateReservationStatusHistoryDto } from './create-reservation-status-history.dto';

export class UpdateReservationStatusHistoryDto extends PartialType(CreateReservationStatusHistoryDto) {}
