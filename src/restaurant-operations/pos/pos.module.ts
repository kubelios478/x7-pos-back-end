import { Module } from '@nestjs/common';
import { OrderItemModule } from './order-item/order-item.module';
import { OrdersModule } from './orders/orders.module';
import { OrderPaymentsModule } from './order-payments/order-payments.module';
import { OrderTaxesModule } from './order-taxes/order-taxes.module';
import { OrderItemModifiersModule } from './order-item-modifiers/order-item-modifiers.module';
import { ModifierAnalyticsModule } from './modifier-analytics/modifier-analytics.module';

@Module({
  imports: [
    OrdersModule,
    OrderItemModule,
    OrderPaymentsModule,
    OrderTaxesModule,
    OrderItemModifiersModule,
    ModifierAnalyticsModule,
  ],
  exports: [
    OrdersModule,
    OrderItemModule,
    OrderPaymentsModule,
    OrderTaxesModule,
    OrderItemModifiersModule,
    ModifierAnalyticsModule,
  ],
})
export class PosModule {}
