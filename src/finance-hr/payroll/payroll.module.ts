import { Module } from '@nestjs/common';
import { PayrollAdjustmentsModule } from './payroll-adjustments/payroll-adjustments.module';
import { PayrollEntriesModule } from './payroll-entries/payroll-entries.module';
import { PayrollRunsModule } from './payroll-runs/payroll-runs.module';
import { PayrollTaxDetailsModule } from './payroll-tax-details/payroll-tax-details.module';

@Module({
  imports: [
    PayrollAdjustmentsModule,
    PayrollEntriesModule,
    PayrollRunsModule,
    PayrollTaxDetailsModule,
  ],
  exports: [
    PayrollAdjustmentsModule,
    PayrollEntriesModule,
    PayrollRunsModule,
    PayrollTaxDetailsModule,
  ],
})
export class PayrollModule {}
