import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LoyaltyTierService } from './loyalty-tier.service';
import { CreateLoyaltyTierDto } from './dto/create-loyalty-tier.dto';
import { UpdateLoyaltyTierDto } from './dto/update-loyalty-tier.dto';

@Controller('loyalty-tier')
export class LoyaltyTierController {
  constructor(private readonly loyaltyTierService: LoyaltyTierService) {}

  @Post()
  create(@Body() createLoyaltyTierDto: CreateLoyaltyTierDto) {
    return this.loyaltyTierService.create(createLoyaltyTierDto);
  }

  @Get()
  findAll() {
    return this.loyaltyTierService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.loyaltyTierService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLoyaltyTierDto: UpdateLoyaltyTierDto) {
    return this.loyaltyTierService.update(+id, updateLoyaltyTierDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.loyaltyTierService.remove(+id);
  }
}
