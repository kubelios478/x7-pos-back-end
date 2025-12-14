import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LoyaltyCustomerService } from './loyalty-customer.service';
import { CreateLoyaltyCustomerDto } from './dto/create-loyalty-customer.dto';
import { UpdateLoyaltyCustomerDto } from './dto/update-loyalty-customer.dto';

@Controller('loyalty-customer')
export class LoyaltyCustomerController {
  constructor(private readonly loyaltyCustomerService: LoyaltyCustomerService) {}

  @Post()
  create(@Body() createLoyaltyCustomerDto: CreateLoyaltyCustomerDto) {
    return this.loyaltyCustomerService.create(createLoyaltyCustomerDto);
  }

  @Get()
  findAll() {
    return this.loyaltyCustomerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.loyaltyCustomerService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLoyaltyCustomerDto: UpdateLoyaltyCustomerDto) {
    return this.loyaltyCustomerService.update(+id, updateLoyaltyCustomerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.loyaltyCustomerService.remove(+id);
  }
}
