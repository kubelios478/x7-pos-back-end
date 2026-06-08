import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { MailModule } from 'src/mail/mail.module';
import { RealtimeModule } from 'src/realtime/realtime.module';
import { Item } from '../products-inventory/stocks/items/entities/item.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { InventoryStockAlert } from './entities/inventory-stock-alert.entity';
import { StockLevelMonitorService } from './stock-level-monitor.service';
import { StockAvailabilityService } from './stock-availability.service';
import { InventoryStockAlertsService } from './inventory-stock-alerts.service';
import { InventoryStockAlertListener } from './inventory-stock-alert.listener';
import { InventoryStockAlertsController } from './inventory-stock-alerts.controller';

@Module({
  imports: [
    AuthModule,
    MailModule,
    RealtimeModule,
    TypeOrmModule.forFeature([Item, Merchant, User, InventoryStockAlert]),
  ],
  controllers: [InventoryStockAlertsController],
  providers: [
    StockLevelMonitorService,
    StockAvailabilityService,
    InventoryStockAlertsService,
    InventoryStockAlertListener,
  ],
  exports: [StockLevelMonitorService, StockAvailabilityService],
})
export class StockAlertsModule {}
