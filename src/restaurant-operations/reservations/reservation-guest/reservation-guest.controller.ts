import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ReservationGuestService } from './reservation-guest.service';
import { CreateReservationGuestDto } from './dto/create-reservation-guest.dto';
import { UpdateReservationGuestDto } from './dto/update-reservation-guest.dto';

@Controller('reservation-guest')
export class ReservationGuestController {
  constructor(private readonly reservationGuestService: ReservationGuestService) {}

  @Post()
  create(@Body() createReservationGuestDto: CreateReservationGuestDto) {
    return this.reservationGuestService.create(createReservationGuestDto);
  }

  @Get()
  findAll() {
    return this.reservationGuestService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reservationGuestService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReservationGuestDto: UpdateReservationGuestDto) {
    return this.reservationGuestService.update(+id, updateReservationGuestDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reservationGuestService.remove(+id);
  }
}
