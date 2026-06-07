import { Module } from '@nestjs/common';
import { CashDrawersModule } from './cash-drawers/cash-drawers.module';
import { CashDrawerHistoryModule } from './cash-drawer-history/cash-drawer-history.module';
import { CashTransactionsModule } from './cash-transactions/cash-transactions.module';
import { CashShiftsModule } from './cash-shifts/cash-shifts.module';
import { CashMovementsModule } from './cash-movements/cash-movements.module';

@Module({
  imports: [CashDrawersModule, CashDrawerHistoryModule, CashTransactionsModule, CashShiftsModule, CashMovementsModule],
  exports: [CashDrawersModule, CashDrawerHistoryModule, CashTransactionsModule, CashShiftsModule, CashMovementsModule],
})
export class CashdrawerModule { }
