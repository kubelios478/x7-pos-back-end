import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ReservationStatusHistoryService } from './reservation-status-history.service';
import { CreateReservationStatusHistoryDto } from './dto/create-reservation-status-history.dto';
import { UpdateReservationStatusHistoryDto } from './dto/update-reservation-status-history.dto';

@Controller('reservation-status-history')
export class ReservationStatusHistoryController {
  constructor(private readonly reservationStatusHistoryService: ReservationStatusHistoryService) {}

  @Post()
  create(@Body() createReservationStatusHistoryDto: CreateReservationStatusHistoryDto) {
    return this.reservationStatusHistoryService.create(createReservationStatusHistoryDto);
  }

  @Get()
  findAll() {
    return this.reservationStatusHistoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reservationStatusHistoryService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReservationStatusHistoryDto: UpdateReservationStatusHistoryDto) {
    return this.reservationStatusHistoryService.update(+id, updateReservationStatusHistoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reservationStatusHistoryService.remove(+id);
  }
}
