import { Injectable } from '@nestjs/common';
import { CreateLoyaltyCustomerDto } from './dto/create-loyalty-customer.dto';
import { UpdateLoyaltyCustomerDto } from './dto/update-loyalty-customer.dto';

@Injectable()
export class LoyaltyCustomerService {
  create(createLoyaltyCustomerDto: CreateLoyaltyCustomerDto) {
    return 'This action adds a new loyaltyCustomer';
  }

  findAll() {
    return `This action returns all loyaltyCustomer`;
  }

  findOne(id: number) {
    return `This action returns a #${id} loyaltyCustomer`;
  }

  update(id: number, updateLoyaltyCustomerDto: UpdateLoyaltyCustomerDto) {
    return `This action updates a #${id} loyaltyCustomer`;
  }

  remove(id: number) {
    return `This action removes a #${id} loyaltyCustomer`;
  }
}
