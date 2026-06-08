import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SaleInventoryDeductionService } from './sale-inventory-deduction.service';
import {
  ORDER_FULLY_PAID_EVENT,
  type OrderFullyPaidPayload,
} from './order-paid.events';

@Injectable()
export class OrderFullyPaidInventoryListener {
  private readonly logger = new Logger(OrderFullyPaidInventoryListener.name);

  constructor(
    private readonly saleInventoryDeductionService: SaleInventoryDeductionService,
  ) {}

  /**
   * Defer heavy work off the HTTP microtask queue (CAT 1: asynchronous processing).
   */
  @OnEvent(ORDER_FULLY_PAID_EVENT)
  handleOrderFullyPaid(payload: OrderFullyPaidPayload): void {
    setImmediate(() => {
      void this.saleInventoryDeductionService
        .processOrderFullyPaid(payload)
        .catch((err: unknown) => {
          const e = err instanceof Error ? err : new Error(String(err));
          this.logger.error(
            `Sale inventory deduction async error: ${e.message}`,
            e.stack,
          );
        });
    });
  }
}
