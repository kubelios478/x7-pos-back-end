import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ORDER_FULLY_PAID_EVENT,
  ORDER_LOYALTY_REVERSAL_EVENT,
  type OrderFullyPaidPayload,
  type OrderLoyaltyReversalPayload,
} from 'src/inventory/sale-inventory/order-paid.events';
import { OrderLoyaltyWalletService } from './order-loyalty-wallet.service';

@Injectable()
export class OrderFullyPaidLoyaltyListener {
  private readonly logger = new Logger(OrderFullyPaidLoyaltyListener.name);

  constructor(
    private readonly orderLoyaltyWalletService: OrderLoyaltyWalletService,
  ) {}

  @OnEvent(ORDER_FULLY_PAID_EVENT)
  handleOrderFullyPaid(payload: OrderFullyPaidPayload): void {
    setImmediate(() => {
      void this.orderLoyaltyWalletService
        .processOrderFullyPaid(payload)
        .catch((err: unknown) => {
          const e = err instanceof Error ? err : new Error(String(err));
          this.logger.error(
            `Loyalty accrual async error: ${e.message}`,
            e.stack,
          );
        });
    });
  }

  @OnEvent(ORDER_LOYALTY_REVERSAL_EVENT)
  handleOrderLoyaltyReversal(payload: OrderLoyaltyReversalPayload): void {
    setImmediate(() => {
      void this.orderLoyaltyWalletService
        .reverseOrderLoyaltyPoints(payload)
        .catch((err: unknown) => {
          const e = err instanceof Error ? err : new Error(String(err));
          this.logger.error(
            `Loyalty reversal async error: ${e.message}`,
            e.stack,
          );
        });
    });
  }
}
