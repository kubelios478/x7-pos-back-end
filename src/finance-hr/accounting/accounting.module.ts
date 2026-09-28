import { Module } from '@nestjs/common';
import { LedgerAccountsController } from './ledger-accounts.controller';
import { JournalEntriesController } from './journal-entries.controller';

@Module({
  controllers: [],
  exports: [],
})
export class AccountingModule {}
