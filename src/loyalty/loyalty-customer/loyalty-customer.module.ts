import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoyaltyCustomerService } from './loyalty-customer.service';
import { LoyaltyCustomerController } from './loyalty-customer.controller';
import { LoyaltyCustomer } from './entities/loyalty-customer.entity';
import { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LoyaltyCustomer, LoyaltyProgram])],
  controllers: [LoyaltyCustomerController],
  providers: [LoyaltyCustomerService],
  exports: [LoyaltyCustomerService],
})
export class LoyaltyCustomerModule {}
