import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ReservationNoteService } from './reservation-note.service';
import { CreateReservationNoteDto } from './dto/create-reservation-note.dto';
import { UpdateReservationNoteDto } from './dto/update-reservation-note.dto';

@Controller('reservation-note')
export class ReservationNoteController {
  constructor(private readonly reservationNoteService: ReservationNoteService) {}

  @Post()
  create(@Body() createReservationNoteDto: CreateReservationNoteDto) {
    return this.reservationNoteService.create(createReservationNoteDto);
  }

  @Get()
  findAll() {
    return this.reservationNoteService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reservationNoteService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReservationNoteDto: UpdateReservationNoteDto) {
    return this.reservationNoteService.update(+id, updateReservationNoteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reservationNoteService.remove(+id);
  }
}
