import { Module } from '@nestjs/common';
import { FinanceHrController } from './finance-hr.controller';
import { FinanceHrService } from './finance-hr.service';
import { AccountingModule } from './accounting/accounting.module';
import { AccountPayableModule } from './account-payable/account-payable.module';
import { HrModule } from './hr/hr.module';
import { PayrollModule } from './payroll/payroll.module';

@Module({
  imports: [AccountingModule, AccountPayableModule, HrModule, PayrollModule],
  exports: [AccountingModule, AccountPayableModule, HrModule, PayrollModule],
  controllers: [FinanceHrController],
  providers: [FinanceHrService],
})
export class FinanceHrModule {}
