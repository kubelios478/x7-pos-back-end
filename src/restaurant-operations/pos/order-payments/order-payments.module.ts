import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderPaymentsService } from './order-payments.service';
import { OrderPaymentsController } from './order-payments.controller';
import { OrderPayment } from './entities/order-payment.entity';
import { Order } from '../orders/entities/order.entity';
import { OrdersModule } from '../orders/orders.module';

import { CashShiftsModule } from '../../cashdrawer/cash-shifts/cash-shifts.module';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([OrderPayment, Order]), OrdersModule, CashShiftsModule],
  controllers: [OrderPaymentsController],
  providers: [OrderPaymentsService],
  exports: [OrderPaymentsService],
})
export class OrderPaymentsModule { }
