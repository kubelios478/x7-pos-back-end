import { Module } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyProgramsModule } from './loyalty-programs/loyalty-programs.module';

@Module({
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  imports: [LoyaltyProgramsModule],
})
export class LoyaltyModule {}
