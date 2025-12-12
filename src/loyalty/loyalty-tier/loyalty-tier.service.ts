import { Injectable } from '@nestjs/common';
import { CreateLoyaltyTierDto } from './dto/create-loyalty-tier.dto';
import { UpdateLoyaltyTierDto } from './dto/update-loyalty-tier.dto';

@Injectable()
export class LoyaltyTierService {
  create(createLoyaltyTierDto: CreateLoyaltyTierDto) {
    return 'This action adds a new loyaltyTier';
  }

  findAll() {
    return `This action returns all loyaltyTier`;
  }

  findOne(id: number) {
    return `This action returns a #${id} loyaltyTier`;
  }

  update(id: number, updateLoyaltyTierDto: UpdateLoyaltyTierDto) {
    return `This action updates a #${id} loyaltyTier`;
  }

  remove(id: number) {
    return `This action removes a #${id} loyaltyTier`;
  }
}
