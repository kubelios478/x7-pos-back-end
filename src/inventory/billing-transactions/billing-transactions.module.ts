import { Module } from '@nestjs/common';
import { BillingTransactionsService } from './billing-transactions.service';
import { BillingTransactionsController } from './billing-transactions.controller';

@Module({
  controllers: [BillingTransactionsController],
  providers: [BillingTransactionsService],
})
export class BillingTransactionsModule {}
