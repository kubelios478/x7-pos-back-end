import { PartialType } from '@nestjs/swagger';
import { CreateLoyaltyCustomerDto } from './create-loyalty-customer.dto';

export class UpdateLoyaltyCustomerDto extends PartialType(CreateLoyaltyCustomerDto) {}
