import { Module } from '@nestjs/common';
import { BillingTransactionsService } from './billing-transactions.service';
import { BillingTransactionsController } from './billing-transactions.controller';
import { ReceiptsModule } from './receipts/receipts.module';

@Module({
    imports: [ReceiptsModule],
    controllers: [BillingTransactionsController],
    providers: [BillingTransactionsService],
})
export class BillingTransactionsModule { }
