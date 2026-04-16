import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ReservationTableService } from './reservation-table.service';
import { CreateReservationTableDto } from './dto/create-reservation-table.dto';
import { UpdateReservationTableDto } from './dto/update-reservation-table.dto';

@Controller('reservation-table')
export class ReservationTableController {
  constructor(private readonly reservationTableService: ReservationTableService) {}

  @Post()
  create(@Body() createReservationTableDto: CreateReservationTableDto) {
    return this.reservationTableService.create(createReservationTableDto);
  }

  @Get()
  findAll() {
    return this.reservationTableService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reservationTableService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReservationTableDto: UpdateReservationTableDto) {
    return this.reservationTableService.update(+id, updateReservationTableDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reservationTableService.remove(+id);
  }
}
