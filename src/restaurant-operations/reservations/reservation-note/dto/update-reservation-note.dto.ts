import { PartialType } from '@nestjs/swagger';
import { CreateReservationNoteDto } from './create-reservation-note.dto';

export class UpdateReservationNoteDto extends PartialType(CreateReservationNoteDto) { }
