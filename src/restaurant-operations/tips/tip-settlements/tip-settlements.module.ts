import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { TipSettlementsService } from './tip-settlements.service';
import { TipSettlementsController } from './tip-settlements.controller';
import { TipSettlement } from './entities/tip-settlement.entity';
import { Collaborator } from 'src/finance-hr/hr/collaborators/entities/collaborator.entity';
import { Shift } from '../../shift/shifts/entities/shift.entity';
import { User } from '../../../platform-saas/users/entities/user.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { Tip } from '../tips/entities/tip.entity';
import { MerchantTipRule } from '../../../core/configuration/merchant-tip-rule/entity/merchant-tip-rule-entity';
import { CashDrawer } from '../../cashdrawer/cash-drawers/entities/cash-drawer.entity';
import { CashShift } from '../../cashdrawer/cash-shifts/entities/cash-shift.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      TipSettlement,
      Collaborator,
      Shift,
      User,
      Merchant,
      Tip,
      MerchantTipRule,
      CashDrawer,
      CashShift,
    ]),
  ],
  controllers: [TipSettlementsController],
  providers: [TipSettlementsService],
  exports: [TipSettlementsService],
})
export class TipSettlementsModule {}
