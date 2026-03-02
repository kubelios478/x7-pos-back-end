import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { BillingTransactionsModule } from './billing-transactions/billing-transactions.module';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService],
  imports: [BillingTransactionsModule],
})
export class InventoryModule { }
