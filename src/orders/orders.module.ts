import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { Table } from '../tables/entities/table.entity';
import { Collaborator } from '../collaborators/entities/collaborator.entity';
import { MerchantSubscription } from '../subscriptions/merchant-subscriptions/entities/merchant-subscription.entity';
import { Customer } from '../customers/entities/customer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      Merchant,
      Table,
      Collaborator,
      MerchantSubscription,
      Customer,
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
