import { Module } from '@nestjs/common';
import { CashDrawersModule } from './cash-drawers/cash-drawers.module';
import { CashDrawerHistoryModule } from './cash-drawer-history/cash-drawer-history.module';
import { CashTransactionsModule } from './cash-transactions/cash-transactions.module';
import { CashShiftsModule } from './cash-shifts/cash-shifts.module';

@Module({
  imports: [CashDrawersModule, CashDrawerHistoryModule, CashTransactionsModule, CashShiftsModule],
  exports: [CashDrawersModule, CashDrawerHistoryModule, CashTransactionsModule, CashShiftsModule],
})
export class CashdrawerModule { }
