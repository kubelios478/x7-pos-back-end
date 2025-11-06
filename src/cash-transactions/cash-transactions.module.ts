import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashTransactionsService } from './cash-transactions.service';
import { CashTransactionsController } from './cash-transactions.controller';
import { CashTransaction } from './entities/cash-transaction.entity';
import { CashDrawer } from '../cash-drawers/entities/cash-drawer.entity';
import { Collaborator } from '../collaborators/entities/collaborator.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CashTransaction, CashDrawer, Collaborator])],
  controllers: [CashTransactionsController],
  providers: [CashTransactionsService],
})
export class CashTransactionsModule {}
