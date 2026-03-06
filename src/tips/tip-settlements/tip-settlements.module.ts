import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipSettlementsService } from './tip-settlements.service';
import { TipSettlementsController } from './tip-settlements.controller';
import { TipSettlement } from './entities/tip-settlement.entity';
import { Collaborator } from '../../hr/collaborators/entities/collaborator.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { User } from '../../users/entities/user.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TipSettlement,
      Collaborator,
      Shift,
      User,
      Merchant,
    ]),
  ],
  controllers: [TipSettlementsController],
  providers: [TipSettlementsService],
  exports: [TipSettlementsService],
})
export class TipSettlementsModule {}
