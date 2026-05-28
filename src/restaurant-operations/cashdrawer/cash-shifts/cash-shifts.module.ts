import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashShift } from './entities/cash-shift.entity';
import { CashDrawer } from '../cash-drawers/entities/cash-drawer.entity';
import { CashTransaction } from '../cash-transactions/entities/cash-transaction.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { Collaborator } from '../../../finance-hr/hr/collaborators/entities/collaborator.entity';
import { CashShiftRepository } from './cash-shift.repository';
import { CashFlowService } from './cash-flow.service';
import { CashShiftsService } from './cash-shifts.service';
import { CashShiftsController } from './cash-shifts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CashShift,
      CashDrawer,
      CashTransaction,
      Merchant,
      Collaborator,
    ]),
  ],
  controllers: [CashShiftsController],
  providers: [CashShiftRepository, CashFlowService, CashShiftsService],
  exports: [CashShiftRepository, CashFlowService, CashShiftsService],
})
export class CashShiftsModule {}
