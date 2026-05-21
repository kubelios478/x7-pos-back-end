import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailService } from 'src/mail/mail.service';
import { RealtimeEventBusService } from 'src/realtime/realtime-event-bus.service';
import { companyRoom } from 'src/realtime/realtime.constants';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { InventoryStockAlert } from './entities/inventory-stock-alert.entity';
import { InventoryStockAlertType } from './constants/inventory-stock-alert-type.enum';
import {
  INVENTORY_STOCK_ALERT_EVENT,
  type InventoryStockAlertPayload,
} from './inventory-stock.events';

@Injectable()
export class InventoryStockAlertListener {
  private readonly logger = new Logger(InventoryStockAlertListener.name);

  constructor(
    private readonly realtimeBus: RealtimeEventBusService,
    private readonly mailService: MailService,
    @InjectRepository(InventoryStockAlert)
    private readonly alertRepo: Repository<InventoryStockAlert>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @OnEvent(INVENTORY_STOCK_ALERT_EVENT)
  handleInventoryStockAlert(payload: InventoryStockAlertPayload): void {
    setImmediate(() => {
      void this.dispatch(payload).catch((err: unknown) => {
        const e = err instanceof Error ? err : new Error(String(err));
        this.logger.error(
          `Inventory stock alert dispatch failed: ${e.message}`,
          e.stack,
        );
      });
    });
  }

  private async dispatch(payload: InventoryStockAlertPayload): Promise<void> {
    this.emitRealtime(payload);
    await this.sendEmailIfConfigured(payload);
  }

  private emitRealtime(payload: InventoryStockAlertPayload): void {
    if (process.env.WS_ENABLED === 'false') {
      return;
    }
    try {
      this.realtimeBus.emitToRoom(
        companyRoom(payload.companyId),
        INVENTORY_STOCK_ALERT_EVENT,
        payload,
      );
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.logger.debug(
        `Realtime emit skipped for alert ${payload.alertId}: ${err.message}`,
      );
    }
  }

  private async sendEmailIfConfigured(
    payload: InventoryStockAlertPayload,
  ): Promise<void> {
    if (!process.env.SMTP_HOST?.trim()) {
      return;
    }

    const alert = await this.alertRepo.findOne({
      where: { id: payload.alertId },
    });
    if (!alert || alert.emailSentAt != null) {
      return;
    }

    const recipients = await this.resolveRecipientEmails(payload.merchantId);
    if (recipients.length === 0) {
      return;
    }

    const typeLabel =
      payload.alertType === InventoryStockAlertType.OUT_OF_STOCK
        ? 'Out of stock'
        : 'Low stock';
    const minLine =
      payload.minimumQty != null
        ? `Minimum configured: ${payload.minimumQty}\n`
        : '';
    const frontend = (
      process.env.FRONTEND_URL ?? 'http://localhost:4200'
    ).replace(/\/$/, '');
    const text = [
      `${typeLabel} alert`,
      '',
      `Product: ${payload.productName}`,
      `Variant: ${payload.variantName}`,
      `Location: ${payload.locationName}`,
      `Current quantity: ${payload.currentQty}`,
      minLine,
      `Review inventory: ${frontend}`,
    ].join('\n');

    for (const to of recipients) {
      await this.mailService.sendMail({
        to,
        subject: `[X7 POS] ${typeLabel}: ${payload.productName}`,
        text,
      });
    }

    await this.alertRepo.update(
      { id: payload.alertId },
      { emailSentAt: new Date() },
    );
  }

  private async resolveRecipientEmails(merchantId: number): Promise<string[]> {
    const emails = new Set<string>();
    const merchant = await this.merchantRepo.findOne({
      where: { id: merchantId },
      select: ['id', 'email'],
    });
    if (merchant?.email?.trim()) {
      emails.add(merchant.email.trim());
    }

    const admins = await this.userRepo.find({
      where: { merchantId, role: UserRole.MERCHANT_ADMIN },
      select: ['email'],
    });
    for (const u of admins) {
      if (u.email?.trim()) {
        emails.add(u.email.trim());
      }
    }
    return [...emails];
  }
}
